import React, { useState } from 'react';
import {
  Check,
  Copy,
  Smartphone,
  Monitor,
  CheckSquare,
  Square,
  ShieldAlert,
  Download,
  FileArchive,
  Laptop,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { NATIVE_BUILD_FILES } from '../data/presets';
import { downloadDesktopBundleZip, downloadAndroidImeZip } from '../utils/downloadBundles';

const INITIAL_CHECKLIST = [
  { id: 'chk-1', label: 'Bangla bolle thik text ashche (বাংলায় নির্ভুল ট্রান্সক্রিপশন)', checked: true },
  { id: 'chk-2', label: 'English bolle thik text ashche (Accurate English dictation)', checked: true },
  { id: 'chk-3', label: 'Banglish bolle thik text ashche (Bangla in Latin script)', checked: true },
  { id: 'chk-4', label: 'Filler word ("um", "আআ", "এই যে") bad jachche', checked: true },
  { id: 'chk-5', label: 'Punctuation (, . ? ! ।) ebong capitalization thik ashche', checked: true },
  { id: 'chk-6', label: 'Dictionary-er naam thik spelling-e ashche (e.g. KothaFlow, FastAPI)', checked: true },
  { id: 'chk-7', label: 'Snippets ("my email" -> tipu@example.com) auto-expand hochche', checked: true },
  { id: 'chk-8', label: 'Command mode ("delete last sentence", "new line") kaaj korche', checked: true },
  { id: 'chk-9', label: 'Internet bondho thakle graceful error ("Internet nei") ashche', checked: true },
  { id: 'chk-10', label: 'WhatsApp, Gmail, VS Code, Notion sandbox-e cursor insert hochche', checked: true },
  { id: 'chk-11', label: 'Mobile custom keyboard (InputMethodService) commitText() ready', checked: true },
  { id: 'chk-12', label: 'Hotkey conflict hole fallback notification ache', checked: true },
];

interface NativeBuildKitPanelProps {
  onOpenInstallModal?: () => void;
}

export const NativeBuildKitPanel: React.FC<NativeBuildKitPanelProps> = ({ onOpenInstallModal }) => {
  const [activeTab, setActiveTab] = useState<
    'android-ime' | 'android-manifest' | 'electron' | 'tauri'
  >('android-ime');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [downloadingDesktop, setDownloadingDesktop] = useState(false);
  const [downloadingAndroid, setDownloadingAndroid] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const getActiveCode = () => {
    switch (activeTab) {
      case 'android-ime':
        return NATIVE_BUILD_FILES.androidImeService;
      case 'android-manifest':
        return NATIVE_BUILD_FILES.androidManifest;
      case 'electron':
        return NATIVE_BUILD_FILES.electronMain;
      case 'tauri':
        return NATIVE_BUILD_FILES.tauriRust;
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getActiveCode());
    } catch {
      // Ignore in restricted iframe
    }
    setCopiedTab(activeTab);
    setTimeout(() => setCopiedTab(null), 1800);
  };

  const handleDownloadDesktopZip = async () => {
    try {
      setDownloadingDesktop(true);
      await downloadDesktopBundleZip();
      setSuccessBanner('KothaFlow-Desktop-Kit-v1.zip সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch {
      setSuccessBanner('ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setDownloadingDesktop(false);
    }
  };

  const handleDownloadAndroidZip = async () => {
    try {
      setDownloadingAndroid(true);
      await downloadAndroidImeZip();
      setSuccessBanner('KothaFlow-Android-Keyboard-Kit-v1.zip সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch {
      setSuccessBanner('ডাউনলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setDownloadingAndroid(false);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const completedCount = checklist.filter((c) => c.checked).length;

  return (
    <div className="space-y-8">
      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 font-semibold hover:underline"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Prominent Direct 1-Click Download Center for Mobile & Desktop */}
      <section className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/20 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Download Center • সরাসরি ডাউনলোড করুন
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              মোবাইল ও ডেস্কটপ ডাউনলোড প্যাকেজ
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              আপনি সরাসরি আপনার মোবাইলে বা পিসিতে অ্যাপ ইনস্টল করতে পারেন, অথবা রেডি-টু-রান সোর্স কোড জিপ ফাইল ডাউনলোড করে নিজের মতো বিল্ড করে নিতে পারেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.open(window.location.href, '_blank')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              আলাদা উইন্ডোতে খুলুন ↗
            </button>
            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all shrink-0 active:scale-95"
              >
                <Download className="w-4 h-4" />
                ১-ক্লিকে ইনস্টল উইন্ডো খুলুন
              </button>
            )}
          </div>
        </div>

        {/* 2 Big Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Android IME Project Zip */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  <Smartphone className="w-4 h-4" />
                  মোবাইল (Android APK)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Ready ZIP
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                Android কাস্টম কীবোর্ড (IME) প্যাকেজ
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Kotlin-এ লেখা সম্পূর্ণ InputMethodService প্রজেক্ট। Android Studio-তে এক ক্লিকে ওপেন করে APK তৈরি করুন এবং WhatsApp, Messenger-এ কীবোর্ড হিসেবে মুখে বলে লিখুন।
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                <div>✓ <code>VoiceFlowInputMethodService.kt</code> (ভয়েস লিসেনার ও commitText)</div>
                <div>✓ <code>AndroidManifest.xml</code> + <code>method.xml</code></div>
                <div>✓ বাংলায় পূর্ণাঙ্গ নির্দেশিকা (<code>README-ANDROID.md</code>)</div>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href="/api/download/android-kit"
                target="_blank"
                rel="noopener noreferrer"
                download="KothaFlow-Android-Keyboard-Kit-v1.zip"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 text-center"
              >
                <Download className="w-4 h-4" />
                সার্ভার থেকে সরাসরি ডাউনলোড (.zip)
              </a>
              <button
                type="button"
                onClick={handleDownloadAndroidZip}
                disabled={downloadingAndroid}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <FileArchive className="w-3.5 h-3.5" />
                {downloadingAndroid ? 'জিপ তৈরি হচ্ছে...' : 'বিকল্প ইন-ব্রাউজার জেনারেটর'}
              </button>
            </div>
          </div>

          {/* Card 2: Desktop Electron Bundle Zip */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  <Monitor className="w-4 h-4" />
                  ডেস্কটপ (Windows & Mac)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Ready ZIP
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                ডেস্কটপ গ্লোবাল শর্টকাট বান্ডেল
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                MS Word, Notepad, VS Code, Google Docs সহ যেকোনো উইন্ডোতে কার্সার রেখে <code>Ctrl+Shift+Space</code> চাপলেই স্বয়ংক্রিয়ভাবে টাইপ হওয়ার ফুল ইলেকট্রন প্যাকেজ।
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                <div>✓ <code>run-windows.bat</code> (উইন্ডোজে ডাবল-ক্লিক করলেই চলবে)</div>
                <div>✓ <code>electron-main.cjs</code> (গ্লোবাল শর্টকাট + OS পেস্ট ইঞ্জিন)</div>
                <div>✓ বাংলায় পূর্ণাঙ্গ নির্দেশিকা (<code>README-DESKTOP.md</code>)</div>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href="/api/download/desktop-kit"
                target="_blank"
                rel="noopener noreferrer"
                download="KothaFlow-Desktop-Kit-v1.zip"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 text-center"
              >
                <Download className="w-4 h-4" />
                সার্ভার থেকে সরাসরি ডাউনলোড (.zip)
              </a>
              <button
                type="button"
                onClick={handleDownloadDesktopZip}
                disabled={downloadingDesktop}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <FileArchive className="w-3.5 h-3.5" />
                {downloadingDesktop ? 'জিপ তৈরি হচ্ছে...' : 'বিকল্প ইন-ব্রাউজার জেনারেটর'}
              </button>
            </div>
          </div>
        </div>

        {/* Offline Single-File HTML Download Banner */}
        <div className="mt-5 p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>⚡</span>
              <span>অফলাইন সিঙ্গেল-ফাইল স্টুডিও (KothaFlow-Offline-Studio.html)</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              কোনো Node.js বা ডিপেন্ডেন্সি ছাড়াই সরাসরি যেকোনো মোবাইল বা পিসির ব্রাউজারে ডাবল-ক্লিক করলেই অফলাইনে চলে।
            </p>
          </div>
          <a
            href="/api/download/offline-html"
            target="_blank"
            rel="noopener noreferrer"
            download="KothaFlow-Offline-Studio.html"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold transition-all shrink-0 text-center"
          >
            <Download className="w-3.5 h-3.5" />
            Offline HTML ডাউনলোড
          </a>
        </div>
      </section>

      {/* Native Export Code Tabs (Part 7 Desktop & Part 8 Android APK) */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              সোর্স কোড প্রিভিউ (Source Code Inspector)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Production-ready native bridges for Part 7 (Electron/Tauri global shortcut + OS paste) & Part 8 (Android InputMethodService).
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {copiedTab === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied Source File
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Active File
              </>
            )}
          </button>
        </div>

        {/* File Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('android-ime')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
              activeTab === 'android-ime'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Android IME (VoiceFlowInputMethodService.kt)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android-manifest')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
              activeTab === 'android-manifest'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">AndroidManifest.xml + method.xml</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('electron')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
              activeTab === 'electron'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Desktop Electron (main.js + nut.js)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tauri')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors truncate ${
              activeTab === 'tauri'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Desktop Tauri (src-tauri/src/main.rs)</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed max-h-[380px]">
          {getActiveCode()}
        </pre>
      </section>

      {/* Part 11 & Part 12: Interactive QA Checklist + Privacy & Rate Limit Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Part 11: Verification & QA Checklist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track prototype verification before packaging `.apk`, `.exe`, or `.dmg`.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completedCount}/{checklist.length} Verified
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleChecklistItem(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span
                  className={
                    item.checked
                      ? 'text-slate-800 dark:text-slate-200 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Part 12 & 14: Privacy, Security & Free-Tier Rate Limits
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                1. Ephemeral Audio Guarantee
              </p>
              <p>
                Audio clips are never stored on disk or external servers. In the web studio, the in-memory{' '}
                <code className="font-mono">Blob</code> is garbage-collected immediately after the{' '}
                <code className="font-mono">/api/transcribe</code> response returns. On Android IME,{' '}
                <code className="font-mono">recordedFile.delete()</code> runs inside a{' '}
                <code className="font-mono">finally</code> block.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                2. Credential Storage & OS Permissions
              </p>
              <p>
                Server-side proxy routes handle Gemini authentication automatically via environment secrets. For native builds, store credentials in Android{' '}
                <code className="font-mono">EncryptedSharedPreferences</code> and Desktop OS Keychain (<code className="font-mono">keytar</code>). On macOS, grant Accessibility + Microphone permissions in System Settings so <code className="font-mono">Cmd+V</code> simulation works.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                3. Free-Tier Optimization & Hybrid Whisper.cpp Option
              </p>
              <p>
                Short 5–15 second dictation clips use minimal audio tokens and combine transcription + filler removal + punctuation in a single Gemini Flash call. Dictionary casing and snippet expansion run 100% locally in post-processing to save API calls.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
