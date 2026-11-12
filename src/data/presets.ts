import {
  AppSettings,
  HistoryItem,
  SampleVoiceClip,
  SnippetItem,
  TargetAppId,
} from '../types/voice';

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Ctrl+Shift+Space',
  recordingMode: 'hold',
  languageHint: 'auto',
  tone: 'natural',
  selectedMicId: 'default',
  autoStartOs: true,
  darkMode: false,
  wakeWordOptIn: false,
  liveStreamingPreview: true,
  emojiCommands: true,
  sensitiveWarningEnabled: true,
  floatingWidgetEnabled: true,
  autoPopupOnFocus: true,
};

export const DEFAULT_DICTIONARY: string[] = [
  'KothaFlow',
  'Tipu',
  'Dhaka',
  'FastAPI',
  'Jetpack Compose',
  'TypeScript',
  'PostgreSQL',
  'Sylhet',
  'Next.js',
  'InputMethodService',
];

export const DEFAULT_SNIPPETS: SnippetItem[] = [
  {
    id: 'snip-email',
    trigger: 'my email',
    expansion: 'tipu@example.com',
    description: 'Inserts primary work email address',
  },
  {
    id: 'snip-github',
    trigger: 'my github',
    expansion: 'https://github.com/tipu-dev',
    description: 'Inserts GitHub profile link',
  },
  {
    id: 'snip-calendar',
    trigger: 'my calendar',
    expansion: 'https://cal.com/tipu/30min',
    description: 'Inserts meeting booking URL',
  },
  {
    id: 'snip-signoff-bn',
    trigger: 'bangla signoff',
    expansion: 'ধন্যবাদান্তে,\nটিপু সুলতান',
    description: 'Formal Bangla email closing',
  },
];

export const SAMPLE_VOICE_CLIPS: SampleVoiceClip[] = [
  {
    id: 'sample-bangla-filler',
    title: 'Bangla + Filler Removal',
    subtitle: 'Removes "আআ", "এই যে", "মানে" and adds দাঁড়ি (।)',
    languageLabel: 'বাংলা (Bangla)',
    spokenRaw:
      'আআ আজকে বিকেলে এই যে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে দাড়ি সবাই একটু চেক করে জানাবেন দাঁড়ি',
    expectedCleaned:
      'আজকে বিকেলে আমাদের KothaFlow প্রজেক্টের নতুন আপডেট রিলিজ হবে। সবাই একটু চেক করে জানাবেন।',
    language: 'bn',
    command: null,
    recommendedTone: 'natural',
    durationSec: 4.8,
  },
  {
    id: 'sample-banglish-chat',
    title: 'Banglish Casual Chat',
    subtitle: 'Mixed Bangla-in-English letters + dictionary casing',
    languageLabel: 'Banglish',
    spokenRaw:
      'um bhai ami ajke dhaka theke kothaflow er android keyboard test kortesi নতুন লাইন kal সকালে কথা হবে thumbs up',
    expectedCleaned:
      'Bhai ami ajke Dhaka theke KothaFlow er android keyboard test kortesi\nKal সকালে কথা হবে 👍',
    language: 'banglish',
    command: null,
    recommendedTone: 'casual',
    durationSec: 5.2,
  },
  {
    id: 'sample-english-email',
    title: 'English Email + Snippet',
    subtitle: 'Expands "my email" snippet & strips "um/uh" stutters',
    languageLabel: 'English',
    spokenRaw:
      'um hi team uh please send the signed APK build logs to my email full stop new line we will deploy the fastapi backend by Friday full stop',
    expectedCleaned:
      'Hi team, please send the signed APK build logs to tipu@example.com.\nWe will deploy the FastAPI backend by Friday.',
    language: 'en',
    command: null,
    recommendedTone: 'email',
    durationSec: 6.1,
  },
  {
    id: 'sample-mixed-tech',
    title: 'Code-Switching Technical Note',
    subtitle: 'Bangla + English technical terms (TypeScript, Jetpack Compose)',
    languageLabel: 'Mixed (BN + EN)',
    spokenRaw:
      'উম আমাদের android app এ jetpack compose আর typescript backend একসাথে কাজ করছে নতুন লাইন my github এ কোড পুশ করা আছে দাঁড়ি',
    expectedCleaned:
      'আমাদের android app এ Jetpack Compose আর TypeScript backend একসাথে কাজ করছে\nhttps://github.com/tipu-dev এ কোড পুশ করা আছে।',
    language: 'mixed',
    command: null,
    recommendedTone: 'code',
    durationSec: 5.5,
  },
  {
    id: 'sample-command-delete',
    title: 'Voice Command: "delete last sentence"',
    subtitle: 'Triggers command mode to remove the previous sentence at cursor',
    languageLabel: 'Command',
    spokenRaw: 'delete last sentence',
    expectedCleaned: '',
    language: 'en',
    command: 'delete',
    recommendedTone: 'natural',
    durationSec: 1.6,
  },
];

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    rawText:
      'আআ ভাই আমরা আজকে KothaFlow এর ডেস্কটপ হটকি এবং অ্যান্ড্রয়েড কিবোর্ড দুটিই চেক করেছি দাঁড়ি',
    cleanedText:
      'ভাই আমরা আজকে KothaFlow এর ডেস্কটপ হটকি এবং অ্যান্ড্রয়েড কিবোর্ড দুটিই চেক করেছি।',
    language: 'bn',
    tone: 'natural',
    command: null,
    timestamp: '10:42 AM',
    durationSec: 4.4,
    wordCount: 14,
    targetApp: 'whatsapp',
    appliedSnippets: [],
    appliedDictionary: ['KothaFlow'],
  },
  {
    id: 'hist-2',
    rawText:
      'um please forward the accessibility permission guide to my email full stop',
    cleanedText:
      'Please forward the accessibility permission guide to tipu@example.com.',
    language: 'en',
    tone: 'email',
    command: null,
    timestamp: '10:18 AM',
    durationSec: 3.9,
    wordCount: 9,
    targetApp: 'gmail',
    appliedSnippets: ['my email'],
    appliedDictionary: [],
  },
  {
    id: 'hist-3',
    rawText:
      'ami sylhet theke fastapi server deploy korechi নতুন লাইন check my github',
    cleanedText:
      'Ami Sylhet theke FastAPI server deploy korechi\nCheck https://github.com/tipu-dev',
    language: 'banglish',
    tone: 'casual',
    command: null,
    timestamp: '09:50 AM',
    durationSec: 4.1,
    wordCount: 10,
    targetApp: 'notion',
    appliedSnippets: ['my github'],
    appliedDictionary: ['Sylhet', 'FastAPI'],
  },
];

