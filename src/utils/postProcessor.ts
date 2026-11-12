import {
  DetectedLanguage,
  LanguageHint,
  SnippetItem,
  ToneOption,
  VoiceCommandType,
} from '../types/voice';

export interface PostProcessOptions {
  dictionary: string[];
  snippets: SnippetItem[];
  emojiCommands?: boolean;
  tone?: ToneOption;
}

export interface PostProcessResult {
  text: string;
  command: VoiceCommandType;
  appliedSnippets: string[];
  appliedDictionary: string[];
  removedFillers: string[];
  hasSensitiveWarning: boolean;
}

const EMOJI_MAP: Record<string, string> = {
  'smiley face': '🙂',
  smiley: '🙂',
  'thumbs up': '👍',
  'heart emoji': '❤️',
  'rocket emoji': '🚀',
  'check mark': '✅',
  'fire emoji': '🔥',
};

const FILLER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(um+|uh+|er+|ah+)\b[,\s]*/gi, label: 'um/uh' },
  { pattern: /(^|\s)(আআ+|উম+|এই যে|মানে হচ্ছে যে|হুম+)(\s|$)/g, label: 'আআ/এই যে/মানে' },
  { pattern: /\b(a+h+|e+i+ j+e+|m+a+n+e+ h+o+c+c+h+e+)\b[,\s]*/gi, label: 'Banglish filler' },
];

const SENSITIVE_KEYWORDS = [
  /\b(password|passcode|cvv|credit card|bank account|otp|pin number|secret key)\b/i,
  /(পাসওয়ার্ড|ওটিপি|ব্যাংক একাউন্ট|পিন নম্বর)/,
];

/**
 * Generates the exact Part 5 System Instruction for Gemini audio transcription + cleanup.
 */
