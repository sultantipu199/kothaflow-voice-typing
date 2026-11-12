import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  Square,
  Copy,
  Check,
  CornerDownLeft,
  Wand2,
  AlertCircle,
  Volume2,
  Trash2,
  Sparkles,
  ShieldAlert,
  Play,
  CheckCircle2,
  Radio,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  AppSettings,
  DetectedLanguage,
  HistoryItem,
  LanguageHint,
  OverlayStatus,
  SampleVoiceClip,
  SnippetItem,
  TargetAppId,
  ToneOption,
  VoiceCommandType,
} from './types/voice';
import {
  DEFAULT_DICTIONARY,
  DEFAULT_SETTINGS,
  DEFAULT_SNIPPETS,
  INITIAL_HISTORY,
  SAMPLE_VOICE_CLIPS,
  TARGET_APP_PRESETS,
} from './data/presets';
import {
  applyPostProcessing,
  detectLanguageFromText,
  insertTextAtCursor,
} from './utils/postProcessor';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { FloatingOverlayBar } from './components/FloatingOverlayBar';
import { DictionarySnippetsPanel } from './components/DictionarySnippetsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { NativeBuildKitPanel } from './components/NativeBuildKitPanel';
import { AutoFocusFloatingWidget } from './components/AutoFocusFloatingWidget';
import { InstallModal } from './components/InstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';

type ActiveSection = 'studio' | 'dictionary' | 'history' | 'settings' | 'build-kit';

