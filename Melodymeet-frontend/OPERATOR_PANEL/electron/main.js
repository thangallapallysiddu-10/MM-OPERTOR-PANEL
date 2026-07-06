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

function invokeAudio(method, ...args) {
  if (!audioService) {
    throw new Error('AudioService is unavailable');
  }
  if (typeof audioService[method] !== 'function') {
    throw new Error(`AudioService method unavailable: ${method}`);
  }
  return audioService[method](...args);
}

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

  ipcMain.handle('audio:getEngineHealthSnapshot', async () => {
    return invokeAudio('getEngineHealthSnapshot');
  });

  ipcMain.handle('audio:getVersions', async () => {
    return invokeAudio('getVersions');
  });

  ipcMain.handle('audio:setActiveSession', async (e, sessionType) => {
    return invokeAudio('setActiveSession', sessionType);
  });

  ipcMain.handle('audio:setOutputSession', async (e, sessionType) => {
    return invokeAudio('setOutputSession', sessionType);
  });

  ipcMain.handle('audio:getPlaybackSnapshot', async () => {
    return invokeAudio('getPlaybackSnapshot');
  });

  ipcMain.handle('audio:getMixerSnapshot', async () => {
    return invokeAudio('getMixerSnapshot');
  });

  ipcMain.handle('audio:getMicrophoneSnapshot', async () => {
    return invokeAudio('getMicrophoneSnapshot');
  });

  ipcMain.handle('audio:getRecordingSnapshot', async () => {
    return invokeAudio('getRecordingSnapshot');
  });

  ipcMain.handle('audio:getBroadcastSnapshot', async () => {
    return invokeAudio('getBroadcastSnapshot');
  });

  ipcMain.handle('audio:getDSPSnapshot', async () => {
    return invokeAudio('getDSPSnapshot');
  });

  ipcMain.handle('audio:getMeterSnapshot', async () => {
    return invokeAudio('getMeterSnapshot');
  });

  // Audio Engine: Deck APIs
  ipcMain.handle('audio:loadDeck', async (e, deckId, path) => {
    console.log("[main TRACE] IPC audio:loadDeck invoked", { deckId, path });
    return invokeAudio('loadDeck', deckId, path);
  });

  ipcMain.handle('audio:unloadDeck', async (e, deckId) => {
    return invokeAudio('unloadDeck', deckId);
  });

  ipcMain.handle('audio:play', async (e, deckId) => {
    return invokeAudio('play', deckId);
  });

  ipcMain.handle('audio:pause', async (e, deckId) => {
    return invokeAudio('pause', deckId);
  });

  ipcMain.handle('audio:stop', async (e, deckId) => {
    return invokeAudio('stop', deckId);
  });

  ipcMain.handle('audio:seek', async (e, deckId, seconds) => {
    return invokeAudio('seek', deckId, seconds);
  });

  ipcMain.handle('audio:setCue', async (e, deckId, seconds) => {
    return invokeAudio('setCue', deckId, seconds);
  });

  ipcMain.handle('audio:jumpToCue', async (e, deckId) => {
    return invokeAudio('jumpToCue', deckId);
  });

  ipcMain.handle('audio:setLoop', async (e, deckId, loop) => {
    return invokeAudio('setLoop', deckId, loop);
  });

  ipcMain.handle('audio:setLoopRange', async (e, deckId, startSeconds, endSeconds) => {
    return invokeAudio('setLoopRange', deckId, startSeconds, endSeconds);
  });

  ipcMain.handle('audio:setPitch', async (e, deckId, percent) => {
    return invokeAudio('setPitch', deckId, percent);
  });

  // Audio Engine: Mixer APIs
  ipcMain.handle('audio:setCrossfade', async (e, value) => {
    return invokeAudio('setCrossfade', value);
  });

  ipcMain.handle('audio:setDeckGain', async (e, deckId, gain) => {
    return invokeAudio('setDeckGain', deckId, gain);
  });

  ipcMain.handle('audio:setMasterGain', async (e, gain) => {
    return invokeAudio('setMasterGain', gain);
  });

  ipcMain.handle('audio:muteDeck', async (e, deckId, muted) => {
    return invokeAudio('muteDeck', deckId, muted);
  });

  ipcMain.handle('audio:soloDeck', async (e, deckId, soloed) => {
    return invokeAudio('soloDeck', deckId, soloed);
  });

  ipcMain.handle('audio:resetMixer', async () => {
    return invokeAudio('resetMixer');
  });

  // Audio Engine: Microphone APIs
  ipcMain.handle('audio:getAvailableInputDevices', async () => {
    return invokeAudio('getAvailableInputDevices');
  });

  ipcMain.handle('audio:enableMicrophone', async (e, deviceName) => {
    return invokeAudio('enableMicrophone', deviceName);
  });

  ipcMain.handle('audio:enableMicrophoneByIndex', async (e, micIndex, deviceName) => {
    console.log('[IPC ENABLE MIC]', { micIndex, deviceName });
    try {
      const result = invokeAudio('enableMicrophoneByIndex', micIndex, deviceName);
      console.log('[IPC ENABLE MIC] result:', result);
      return result;
    } catch (err) {
      console.error('[IPC ENABLE MIC] ERROR:', err);
      throw err;
    }
  });

  ipcMain.handle('audio:disableMicrophone', async () => {
    return invokeAudio('disableMicrophone');
  });

  ipcMain.handle('audio:disableMicrophoneByIndex', async (e, micIndex) => {
    console.log('[IPC DISABLE MIC]', { micIndex });
    try {
      const result = invokeAudio('disableMicrophoneByIndex', micIndex);
      console.log('[IPC DISABLE MIC] result:', result);
      return result;
    } catch (err) {
      console.error('[IPC DISABLE MIC] ERROR:', err);
      throw err;
    }
  });

  ipcMain.handle('audio:setMicrophoneGain', async (e, gain) => {
    return invokeAudio('setMicrophoneGain', gain);
  });

  ipcMain.handle('audio:setMicrophoneGainByIndex', async (e, micIndex, gain) => {
    return invokeAudio('setMicrophoneGainByIndex', micIndex, gain);
  });

  ipcMain.handle('audio:muteMicrophone', async (e, muted) => {
    return invokeAudio('muteMicrophone', muted);
  });

  ipcMain.handle('audio:muteMicrophoneByIndex', async (e, micIndex, muted) => {
    console.log('[IPC MUTE MIC]', { micIndex, muted });
    try {
      const result = invokeAudio('muteMicrophoneByIndex', micIndex, muted);
      console.log('[IPC MUTE MIC] result:', result);
      return result;
    } catch (err) {
      console.error('[IPC MUTE MIC] ERROR:', err);
      throw err;
    }
  });

  // Audio Engine: Recording APIs
  ipcMain.handle('audio:startRecording', async () => {
    return invokeAudio('startRecording');
  });

  ipcMain.handle('audio:pauseRecording', async () => {
    return invokeAudio('pauseRecording');
  });

  ipcMain.handle('audio:resumeRecording', async () => {
    return invokeAudio('resumeRecording');
  });

  ipcMain.handle('audio:stopRecording', async () => {
    return invokeAudio('stopRecording');
  });

  // Audio Engine: Broadcast APIs
  ipcMain.handle('audio:startBroadcast', async (e, config) => {
    return invokeAudio('startBroadcast', config);
  });

  ipcMain.handle('audio:stopBroadcast', async () => {
    return invokeAudio('stopBroadcast');
  });

  // Audio Engine: DSP APIs
  ipcMain.handle('audio:setEQ', async (e, channelId, settings) => {
    return invokeAudio('setEQ', channelId, settings);
  });

  ipcMain.handle('audio:getEQ', async (e, channelId) => {
    return invokeAudio('getEQ', channelId);
  });

  ipcMain.handle('audio:setCompressor', async (e, settings) => {
    return invokeAudio('setCompressor', settings);
  });

  ipcMain.handle('audio:getCompressor', async () => {
    return invokeAudio('getCompressor');
  });

  ipcMain.handle('audio:setLimiter', async (e, settings) => {
    return invokeAudio('setLimiter', settings);
  });

  ipcMain.handle('audio:setMicrophoneCompressor', async (e, micIndex, settings) => {
    return invokeAudio('setMicrophoneCompressor', micIndex, settings);
  });

  ipcMain.handle('audio:setMicrophoneLimiter', async (e, micIndex, settings) => {
    return invokeAudio('setMicrophoneLimiter', micIndex, settings);
  });

  ipcMain.handle('audio:getLimiter', async () => {
    return invokeAudio('getLimiter');
  });

  ipcMain.handle('audio:resetDSP', async () => {
    return invokeAudio('resetDSP');
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