export function buildSystemInstruction(
  dictionary: string[],
  tone: ToneOption,
  languageHint: LanguageHint = 'auto'
): string {
  const dictFormatted =
    dictionary.length > 0 ? dictionary.map((w) => w.trim()).filter(Boolean).join(', ') : 'None';

  const languageGuidance =
    languageHint === 'bn'
      ? 'Prefer Bangla (বাংলা) script for Bangla speech.'
      : languageHint === 'en'
        ? 'Prefer English script.'
        : languageHint === 'banglish'
          ? 'Prefer Banglish (Bangla words written naturally in English/Latin alphabet).'
          : 'Auto-detect whether the user speaks Bangla, English, Banglish, or a mix.';

  return `You are a voice-to-text engine for a dictation app.

Input: an audio clip of a user speaking. The user may speak Bangla,
English, Banglish (Bangla written in English letters), or a mix.
Language preference hint: ${languageGuidance}

Your job:
1. Transcribe the speech accurately. Do NOT translate unless asked.
2. Remove filler words and stutters: "um", "uh", "like", "এই", "আআ",
   "মানে", "হুম" when they carry no meaning.
3. Add correct punctuation (, . ? !) and capitalization.
4. Keep the speaker's meaning and words. Do not add new information.
5. If the user says a formatting command, apply it instead of typing it:
   - "new line" / "নতুন লাইন" -> newline
   - "new paragraph" -> two newlines
   - "full stop" / "দাঁড়ি" -> "."
   - "delete that" -> return empty text
6. Use this personal dictionary for spelling of names and terms:
   ${dictFormatted}
7. Tone: ${tone}
   (one of: natural, formal, casual, email, code)
8. If the audio is silent or unclear, return an empty text.

Return ONLY valid JSON, no markdown, no commentary:
{
  "text": "<cleaned transcript>",
  "language": "bn | en | banglish | mixed",
  "command": null | "newline" | "paragraph" | "delete" | "rewrite"
}`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Post-processes the transcript returned by Gemini (or local fallback):
 * - Detects voice commands ("delete that", "delete last sentence", "new line", "new paragraph")
 * - Removes remaining filler words
 * - Applies inline formatting commands ("নতুন লাইন", "দাঁড়ি", "full stop")
 * - Expands user snippets (e.g., "my email" -> "tipu@example.com")
 * - Enforces personal dictionary exact casing (case-insensitive match)
 * - Replaces optional emoji voice triggers
 * - Collapses double spaces and normalizes punctuation
 */
export function applyPostProcessing(
  inputText: string,
  options: PostProcessOptions,
  initialCommand: VoiceCommandType = null
): PostProcessResult {
  const appliedSnippets: string[] = [];
  const appliedDictionary: string[] = [];
  const removedFillers: string[] = [];

  if (!inputText || !inputText.trim()) {
    return {
      text: '',
      command: initialCommand,
      appliedSnippets,
      appliedDictionary,
      removedFillers,
      hasSensitiveWarning: false,
    };
  }

  let working = inputText.trim();
  let detectedCommand: VoiceCommandType = initialCommand;

  // Check standalone voice commands first
  const normalizedLower = working.toLowerCase().replace(/[.!?]+$/, '').trim();
  if (
    normalizedLower === 'delete that' ||
    normalizedLower === 'delete last sentence' ||
    normalizedLower === 'এটা মুছে ফেলো' ||
    normalizedLower === 'মুছে ফেলো'
  ) {
    return {
      text: '',
      command: 'delete',
      appliedSnippets,
      appliedDictionary,
      removedFillers,
      hasSensitiveWarning: false,
    };
  }

  if (normalizedLower === 'new line' || normalizedLower === 'নতুন লাইন') {
    return {
      text: '\n',
      command: 'newline',
      appliedSnippets,
      appliedDictionary,
      removedFillers,
      hasSensitiveWarning: false,
    };
  }

  if (normalizedLower === 'new paragraph' || normalizedLower === 'নতুন অনুচ্ছেদ') {
    return {
      text: '\n\n',
      command: 'paragraph',
      appliedSnippets,
      appliedDictionary,
      removedFillers,
      hasSensitiveWarning: false,
    };
  }

  // 1. Remove leftover filler words (run twice to catch adjacent fillers)
  for (const filler of FILLER_PATTERNS) {
    if (filler.pattern.test(working)) {
      removedFillers.push(filler.label);
      working = working.replace(filler.pattern, ' ').replace(filler.pattern, ' ');
    }
  }

  // 2. Inline formatting & punctuation commands (Bangla + English)
  working = working
    .replace(/\bnew paragraph\b/gi, '\n\n')
    .replace(/নতুন অনুচ্ছেদ/g, '\n\n')
    .replace(/\bnew line\b/gi, '\n')
    .replace(/নতুন লাইন/g, '\n')
    .replace(/\bquestion mark\b/gi, '?')
    .replace(/প্রশ্নবোধক চিহ্ন/g, '?')
    .replace(/\bexclamation mark\b/gi, '!')
    .replace(/\bfull stop\b/gi, '.')
    .replace(/\s*(দাঁড়ি|দাড়ি)\s*/g, '। ')
    .replace(/\s*কমা\s*/g, ', ');

  // 3. Personal dictionary enforcement (case-insensitive match -> exact spelling)
  // Run BEFORE snippet expansion so expanded emails/URLs (e.g. tipu@example.com) are not altered
  const sortedDict = [...options.dictionary]
    .map((w) => w.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const term of sortedDict) {
    const regex = new RegExp(`(?<![@/\\w.-])\\b${escapeRegExp(term)}\\b(?![@/\\w.-])`, 'gi');
    if (regex.test(working)) {
      working = working.replace(regex, () => {
        if (!appliedDictionary.includes(term)) {
          appliedDictionary.push(term);
        }
        return term;
      });
    }
  }

  // 4. Snippet expansion (longer triggers matched first)
  const sortedSnippets = [...options.snippets].sort(
    (a, b) => b.trigger.length - a.trigger.length
  );
  for (const snippet of sortedSnippets) {
    const triggerClean = snippet.trigger.trim();
    if (!triggerClean) continue;
    const regex = new RegExp(`\\b${escapeRegExp(triggerClean)}\\b`, 'gi');
    if (regex.test(working)) {
      appliedSnippets.push(triggerClean);
      working = working.replace(regex, snippet.expansion);
    }
  }

  // 5. Optional emoji commands
  if (options.emojiCommands) {
    for (const [phrase, emoji] of Object.entries(EMOJI_MAP)) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
      working = working.replace(regex, emoji);
    }
  }

  // 6. Clean up double spaces while preserving newlines
  working = working
    .split('\n')
    .map((line) =>
      line
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.;?!।])/g, '$1')
        .trim()
    )
    .join('\n')
    .trim();

  // 7. Auto-capitalize first letter of English/Banglish sentences (unless code tone)
  if (options.tone !== 'code' && working.length > 0) {
    working = working.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, char) => {
      return `${prefix}${char.toUpperCase()}`;
    });
  }

  // 8. Check sensitive warning
  const hasSensitiveWarning = SENSITIVE_KEYWORDS.some((rx) => rx.test(working));

  return {
    text: working,
    command: detectedCommand,
    appliedSnippets,
    appliedDictionary,
    removedFillers,
    hasSensitiveWarning,
  };
}

