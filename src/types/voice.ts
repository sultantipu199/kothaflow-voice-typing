export type ToneOption = 'natural' | 'formal' | 'casual' | 'email' | 'code';

export type LanguageHint = 'auto' | 'bn' | 'en' | 'banglish';

export type DetectedLanguage = 'bn' | 'en' | 'banglish' | 'mixed';

export type VoiceCommandType = null | 'newline' | 'paragraph' | 'delete' | 'rewrite';

export type RecordingMode = 'hold' | 'toggle';

export type OverlayStatus = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export type TargetAppId = 'whatsapp' | 'gmail' | 'vscode' | 'notion';

export interface SnippetItem {
  id: string;
  trigger: string;
  expansion: string;
  description?: string;
}

export interface HistoryItem {
  id: string;
  rawText: string;
  cleanedText: string;
  language: DetectedLanguage;
  tone: ToneOption;
  command: VoiceCommandType;
  timestamp: string;
  durationSec: number;
  wordCount: number;
  targetApp?: TargetAppId;
  appliedSnippets: string[];
  appliedDictionary: string[];
}

export interface AppSettings {
  hotkey: string;
  recordingMode: RecordingMode;
  languageHint: LanguageHint;
  tone: ToneOption;
  selectedMicId: string;
  autoStartOs: boolean;
  darkMode: boolean;
  wakeWordOptIn: boolean;
  liveStreamingPreview: boolean;
  emojiCommands: boolean;
  sensitiveWarningEnabled: boolean;
  floatingWidgetEnabled: boolean;
  autoPopupOnFocus: boolean;
}

export interface TranscriptionApiResponse {
  text: string;
  language: DetectedLanguage;
  command: VoiceCommandType;
  removedFillers?: string[];
  source?: 'gemini' | 'sample-fallback';
}

export interface SampleVoiceClip {
  id: string;
  title: string;
  subtitle: string;
  languageLabel: string;
  spokenRaw: string;
  expectedCleaned: string;
  language: DetectedLanguage;
  command: VoiceCommandType;
  recommendedTone: ToneOption;
  durationSec: number;
}
