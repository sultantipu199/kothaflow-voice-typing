import React from 'react';
import { Mic, Square, Sparkles, Check, X, Move, ChevronRight, Zap } from 'lucide-react';
import { LanguageHint, OverlayStatus, ToneOption } from '../types/voice';

interface AutoFocusFloatingWidgetProps {
  visible: boolean;
  activeTargetName: string;
  status: OverlayStatus;
  recordingSeconds: number;
  liveTranscript: string;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onDismiss: () => void;
  onApplySampleText: (text: string) => void;
  tone: ToneOption;
  languageHint: LanguageHint;
  hotkey: string;
}

export const AutoFocusFloatingWidget: React.FC<AutoFocusFloatingWidgetProps> = ({
  visible,
  activeTargetName,
  status,
  recordingSeconds,
  liveTranscript,
  onStartVoice,
  onStopVoice,
  onDismiss,
  onApplySampleText,
  tone,
  languageHint,
  hotkey,
}) => {
  if (!visible) return null;

  const isRecording = status === 'recording';
  const isProcessing = status === 'processing';
  const isDone = status === 'done';

  return (
    <aside
      aria-label="KothaFlow Instant Auto-Typing Widget"
      className="fixed bottom-20 right-4 sm:right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="w-[320px] sm:w-[360px] rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-blue-500/30 shadow-2xl overflow-hidden">
        {/* Widget Top Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isRecording ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </>
              ) : (
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              )}
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-100 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              KothaFlow Auto-Popup
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {activeTargetName}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss auto-popup widget"
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Widget Action Body */}
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">
                {isRecording
                  ? `রেকর্ড হচ্ছে (${recordingSeconds.toFixed(1)}s)...`
                  : isProcessing
                    ? 'ক্লিনআপ ও কার্সার ইনসার্ট হচ্ছে...'
                    : isDone
                      ? 'কার্সারে টাইপ হয়েছে!'
                      : 'কথা বলুন, লেখা স্বয়ংক্রিয়ভাবে টাইপ হবে'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {languageHint.toUpperCase()} · {tone} · শর্টকাট: <code className="text-blue-300 font-mono">Space</code> বা <code className="text-blue-300 font-mono">{hotkey}</code>
              </div>
            </div>

            {/* Instant Click/Hold Mic Trigger */}
            <button
              type="button"
              onClick={isRecording ? onStopVoice : onStartVoice}
              aria-label={isRecording ? 'Stop voice typing' : 'Start instant voice typing'}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer shadow-lg ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white scale-105'
                  : isProcessing
                    ? 'bg-amber-600 text-white animate-pulse'
                    : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
              }`}
            >
              {isRecording ? (
                <Square className="w-5 h-5 fill-current" />
              ) : isDone ? (
                <Check className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Live transcript preview stream */}
          {liveTranscript && (
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 max-h-16 overflow-y-auto italic">
              &ldquo;{liveTranscript}&rdquo;
            </div>
          )}

          {/* Quick Voice Triggers for instant 1-click typing */}
          <div className="pt-1 border-t border-slate-800/80">
            <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
              <span>১-ক্লিকে কার্সারে টাইপ করুন (Instant Inserts):</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onApplySampleText('আজকের মিটিংয়ের আপডেট রিপোর্ট পাঠিয়ে দেওয়া হয়েছে।')
                }
                className="text-left px-2 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors truncate cursor-pointer"
              >
                বাংলা মিটিং আপডেট
              </button>
              <button
                type="button"
                onClick={() =>
                  onApplySampleText('Please review and let me know at my email.')
                }
                className="text-left px-2 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors truncate cursor-pointer"
              >
                English + Snippet
              </button>
            </div>
          </div>
        </div>

        {/* Footer info strip */}
        <div className="px-3.5 py-1.5 bg-slate-950 text-[10px] text-slate-500 flex items-center justify-between">
          <span>যেকোনো ইনপুট ফিল্ডে ফোকাস করলেই অটো-পপআপ আসে</span>
          <span className="text-emerald-400">Mobile + Desktop Ready</span>
        </div>
      </div>
    </aside>
  );
};