/**
 * Inserts transcribed text or executes a voice command at the cursor position
 * inside any target editor buffer.
 */
export function insertTextAtCursor(
  existingContent: string,
  selectionStart: number,
  selectionEnd: number,
  newText: string,
  command: VoiceCommandType = null
): { content: string; newCursorPos: number } {
  const safeStart = Math.max(0, Math.min(selectionStart, existingContent.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, existingContent.length));

  if (command === 'delete') {
    if (safeStart !== safeEnd) {
      // Delete selected text
      const updated = existingContent.slice(0, safeStart) + existingContent.slice(safeEnd);
      return { content: updated, newCursorPos: safeStart };
    }
    // Delete the last sentence before the cursor (or end of text)
    const targetPos = safeStart > 0 ? safeStart : existingContent.length;
    const before = existingContent.slice(0, targetPos).trimEnd();
    const after = existingContent.slice(targetPos);
    const lastSentenceBreak = Math.max(
      before.lastIndexOf('. '),
      before.lastIndexOf('! '),
      before.lastIndexOf('? '),
      before.lastIndexOf('। '),
      before.lastIndexOf('\n')
    );
    if (lastSentenceBreak === -1) {
      return { content: after.trimStart(), newCursorPos: 0 };
    }
    const keptBefore = before.slice(0, lastSentenceBreak + 1);
    const updated = keptBefore + (after ? ' ' + after.trimStart() : '');
    return { content: updated, newCursorPos: keptBefore.length };
  }

  if (command === 'newline') {
    const updated = existingContent.slice(0, safeStart) + '\n' + existingContent.slice(safeEnd);
    return { content: updated, newCursorPos: safeStart + 1 };
  }

  if (command === 'paragraph') {
    const updated = existingContent.slice(0, safeStart) + '\n\n' + existingContent.slice(safeEnd);
    return { content: updated, newCursorPos: safeStart + 2 };
  }

  if (!newText) {
    return { content: existingContent, newCursorPos: safeStart };
  }

  const before = existingContent.slice(0, safeStart);
  const after = existingContent.slice(safeEnd);
  const needsLeadingSpace =
    before.length > 0 && !/[\s\n([{"']$/.test(before) && !/^[\s\n.,!?;:।)]/.test(newText);
  const needsTrailingSpace =
    after.length > 0 && !/^[\s\n.,!?;:।)\]}"']/.test(after) && !/[\s\n]$/.test(newText);

  const inserted = `${needsLeadingSpace ? ' ' : ''}${newText}${needsTrailingSpace ? ' ' : ''}`;
  const updated = before + inserted + after;
  const newCursorPos = before.length + inserted.length;

  return { content: updated, newCursorPos };
}

/**
 * Detects whether text is primarily Bangla, English, Banglish, or Mixed.
 */
export function detectLanguageFromText(text: string): DetectedLanguage {
  const hasBanglaScript = /[\u0980-\u09FF]/.test(text);
  const hasLatinScript = /[a-zA-Z]/.test(text);
  const banglishMarkers =
    /\b(ami|tumi|apni|kemon|achen|korbo|kotha|bolbo|lagbe|vala|bhalo|kortesi|korchi|hobe|ekta|jonno|theke|sathe|bhai|accha)\b/i;

  if (hasBanglaScript && hasLatinScript) {
    return 'mixed';
  }
  if (hasBanglaScript) {
    return 'bn';
  }
  if (banglishMarkers.test(text)) {
    return 'banglish';
  }
  return 'en';
}