export const TARGET_APP_PRESETS: Record<
  TargetAppId,
  {
    name: string;
    contextHint: string;
    recommendedTone: 'casual' | 'email' | 'code' | 'natural';
    placeholder: string;
    initialContent: string;
  }
> = {
  whatsapp: {
    name: 'WhatsApp / Messenger',
    contextHint: 'Casual chat · Banglish & Bangla friendly',
    recommendedTone: 'casual',
    placeholder: 'Type a message to Team Dhaka...',
    initialContent: 'শোনো, আজকে রাত ৯টায় প্রজেক্ট সিঙ্ক মিটিং আছে।',
  },
  gmail: {
    name: 'Gmail Compose',
    contextHint: 'Formal email · Auto-greetings & punctuation',
    recommendedTone: 'email',
    placeholder: 'Compose email body...',
    initialContent:
      'Hi Engineering Team,\n\nHere is the status update for our voice dictation build.',
  },
  vscode: {
    name: 'VS Code Editor',
    contextHint: 'Technical comments & commit messages',
    recommendedTone: 'code',
    placeholder: '// Dictate code comments or PR descriptions...',
    initialContent:
      '// Verify InputMethodService commitText() latency under 400ms on Android 14.',
  },
  notion: {
    name: 'Notion Spec Doc',
    contextHint: 'Structured paragraphs & meeting notes',
    recommendedTone: 'natural',
    placeholder: 'Dictate notes, paragraphs, or action items...',
    initialContent:
      'Sprint 4 Action Items:\n1. Test microphone noise suppression with fan background.',
  },
};

