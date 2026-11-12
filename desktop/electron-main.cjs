const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Menu } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let bubbleWindow = null;
let isRecording = false;

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
    skipTaskbar: false,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  bubbleWindow.loadFile(path.join(__dirname, 'overlay.html'));
  bubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function pasteAtCursor(text) {
  if (!text || text.trim() === '') return;
  clipboard.writeText(text.trim() + ' ');

  // Release focus back to previous target app (Word, Notepad, Chrome, WhatsApp)
  if (bubbleWindow) {
    bubbleWindow.blur();
  }

  // Instant native paste simulation at cursor
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
  }, 40);
}

app.whenReady().then(() => {
  createBubbleWindow();

  // Resize window when switching between compact bubble and expanded pill
  ipcMain.on('set-bubble-mode', (event, mode) => {
    if (!bubbleWindow) return;
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    const currentBounds = bubbleWindow.getBounds();

    if (mode === 'expanded') {
      isRecording = true;
      const newWidth = 320;
      const newHeight = 64;
      const newX = Math.max(10, Math.min(width - newWidth - 10, currentBounds.x - 250));
      bubbleWindow.setBounds({ x: newX, y: currentBounds.y, width: newWidth, height: newHeight });
    } else {
      isRecording = false;
      bubbleWindow.setBounds({ x: currentBounds.x, y: currentBounds.y, width: 64, height: 64 });
    }
  });

  // Handle transcribed text commit from UI
  ipcMain.on('commit-speech', (event, text) => {
    pasteAtCursor(text);
  });

  // Global hotkey: Ctrl+Shift+Space (Mac: Command+Shift+Space)
  const hotkey = process.platform === 'darwin' ? 'Command+Shift+Space' : 'Ctrl+Shift+Space';
  globalShortcut.register(hotkey, () => {
    if (bubbleWindow) {
      bubbleWindow.webContents.send('toggle-recording-hotkey');
    }
  });

  // Context menu on bubble
  ipcMain.on('show-context-menu', (event) => {
    const contextMenu = Menu.buildFromTemplate([
      { label: '🇧🇩 বাংলা ভাষা', click: () => bubbleWindow.webContents.send('switch-lang', 'bn-BD') },
      { label: '🇺🇸 English', click: () => bubbleWindow.webContents.send('switch-lang', 'en-US') },
      { type: 'separator' },
      { label: 'KothaFlow বন্ধ করুন (Exit)', click: () => app.quit() }
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });

  console.log(`KothaFlow Desktop Bubble is active! Draggable anywhere. Hotkey: ${hotkey}`);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
