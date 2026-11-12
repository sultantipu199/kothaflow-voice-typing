import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Laptop,
  Check,
  Share2,
  PlusSquare,
  X,
  FileArchive,
  Terminal,
  Copy,
  FileCode,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { downloadDesktopBundleZip, downloadAndroidImeZip } from '../utils/downloadBundles';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  onPromptInstall: () => Promise<'accepted' | 'dismissed' | 'not-supported'>;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  isIOS,
  isAndroid,
  isDesktop,
  onPromptInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>(
    isAndroid || isIOS ? 'mobile' : 'desktop'
  );
  const [isDownloadingDesktop, setIsDownloadingDesktop] = useState(false);
  const [isDownloadingAndroid, setIsDownloadingAndroid] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleOpenInNewWindow = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = window.location.href;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleInstallClick = async () => {
    setInstallStatus('প্রসেস করা হচ্ছে...');
    const result = await onPromptInstall();
    if (result === 'accepted') {
      setInstallStatus('অ্যাপটি সফলভাবে আপনার ডিভাইসে ইনস্টল হয়েছে!');
    } else if (result === 'dismissed') {
      setInstallStatus('ইনস্টলেশন বাতিল করা হয়েছে। আপনি চাইলে যেকোনো সময় আবার চেষ্টা করতে পারেন।');
    } else {
      if (isInIframe) {
        setInstallStatus(
          'আইফ্রেম প্রিভিউয়ের ভেতর ব্রাউজার সরাসরি ইনস্টল ব্লক করে রেখেছে। অনুগ্রহ করে উপরের "আলাদা উইন্ডোতে খুলুন" বাটনে ক্লিক করে ফুল ব্রাউজারে ওপেন করুন।'
        );
      } else {
        setInstallStatus(
          'আপনার ব্রাউজার মেনু (তিনটি ডট অথবা শেয়ার বাটন) থেকে "Add to Home screen" বা "Install App" অপশনটিতে ক্লিক করুন।'
        );
      }
    }
  };

  const handleDownloadDesktopClient = async () => {
    try {
      setIsDownloadingDesktop(true);
      await downloadDesktopBundleZip();
      setDownloadSuccessMsg('KothaFlow-Desktop-Kit-v1.zip সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setDownloadSuccessMsg(null), 5000);
    } catch {
      // If client generation fails, redirect to direct server endpoint
      window.open('/api/download/desktop-kit', '_blank');
    } finally {
      setIsDownloadingDesktop(false);
    }
  };

  const handleDownloadAndroidClient = async () => {
    try {
      setIsDownloadingAndroid(true);
      await downloadAndroidImeZip();
      setDownloadSuccessMsg('KothaFlow-Android-Keyboard-Kit-v1.zip সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setDownloadSuccessMsg(null), 5000);
    } catch {
      // If client generation fails, redirect to direct server endpoint
      window.open('/api/download/android-kit', '_blank');
    } finally {
      setIsDownloadingAndroid(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                KothaFlow ডাউনলোড ও ইনস্টল কেন্দ্র
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Direct Download
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                মোবাইল বা কম্পিউটারে সরাসরি ইনস্টল করুন অথবা সোর্স প্যাকেজ ডাউনলোড করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Solution Card: Open in Full Window / Copy Link */}
        <div className="p-4 sm:p-6 pb-2 space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-200">
                  <Globe className="w-3.5 h-3.5" />
                  কেন ডাউনলোড বা ইনস্টল হতে সমস্যা হতে পারে?
                </div>
                <h3 className="text-base font-bold">
                  অ্যাপটি ব্রাউজারের আলাদা উইন্ডোতে খুলুন
                </h3>
                <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
                  গুগল প্রিভিউ আইফ্রেমের ভেতরে ব্রাউজারের নিরাপত্তা নীতি ডাউনলোড বা হোমস্ক্রিন ইনস্টল সাময়িকভাবে আটকে দিতে পারে। নিচের বাটনে চাপ দিয়ে আলাদা ট্যাবে খুললেই মোবাইলে বা পিসিতে সঙ্গে সঙ্গে ডাউনলোড ও ১-ক্লিকে ইনস্টল হয়ে যাবে।
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenInNewWindow}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
                >
                  <ExternalLink className="w-4 h-4" />
                  আলাদা উইন্ডোতে খুলুন ↗
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-medium text-xs border border-blue-400/40 transition-all active:scale-95 whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      কপি হয়েছে!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      লিংক কপি
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Current Device Detection Badge */}
        <div className="px-4 sm:px-6 pt-1 pb-2">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              {isAndroid && '📱 আপনি একটি অ্যান্ড্রয়েড মোবাইল থেকে ব্রাউজ করছেন।'}
              {isIOS && '📱 আপনি একটি আইফোন / আইপ্যাড থেকে ব্রাউজ করছেন।'}
              {isDesktop && '💻 আপনি একটি কম্পিউটার (ডেস্কটপ/ল্যাপটপ) থেকে ব্রাউজ করছেন।'}
              {' নিচের যেকোনো পদ্ধতিতে সরাসরি ফাইল বা অ্যাপ সংগ্রহ করুন:'}
            </span>
          </div>
        </div>

        {/* Tabs: Mobile vs Desktop */}
        <div className="px-4 sm:px-6 pt-1">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('mobile')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'mobile'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              মোবাইলের জন্য (Android & iOS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'desktop'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              ডেস্কটপের জন্য (Windows & Mac)
            </button>
          </div>
        </div>

        {/* Feedback / Alert message */}
        {(downloadSuccessMsg || installStatus) && (
          <div className="px-4 sm:px-6 pt-3">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                {downloadSuccessMsg || installStatus}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDownloadSuccessMsg(null);
                  setInstallStatus(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-semibold shrink-0"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {activeTab === 'mobile' ? (
            <div className="space-y-5">
              {/* Option 1: Mobile Direct Server ZIP Download */}
              <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      পদ্ধতি ১ • সরাসরি ফাইল ডাউনলোড (Direct Server Download)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      Android কীবোর্ড (IME APK) প্রজেক্ট (.zip)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Android Studio-তে এক ক্লিকে ওপেন করে আপনার ফোনের নিজস্ব WhatsApp/Messenger ভয়েস কীবোর্ড APK তৈরি করুন।
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <a
                      href="/api/download/android-kit"
                      target="_blank"
                      rel="noopener noreferrer"
                      download="KothaFlow-Android-Keyboard-Kit-v1.zip"
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 text-center"
                    >
                      <Download className="w-4 h-4" />
                      সার্ভার থেকে সরাসরি ডাউনলোড (.zip)
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadAndroidClient}
                      disabled={isDownloadingAndroid}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all text-center"
                      title="ব্রাউজার মেমোরি থেকে জিপ ফাইল তৈরি করুন"
                    >
                      <FileArchive className="w-3.5 h-3.5 text-emerald-600" />
                      বিকল্প জেনারেটর
                    </button>
                  </div>
                </div>

                <div className="mt-3 p-3.5 rounded-lg bg-white dark:bg-slate-950 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>✓ <strong>VoiceFlowInputMethodService.kt</strong> (ভয়েস লিসেনার ও commitText)</div>
                  <div>✓ <strong>AndroidManifest.xml</strong> + <strong>build.gradle.kts</strong> (Android Studio রেডি)</div>
                  <div>✓ বাংলায় পূর্ণাঙ্গ ৪-স্টেপ নির্দেশিকা (<strong>README-ANDROID.md</strong>)</div>
                </div>
              </div>

              {/* Option 2: 1-Click PWA App on Phone */}
              <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      পদ্ধতি ২ • ১-ক্লিক মোবাইল অ্যাপ (PWA Standalone)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      ফোনের হোম স্ক্রিনে ফুল-স্ক্রিন অ্যাপ হিসেবে ইনস্টল করুন
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      কোনো APK ছাড়াই আপনার ফোনের হোম স্ক্রিনে অ্যাপ আইকন যুক্ত হবে এবং ইন্টারনেট ছাড়াই ফুল-স্ক্রিনে ওপেন হবে।
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all shrink-0 active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      {isInstalled ? 'ইতোমধ্যে ইনস্টল করা আছে' : 'ফোনে অ্যাপ ইনস্টল করুন'}
                    </button>
                    {isInIframe && (
                      <button
                        type="button"
                        onClick={handleOpenInNewWindow}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-200 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ফুল উইন্ডোতে খুলুন
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile instructions box */}
                <div className="mt-4 pt-3 border-t border-blue-100 dark:border-blue-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      Android (Google Chrome):
                    </div>
                    <span>ফুল উইন্ডোতে ওপেন করার পর ক্রোমের তিনটি ডট <strong className="text-slate-800 dark:text-slate-200">⋮</strong> চেপে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন।</span>
                  </div>

                  <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
                      iPhone / iPad (Safari):
                    </div>
                    <span>সাফারি ব্রাউজারের নিচে শেয়ার আইকন <strong className="text-slate-800 dark:text-slate-200">⎋</strong> চাপুন এবং <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline mx-0.5 text-blue-500" /> চাপুন।</span>
                  </div>
                </div>
              </div>

              {/* Option 3: Single-file Offline HTML */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-500" />
                    পদ্ধতি ৩ • অফলাইন সিঙ্গেল-ফাইল স্টুডিও (.html)
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    একটিমাত্র ফাইল ফোনে ডাউনলোড করে যেকোনো ব্রাউজারে ডাবল-ক্লিক করলেই অফলাইনে সরাসরি চলবে।
                  </p>
                </div>
                <a
                  href="/api/download/offline-html"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="KothaFlow-Offline-Studio.html"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-all shrink-0 text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  KothaFlow-Offline.html ডাউনলোড
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Option 1: Desktop Direct Server ZIP Download */}
              <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      পদ্ধতি ১ • সরাসরি ফাইল ডাউনলোড (Direct Server Download)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      ডেস্কটপ গ্লোবাল শর্টকাট বান্ডেল (.zip)
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      MS Word, Notepad, VS Code, Notion, WhatsApp সহ কম্পিউটারের যেকোনো সফটওয়্যারে কার্সার রেখে <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded font-mono text-[11px]">Ctrl+Shift+Space</code> চাপলেই মুখে বলে অটো-টাইপ হবে।
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <a
                      href="/api/download/desktop-kit"
                      target="_blank"
                      rel="noopener noreferrer"
                      download="KothaFlow-Desktop-Kit-v1.zip"
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 text-center"
                    >
                      <Download className="w-4 h-4" />
                      সার্ভার থেকে সরাসরি ডাউনলোড (.zip)
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadDesktopClient}
                      disabled={isDownloadingDesktop}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all text-center"
                      title="ব্রাউজার মেমোরি থেকে জিপ ফাইল তৈরি করুন"
                    >
                      <FileArchive className="w-3.5 h-3.5 text-blue-600" />
                      বিকল্প জেনারেটর
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-500" />
                    📦 জিপ ফাইলে যা থাকছে এবং উইন্ডোজে চালানোর সহজ নিয়ম:
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong className="text-slate-700 dark:text-slate-300">run-windows.bat</strong> — আনজিপ করে শুধু ডাবল-ক্লিক করলেই উইন্ডোজে ব্যাকগ্রাউন্ডে চালু হবে</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong className="text-slate-700 dark:text-slate-300">electron-main.cjs</strong> — গ্লোবাল শর্টকাট লিসেনার ও ক্লিপবোর্ড পেস্ট ইঞ্জিন</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong className="text-slate-700 dark:text-slate-300">overlay.html</strong> — ফ্লোটিং ভয়েস ওয়েভবার স্ট্যাটাস উইন্ডো</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span><strong className="text-slate-700 dark:text-slate-300">README-DESKTOP.md</strong> — বাংলায় সম্পূর্ণ সেটআপ ও এক্সিকিউশন গাইড</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Option 2: Desktop 1-Click PWA App */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      পদ্ধতি ২ • ১-ক্লিক ডেস্কটপ অ্যাপ (Chrome / Edge)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      টাস্কবার ও ডেস্কটপ আইকন সহ অ্যাপ হিসেবে ইনস্টল করুন
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      ব্রাউজার ট্যাব ছাড়া আপনার কম্পিউটারের আলাদা উইন্ডোতে KothaFlow চলবে।
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all shrink-0 active:scale-95"
                    >
                      <Laptop className="w-4 h-4" />
                      {isInstalled ? 'ডেস্কটপে ইনস্টল করা আছে' : 'ডেস্কটপে ইনস্টল করুন'}
                    </button>
                    {isInIframe && (
                      <button
                        type="button"
                        onClick={handleOpenInNewWindow}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ফুল ব্রাউজারে খুলুন
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    💡 <strong>সহজ টিপস:</strong> অ্যাপটি আলাদা ব্রাউজার ট্যাবে খুললে Chrome বা Edge ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <strong>Install</strong> বাটন স্বয়ংক্রিয়ভাবে ভেসে উঠবে।
                  </p>
                </div>
              </div>

              {/* Option 3: Single-file Offline HTML */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-500" />
                    পদ্ধতি ৩ • অফলাইন সিঙ্গেল-ফাইল স্টুডিও (.html)
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Node.js বা কোনো সফটওয়্যার ইনস্টল ছাড়াই সরাসরি যেকোনো ব্রাউজারে ডাবল-ক্লিক করে অফলাইনে ভয়েস টাইপ করুন।
                  </p>
                </div>
                <a
                  href="/api/download/offline-html"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="KothaFlow-Offline-Studio.html"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-all shrink-0 text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  KothaFlow-Offline.html ডাউনলোড
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>KothaFlow v1.0 — Powered by Google Gemini AI Speech Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
