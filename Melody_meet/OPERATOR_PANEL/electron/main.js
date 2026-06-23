console.log("===== 1 =====");

const { app, BrowserWindow, ipcMain } = require("electron");
console.log("===== 2 =====");

const path = require("path");
console.log("===== 3 =====");

let audioService;

console.log("[main TRACE] Before require('./services/AudioService')");
try {
    audioService = require("./services/AudioService");
    console.log("[main TRACE] After require('./services/AudioService'). Type:", typeof audioService);
} catch (err) {
    console.error("[main TRACE] CRITICAL: require('./services/AudioService') threw an exception:");
    console.error(err);
    // Don't exit just yet so we can see what the UI does, but we MUST report it
    audioService = null;
}

console.log("===== 5 =====");

// ── Window creation ─────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:8081');
    // Open the DevTools.
    // win.webContents.openDevTools();
  } else {
    // In production, load the exported Expo static files
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── IPC handlers ────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  // Desktop ping (existing)
  ipcMain.handle('ping', () => 'pong');

  // Audio Engine: Lifecycle & Info
  ipcMain.handle('audio:initialize', async () => {
    return { success: audioService.initialize() };
  });

  ipcMain.handle('audio:shutdown', async () => {
    audioService.shutdown();
    return { success: true };
  });

  ipcMain.handle('audio:getEngineInfo', async () => {
    console.log("[main TRACE] IPC audio:getEngineInfo invoked");
    if (!audioService) return { initialized: false, error: 'audioService require failed in main.js' };
    return audioService.getEngineInfo();
  });

  ipcMain.handle('audio:getPlaybackSnapshot', async () => {
    return audioService.getPlaybackSnapshot();
  });

  // Audio Engine: Deck APIs
  ipcMain.handle('audio:loadDeck', async (e, deckId, path) => {
    return audioService.loadDeck(deckId, path);
  });

  ipcMain.handle('audio:unloadDeck', async (e, deckId) => {
    return audioService.unloadDeck(deckId);
  });

  ipcMain.handle('audio:play', async (e, deckId) => {
    return audioService.play(deckId);
  });

  ipcMain.handle('audio:pause', async (e, deckId) => {
    return audioService.pause(deckId);
  });

  ipcMain.handle('audio:stop', async (e, deckId) => {
    return audioService.stop(deckId);
  });

  ipcMain.handle('audio:seek', async (e, deckId, seconds) => {
    return audioService.seek(deckId, seconds);
  });

  // Audio Engine: Mixer APIs
  ipcMain.handle('audio:setCrossfade', async (e, value) => {
    if (!audioService.initialized) return;
    audioService.setCrossfade(value);
  });

  ipcMain.handle('audio:setDeckGain', async (e, deckId, gain) => {
    if (!audioService.initialized) return;
    audioService.setDeckGain(deckId, gain);
  });

  ipcMain.handle('audio:setMasterGain', async (e, gain) => {
    if (!audioService.initialized) return;
    audioService.setMasterGain(gain);
  });

  ipcMain.handle('audio:muteDeck', async (e, deckId, muted) => {
    if (!audioService.initialized) return;
    audioService.muteDeck(deckId, muted);
  });

  ipcMain.handle('audio:soloDeck', async (e, deckId, soloed) => {
    if (!audioService.initialized) return;
    audioService.soloDeck(deckId, soloed);
  });

  ipcMain.handle('audio:resetMixer', async () => {
    if (!audioService.initialized) return;
    audioService.resetMixer();
  });

  // Audio Engine: Microphone APIs
  ipcMain.handle('audio:getAvailableInputDevices', async () => {
    return audioService.getAvailableInputDevices();
  });

  ipcMain.handle('audio:enableMicrophone', async (e, deviceName) => {
    return audioService.enableMicrophone(deviceName);
  });

  ipcMain.handle('audio:disableMicrophone', async () => {
    audioService.disableMicrophone();
  });

  ipcMain.handle('audio:setMicrophoneGain', async (e, gain) => {
    audioService.setMicrophoneGain(gain);
  });

  ipcMain.handle('audio:muteMicrophone', async (e, muted) => {
    audioService.muteMicrophone(muted);
  });

  // Audio Engine: Recording APIs
  ipcMain.handle('audio:startRecording', async () => {
    return audioService.startRecording();
  });

  ipcMain.handle('audio:pauseRecording', async () => {
    audioService.pauseRecording();
  });

  ipcMain.handle('audio:resumeRecording', async () => {
    audioService.resumeRecording();
  });

  ipcMain.handle('audio:stopRecording', async () => {
    audioService.stopRecording();
  });

  ipcMain.handle('audio:getRecordingSnapshot', async () => {
    return audioService.getRecordingSnapshot();
  });

  // Audio Engine: Broadcast APIs
  ipcMain.handle('audio:startBroadcast', async (e, config) => {
    return audioService.startBroadcast(config);
  });

  ipcMain.handle('audio:stopBroadcast', async () => {
    audioService.stopBroadcast();
  });

  ipcMain.handle('audio:getBroadcastSnapshot', async () => {
    return audioService.getBroadcastSnapshot();
  });

  // Audio Engine: DSP APIs
  ipcMain.handle('audio:setEQ', async (e, channelId, settings) => {
    audioService.setEQ(channelId, settings);
  });

  ipcMain.handle('audio:getEQ', async (e, channelId) => {
    return audioService.getEQ(channelId);
  });

  ipcMain.handle('audio:setCompressor', async (e, settings) => {
    audioService.setCompressor(settings);
  });

  ipcMain.handle('audio:getCompressor', async () => {
    return audioService.getCompressor();
  });

  ipcMain.handle('audio:setLimiter', async (e, settings) => {
    audioService.setLimiter(settings);
  });

  ipcMain.handle('audio:getLimiter', async () => {
    return audioService.getLimiter();
  });

  ipcMain.handle('audio:resetDSP', async () => {
    audioService.resetDSP();
  });

  ipcMain.handle('audio:getDSPSnapshot', async () => {
    return audioService.getDSPSnapshot();
  });
}

// ── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  console.log("[main TRACE] app.whenReady() fired.");
  console.log("[main TRACE] Electron app is ready. Attempting to initialize AudioEngine...");
  try {
    if (audioService) {
        audioService.initialize();
        console.log("[main TRACE] AudioEngine initialized successfully.");
    } else {
        console.error("[main TRACE] Skipping initialize() because audioService is null.");
    }
  } catch (err) {
    console.error("[main TRACE] FATAL: Failed to initialize AudioEngine on startup:");
    console.error(err);
  }

  registerIpcHandlers();
  console.log("[main TRACE] IPC Handlers registered.");
  createWindow();
  console.log("[main TRACE] Window created.");

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    console.log("[MelodyMeet] Shutting down AudioEngine gracefully...");
    audioService.shutdown();
  } catch (err) {
    console.error("[MelodyMeet] Error during graceful shutdown:", err);
  }
});
