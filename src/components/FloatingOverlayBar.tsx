import React from 'react';
import { Check, Loader2, Mic, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { LanguageHint, OverlayStatus, RecordingMode, ToneOption } from '../types/voice';

interface FloatingOverlayBarProps {
  status: OverlayStatus;
  recordingSeconds: number;
  recordingMode: RecordingMode;
  hotkey: string;
  tone: ToneOption;
  languageHint: LanguageHint;
  previewDevice: 'desktop-overlay' | 'android-ime';
  onSwitchPreviewDevice: (device: 'desktop-overlay' | 'android-ime') => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  lastInsertedPreview: string;
  errorMessage: string | null;
}

export const FloatingOverlayBar: React.FC<FloatingOverlayBarProps> = ({
  status,
  recordingSeconds,
  recordingMode,
  hotkey,
  tone,
  languageHint,
  previewDevice,
  onSwitchPreviewDevice,
  onStartRecording,
  onStopRecording,
  lastInsertedPreview,
  errorMessage,
}) => {
  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';
  const isDone = status === 'done';
  const isError = status === 'error';

  const handleMicAction = () => {
    if (isRecording) {
      onStopRecording();
    } else if (!isProcessing) {
      onStartRecording();
    }
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Mode switcher between Desktop Floating Pill Overlay & Android IME Keyboard Preview */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Live OS Surface Preview:
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => onSwitchPreviewDevice('desktop-overlay')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                previewDevice === 'desktop-overlay'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop Overlay Bar
            </button>
            <button
              type="button"
              onClick={() => onSwitchPreviewDevice('android-ime')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                previewDevice === 'android-ime'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Android IME Keyboard
            </button>
          </div>
        </div>

        {/* Center: The simulated Desktop Pill Overlay or Android IME Keyboard */}
        {previewDevice === 'desktop-overlay' ? (
          <div
            data-testid="desktop-floating-overlay"
            className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-700/80 shadow-md min-w-[320px] justify-between"
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleMicAction}
                aria-label={isRecording ? 'Stop overlay recording' : 'Start overlay recording'}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  isRecording
                    ? 'bg-red-600 text-white'
                    : isProcessing
                      ? 'bg-amber-600 text-white'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-300" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="text-xs">
                {isRecording && (
                  <span className="font-medium text-red-300 tabular-nums">
                    Listening ({recordingSeconds.toFixed(1)}s) · Speak Bangla / EN / Banglish
                  </span>
                )}
                {isProcessing && (
                  <span className="font-medium text-amber-300">
                    Gemini cleanup + dictionary matching...
                  </span>
                )}
                {isDone && (
                  <span className="font-medium text-emerald-300">
                    Inserted at cursor · Copied to clipboard
                  </span>
                )}
                {isError && (
                  <span className="font-medium text-red-300 truncate max-w-[240px] block">
                    {errorMessage || 'Internet nei / Transcription error'}
                  </span>
                )}
                {status === 'idle' && (
                  <span className="text-slate-300">
                    {recordingMode === 'hold' ? 'Hold' : 'Press'}{' '}
                    <code className="font-mono text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded">
                      Space
                    </code>{' '}
                    or <code className="font-mono text-slate-300">{hotkey}</code> to dictate
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
              {languageHint.toUpperCase()} · {tone}
            </div>
          </div>
        ) : (
          <div
            data-testid="android-ime-preview"
            className="w-full max-w-md rounded-xl bg-slate-900 text-white p-2.5 border border-slate-700 shadow-md"
          >
            <div className="flex items-center justify-between text-xs px-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-white">KothaFlow IME</span>
                <span aria-hidden="true">·</span>
                <span>বাংলা / EN / Banglish</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">Tone: {tone}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {isRecording
                  ? `REC ${recordingSeconds.toFixed(1)}s`
                  : isProcessing
                    ? 'COMMITTING...'
                    : isDone
                      ? 'commitText() OK'
                      : 'READY'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 px-1">
              <div className="text-xs text-slate-300 truncate flex-1">
                {isError ? (
                  <span className="text-red-300">
                    সমস্যা হয়েছে: {errorMessage || 'ইন্টারনেট নেই (No Internet)'}
                  </span>
                ) : lastInsertedPreview ? (
                  <span className="text-slate-200">
                    InputConnection: &ldquo;{lastInsertedPreview.slice(0, 48)}
                    {lastInsertedPreview.length > 48 ? '...' : ''}&rdquo;
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Tap bottom-right Mic in any Android app (WhatsApp, Messenger, Chrome)
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleMicAction}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isRecording
                    ? 'bg-red-600 text-white'
                    : isProcessing
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isRecording ? 'Release to Insert' : 'IME Mic Button'}
              </button>
            </div>
          </div>
        )}

        {/* Right: Privacy & Ephemeral Audio guarantee (Part 12 Spec) */}
        <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Zero audio retention · Ephemeral buffer cleared on stop
        </div>
      </div>
    </div>
  );
};