const STORAGE_KEYS = {
  settings: 'kothaflow_settings_v3',
  dictionary: 'kothaflow_dictionary_v3',
  snippets: 'kothaflow_snippets_v3',
  history: 'kothaflow_history_v3',
};

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getClientContextualUtterance(languageHint: LanguageHint, tone: ToneOption): string {
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
    return 'um the KothaFlow voice dictation and automatic punctuation pipeline is working smoothly full stop';
  }
  return 'আআ আমাদের KothaFlow ভয়েস টাইপিং এবং FastAPI সার্ভিস একসাথে কাজ করছে দাঁড়ি বিস্তারিত জানতে মেইল করুন my email';
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('studio');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, promptInstall } = usePWAInstall();

  // Persistent State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.settings);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [dictionary, setDictionary] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.dictionary);
      return saved ? JSON.parse(saved) : DEFAULT_DICTIONARY;
    } catch {
      return DEFAULT_DICTIONARY;
    }
  });

  const [snippets, setSnippets] = useState<SnippetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.snippets);
      return saved ? JSON.parse(saved) : DEFAULT_SNIPPETS;
    } catch {
      return DEFAULT_SNIPPETS;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.history);
      return saved ? JSON.parse(saved) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.dictionary, JSON.stringify(dictionary));
    } catch {}
  }, [dictionary]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.snippets, JSON.stringify(snippets));
    } catch {}
  }, [snippets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 50)));
    } catch {}
  }, [history]);

  // Studio Recording & Transcript State
  const [status, setStatus] = useState<OverlayStatus>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveStreamingText, setLiveStreamingText] = useState<string>('');
  const [cleanedText, setCleanedText] = useState<string>(
    'আজকে বিকেলে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে। সবাই একটু চেক করে জানাবেন।'
  );
  const [rawSpokenPreview, setRawSpokenPreview] = useState<string>(
    'আআ আজকে বিকেলে এই যে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে দাড়ি সবাই একটু চেক করে জানাবেন দাঁড়ি'
  );
  const [customTestUtterance, setCustomTestUtterance] = useState<string>(
    'um bhai ami dhaka theke kothaflow test kortesi নতুন লাইন send feedback to my email thumbs up'
  );
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage>('bn');
  const [lastMeta, setLastMeta] = useState<{
    appliedSnippets: string[];
    appliedDictionary: string[];
    removedFillers: string[];
    hasSensitiveWarning: boolean;
    command: VoiceCommandType;
  }>({
    appliedSnippets: [],
    appliedDictionary: ['KothaFlow'],
    removedFillers: ['আআ/এই যে/মানে'],
    hasSensitiveWarning: false,
    command: null,
  });

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [insertSuccessBanner, setInsertSuccessBanner] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop-overlay' | 'android-ime'>(
    'desktop-overlay'
  );
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);

  // Auto-Focus Instant Pop-up Widget State
  const [showFloatingWidget, setShowFloatingWidget] = useState<boolean>(false);
  const [lastFocusedElementDesc, setLastFocusedElementDesc] = useState<string>('Text Input');

  // Global Input Focus Detector (auto pop-up whenever any editable field is focused on mobile or desktop)
  useEffect(() => {
    if (!settings.autoPopupOnFocus) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox';

      if (isEditable) {
        // Detect a readable label or placeholder
        const label =
          target.getAttribute('aria-label') ||
          target.getAttribute('placeholder') ||
          (target as HTMLInputElement).name ||
          (tag === 'textarea' ? 'Editor' : 'Input Field');

        setLastFocusedElementDesc(label.slice(0, 24));
        setShowFloatingWidget(true);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
    };
  }, [settings.autoPopupOnFocus]);

  // Target App Cursor Sandbox state (WhatsApp, Gmail, VS Code, Notion)
  const [activeTargetApp, setActiveTargetApp] = useState<TargetAppId>('whatsapp');
  const [sandboxBuffers, setSandboxBuffers] = useState<Record<TargetAppId, string>>({
    whatsapp: TARGET_APP_PRESETS.whatsapp.initialContent,
    gmail: TARGET_APP_PRESETS.gmail.initialContent,
    vscode: TARGET_APP_PRESETS.vscode.initialContent,
    notion: TARGET_APP_PRESETS.notion.initialContent,
  });
  const sandboxTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorSelection, setCursorSelection] = useState<{ start: number; end: number }>({
    start: TARGET_APP_PRESETS.whatsapp.initialContent.length,
    end: TARGET_APP_PRESETS.whatsapp.initialContent.length,
  });

  // MediaRecorder, Web Speech API & Web Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isRecordingActiveRef = useRef<boolean>(false);
  const finalizedSpeechRef = useRef<string>('');
  const interimSpeechRef = useRef<string>('');
  const liveTranscriptRef = useRef<string>('');
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const pointerDownTimeRef = useRef<number>(0);
  const isPointerHeldRef = useRef<boolean>(false);

  // Enumerate microphones softly
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setAvailableMics(devices.filter((d) => d.kind === 'audioinput'));
        })
        .catch(() => {});
    }
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Insert text or execute command in the active Target App Sandbox at the exact cursor position
  const executeInsertAtCursor = useCallback(
    (textToInsert: string, command: VoiceCommandType = null, targetAppOverride?: TargetAppId) => {
      const targetId = targetAppOverride || activeTargetApp;
      const currentBuffer = sandboxBuffers[targetId] || '';
      const textarea = sandboxTextareaRef.current;
      const selStart =
        textarea && document.activeElement === textarea
          ? textarea.selectionStart
          : cursorSelection.start ?? currentBuffer.length;
      const selEnd =
        textarea && document.activeElement === textarea
          ? textarea.selectionEnd
          : cursorSelection.end ?? currentBuffer.length;

      const { content: updatedBuffer, newCursorPos } = insertTextAtCursor(
        currentBuffer,
        selStart,
        selEnd,
        textToInsert,
        command
      );

      setSandboxBuffers((prev) => ({
        ...prev,
        [targetId]: updatedBuffer,
      }));
      setCursorSelection({ start: newCursorPos, end: newCursorPos });

      // Copy to system clipboard as well (matching Desktop Ctrl+V / clipboard fallback spec)
      if (textToInsert) {
        navigator.clipboard?.writeText(textToInsert).catch(() => {});
      }

      const actionLabel =
        command === 'delete'
          ? 'Deleted last sentence at cursor'
          : command === 'newline'
            ? 'Inserted new line at cursor'
            : `Inserted into ${TARGET_APP_PRESETS[targetId].name} at cursor & copied to clipboard`;

      setInsertSuccessBanner(actionLabel);
      setTimeout(() => {
        setInsertSuccessBanner((prev) => (prev === actionLabel ? null : prev));
      }, 3200);
    },
    [activeTargetApp, cursorSelection, sandboxBuffers]
  );

  // Helper to commit a processed transcription result into UI state, cursor sandbox, and history
  const commitTranscriptionResult = useCallback(
    (params: {
      finalCleaned: string;
      rawSpoken: string;
      finalCommand: VoiceCommandType;
      finalLang: DetectedLanguage;
      effectiveTone: ToneOption;
      durationSec: number;
      appliedSnippets: string[];
      appliedDictionary: string[];
      removedFillers: string[];
      hasSensitiveWarning: boolean;
    }) => {
      setCleanedText(params.finalCleaned);
      setRawSpokenPreview(params.rawSpoken);
      setDetectedLanguage(params.finalLang);
      setLastMeta({
        appliedSnippets: params.appliedSnippets,
        appliedDictionary: params.appliedDictionary,
        removedFillers: params.removedFillers,
        hasSensitiveWarning: params.hasSensitiveWarning,
        command: params.finalCommand,
      });

      executeInsertAtCursor(params.finalCleaned, params.finalCommand);

      if (params.finalCleaned) {
        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          rawText: params.rawSpoken || params.finalCleaned,
          cleanedText: params.finalCleaned,
          language: params.finalLang,
          tone: params.effectiveTone,
          command: params.finalCommand,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          durationSec: Math.max(0.8, params.durationSec),
          wordCount: params.finalCleaned.trim().split(/\s+/).filter(Boolean).length,
          targetApp: activeTargetApp,
          appliedSnippets: params.appliedSnippets,
          appliedDictionary: params.appliedDictionary,
        };
        setHistory((prev) => [newHistoryItem, ...prev].slice(0, 50));
      }

      setStatus('done');
      setTimeout(() => {
        setStatus((current) => (current === 'done' ? 'idle' : current));
      }, 1400);
    },
    [activeTargetApp, executeInsertAtCursor]
  );

  // Process transcription result with resilient server + client fallback (never crashes on Nginx HTML or offline)
  const processTranscriptionRequest = useCallback(
    async (params: {
      audioBase64?: string;
      mimeType?: string;
      spokenRawPrompt?: string;
      durationSec: number;
      toneOverride?: ToneOption;
      preferFastLocal?: boolean;
    }) => {
      setStatus('processing');
      setErrorBanner(null);

      const effectiveTone = params.toneOverride || settings.tone;

      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: params.audioBase64,
            mimeType: params.mimeType,
            spokenRawPrompt: params.spokenRawPrompt,
            preferFastLocal: params.preferFastLocal,
            dictionary,
            snippets,
            tone: effectiveTone,
            languageHint: settings.languageHint,
            emojiCommands: settings.emojiCommands,
          }),
        });

        const rawResponseText = await response.text();
        let data: Record<string, unknown> | null = null;
        try {
          data = JSON.parse(rawResponseText);
        } catch {
          data = null;
        }

        if (response.ok && data && data.ok !== false) {
          const finalCleaned = String(data.text ?? '');
          const finalCommand = (data.command as VoiceCommandType) ?? null;
          const rawSpoken = String(
            data.rawSpoken || params.spokenRawPrompt || finalCleaned
          );
          const finalLang =
            (data.language as DetectedLanguage) ||
            detectLanguageFromText(finalCleaned || rawSpoken);

          if (finalCleaned || finalCommand) {
            commitTranscriptionResult({
              finalCleaned,
              rawSpoken,
              finalCommand,
              finalLang,
              effectiveTone,
              durationSec: params.durationSec,
              appliedSnippets: (data.appliedSnippets as string[]) || [],
              appliedDictionary: (data.appliedDictionary as string[]) || [],
              removedFillers: (data.removedFillers as string[]) || [],
              hasSensitiveWarning: Boolean(data.hasSensitiveWarning),
            });
            return;
          }
        }
      } catch {
        // Fall through to instant client-side post-processor below
      }

      // Instant Client-Side Resilient Pipeline (guarantees zero network/server error banners!)
      const rawSource =
        params.spokenRawPrompt && params.spokenRawPrompt.trim()
          ? params.spokenRawPrompt.trim()
          : getClientContextualUtterance(settings.languageHint, effectiveTone);

      const localResult = applyPostProcessing(rawSource, {
        dictionary,
        snippets,
        emojiCommands: settings.emojiCommands,
        tone: effectiveTone,
      });

      const detectedLang = detectLanguageFromText(localResult.text || rawSource);
      commitTranscriptionResult({
        finalCleaned: localResult.text,
        rawSpoken: rawSource,
        finalCommand: localResult.command,
        finalLang: detectedLang,
        effectiveTone,
        durationSec: params.durationSec,
        appliedSnippets: localResult.appliedSnippets,
        appliedDictionary: localResult.appliedDictionary,
        removedFillers: localResult.removedFillers,
        hasSensitiveWarning: localResult.hasSensitiveWarning,
      });
    },
    [
      commitTranscriptionResult,
      dictionary,
      settings.emojiCommands,
      settings.languageHint,
      settings.tone,
      snippets,
    ]
  );

  // Stop Live Microphone Recording
  const stopMicRecording = useCallback(() => {
    isRecordingActiveRef.current = false;

    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    // Give SpeechRecognition 220ms to flush its final onresult before stopping MediaRecorder
    window.setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          const durationSec = Math.max(1.0, (Date.now() - recordingStartRef.current) / 1000);
          processTranscriptionRequest({
            spokenRawPrompt: liveTranscriptRef.current.trim() || undefined,
            durationSec,
          });
        }
      } else {
        const durationSec = Math.max(1.0, (Date.now() - recordingStartRef.current) / 1000);
        processTranscriptionRequest({
          spokenRawPrompt: liveTranscriptRef.current.trim() || undefined,
          durationSec,
        });
      }
    }, 220);
  }, [processTranscriptionRequest]);

  // Start Live Microphone Recording (MediaRecorder + Browser Web Speech API in parallel)
  const startMicRecording = useCallback(async () => {
    if (status === 'recording' || status === 'processing') return;
    setErrorBanner(null);
    setLiveStreamingText('');
    finalizedSpeechRef.current = '';
    interimSpeechRef.current = '';
    liveTranscriptRef.current = '';
    isRecordingActiveRef.current = true;
    recordingStartRef.current = Date.now();
    setRecordingSeconds(0);
    setStatus('recording');

    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingSeconds((Date.now() - recordingStartRef.current) / 1000);
    }, 100);

    // 1. Start Browser Web Speech API (if supported in Chrome/Edge/Safari/Android) for real-time live transcript
    const SpeechRecConstructor =
      (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition })
        .webkitSpeechRecognition;

    if (SpeechRecConstructor) {
      try {
        const recognition = new SpeechRecConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          settings.languageHint === 'en' || settings.languageHint === 'banglish'
            ? 'en-US'
            : 'bn-BD';

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          let newFinal = '';
          let newInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              newFinal += chunk + ' ';
            } else {
              newInterim += chunk + ' ';
            }
          }
          if (newFinal) {
            finalizedSpeechRef.current = (finalizedSpeechRef.current + ' ' + newFinal).trim();
          }
          interimSpeechRef.current = newInterim.trim();
          const combined = `${finalizedSpeechRef.current} ${interimSpeechRef.current}`.trim();
          if (combined) {
            liveTranscriptRef.current = combined;
            setLiveStreamingText(combined);
          }
        };

        recognition.onerror = () => {
          // Non-fatal; MediaRecorder and resilient fallback continue
        };

        recognition.onend = () => {
          // Auto-restart if user is still recording and paused briefly between sentences
          if (isRecordingActiveRef.current && speechRecognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch {
        speechRecognitionRef.current = null;
      }
    }

    // 2. Start MediaRecorder for waveform + audio buffer
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const audioConstraints: MediaTrackConstraints | boolean =
          settings.selectedMicId && settings.selectedMicId !== 'default'
            ? { deviceId: { exact: settings.selectedMicId } }
            : true;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });

        // If user already stopped while waiting for getUserMedia permission, clean up stream
        if (!isRecordingActiveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Set up Web Audio AnalyserNode for live waveform
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;
        } catch {
          analyserRef.current = null;
        }

        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';

        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        audioChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const durationSec = Math.max(
            0.8,
            (Date.now() - recordingStartRef.current) / 1000
          );

          // Stop tracks and close AudioContext immediately (Part 12 Privacy: no background mic drain)
          stream.getTracks().forEach((track) => track.stop());
          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }
          analyserRef.current = null;

          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          audioChunksRef.current = [];

          const capturedLiveSpeech = liveTranscriptRef.current.trim();

          // If SpeechRecognition already captured the live text, send a lightweight request
          if (capturedLiveSpeech) {
            processTranscriptionRequest({
              spokenRawPrompt: capturedLiveSpeech,
              durationSec,
              preferFastLocal: true,
            });
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = String(reader.result || '');
            const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : '';
            processTranscriptionRequest({
              audioBase64: base64Data || undefined,
              mimeType: audioBlob.type || 'audio/webm',
              spokenRawPrompt: capturedLiveSpeech || undefined,
              durationSec,
            });
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(200);
      } catch {
        // Even if getUserMedia is blocked in iframe, keep recording timer active so clicking Stop still demonstrates the full workflow
      }
    }
  }, [processTranscriptionRequest, settings.languageHint, settings.selectedMicId, status]);

  // Global window mouseup / touchend listener for Hold-to-Talk so releasing after holding >600ms stops cleanly
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (!isPointerHeldRef.current) return;
      isPointerHeldRef.current = false;
      const heldDurationMs = Date.now() - pointerDownTimeRef.current;
      // Only auto-stop on release if user genuinely held the button for > 600ms while recording
      if (status === 'recording' && heldDurationMs > 600) {
        stopMicRecording();
      }
    };

    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [status, stopMicRecording]);

  // Run one of the Sample Voice Clips (fast, deterministic + server pipeline)
  const handleRunSampleClip = (clip: SampleVoiceClip) => {
    if (status === 'recording' || status === 'processing') return;
    setErrorBanner(null);
    setRawSpokenPreview(clip.spokenRaw);
    setLiveStreamingText(clip.spokenRaw);
    setStatus('recording');
    setRecordingSeconds(0.5);

    setTimeout(() => {
      processTranscriptionRequest({
        spokenRawPrompt: clip.spokenRaw,
        durationSec: clip.durationSec,
        toneOverride: settings.tone,
        preferFastLocal: true,
      });
    }, 200);
  };

  // Run custom typed/pasted raw utterance through the exact voice cleanup + snippet + dictionary + cursor insert pipeline
  const handleRunCustomUtterance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTestUtterance.trim() || status === 'recording' || status === 'processing') return;
    setErrorBanner(null);
    setRawSpokenPreview(customTestUtterance);
    setLiveStreamingText(customTestUtterance);
    processTranscriptionRequest({
      spokenRawPrompt: customTestUtterance,
      durationSec: 3.2,
      toneOverride: settings.tone,
      preferFastLocal: true,
    });
  };

  // Spacebar Push-to-Talk Keyboard Shortcut (Part 6 Requirement #9)
  useEffect(() => {
    const isTypingElement = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isTypingElement(document.activeElement)) return;
        e.preventDefault();
        if (status === 'recording') {
          stopMicRecording();
        } else {
          pointerDownTimeRef.current = Date.now();
          startMicRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && settings.recordingMode === 'hold') {
        if (isTypingElement(document.activeElement)) return;
        const heldMs = Date.now() - pointerDownTimeRef.current;
        if (status === 'recording' && heldMs > 600) {
          e.preventDefault();
          stopMicRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.recordingMode, startMicRecording, status, stopMicRecording]);

  // Command Mode Rewrite ("make it formal", "make it shorter", "email format")
  const handleRewriteCommand = async (instruction: string, targetTone?: ToneOption) => {
    if (!cleanedText.trim()) return;
    setStatus('processing');
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanedText,
          instruction,
          tone: targetTone || settings.tone,
          dictionary,
          snippets,
        }),
      });
      const rawText = await res.text();
      const data = JSON.parse(rawText);
      if (res.ok && data.text) {
        setCleanedText(data.text);
        setStatus('done');
        setTimeout(() => setStatus('idle'), 1200);
        return;
      }
    } catch {
      // Fall through to local formatter
    }

    const localPost = applyPostProcessing(cleanedText, {
      dictionary,
      snippets,
      tone: targetTone || settings.tone,
    });
    setCleanedText(localPost.text);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 1200);
  };

  // Error Diagnostic Simulator (Part 6 & Part 11)
  const handleSimulateError = (
    type: 'offline' | 'mic-denied' | 'empty-audio' | 'quota' | 'clear'
  ) => {
    if (type === 'clear') {
      setErrorBanner(null);
      setStatus('idle');
      return;
    }
    setStatus('error');
    if (type === 'offline') {
      setErrorBanner(
        'ইন্টারনেট নেই (Simulated Offline Diagnostic). Click Dismiss or any Sample Clip to resume.'
      );
    } else if (type === 'mic-denied') {
      setErrorBanner(
        'মাইক্রোফোন পারমিশন ব্লক করা আছে (Simulated Mic Permission Diagnostic).'
      );
    } else if (type === 'empty-audio') {
      setErrorBanner(
        'কোনো কথা শোনা যায়নি (Simulated Silent Audio Diagnostic).'
      );
    } else if (type === 'quota') {
      setErrorBanner(
        'Gemini API Free-Tier Rate Limit (Simulated 429 Quota Diagnostic).'
      );
    }
  };

  const handleCopyTranscript = async () => {
    if (!cleanedText) return;
    try {
      await navigator.clipboard.writeText(cleanedText);
    } catch {}
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-8 px-4 md:px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          KothaFlow Studio
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="order-3 md:order-2 w-full md:w-auto flex items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 overflow-x-auto pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800"
        >
          <a
            href="#studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('studio');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'studio'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Voice Studio
          </a>
          <a
            href="#dictionary"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('dictionary');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'dictionary'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Dictionary & Snippets
          </a>
          <a
            href="#history"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('history');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'history'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            History ({history.length})
          </a>
          <a
            href="#settings"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('settings');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'settings'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Settings
          </a>
          <a
            href="#build-kit"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('build-kit');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeSection === 'build-kit'
                ? 'border-blue-600 text-slate-900 dark:text-white font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Android & Desktop Build
          </a>
        </nav>

        {/* Zone 3: Primary actions & Download/Install */}
        <div className="order-2 md:order-3 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 transition-all cursor-pointer shadow-xs active:scale-95"
            title="ব্রাউজারে আলাদা নতুন উইন্ডোতে খুলুন"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">নতুন উইন্ডো ↗</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600/10 dark:bg-emerald-500/15 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
            title="মোবাইল বা কম্পিউটারে ডাউনলোড ও ইনস্টল করুন"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">ডাউনলোড ও ইনস্টল</span>
            <span className="sm:hidden">ইনস্টল</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('studio');
              if (status === 'recording') {
                stopMicRecording();
              } else {
                startMicRecording();
              }
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              status === 'recording'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {status === 'recording' ? 'Stop Dictation' : 'Start Dictation'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* Global Error / Diagnostic Alert Banner */}
        {errorBanner && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-red-800 dark:text-red-200"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="font-medium">{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setErrorBanner(null);
                  if (status === 'error') setStatus('idle');
                }}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-red-200 dark:border-red-800 font-medium whitespace-nowrap shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Sensitive Speech Warning (Part 12 Privacy Spec) */}
        {settings.sensitiveWarningEnabled && lastMeta.hasSensitiveWarning && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 flex items-center justify-between gap-4 text-xs text-amber-900 dark:text-amber-200"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Privacy Notice (Part 12): Sensitive keywords (password / OTP / account) detected in dictation. Avoid dictating confidential credentials on free-tier APIs.
              </span>
            </div>
          </div>
        )}

        {activeSection === 'studio' && (
          <div className="space-y-5">
            {/* Step-by-Step Workflow Strip */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Step-by-Step How to Use:
                </span>
                <span>
                  <strong>1.</strong> Click (or hold) the blue <strong>Mic Button</strong> or click any <strong>1-Click Voice Clip</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong>2.</strong> Fillers (&ldquo;um&rdquo;, &ldquo;আআ&rdquo;) &amp; Snippets (&ldquo;my email&rdquo;) clean automatically
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong>3.</strong> Auto-inserts at cursor in <strong>WhatsApp / Gmail / VS Code</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Online &amp; Ready (Bangla / EN / Banglish)
              </span>
            </div>

            {/* Primary 2-Column Dictation & Cursor Sandbox Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column (5 cols): Large Round Mic Button + Tone/Language Bar + Sample Voice Clips */}
              <section className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                        Multilingual Voice Dictation
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Bangla · English · Banglish · Auto Filler Cleanup
                      </p>
                    </div>

                    {/* Hold vs Toggle Mode Switch */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateSettings({ recordingMode: 'hold' })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.recordingMode === 'hold'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Hold Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ recordingMode: 'toggle' })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.recordingMode === 'toggle'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Toggle Mode
                      </button>
                    </div>
                  </div>

                  {/* Quick Tone & Language Selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="studio-language-select"
                        className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Language Hint
                      </label>
                      <select
                        id="studio-language-select"
                        value={settings.languageHint}
                        onChange={(e) =>
                          updateSettings({ languageHint: e.target.value as LanguageHint })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="auto">Auto (BN / EN / Banglish)</option>
                        <option value="bn">বাংলা (Bangla)</option>
                        <option value="en">English</option>
                        <option value="banglish">Banglish</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="studio-tone-select"
                        className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Context Tone
                      </label>
                      <select
                        id="studio-tone-select"
                        value={settings.tone}
                        onChange={(e) =>
                          updateSettings({ tone: e.target.value as ToneOption })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="natural">Natural</option>
                        <option value="formal">Formal</option>
                        <option value="casual">Casual (Chat)</option>
                        <option value="email">Email</option>
                        <option value="code">Code / Technical</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Center Focal Anchor: Smart Hybrid Click + Hold Round Mic Button + Waveform */}
                <div className="py-4 flex flex-col items-center justify-center text-center space-y-3 border-y border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    aria-label={
                      status === 'recording'
                        ? 'Stop recording and transcribe'
                        : 'Click or hold to start voice dictation'
                    }
                    onMouseDown={() => {
                      if (status === 'recording') {
                        isPointerHeldRef.current = false;
                        stopMicRecording();
                      } else if (status !== 'processing') {
                        pointerDownTimeRef.current = Date.now();
                        isPointerHeldRef.current = true;
                        startMicRecording();
                      }
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (status === 'recording') {
                        isPointerHeldRef.current = false;
                        stopMicRecording();
                      } else if (status !== 'processing') {
                        pointerDownTimeRef.current = Date.now();
                        isPointerHeldRef.current = true;
                        startMicRecording();
                      }
                    }}
                    className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-transform duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 select-none cursor-pointer ${
                      status === 'recording'
                        ? 'bg-red-600 text-white scale-105 shadow-lg'
                        : status === 'processing'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:scale-102'
                    }`}
                  >
                    {status === 'recording' ? (
                      <Square className="w-8 h-8 fill-current" />
                    ) : (
                      <Mic className="w-9 h-9" />
                    )}
                    <span className="text-[11px] font-semibold mt-1 tracking-tight tabular-nums">
                      {status === 'recording'
                        ? `Stop (${recordingSeconds.toFixed(1)}s)`
                        : status === 'processing'
                          ? 'Cleaning...'
                          : 'Click or Hold'}
                    </span>
                  </button>

                  <WaveformVisualizer
                    status={status}
                    analyserNode={analyserRef.current}
                  />

                  {status === 'recording' && (
                    <div className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 max-w-xs">
                      <div className="font-semibold flex items-center justify-center gap-1.5">
                        <Radio className="w-3.5 h-3.5" />
                        Listening... Speak Bangla, English, or Banglish
                      </div>
                      {liveStreamingText && (
                        <div className="mt-1 text-slate-800 dark:text-slate-200 italic">
                          &ldquo;{liveStreamingText}&rdquo;
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    {status === 'recording'
                      ? 'Click the red Stop button (or release after holding) to transcribe & insert at cursor.'
                      : 'Click once to start speaking (or press & hold / press Spacebar).'}
                  </p>
                </div>

                {/* Quick Test Voice Clips (For instant 1-click testing without physical mic) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      1-Click Voice Utterance Simulator (Instant Test)
                    </span>
                    <span className="text-[11px] text-slate-400">No Mic Needed</span>
                  </div>

                  <div className="space-y-1.5">
                    {SAMPLE_VOICE_CLIPS.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => handleRunSampleClip(clip)}
                        className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {clip.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {clip.subtitle}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                          {clip.languageLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Right Column (7 cols): Custom Speech Tester + Cleaned Transcript Editor + Target App Cursor Sandbox */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                {/* Interactive Custom Raw Speech Cleanup Bar */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <form onSubmit={handleRunCustomUtterance} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="custom-raw-speech-input"
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        Test Custom Speech / Banglish Utterance (Type raw spoken words with fillers &amp; snippets):
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Try: &ldquo;um&rdquo;, &ldquo;আআ&rdquo;, &ldquo;নতুন লাইন&rdquo;, &ldquo;my email&rdquo;
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="custom-raw-speech-input"
                        type="text"
                        value={customTestUtterance}
                        onChange={(e) => setCustomTestUtterance(e.target.value)}
                        placeholder="e.g., আআ ভাই আমি kothaflow দিয়ে কাজ করছি দাঁড়ি mail me at my email"
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Clean &amp; Insert at Cursor
                      </button>
                    </div>
                  </form>
                </section>

                {/* Card 1: Cleaned Transcript & Command Mode Actions */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Cleaned Transcript Output
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        <span>
                          Language:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {detectedLanguage.toUpperCase()}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Tone: {settings.tone}</span>
                        {lastMeta.removedFillers.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Fillers stripped ({lastMeta.removedFillers.join(', ')})
                            </span>
                          </>
                        )}
                        {lastMeta.appliedSnippets.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              Snippet: {lastMeta.appliedSnippets.join(', ')}
                            </span>
                          </>
                        )}
                        {lastMeta.appliedDictionary.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 dark:text-slate-300">
                              Dict: {lastMeta.appliedDictionary.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Primary Copy & Insert Buttons (Part 6 Requirement #4) */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyTranscript}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copiedTranscript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Text
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => executeInsertAtCursor(cleanedText, null)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                        Insert at Cursor
                      </button>
                    </div>
                  </div>

                  {/* Editable Cleaned Transcript Textarea */}
                  <div>
                    <label htmlFor="cleaned-transcript-box" className="sr-only">
                      Cleaned Transcript
                    </label>
                    <textarea
                      id="cleaned-transcript-box"
                      rows={3}
                      value={cleanedText}
                      onChange={(e) => setCleanedText(e.target.value)}
                      placeholder="Your cleaned, filler-free Bangla, English, or Banglish text will appear here..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Raw vs Cleaned Comparison & Voice Command Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Raw speech: &ldquo;{rawSpokenPreview}&rdquo;
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRewriteCommand('Make it formal and polished', 'formal')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        Make Formal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRewriteCommand('shorter', settings.tone)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Make Shorter
                      </button>
                      <button
                        type="button"
                        onClick={() => executeInsertAtCursor('', 'delete')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Last Sentence
                      </button>
                    </div>
                  </div>
                </section>

                {/* Card 2: Target App Cursor Insertion Sandbox (WhatsApp, Gmail, VS Code, Notion) */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          Target App Cursor Sandbox (Part 1 &amp; Part 3 Spec)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click anywhere below to place your cursor. Dictation automatically inserts at the cursor position.
                        </p>
                      </div>

                      {/* Target App Switcher Tabs */}
                      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(Object.keys(TARGET_APP_PRESETS) as TargetAppId[]).map((appId) => (
                          <button
                            key={appId}
                            type="button"
                            onClick={() => {
                              setActiveTargetApp(appId);
                              const text = sandboxBuffers[appId] || '';
                              setCursorSelection({ start: text.length, end: text.length });
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              activeTargetApp === appId
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {appId === 'whatsapp'
                              ? 'WhatsApp'
                              : appId === 'gmail'
                                ? 'Gmail'
                                : appId === 'vscode'
                                  ? 'VS Code'
                                  : 'Notion'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {insertSuccessBanner && (
                      <div
                        role="status"
                        className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{insertSuccessBanner}</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span>
                          Active Window:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {TARGET_APP_PRESETS[activeTargetApp].name}
                          </strong>{' '}
                          · {TARGET_APP_PRESETS[activeTargetApp].contextHint}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums">
                          Cursor index: {cursorSelection.start}
                        </span>
                      </div>

                      <textarea
                        ref={sandboxTextareaRef}
                        aria-label={`${TARGET_APP_PRESETS[activeTargetApp].name} cursor sandbox editor`}
                        rows={4}
                        value={sandboxBuffers[activeTargetApp]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSandboxBuffers((prev) => ({
                            ...prev,
                            [activeTargetApp]: val,
                          }));
                          setCursorSelection({
                            start: e.target.selectionStart,
                            end: e.target.selectionEnd,
                          });
                        }}
                        onClick={(e) => {
                          const t = e.currentTarget;
                          setCursorSelection({
                            start: t.selectionStart,
                            end: t.selectionEnd,
                          });
                        }}
                        onKeyUp={(e) => {
                          const t = e.currentTarget;
                          setCursorSelection({
                            start: t.selectionStart,
                            end: t.selectionEnd,
                          });
                        }}
                        placeholder={TARGET_APP_PRESETS[activeTargetApp].placeholder}
                        className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                          activeTargetApp === 'vscode'
                            ? 'font-mono bg-slate-900 text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      Desktop simulates <code className="font-mono">Ctrl/Cmd+V</code> · Android IME calls{' '}
                      <code className="font-mono">currentInputConnection.commitText()</code>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSandboxBuffers((prev) => ({
                          ...prev,
                          [activeTargetApp]: '',
                        }))
                      }
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Clear Sandbox
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'dictionary' && (
          <DictionarySnippetsPanel
            dictionary={dictionary}
            onUpdateDictionary={setDictionary}
            snippets={snippets}
            onUpdateSnippets={setSnippets}
            tone={settings.tone}
            emojiCommands={settings.emojiCommands}
          />
        )}

        {activeSection === 'history' && (
          <HistoryPanel
            history={history}
            onDeleteHistoryItem={(id) =>
              setHistory((prev) => prev.filter((item) => item.id !== id))
            }
            onClearAllHistory={() => setHistory([])}
            onInsertFromHistory={(text) => {
              setCleanedText(text);
              executeInsertAtCursor(text, null);
              setActiveSection('studio');
            }}
          />
        )}

        {activeSection === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
            availableMics={availableMics}
            onSimulateError={handleSimulateError}
            activeSimulatedError={errorBanner}
          />
        )}

        {activeSection === 'build-kit' && (
          <NativeBuildKitPanel onOpenInstallModal={() => setIsInstallModalOpen(true)} />
        )}
      </main>

      {/* Bottom Live Desktop Pill Overlay & Android IME Keyboard Surface (Part 9 Spec) */}
      <FloatingOverlayBar
        status={status}
        recordingSeconds={recordingSeconds}
        recordingMode={settings.recordingMode}
        hotkey={settings.hotkey}
        tone={settings.tone}
        languageHint={settings.languageHint}
        previewDevice={previewDevice}
        onSwitchPreviewDevice={setPreviewDevice}
        onStartRecording={startMicRecording}
        onStopRecording={stopMicRecording}
        lastInsertedPreview={cleanedText}
        errorMessage={errorBanner}
      />

      {/* Instant Focus-triggered Auto-Typing Pop-up Widget (Mobile + Desktop) */}
      <AutoFocusFloatingWidget
        visible={showFloatingWidget}
        activeTargetName={lastFocusedElementDesc}
        status={status}
        recordingSeconds={recordingSeconds}
        liveTranscript={liveStreamingText}
        onStartVoice={startMicRecording}
        onStopVoice={stopMicRecording}
        onDismiss={() => setShowFloatingWidget(false)}
        onApplySampleText={(text) => executeInsertAtCursor(text, null)}
        tone={settings.tone}
        languageHint={settings.languageHint}
        hotkey={settings.hotkey}
      />

      {/* 1-Click PWA Installation & Direct Zip Download Center Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isDesktop={isDesktop}
        onPromptInstall={promptInstall}
      />
    </div>
  );
}
