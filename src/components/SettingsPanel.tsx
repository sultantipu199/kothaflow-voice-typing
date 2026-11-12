import React from 'react';
import {
  Keyboard,
  Mic,
  Globe,
  Sliders,
  WifiOff,
  MicOff,
  VolumeX,
  AlertTriangle,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings, LanguageHint, RecordingMode, ToneOption } from '../types/voice';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  availableMics: MediaDeviceInfo[];
  onSimulateError: (
    type: 'offline' | 'mic-denied' | 'empty-audio' | 'quota' | 'clear'
  ) => void;
  activeSimulatedError: string | null;
}

const HOTKEY_PRESETS = [
  'Ctrl+Shift+Space',
  'Alt+Space',
  'Cmd+Shift+D',
  'Ctrl+Alt+V',
  'F8',
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  availableMics,
  onSimulateError,
  activeSimulatedError,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General & Hotkey Settings */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              General & Push-to-Talk Controls
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="recording-mode-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Trigger Mode (Must-Have MVP)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['hold', 'toggle'] as RecordingMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateSettings({ recordingMode: mode })}
                    className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      settings.recordingMode === mode
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold">
                      {mode === 'hold' ? 'Push-to-Talk (Hold)' : 'Toggle Mode (Tap)'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {mode === 'hold'
                        ? 'Hold button or Spacebar to speak, release to transcribe'
                        : 'Press once to start recording, press again to finish'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="global-hotkey-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Desktop Global Shortcut (Electron / Tauri)
              </label>
              <select
                id="global-hotkey-select"
                value={settings.hotkey}
                onChange={(e) => onUpdateSettings({ hotkey: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {HOTKEY_PRESETS.map((hk) => (
                  <option key={hk} value={hk}>
                    {hk}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                In the web studio, hold <code className="font-mono">Space</code> anywhere outside text inputs to record immediately.
              </p>
            </div>

            {/* Theme & OS Toggles */}
            <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Appearance Theme
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Switch between crisp light studio and low-glare dark slate
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {settings.darkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-600" />
                      Dark Mode
                    </>
                  )}
                </button>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Auto-start with OS on boot
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Keep tray icon and global shortcut ready at login
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoStartOs}
                  onChange={(e) => onUpdateSettings({ autoStartOs: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Emoji voice commands (&ldquo;thumbs up&rdquo; → 👍)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Convert spoken emoji names during post-processing
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emojiCommands}
                  onChange={(e) => onUpdateSettings({ emojiCommands: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Auto-Popup Floating Widget on Input Focus
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    যেকোনো লেখার ফিল্ডে কার্সার গেলেই স্বয়ংক্রিয় পপ-আপ আসবে (Mobile + Desktop)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoPopupOnFocus}
                  onChange={(e) =>
                    onUpdateSettings({ autoPopupOnFocus: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Sensitive speech warning (Part 12 Privacy)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alert when passwords, OTPs, or bank numbers are detected
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sensitiveWarningEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ sensitiveWarningEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Language, Tone & Microphone Input Settings */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Language, Tone & Audio Input
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="language-hint-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Primary Language Hint
              </label>
              <select
                id="language-hint-select"
                value={settings.languageHint}
                onChange={(e) =>
                  onUpdateSettings({ languageHint: e.target.value as LanguageHint })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="auto">Auto-Detect (Bangla + English + Banglish Mixed)</option>
                <option value="bn">বাংলা (Bangla Script Priority)</option>
                <option value="en">English (Standard Latin Script)</option>
                <option value="banglish">Banglish (Bangla words in English alphabet)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="default-tone-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Formatting Tone Profile
              </label>
              <select
                id="default-tone-select"
                value={settings.tone}
                onChange={(e) => onUpdateSettings({ tone: e.target.value as ToneOption })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="natural">Natural — Clean punctuation, preserves voice</option>
                <option value="formal">Formal — Professional prose for reports & docs</option>
                <option value="casual">Casual — Friendly for WhatsApp & Messenger</option>
                <option value="email">Email — Structured paragraphs & polite sign-offs</option>
                <option value="code">Code — Preserves technical identifiers & casing</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="mic-device-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-slate-500" />
                  Microphone Hardware Input
                </span>
              </label>
              <select
                id="mic-device-select"
                value={settings.selectedMicId}
                onChange={(e) => onUpdateSettings({ selectedMicId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="default">System Default Microphone</option>
                {availableMics.map((mic, idx) => (
                  <option key={mic.deviceId || idx} value={mic.deviceId}>
                    {mic.label || `Microphone ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Gemini Audio Engine Configured:
                </span>{' '}
                Audio buffers are routed through the server-side{' '}
                <code className="font-mono">gemini-3.8-flash</code> multimodal endpoint with structured JSON schema enforcement.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Part 6 & Part 11 Requirement: Edge-Case & Offline Error Simulator */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Error & Resilience Diagnostic Tester (Part 6 & Part 11 Spec)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify graceful bilingual (Bangla + English) error handling for offline state, mic permission denial, silent audio, and rate limits.
            </p>
          </div>
          {activeSimulatedError && (
            <button
              type="button"
              onClick={() => onSimulateError('clear')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold"
            >
              Clear Simulated Error
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onSimulateError('offline')}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <WifiOff className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Test Offline Error
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                &ldquo;ইন্টারনেট নেই (No Internet)&rdquo;
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSimulateError('mic-denied')}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <MicOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Test Mic Permission
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Browser/OS mic access blocked
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSimulateError('empty-audio')}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <VolumeX className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Test Silent Audio
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Empty/unclear speech clip
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSimulateError('quota')}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Test Free-Tier Rate Limit
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                RPM/RPD quota warning
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
