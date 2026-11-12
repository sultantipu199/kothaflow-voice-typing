import JSZip from 'jszip';
import { NATIVE_BUILD_FILES } from '../data/presets';

function saveBlob(blob: Blob, filename: string, fallbackApiUrl?: string) {
  try {
    // If inside an iframe and fallback URL is provided, open direct server download as priority
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (isInIframe && fallbackApiUrl) {
      const link = document.createElement('a');
      link.href = fallbackApiUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (err) {
    console.warn('saveBlob error, falling back to server download:', err);
    if (fallbackApiUrl) {
      window.open(fallbackApiUrl, '_blank');
    }
  }
}

export async function downloadDesktopBundleZip(): Promise<void> {
  const fallbackUrl = '/api/download/desktop-kit';
  try {
    const zip = new JSZip();

    // Root folder in zip
    const folder = zip.folder('KothaFlow-Desktop-App');
    if (!folder) {
      window.open(fallbackUrl, '_blank');
      return;
    }

  // 1. package.json
  const packageJson = {
    name: 'kothaflow-desktop',
    version: '1.0.0',
    description: 'KothaFlow Voice Typing Desktop App (Wispr Flow style global voice typing)',
    main: 'electron-main.cjs',
    scripts: {
      start: 'electron .',
      build: 'electron-builder',
    },
    dependencies: {
      '@google/genai': '^0.1.1',
      electron: '^33.2.0',
      robotjs: '^0.6.0',
    },
  };
  folder.file('package.json', JSON.stringify(packageJson, null, 2));

  // 2. electron-main.cjs
  folder.file('electron-main.cjs', NATIVE_BUILD_FILES.electronMain);

  // 3. Simple floating HTML bar
  const overlayHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>KothaFlow Floating Bar</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    .pill {
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(59, 130, 246, 0.5);
      border-radius: 9999px;
      padding: 8px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59, 130, 246, 0.3);
      backdrop-filter: blur(12px);
    }
    .dot {
      width: 12px;
      height: 12px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1.2s infinite;
    }
    .status-text {
      font-size: 13px;
      font-weight: 500;
    }
    .hint {
      font-size: 11px;
      color: #94a3b8;
      border-left: 1px solid #334155;
      padding-left: 8px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
  </style>
</head>
<body>
  <div class="pill">
    <div class="dot"></div>
    <div class="status-text">KothaFlow শুনছে... কথা বলুন</div>
    <div class="hint">Ctrl+Shift+Space ছেড়ে দিন</div>
  </div>
</body>
</html>`;
  folder.file('overlay.html', overlayHtml);

  // 4. Windows 1-Click Batch Runner
  const runBat = `@echo off
echo ========================================================
echo   KothaFlow Desktop Voice Typing - Starting...
echo   (Wispr Flow Style Global Hotkey Voice Typing)
echo ========================================================
echo.
if not exist node_modules (
    echo [*] Installing dependencies (first time run)...
    npm install
)
echo [*] Launching KothaFlow Global Listener...
echo [*] Press Ctrl+Shift+Space in ANY app (Word, Notepad, Chrome) to dictate!
npm start
pause
`;
  folder.file('run-windows.bat', runBat);

  // 5. Mac / Linux 1-Click Shell Runner
  const runSh = `#!/bin/bash
echo "========================================================"
echo "  KothaFlow Desktop Voice Typing - Starting..."
echo "========================================================"
if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies..."
    npm install
fi
echo "[*] Launching KothaFlow Desktop..."
npm start
`;
  folder.file('run-mac-linux.sh', runSh);

  // 6. Comprehensive Bengali & English README
  const readmeMd = `# KothaFlow Desktop Voice Typing (উইন্ডোজ ও ম্যাক গাইড)

KothaFlow ডেস্কটপ অ্যাপের মাধ্যমে আপনি আপনার কম্পিউটারের যে কোনো সফটওয়্যারে (MS Word, Notepad, VS Code, Google Chrome, WhatsApp, Notion, ইত্যাদি) যেখানে কার্সার রাখবেন, সেখানে গ্লোবাল শর্টকাট চেপে মুখে বলে সরাসরি বাংলা ও ইংরেজিতে টাইপ করতে পারবেন।

## কম্পিউটার ইনস্টল করার নিয়ম (Windows / Mac / Linux):

### পদ্ধতি ১: Node.js থাকলে (সবচেয়ে সহজ)
1. এই ফোল্ডারের ফাইলগুলো আপনার কম্পিউটারে কোনো একটি ফোল্ডারে আনজিপ (Extract) করুন।
2. যদি আপনার পিসিতে Node.js ইনস্টল করা না থাকে, তবে [nodejs.org](https://nodejs.org) থেকে সহজে ইনস্টল করে নিন।
3. **উইন্ডোজের জন্য:** শুধুমাত্র \`run-windows.bat\` ফাইলটিতে ডাবল ক্লিক করুন।
4. **ম্যাক/লিনাক্সের জন্য:** টার্মিনালে \`chmod +x run-mac-linux.sh && ./run-mac-linux.sh\` কমান্ডটি চালান।
5. প্রথমবার প্রয়োজনীয় প্যাকেজ ইনস্টল হয়ে অ্যাপটি ব্যাকগ্রাউন্ডে চালু হয়ে যাবে।

### কীভাবে ব্যবহার করবেন:
1. যে কোনো সফটওয়্যার বা লেখার বক্সে ক্লিক করে কার্সার রাখুন।
2. কীবোর্ডে **\`Ctrl + Shift + Space\`** চাপুন (ম্যাকে \`Command + Shift + Space\`)।
3. নিচে ছোট ফ্ল্যাটিং বার দেখা যাবে। মুখে কথা বলুন (বাংলা, ইংরেজি বা বাংলিশ)।
4. হটকি ছেড়ে দেওয়া মাত্রই জেমিনি এআই আপনার কথা থেকে 'um', 'আআ', অদরকারি কথা বাদ দিয়ে সঠিক দাঁড়ি, কমা সহ স্বয়ংক্রিয়ভাবে কার্সারে টাইপ করে দেবে!

---
KothaFlow - Powered by Google Gemini AI
`;
  folder.file('README-DESKTOP.md', readmeMd);

  const content = await zip.generateAsync({ type: 'blob' });
  saveBlob(content, 'KothaFlow-Desktop-Kit-v1.zip', fallbackUrl);
} catch (err) {
  console.warn('Desktop zip generation error:', err);
  window.open(fallbackUrl, '_blank');
}
}

export async function downloadAndroidImeZip(): Promise<void> {
  const fallbackUrl = '/api/download/android-kit';
  try {
    const zip = new JSZip();

    const folder = zip.folder('KothaFlow-Android-Keyboard');
    if (!folder) {
      window.open(fallbackUrl, '_blank');
      return;
    }

  // AndroidManifest.xml
  folder.file('app/src/main/AndroidManifest.xml', NATIVE_BUILD_FILES.androidManifest);

  // VoiceFlowInputMethodService.kt
  folder.file(
    'app/src/main/java/com/kothaflow/ime/VoiceFlowInputMethodService.kt',
    NATIVE_BUILD_FILES.androidImeService
  );

  // res/xml/method.xml
  const methodXml = `<?xml version="1.0" encoding="utf-8"?>
<input-method xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.kothaflow.ime.SettingsActivity"
    android:isDefault="false">
    <subtype
        android:label="KothaFlow Voice Keyboard"
        android:imeSubtypeLocale="bn_BD"
        android:imeSubtypeMode="voice" />
    <subtype
        android:label="KothaFlow Voice English"
        android:imeSubtypeLocale="en_US"
        android:imeSubtypeMode="voice" />
</input-method>`;
  folder.file('app/src/main/res/xml/method.xml', methodXml);

  // res/layout/voice_keyboard_view.xml
  const keyboardLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:background="#0F172A"
    android:padding="16dp">

    <TextView
        android:id="@+id/tvStatus"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="KothaFlow: কথা বলার জন্য মাইক চাপুন"
        android:textColor="#94A3B8"
        android:textSize="14sp"
        android:layout_gravity="center_horizontal"
        android:layout_marginBottom="12dp" />

    <ImageButton
        android:id="@+id/btnMic"
        android:layout_width="72dp"
        android:layout_height="72dp"
        android:layout_gravity="center_horizontal"
        android:background="@android:drawable/btn_default"
        android:src="@android:drawable/ic_btn_speak_now"
        android:contentDescription="ভয়েস রেকর্ড করুন" />

</LinearLayout>`;
  folder.file('app/src/main/res/layout/voice_keyboard_view.xml', keyboardLayout);

  // build.gradle.kts (App level)
  const buildGradle = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.kothaflow.ime"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kothaflow.ime"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}`;
  folder.file('app/build.gradle.kts', buildGradle);

  // README-ANDROID.md
  const readmeAndroid = `# KothaFlow Android Custom Keyboard (IME APK বিল্ড গাইড)

এই প্রজেক্টটি একটি ফুল-ফিচার্ড Android InputMethodService (IME)। এটি ফোনে ইনস্টল করলে আপনার কীবোর্ডে একটি ডেডিকেটেড KothaFlow ভয়েস টাইপিং কীবোর্ড যুক্ত হবে, যার মাধ্যমে আপনি WhatsApp, Messenger, Gmail, Facebook, Chrome সহ যেকোনো অ্যাপে সরাসরি মুখে বলে অটোমেটিক নির্ভুল টাইপিং করতে পারবেন!

## Android APK বিল্ড করার সহজ নিয়ম:

1. আপনার কম্পিউটারে **Android Studio** ওপেন করুন।
2. **Open Existing Project**-এ ক্লিক করে এই আনজিপ করা ফোল্ডারটি সিলেক্ট করুন।
3. Gradle Sync শেষ হতে কিছুক্ষণ সময় দিন।
4. মেনু থেকে যান: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**।
5. কয়েক সেকেন্ডের মধ্যে আপনার জন্য \`app-debug.apk\` তৈরি হয়ে যাবে!
6. APK ফাইলটি আপনার অ্যান্ড্রয়েড মোবাইলে নিয়ে গিয়ে ইনস্টল (Install) করুন।

## মোবাইলে চালু করার নিয়ম:
1. ফোনের **Settings -> System -> Languages & Input -> Manage Keyboards** এ যান।
2. **KothaFlow Voice Keyboard** অপশনটি চালু (Enable) করে দিন।
3. এবার WhatsApp বা যেকোনো অ্যাপে মেসেজ লেখার সময় কীবোর্ডের নিচের ডানদিকের কীবোর্ড আইকনে ট্যাপ করে **KothaFlow** সিলেক্ট করুন।
4. মাইক চাপুন, কথা বলুন - স্বয়ংক্রিয়ভাবে নির্ভুল টেক্সট টাইপ হয়ে যাবে!
`;
  folder.file('README-ANDROID.md', readmeAndroid);

  const content = await zip.generateAsync({ type: 'blob' });
  saveBlob(content, 'KothaFlow-Android-Keyboard-Kit-v1.zip', fallbackUrl);
} catch (err) {
  console.warn('Android IME zip generation error:', err);
  window.open(fallbackUrl, '_blank');
}
}
