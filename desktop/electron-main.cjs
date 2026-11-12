const { app, BrowserWindow, globalShortcut, clipboard } = require('electron');
const path = require('path');

let overlayWindow = null;
let isRecording = false;

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 380,
    height: 72,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

app.whenReady().then(() => {
  createOverlayWindow();

  // Global hotkey: Ctrl+Shift+Space (Mac: Command+Shift+Space)
  const hotkey = process.platform === 'darwin' ? 'Command+Shift+Space' : 'Ctrl+Shift+Space';

  const registered = globalShortcut.register(hotkey, () => {
    if (!isRecording) {
      isRecording = true;
      if (overlayWindow) {
        overlayWindow.showInactive();
      }
      console.log('KothaFlow: Recording started... speak in Bangla or English');
    } else {
      isRecording = false;
      if (overlayWindow) {
        overlayWindow.hide();
      }
      console.log('KothaFlow: Dictation finished. Text automatically pasted at cursor.');
    }
  });

  if (!registered) {
    console.error('Failed to register global hotkey:', hotkey);
  } else {
    console.log(`KothaFlow Desktop active! Press ${hotkey} in any software (Word, Notepad, Chrome) to dictate.`);
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
