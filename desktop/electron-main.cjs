const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const autoHealer = require('./auto-healer.cjs');

let bubbleWindow = null;
let tray = null;
let isRecording = false;
let currentLang = 'bn-BD';

function ensureDesktopShortcut() {
  if (process.platform !== 'win32') return;
  try {
    const exePath = process.execPath;
    if (!exePath || path.basename(exePath).toLowerCase().includes('electron')) return;

    const script = `$w = New-Object -ComObject WScript.Shell; $d = [System.Environment]::GetFolderPath('Desktop'); $lnk = Join-Path $d 'KothaFlow.lnk'; if (-not (Test-Path $lnk)) { $s = $w.CreateShortcut($lnk); $s.TargetPath = '${exePath.replace(/'/g, "''")}'; $s.Description = 'KothaFlow Voice Typing (Wispr Flow Style)'; $s.Save(); }`;
    exec(`powershell -WindowStyle Hidden -Command "${script}"`);
  } catch (_) {}
}

function createBubbleWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  bubbleWindow = new BrowserWindow({
    width: 64,
    height: 64,
    x: width - 90,
    y: height - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    focusable: false, // Never steals keyboard focus from Word, Notepad, Chrome, WhatsApp!
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  bubbleWindow.loadFile(path.join(__dirname, 'overlay.html'));
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  bubbleWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  bubbleWindow.webContents.on('will-navigate', (event) => event.preventDefault());
}

let tempVbsPath = null;
function getTempVbs() {
  if (tempVbsPath && fs.existsSync(tempVbsPath)) return tempVbsPath;
  try {
    tempVbsPath = path.join(app.getPath('temp'), 'kothaflow_paste.vbs');
    const vbs = 'Set sh = CreateObject("WScript.Shell")\r\nWScript.Sleep 40\r\nsh.SendKeys "^v"\r\n';
    fs.writeFileSync(tempVbsPath, vbs, 'utf8');
    return tempVbsPath;
  } catch (e) {
    return null;
  }
}

function pasteAtCursor(rawText) {
  if (!rawText || rawText.trim() === '') return;

  // Auto-Healing & Adaptive Vocabulary Enhancement
  let cleaned = '';
  try {
    cleaned = autoHealer.adaptAndEnhanceText(rawText);
  } catch (_) {}
  if (!cleaned || cleaned.trim() === '') cleaned = rawText;

  const toPaste = cleaned.trim() + ' ';
  clipboard.writeText(toPaste);

  // Directly paste into active cursor in Word, Notepad, Chrome, WhatsApp
  setTimeout(() => {
    if (process.platform === 'win32') {
      const vbs = getTempVbs();
      if (vbs) {
        exec(`wscript //nologo "${vbs}"`, (err) => {
          if (err) {
            exec(`powershell -WindowStyle Hidden -Command "$w = New-Object -ComObject wscript.shell; Start-Sleep -m 40; $w.SendKeys('^v')"`);
          }
        });
      } else {
        exec(`powershell -WindowStyle Hidden -Command "$w = New-Object -ComObject wscript.shell; Start-Sleep -m 40; $w.SendKeys('^v')"`);
      }
    } else if (process.platform === 'darwin') {
      exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    } else {
      exec(`xdotool key ctrl+v`);
    }
  }, 40);
}

app.whenReady().then(() => {
  createBubbleWindow();
  ensureDesktopShortcut();

  // Auto-Healing: Clamp window position on screen resolution change
  const { screen } = require('electron');
  screen.on('display-metrics-changed', () => {
    autoHealer.healWindowPosition(bubbleWindow);
  });

  // Create System Tray
  try {
    const iconPath = path.join(__dirname, 'icon.ico');
    tray = new Tray(iconPath);
    const trayMenu = Menu.buildFromTemplate([
      { label: '🎙️ KothaFlow Voice Typing', enabled: false },
      { label: '⌨️ শর্টকাট: F8 অথবা Ctrl+Shift+Space', enabled: false },
      { type: 'separator' },
      {
        label: '👁️ বাবল দেখান / লুকান',
        click: () => {
          if (!bubbleWindow) return;
          if (bubbleWindow.isVisible()) bubbleWindow.hide();
          else bubbleWindow.show();
        }
      },
      {
        label: '🇧🇩 বাংলা ভাষা',
        click: () => {
          currentLang = 'bn-BD';
          bubbleWindow && bubbleWindow.webContents.send('switch-lang', 'bn-BD');
        }
      },
      {
        label: '🇺🇸 English',
        click: () => {
          currentLang = 'en-US';
          bubbleWindow && bubbleWindow.webContents.send('switch-lang', 'en-US');
        }
      },
      { type: 'separator' },
      {
        label: '🔑 Groq API Key সেট করুন',
        click: () => {
          bubbleWindow && bubbleWindow.webContents.send('open-api-modal');
        }
      },
      { label: '🛡️ অটো-হিলিং ও প্রাইভেসি: সক্রিয়', enabled: false },
      {
        label: '🔄 নতুন আপডেট চেক করুন',
        click: () => {
          autoHealer.checkForUpdates((err, res) => {
            if (res && res.hasUpdate) {
              dialog.showMessageBox({
                type: 'info',
                title: 'KothaFlow আপডেট উপলব্ধ',
                message: `KothaFlow-এর নতুন ভার্সন (${res.latestVersion}) প্রকাশিত হয়েছে!`,
                buttons: ['ডাউনলোড করুন', 'পরে']
              }).then(choice => {
                if (choice.response === 0 && res.downloadUrl) {
                  shell.openExternal(res.downloadUrl);
                }
              });
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: 'KothaFlow আপ-টু-ডেট',
                message: 'আপনার KothaFlow সংস্করণটি সম্পূর্ণ লেটেস্ট ও অটো-হিলিং সুরক্ষিত।'
              });
            }
          });
        }
      },
      { type: 'separator' },
      { label: '❌ KothaFlow বন্ধ করুন (Exit)', click: () => app.quit() }
    ]);
    tray.setToolTip('KothaFlow Voice Typing (F8 বা Ctrl+Shift+Space)');
    tray.setContextMenu(trayMenu);
    tray.on('click', () => {
      if (!bubbleWindow) return;
      if (bubbleWindow.isVisible()) bubbleWindow.hide();
      else bubbleWindow.show();
    });
  } catch (err) {
    console.log('Tray note:', err.message);
  }

  // Bubble Mode resize (compact vs expanded)
  ipcMain.on('set-bubble-mode', (event, mode) => {
    if (!bubbleWindow) return;
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    const currentBounds = bubbleWindow.getBounds();

    if (mode === 'expanded') {
      const newWidth = 320;
      const newHeight = 64;
      const newX = Math.max(10, Math.min(width - newWidth - 10, currentBounds.x - 250));
      bubbleWindow.setBounds({ x: newX, y: currentBounds.y, width: newWidth, height: newHeight });
    } else {
      bubbleWindow.setBounds({ x: currentBounds.x, y: currentBounds.y, width: 64, height: 64 });
    }
  });

  // Smooth dragging
  ipcMain.on('move-bubble', (event, { dx, dy }) => {
    if (!bubbleWindow) return;
    const [x, y] = bubbleWindow.getPosition();
    bubbleWindow.setPosition(x + dx, y + dy);
  });

  // Groq API Key Storage Handlers
  ipcMain.handle('get-groq-key', () => {
    try {
      const candidatePaths = [
        path.join(app.getPath('userData'), 'groq_key.txt'),
        path.join(__dirname, 'groq_key.txt'),
        path.join(process.resourcesPath || '', 'groq_key.txt')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const key = fs.readFileSync(p, 'utf8').trim();
          if (key) return key;
        }
      }
    } catch (e) {}
    return '';
  });

  ipcMain.on('save-groq-key', (event, key) => {
    try {
      const userDir = app.getPath('userData');
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, 'groq_key.txt'), (key || '').trim(), 'utf8');
    } catch (e) {}
  });

  // Commit text from renderer and auto-paste directly into active write box
  ipcMain.on('commit-speech', (event, text) => {
    pasteAtCursor(text);
  });

  // Language switch
  ipcMain.on('set-language', (event, lang) => {
    currentLang = lang;
  });

  // Global Shortcuts: F8 & Ctrl+Shift+Space (Push-to-Talk / Toggle)
  globalShortcut.register('F8', () => {
    if (bubbleWindow) {
      bubbleWindow.webContents.send('toggle-recording-hotkey');
    }
  });

  globalShortcut.register('Ctrl+Shift+Space', () => {
    if (bubbleWindow) {
      bubbleWindow.webContents.send('toggle-recording-hotkey');
    }
  });

  // Context Menu
  ipcMain.on('show-context-menu', (event) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🇧🇩 বাংলা ভাষা',
        click: () => {
          currentLang = 'bn-BD';
          bubbleWindow.webContents.send('switch-lang', 'bn-BD');
        }
      },
      {
        label: '🇺🇸 English',
        click: () => {
          currentLang = 'en-US';
          bubbleWindow.webContents.send('switch-lang', 'en-US');
        }
      },
      { type: 'separator' },
      {
        label: '🔑 Groq API Key সেট করুন',
        click: () => {
          bubbleWindow.webContents.send('open-api-modal');
        }
      },
      { label: '⌨️ শর্টকাট: F8 বা Ctrl+Shift+Space', enabled: false },
      { label: '🛡️ অটো-হিলিং ইঞ্জিন: সক্রিয়', enabled: false },
      {
        label: '🔄 নতুন আপডেট চেক করুন',
        click: () => {
          autoHealer.checkForUpdates((err, res) => {
            if (res && res.hasUpdate) {
              dialog.showMessageBox({
                type: 'info',
                title: 'KothaFlow আপডেট',
                message: `নতুন ভার্সন (${res.latestVersion}) প্রকাশিত হয়েছে!`,
                buttons: ['ডাউনলোড করুন', 'পরে']
              }).then(choice => {
                if (choice.response === 0 && res.downloadUrl) {
                  shell.openExternal(res.downloadUrl);
                }
              });
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: 'KothaFlow আপ-টু-ডেট',
                message: 'আপনার অ্যাপটি সম্পূর্ণ আপ-টু-ডেট।'
              });
            }
          });
        }
      },
      { label: '👁️ বাবল হাইড করুন (Hide)', click: () => bubbleWindow.hide() },
      { label: '❌ KothaFlow বন্ধ করুন (Exit)', click: () => app.quit() }
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });

  console.log('[KothaFlow] Desktop Bubble is active! Global Shortcuts: F8, Ctrl+Shift+Space');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