export const NATIVE_BUILD_FILES = {
  electronMain: `// main.js — Electron Global Hotkey + Clipboard Paste at Cursor (Part 7 Spec)
const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu } = require('electron');
const path = require('path');
const { keyboard, Key } = require('@nut-tree-fork/nut-js');

let mainWindow;
let overlayWindow;
let tray;
let isRecording = false;

function createWindows() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  mainWindow.loadURL('http://localhost:3000');

  // Floating Pill Overlay at bottom of screen (Part 9 Spec)
  overlayWindow = new BrowserWindow({
    width: 320,
    height: 56,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: { contextIsolation: true },
  });
}

app.whenReady().then(() => {
  createWindows();

  // Register Global Push-to-Talk / Toggle Hotkey
  const hotkey = 'CommandOrControl+Shift+Space';
  const registered = globalShortcut.register(hotkey, () => {
    isRecording = !isRecording;
    mainWindow.webContents.send('hotkey-triggered', { isRecording });
    overlayWindow.showInactive();
  });

  if (!registered) {
    console.warn('Hotkey conflict detected for:', hotkey);
  }

  // Receive cleaned transcript from Renderer & insert at active OS cursor
  ipcMain.handle('insert-text-at-cursor', async (_event, cleanedText) => {
    if (!cleanedText) return { ok: false };
    clipboard.writeText(cleanedText);

    try {
      const modifier = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl;
      await keyboard.pressKey(modifier, Key.V);
      await keyboard.releaseKey(modifier, Key.V);
      return { ok: true, method: 'simulated-paste' };
    } catch (err) {
      // Fallback: keep in clipboard and notify user
      return { ok: true, method: 'clipboard-fallback', error: err.message };
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});`,

  tauriRust: `// src-tauri/src/main.rs — Tauri Lightweight Rust Global Shortcut + Enigo Paste (Part 7 Option 2)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use enigo::{Enigo, Key, Keyboard, Settings};
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[tauri::command]
fn insert_at_cursor(text: String) -> Result<String, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo.key(modifier, enigo::Direction::Press).ok();
    enigo.key(Key::Unicode('v'), enigo::Direction::Click).ok();
    enigo.key(modifier, enigo::Direction::Release).ok();

    Ok("Inserted via OS paste simulation".into())
}`,

  androidImeService: `// VoiceFlowInputMethodService.kt — Custom Android Keyboard IME (Part 8 Spec)
package com.kothaflow.ime

import android.inputmethodservice.InputMethodService
import android.media.MediaRecorder
import android.view.View
import android.view.inputmethod.InputConnection
import androidx.compose.ui.platform.ComposeView
import kotlinx.coroutines.*
import java.io.File

class VoiceFlowInputMethodService : InputMethodService() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null

    override fun onCreateInputView(): View {
        return ComposeView(this).apply {
            setContent {
                KothaFlowKeyboardBar(
                    onHoldStart = { startRecording() },
                    onHoldRelease = { stopAndTranscribe() }
                )
            }
        }
    }

    private fun startRecording() {
        audioFile = File(cacheDir, "ephemeral_dictation.m4a")
        mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(16000)
            setOutputFile(audioFile!!.absolutePath)
            prepare()
            start()
        }
    }

    private fun stopAndTranscribe() {
        try {
            mediaRecorder?.stop()
        } catch (_: Exception) {}
        mediaRecorder?.release()
        mediaRecorder = null

        val recordedFile = audioFile ?: return
        serviceScope.launch {
            try {
                val result = GeminiImeClient.transcribeAudio(
                    file = recordedFile,
                    tone = PrefsStore.getTone(applicationContext),
                    dictionary = PrefsStore.getDictionary(applicationContext)
                )
                val ic: InputConnection? = currentInputConnection
                when (result.command) {
                    "delete" -> ic?.deleteSurroundingText(60, 0)
                    "newline" -> ic?.commitText("\\n", 1)
                    "paragraph" -> ic?.commitText("\\n\\n", 1)
                    else -> if (result.text.isNotEmpty()) {
                        val processed = PostProcessor.applySnippetsAndDict(result.text)
                        ic?.commitText("$processed ", 1)
                    }
                }
            } finally {
                // Privacy Rule (Part 12): Delete temp audio immediately after transcription
                recordedFile.delete()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}`,

  androidManifest: `<!-- AndroidManifest.xml & res/xml/method.xml (Part 8 Spec) -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kothaflow.ime">

    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="KothaFlow Voice Keyboard"
        android:supportsRtl="true">

        <!-- Custom Voice Keyboard IME Service -->
        <service
            android:name=".VoiceFlowInputMethodService"
            android:label="KothaFlow Voice Typing"
            android:permission="android.permission.BIND_INPUT_METHOD"
            android:exported="true">
            <intent-filter>
                <action android:name="android.view.InputMethod" />
            </intent-filter>
            <meta-data
                android:name="android.view.im"
                android:resource="@xml/method" />
        </service>

        <!-- Settings & Dictionary Configuration Activity -->
        <activity
            android:name=".SettingsActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>

<!-- res/xml/method.xml -->
<?xml version="1.0" encoding="utf-8"?>
<input-method xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.kothaflow.ime.SettingsActivity"
    android:supportsSwitchingToNextInputMethod="true">
    <subtype
        android:label="Bangla / English / Banglish (Auto)"
        android:imeSubtypeLocale="bn_BD"
        android:imeSubtypeMode="voice" />
</input-method>`,
};
