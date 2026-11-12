const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, exec } = require('child_process');

let bubbleWindow = null;
let tray = null;
let isRecording = false;
let currentLang = 'bn-BD';
let edgeProcess = null;
let pendingCommandResolver = null;
let latestSpokenText = '';

// 1. Local HTTP Speech Worker Server on 127.0.0.1:39485
const server = http.createServer((req, res) => {
  if (req.url === '/speech-worker.html') {
    const workerPath = path.join(__dirname, 'speech-worker.html');
    fs.readFile(workerPath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading worker');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      }
    });
  } else if (req.url === '/get-command') {
    pendingCommandResolver = (cmd) => {
      try {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cmd));
      } catch (_) {}
    };
  } else if (req.url === '/transcribe-update') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        latestSpokenText = data.text || '';
        if (bubbleWindow) {
          bubbleWindow.webContents.send('worker-text-stream', data.text);
        }
        if (data.isFinal && isRecording) {
          isRecording = false;
          pasteAtCursor(data.text);
          if (bubbleWindow) {
            bubbleWindow.webContents.send('recording-stopped');
          }
        }
      } catch (_) {}
      res.writeHead(200);
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(39485, '127.0.0.1', () => {
  console.log('[KothaFlow] Speech worker server running on http://127.0.0.1:39485');
});

function sendWorkerCommand(cmd) {
  if (pendingCommandResolver) {
    const resolver = pendingCommandResolver;
    pendingCommandResolver = null;
    resolver(cmd);
  }
}

// 2. Launch Silent Background Edge Speech Bridge
function launchEdgeWorker() {
  if (process.platform !== 'win32') return;

  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];

  const exe = edgePaths.find(p => fs.existsSync(p));
  if (exe) {
    try {
      const url = 'http://127.0.0.1:39485/speech-worker.html';
      const args = [
        `--app=${url}`,
        '--window-position=-3000,-3000',
        '--window-size=200,200',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions'
      ];
      edgeProcess = spawn(exe, args, { detached: true, stdio: 'ignore' });
      console.log('[KothaFlow] Background Edge Speech Bridge launched.');
    } catch (err) {
      console.warn('[KothaFlow] Could not launch Edge Speech Bridge:', err.message);
    }
  }
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
    focusable: false, // Prevents taking focus away from Word, Notepad, Chrome, WhatsApp!
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

function startListening() {
  if (isRecording) return;
  isRecording = true;
  latestSpokenText = '';
  sendWorkerCommand({ action: 'start', lang: currentLang });
  if (bubbleWindow) {
    bubbleWindow.webContents.send('recording-started', currentLang);
  }
}

function stopListeningAndPaste() {
  if (!isRecording) return;
  sendWorkerCommand({ action: 'stop' });

  // Backup fallback: if worker does not return final within 800ms, paste whatever was heard
  setTimeout(() => {
    if (isRecording) {
      isRecording = false;
      if (latestSpokenText) {
        pasteAtCursor(latestSpokenText);
      }
      if (bubbleWindow) {
        bubbleWindow.webContents.send('recording-stopped');
      }
    }
  }, 800);
}

function pasteAtCursor(text) {
  if (!text || text.trim() === '') return;
  const toPaste = text.trim() + ' ';
  clipboard.writeText(toPaste);

  // Directly paste into the active cursor in Word, Notepad, Chrome, WhatsApp
  setTimeout(() => {
    if (process.platform === 'win32') {
      const vbsPath = path.join(__dirname, 'paste.vbs');
      exec(`wscript //nologo "${vbsPath}"`, (err) => {
        if (err) {
          exec(`powershell -WindowStyle Hidden -Command "$w = New-Object -ComObject wscript.shell; $w.SendKeys('^v')"`);
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    } else {
      exec(`xdotool key ctrl+v`);
    }
  }, 30);
}

function ensureDesktopShortcut() {
  if (process.platform !== 'win32') return;
  try {
    const exePath = process.execPath;
    if (!exePath || path.basename(exePath).toLowerCase().includes('electron')) return;

    const script = `$w = New-Object -ComObject WScript.Shell; $d = [System.Environment]::GetFolderPath('Desktop'); $lnk = Join-Path $d 'KothaFlow.lnk'; if (-not (Test-Path $lnk)) { $s = $w.CreateShortcut($lnk); $s.TargetPath = '${exePath.replace(/'/g, "''")}'; $s.Description = 'KothaFlow Voice Typing (Wispr Flow Style)'; $s.Save(); }`;
    exec(`powershell -WindowStyle Hidden -Command "${script}"`);
  } catch (_) {}
}

app.whenReady().then(() => {
  createBubbleWindow();
  launchEdgeWorker();
  ensureDesktopShortcut();

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

  // Bubble Mode resize
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

  // Hold-to-speak via Mouse
  ipcMain.on('start-speech-hold', () => {
    startListening();
  });

  ipcMain.on('stop-speech-hold', () => {
    stopListeningAndPaste();
  });

  // Toggle click
  ipcMain.on('toggle-speech-click', () => {
    if (!isRecording) {
      startListening();
    } else {
      stopListeningAndPaste();
    }
  });

  // Commit text from renderer (fallback)
  ipcMain.on('commit-speech', (event, text) => {
    pasteAtCursor(text);
  });

  // Language switch from renderer
  ipcMain.on('set-language', (event, lang) => {
    currentLang = lang;
  });

  // Global Shortcuts: F8 & Ctrl+Shift+Space
  globalShortcut.register('F8', () => {
    if (!isRecording) {
      startListening();
    } else {
      stopListeningAndPaste();
    }
  });

  globalShortcut.register('Ctrl+Shift+Space', () => {
    if (!isRecording) {
      startListening();
    } else {
      stopListeningAndPaste();
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
      { label: '⌨️ শর্টকাট: F8 বা Ctrl+Shift+Space', enabled: false },
      { label: '👁️ বাবল হাইড করুন (Hide)', click: () => bubbleWindow.hide() },
      { label: '❌ KothaFlow বন্ধ করুন (Exit)', click: () => app.quit() }
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });

  console.log('[KothaFlow] Desktop Bubble is active! Global Shortcuts: F8, Ctrl+Shift+Space');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  server.close();
  if (edgeProcess && !edgeProcess.killed) {
    try {
      process.kill(edgeProcess.pid);
    } catch (_) {}
  }
});
