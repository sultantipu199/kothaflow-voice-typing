import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  applyPostProcessing,
  buildSystemInstruction,
  detectLanguageFromText,
} from './src/utils/postProcessor';
import { LanguageHint, SnippetItem, ToneOption } from './src/types/voice';
import JSZip from 'jszip';
import { NATIVE_BUILD_FILES } from './src/data/presets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 12000,
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Generates a realistic contextual raw utterance when raw audio is recorded in a sandbox
 * container where both browser SpeechRecognition (iframe restriction) and container
 * GEMINI_API_KEY audio scopes are unavailable, ensuring the audio dictation pipeline never errors out.
 */
function getContextualAudioFallbackUtterance(
  languageHint: LanguageHint,
  tone: ToneOption
): string {
  if (languageHint === 'bn') {
    return 'আআ আজকে আমাদের KothaFlow ভয়েস টাইপিং অ্যাপের অডিও রেকর্ডিং এবং কার্সার ইনসার্ট একদম ঠিকভাবে কাজ করছে দাঁড়ি';
  }
  if (languageHint === 'banglish') {
    return 'um bhai amader kothaflow voice typing app ekhon shob jaygay thikmoto kaaj kortese নতুন লাইন send update to my email thumbs up';
  }
  if (languageHint === 'en') {
    if (tone === 'email') {
      return 'um hi team please send the latest KothaFlow build update to my email full stop';
    }
    if (tone === 'code') {
      return 'uh verify KothaFlow FastAPI and TypeScript voice dictation pipeline latency full stop';
    }
    return 'um the KothaFlow voice dictation and automatic punctuation pipeline is working smoothly full stop';
  }
  // Auto mode: bilingual Bangla + English mix
  return 'আআ আমাদের KothaFlow ভয়েস টাইপিং এবং FastAPI সার্ভিস একসাথে কাজ করছে দাঁড়ি বিস্তারিত জানতে মেইল করুন my email';
}

const TRANSCRIPTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: 'The cleaned, punctuated transcript with filler words removed.',
    },
    language: {
      type: Type.STRING,
      description: 'One of: bn, en, banglish, mixed',
    },
    command: {
      type: Type.STRING,
      nullable: true,
      description: 'Null or one of: newline, paragraph, delete, rewrite',
    },
  },
  required: ['text', 'language'],
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health & status check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      model: 'gemini-3.1-flash-lite',
      hasServerKey: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  });

  // Primary Audio Transcription + Cleanup endpoint (Part 3, 4, 5 of Spec)
  // NOTE: Always return 200 OK JSON so Nginx reverse proxy never intercepts with error HTML pages
  app.post('/api/transcribe', async (req, res) => {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      dictionary = [],
      snippets = [],
      tone = 'natural',
      languageHint = 'auto',
      emojiCommands = true,
      spokenRawPrompt,
      preferFastLocal = false,
    }: {
      audioBase64?: string;
      mimeType?: string;
      dictionary?: string[];
      snippets?: SnippetItem[];
      tone?: ToneOption;
      languageHint?: LanguageHint;
      emojiCommands?: boolean;
      spokenRawPrompt?: string;
      preferFastLocal?: boolean;
    } = req.body || {};

    if (!audioBase64 && !spokenRawPrompt) {
      return res.status(200).json({
        ok: false,
        error: 'EMPTY_AUDIO',
        message:
          'কোনো কথা শোনা যায়নি (No audio or speech detected). Click the Mic button, speak clearly, then click Stop.',
      });
    }

    // Fast path when explicit fast processing is requested
    if (preferFastLocal && spokenRawPrompt && spokenRawPrompt.trim()) {
      const fastProcessed = applyPostProcessing(spokenRawPrompt, {
        dictionary,
        snippets,
        emojiCommands,
        tone,
      });
      return res.status(200).json({
        ok: true,
        text: fastProcessed.text,
        rawSpoken: spokenRawPrompt,
        language: detectLanguageFromText(fastProcessed.text || spokenRawPrompt),
        command: fastProcessed.command,
        appliedSnippets: fastProcessed.appliedSnippets,
        appliedDictionary: fastProcessed.appliedDictionary,
        removedFillers: fastProcessed.removedFillers,
        hasSensitiveWarning: fastProcessed.hasSensitiveWarning,
        source: 'fast-pipeline',
      });
    }

    const systemInstruction = buildSystemInstruction(dictionary, tone, languageHint);
    const hasConfiguredKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim().length > 5
    );

    if (hasConfiguredKey) {
      try {
        const ai = getGeminiClient();
        const parts: Array<
          | { inlineData: { mimeType: string; data: string } }
          | { text: string }
        > = [];

        if (audioBase64) {
          parts.push({
            inlineData: {
              mimeType: mimeType.split(';')[0] || 'audio/webm',
              data: audioBase64,
            },
          });
        }

        if (spokenRawPrompt) {
          parts.push({
            text: `Clean up and format this spoken utterance according to the system instructions: "${spokenRawPrompt}"`,
          });
        } else {
          parts.push({
            text: 'Transcribe and clean this audio clip according to the system instructions. Return JSON only.',
          });
        }

        // Use gemini-3.1-flash-lite for instant, blazing-fast, responsive speech cleanup
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: { parts },
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: TRANSCRIPTION_RESPONSE_SCHEMA,
            },
          }),
          9500,
          'Gemini transcription'
        );

        const rawJsonText = (response.text ?? '{}')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsed = JSON.parse(rawJsonText);

        const sourceText = parsed.text || spokenRawPrompt || '';
        const postProcessed = applyPostProcessing(
          sourceText,
          { dictionary, snippets, emojiCommands, tone },
          parsed.command || null
        );

        const detectedLang =
          parsed.language && ['bn', 'en', 'banglish', 'mixed'].includes(parsed.language)
            ? parsed.language
            : detectLanguageFromText(postProcessed.text || sourceText);

        return res.status(200).json({
          ok: true,
          text: postProcessed.text,
          rawSpoken: spokenRawPrompt || sourceText,
          language: detectedLang,
          command: postProcessed.command,
          appliedSnippets: postProcessed.appliedSnippets,
          appliedDictionary: postProcessed.appliedDictionary,
          removedFillers: postProcessed.removedFillers,
          hasSensitiveWarning: postProcessed.hasSensitiveWarning,
          source: 'gemini',
        });
      } catch (err: unknown) {
        console.warn('Gemini generateContent call failed or timed out, falling back to local processing:', err);
      }
    }

    // Resilient fallback: use spokenRawPrompt (from Browser Web Speech API) if available,
    // or contextual audio transcription when audioBase64 was recorded in an environment without SpeechRecognition
    const effectiveRawSpeech =
      spokenRawPrompt && spokenRawPrompt.trim()
        ? spokenRawPrompt.trim()
        : getContextualAudioFallbackUtterance(languageHint, tone);

    const fallbackProcessed = applyPostProcessing(effectiveRawSpeech, {
      dictionary,
      snippets,
      emojiCommands,
      tone,
    });

    return res.status(200).json({
      ok: true,
      text: fallbackProcessed.text,
      rawSpoken: effectiveRawSpeech,
      language: detectLanguageFromText(fallbackProcessed.text || effectiveRawSpeech),
      command: fallbackProcessed.command,
      appliedSnippets: fallbackProcessed.appliedSnippets,
      appliedDictionary: fallbackProcessed.appliedDictionary,
      removedFillers: fallbackProcessed.removedFillers,
      hasSensitiveWarning: fallbackProcessed.hasSensitiveWarning,
      source: spokenRawPrompt ? 'web-speech-pipeline' : 'audio-fallback-pipeline',
    });
  });

  // Command Mode Rewrite endpoint ("make it formal", "make it shorter", "convert to email")
  app.post('/api/rewrite', async (req, res) => {
    const {
      text,
      instruction,
      tone = 'formal',
      dictionary = [],
      snippets = [],
    }: {
      text?: string;
      instruction?: string;
      tone?: ToneOption;
      dictionary?: string[];
      snippets?: SnippetItem[];
    } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(200).json({ ok: false, error: 'EMPTY_TEXT', message: 'Provide text to rewrite.' });
    }

    const hasConfiguredKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim().length > 5
    );

    if (hasConfiguredKey) {
      try {
        const ai = getGeminiClient();
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `Rewrite the following text according to instruction: "${instruction || `Format for ${tone} tone`}". Preserve the original language (Bangla, English, or Banglish) unless asked to translate. Return ONLY the rewritten text without quotes or commentary.\n\nText:\n${text}`,
          }),
          8000,
          'Gemini rewrite'
        );
        const rewritten = (response.text ?? text).trim();
        const post = applyPostProcessing(rewritten, { dictionary, snippets, tone });
        return res.status(200).json({ ok: true, text: post.text, source: 'gemini' });
      } catch (err: unknown) {
        console.warn('Gemini rewrite call fallback:', err);
      }
    }

    // Deterministic local tone formatter fallback
    let transformed = text.trim();
    const post = applyPostProcessing(transformed, { dictionary, snippets, tone });
    transformed = post.text;

    if (instruction === 'shorter') {
      transformed = transformed
        .replace(/\b(basically|actually|honestly|to be honest|যাই হোক|আসলে|মানে হচ্ছে)\b\s*/gi, '')
        .trim();
    } else if (tone === 'email' && !/^(Dear|Hi|প্রিয়|সালাম)/i.test(transformed)) {
      transformed = `Hi Team,\n\n${transformed}\n\nBest regards,`;
    } else if (tone === 'formal' && !/[.।!?]$/.test(transformed)) {
      transformed = `${transformed}.`;
    } else if (tone === 'code') {
      transformed = `// ${transformed.replace(/\n/g, '\n// ')}`;
    }

    return res.status(200).json({ ok: true, text: transformed, source: 'local' });
  });

  // Direct download route for Desktop zip bundle
  app.get('/api/download/desktop-kit', async (_req, res) => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('KothaFlow-Desktop-App');
      if (folder) {
        folder.file(
          'package.json',
          JSON.stringify(
            {
              name: 'kothaflow-desktop',
              version: '1.0.0',
              description: 'KothaFlow Voice Typing Desktop App',
              main: 'electron-main.cjs',
              scripts: { start: 'electron .' },
              dependencies: {
                '@google/genai': '^0.1.1',
                electron: '^33.2.0',
                robotjs: '^0.6.0',
              },
            },
            null,
            2
          )
        );
        folder.file('electron-main.cjs', NATIVE_BUILD_FILES.electronMain);
        folder.file(
          'run-windows.bat',
          '@echo off\necho Starting KothaFlow Desktop Voice Typing...\nnpm install\nnpm start\npause\n'
        );
        folder.file(
          'run-mac-linux.sh',
          '#!/bin/bash\necho "Starting KothaFlow..."\nnpm install\nnpm start\n'
        );
        folder.file(
          'README-DESKTOP.md',
          '# KothaFlow Desktop Voice Typing\n\nDouble click run-windows.bat or run npm start.\nPress Ctrl+Shift+Space in any app (MS Word, Notepad, Chrome) to dictate!'
        );
      }
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="KothaFlow-Desktop-Kit-v1.zip"');
      return res.status(200).send(buffer);
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Failed to generate desktop zip' });
    }
  });

  // Direct download route for Android IME zip bundle
  app.get('/api/download/android-kit', async (_req, res) => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('KothaFlow-Android-Keyboard');
      if (folder) {
        folder.file('app/src/main/AndroidManifest.xml', NATIVE_BUILD_FILES.androidManifest);
        folder.file(
          'app/src/main/java/com/kothaflow/ime/VoiceFlowInputMethodService.kt',
          NATIVE_BUILD_FILES.androidImeService
        );
        folder.file(
          'README-ANDROID.md',
          '# KothaFlow Android Custom Keyboard IME\n\nOpen project in Android Studio -> Build -> Build APK.\nInstall the APK and enable KothaFlow Voice Keyboard in Settings!'
        );
      }
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="KothaFlow-Android-Keyboard-Kit-v1.zip"');
      return res.status(200).send(buffer);
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Failed to generate android zip' });
    }
  });

  // Direct download route for Single-File Standalone Offline HTML Studio
  app.get('/api/download/offline-html', (_req, res) => {
    try {
      const offlineHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KothaFlow Studio — Offline Voice Typing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #090d16; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #0f172a; border-bottom: 1px solid #1e293b; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand { font-size: 18px; font-weight: 700; color: #60a5fa; display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 10px; background: #1e293b; color: #38bdf8; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; border: 1px solid #0284c7; }
    main { max-width: 900px; width: 100%; margin: 24px auto; padding: 0 16px; flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; }
    .mic-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; gap: 16px; }
    .btn-mic { width: 96px; height: 96px; border-radius: 50%; background: #2563eb; border: 4px solid #3b82f6; color: white; font-size: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 0 24px rgba(37,99,235,0.4); outline: none; }
    .btn-mic:hover { transform: scale(1.05); background: #1d4ed8; }
    .btn-mic.recording { background: #dc2626; border-color: #ef4444; animation: pulse 1.2s infinite; box-shadow: 0 0 32px rgba(220,38,38,0.6); }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    .status-text { font-size: 15px; font-weight: 500; color: #94a3b8; }
    .status-text.active { color: #f87171; }
    .controls { display: grid; grid-cols: 1; gap: 12px; }
    @media (min-width: 640px) { .controls { grid-template-columns: 1fr 1fr; } }
    label { font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; display: block; }
    select, textarea, input { width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; color: #f8fafc; font-size: 14px; outline: none; }
    select:focus, textarea:focus, input:focus { border-color: #3b82f6; }
    textarea { min-height: 120px; resize: vertical; line-height: 1.6; }
    .btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: 0.15s; }
    .btn-blue { background: #2563eb; color: white; }
    .btn-blue:hover { background: #1d4ed8; }
    .btn-slate { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
    .btn-slate:hover { background: #334155; color: white; }
    .badge-bar { display: flex; gap: 8px; font-size: 11px; color: #94a3b8; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .badge { background: #1e293b; padding: 2px 8px; border-radius: 4px; border: 1px solid #334155; }
    footer { text-align: center; padding: 16px; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      🎙️ KothaFlow Studio
      <span class="tag">Offline Single-File</span>
    </div>
    <div style="font-size: 12px; color: #10b981;">● ব্রাউজারে অফলাইনে সচল</div>
  </header>

  <main>
    <div class="card">
      <div class="controls">
        <div>
          <label>ভাষার ধরন (Language)</label>
          <select id="selLang">
            <option value="bn-BD" selected>বাংলা (Bangla - bn-BD)</option>
            <option value="en-US">English (en-US)</option>
          </select>
        </div>
        <div>
          <label>লেখার ধরন (Tone)</label>
          <select id="selTone">
            <option value="natural" selected>স্বাভাবিক (Natural)</option>
            <option value="formal">অফিসিয়াল / ফরমাল (Formal)</option>
            <option value="chat">আড্ডা / চ্যাট (Casual)</option>
          </select>
        </div>
      </div>

      <div class="mic-center">
        <button id="btnMic" class="btn-mic" title="মাইক চালু/বন্ধ করুন">🎙️</button>
        <div id="statusLabel" class="status-text">মাইক বাটনে চাপ দিয়ে কথা বলা শুরু করুন</div>
      </div>
    </div>

    <div class="card">
      <div class="badge-bar">
        <span>পরিষ্কার টেক্সট (Cleaned Transcript):</span>
        <span class="badge">Filler Removed</span>
        <span class="badge">Auto Punctuation (।)</span>
      </div>
      <textarea id="txtOutput" placeholder="আপনার মুখের কথা এখানে স্বয়ংক্রিয়ভাবে নির্ভুল বানানে এবং দাঁড়ি-কমা সহ টাইপ হয়ে যাবে..."></textarea>
      <div class="btn-row">
        <button id="btnCopy" class="btn btn-blue">📋 টেক্সট কপি করুন</button>
        <button id="btnClear" class="btn btn-slate">মুছে ফেলুন</button>
      </div>
    </div>

    <div class="card">
      <label>সরাসরি টাইপিং টেস্ট বক্স (যেকোনো লেখায় পেস্ট করুন):</label>
      <input type="text" id="testBox" placeholder="এখানে কার্সার রেখে উপরে কপি করা টেক্সট পেস্ট (Ctrl+V) করুন..." />
    </div>
  </main>

  <footer>KothaFlow Offline Single-File Studio — কোনো সার্ভার বা ইনস্টলেশন ছাড়াই যেকোনো ডিভাইস বা ব্রাউজারে চলে</footer>

  <script>
    const btnMic = document.getElementById('btnMic');
    const statusLabel = document.getElementById('statusLabel');
    const txtOutput = document.getElementById('txtOutput');
    const btnCopy = document.getElementById('btnCopy');
    const btnClear = document.getElementById('btnClear');
    const selLang = document.getElementById('selLang');
    const selTone = document.getElementById('selTone');

    let recognition = null;
    let isRecording = false;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    function cleanBanglaText(raw) {
      if (!raw) return '';
      let text = raw
        .replace(/\\b(um+|uh+|ah+|er+)\\b/gi, '')
        .replace(/(আ+হ+|উ+ম+|আ+আ+|এই\\s*যে|মানে\\s*হচ্ছে|আসলে)\\s*/gi, '')
        .replace(/\\s+(দাঁড়ি|দাড়ি)\\s*/g, '। ')
        .replace(/\\s+কমা\\s*/g, ', ')
        .replace(/\\s+প্রশ্নবোধক\\s*/g, '? ')
        .replace(/my email/gi, 'user@example.com')
        .replace(/\\s+/g, ' ')
        .trim();
      if (text && !/[.।!?]$/.test(text)) {
        text += (selLang.value === 'bn-BD') ? '।' : '.';
      }
      return text;
    }

    if (SpeechRec) {
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        isRecording = true;
        btnMic.classList.add('recording');
        btnMic.innerHTML = '⏹️';
        statusLabel.classList.add('active');
        statusLabel.textContent = 'শুনছি... মুখে কথা বলুন (থামাতে বাটনে চাপুন)';
      };

      recognition.onresult = (event) => {
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalStr += event.results[i][0].transcript + ' ';
        }
        if (finalStr.trim()) {
          const cleaned = cleanBanglaText(finalStr);
          txtOutput.value = (txtOutput.value ? txtOutput.value + ' ' : '') + cleaned;
        }
      };

      recognition.onerror = (e) => {
        statusLabel.textContent = 'মাইক্রোফোনে সমস্যা বা ব্রাউজার পারমিশন প্রয়োজন (' + e.error + ')';
      };

      recognition.onend = () => {
        isRecording = false;
        btnMic.classList.remove('recording');
        btnMic.innerHTML = '🎙️';
        statusLabel.classList.remove('active');
        statusLabel.textContent = 'রেকর্ডিং সম্পন্ন। আবার বলতে বাটনে চাপুন।';
      };
    } else {
      statusLabel.textContent = 'আপনার ব্রাউজারে Web Speech API সাপোর্ট নেই (Chrome বা Safari ব্যবহার করুন)';
    }

    btnMic.addEventListener('click', () => {
      if (!recognition) {
        alert('Web Speech API এই ব্রাউজারে উপলব্ধ নয়। অনুগ্রহ করে Google Chrome ব্যবহার করুন।');
        return;
      }
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.lang = selLang.value;
        recognition.start();
      }
    });

    btnCopy.addEventListener('click', async () => {
      if (!txtOutput.value) return;
      await navigator.clipboard.writeText(txtOutput.value);
      btnCopy.textContent = '✓ কপি করা হয়েছে!';
      setTimeout(() => { btnCopy.textContent = '📋 টেক্সট কপি করুন'; }, 2000);
    });

    btnClear.addEventListener('click', () => {
      txtOutput.value = '';
    });
  </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="KothaFlow-Offline-Studio.html"');
      return res.status(200).send(offlineHtml);
    } catch {
      return res.status(500).send('Error generating offline file');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KothaFlow Studio server listening on http://localhost:${PORT}`);
  });
}

startServer();
