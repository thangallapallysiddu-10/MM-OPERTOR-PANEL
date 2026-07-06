const { contextBridge, ipcRenderer } = require('electron');

console.log('[preload TRACE] Electron preload loaded; exposing window.audio');
console.log('[PRELOAD] contextBridge available:', typeof contextBridge);
console.log('[PRELOAD] ipcRenderer available:', typeof ipcRenderer);

contextBridge.exposeInMainWorld('desktop', {
  ping: () => ipcRenderer.invoke('ping'),
});

// ── Single shared IPC listener to avoid MaxListenersExceeded ──
const audioListeners = new Map(); // Map<eventName, Set<callback>>

ipcRenderer.on('audio-event', (_event, payload) => {
  const { eventName, data } = payload;
  const callbacks = audioListeners.get(eventName);
  if (callbacks) {
    for (const cb of callbacks) {
      try { cb(data); } catch (err) { console.error(`[audio-event] Error in handler for ${eventName}:`, err); }
    }
  }
});

contextBridge.exposeInMainWorld('audio', {
  // Lifecycle & Info
  initialize:    () => ipcRenderer.invoke('audio:initialize'),
  shutdown:      () => ipcRenderer.invoke('audio:shutdown'),
  getEngineInfo: () => ipcRenderer.invoke('audio:getEngineInfo'),
  getEngineHealthSnapshot: () => ipcRenderer.invoke('audio:getEngineHealthSnapshot'),
  getVersions:  () => ipcRenderer.invoke('audio:getVersions'),
  setActiveSession: (sessionType) => ipcRenderer.invoke('audio:setActiveSession', sessionType),
  setOutputSession: (sessionType) => ipcRenderer.invoke('audio:setOutputSession', sessionType),
  getPlaybackSnapshot: () => ipcRenderer.invoke('audio:getPlaybackSnapshot'),
  getMixerSnapshot: () => ipcRenderer.invoke('audio:getMixerSnapshot'),
  getMicrophoneSnapshot: () => ipcRenderer.invoke('audio:getMicrophoneSnapshot'),
  getRecordingSnapshot: () => ipcRenderer.invoke('audio:getRecordingSnapshot'),
  getBroadcastSnapshot: () => ipcRenderer.invoke('audio:getBroadcastSnapshot'),
  getDSPSnapshot: () => ipcRenderer.invoke('audio:getDSPSnapshot'),
  getMeterSnapshot: () => ipcRenderer.invoke('audio:getMeterSnapshot'),

  // Deck APIs
  loadDeck:      (deckId, path) => {
    console.log('[preload TRACE] audio.loadDeck', { deckId, path });
    return ipcRenderer.invoke('audio:loadDeck', deckId, path);
  },
  unloadDeck:    (deckId) => ipcRenderer.invoke('audio:unloadDeck', deckId),
  play:          (deckId) => ipcRenderer.invoke('audio:play', deckId),
  pause:         (deckId) => ipcRenderer.invoke('audio:pause', deckId),
  stop:          (deckId) => ipcRenderer.invoke('audio:stop', deckId),
  seek:          (deckId, seconds) => ipcRenderer.invoke('audio:seek', deckId, seconds),
  setCue:        (deckId, seconds) => ipcRenderer.invoke('audio:setCue', deckId, seconds),
  jumpToCue:     (deckId) => ipcRenderer.invoke('audio:jumpToCue', deckId),
  setLoop:       (deckId, loop) => ipcRenderer.invoke('audio:setLoop', deckId, loop),
  setLoopRange:  (deckId, startSeconds, endSeconds) => ipcRenderer.invoke('audio:setLoopRange', deckId, startSeconds, endSeconds),
  setPitch:      (deckId, percent) => ipcRenderer.invoke('audio:setPitch', deckId, percent),

  // Mixer APIs
  setCrossfade:  (value) => ipcRenderer.invoke('audio:setCrossfade', value),
  setDeckGain:   (deckId, gain) => ipcRenderer.invoke('audio:setDeckGain', deckId, gain),
  setMasterGain: (gain) => ipcRenderer.invoke('audio:setMasterGain', gain),
  muteDeck:      (deckId, muted) => ipcRenderer.invoke('audio:muteDeck', deckId, muted),
  soloDeck:      (deckId, soloed) => ipcRenderer.invoke('audio:soloDeck', deckId, soloed),
  resetMixer:    () => ipcRenderer.invoke('audio:resetMixer'),

  // Microphone APIs
  getAvailableInputDevices: () => ipcRenderer.invoke('audio:getAvailableInputDevices'),
  enableMicrophone:         (deviceName) => ipcRenderer.invoke('audio:enableMicrophone', deviceName),
  enableMicrophoneByIndex:  (micIndex, deviceName) => {
    console.log('[PRELOAD IPC] enableMicrophoneByIndex', { micIndex, deviceName });
    return ipcRenderer.invoke('audio:enableMicrophoneByIndex', micIndex, deviceName);
  },
  disableMicrophone:        () => ipcRenderer.invoke('audio:disableMicrophone'),
  disableMicrophoneByIndex: (micIndex) => {
    console.log('[PRELOAD IPC] disableMicrophoneByIndex', { micIndex });
    return ipcRenderer.invoke('audio:disableMicrophoneByIndex', micIndex);
  },
  setMicrophoneGain:        (gain) => ipcRenderer.invoke('audio:setMicrophoneGain', gain),
  setMicrophoneGainByIndex: (micIndex, gain) => ipcRenderer.invoke('audio:setMicrophoneGainByIndex', micIndex, gain),
  muteMicrophone:           (muted) => ipcRenderer.invoke('audio:muteMicrophone', muted),
  muteMicrophoneByIndex:    (micIndex, muted) => {
    console.log('[PRELOAD IPC] muteMicrophoneByIndex', { micIndex, muted });
    return ipcRenderer.invoke('audio:muteMicrophoneByIndex', micIndex, muted);
  },

  // Recording APIs
  startRecording:           () => ipcRenderer.invoke('audio:startRecording'),
  pauseRecording:           () => ipcRenderer.invoke('audio:pauseRecording'),
  resumeRecording:          () => ipcRenderer.invoke('audio:resumeRecording'),
  stopRecording:            () => ipcRenderer.invoke('audio:stopRecording'),

  // Broadcast APIs
  startBroadcast:           (config) => ipcRenderer.invoke('audio:startBroadcast', config),
  stopBroadcast:            () => ipcRenderer.invoke('audio:stopBroadcast'),

  // DSP APIs
  setEQ:                    (channelId, settings) => ipcRenderer.invoke('audio:setEQ', channelId, settings),
  getEQ:                    (channelId) => ipcRenderer.invoke('audio:getEQ', channelId),
  setCompressor:            (settings) => ipcRenderer.invoke('audio:setCompressor', settings),
  getCompressor:            () => ipcRenderer.invoke('audio:getCompressor'),
  setLimiter:               (settings) => ipcRenderer.invoke('audio:setLimiter', settings),
  getLimiter:               () => ipcRenderer.invoke('audio:getLimiter'),
  setMicrophoneCompressor:  (micIndex, settings) => ipcRenderer.invoke('audio:setMicrophoneCompressor', micIndex, settings),
  setMicrophoneLimiter:     (micIndex, settings) => ipcRenderer.invoke('audio:setMicrophoneLimiter', micIndex, settings),
  resetDSP:                 () => ipcRenderer.invoke('audio:resetDSP'),

  // Event Subscription — multiplexed through a single IPC listener
  on: (eventName, callback) => {
    if (!audioListeners.has(eventName)) {
      audioListeners.set(eventName, new Set());
    }
    audioListeners.get(eventName).add(callback);
  },
  
  off: (eventName, callback) => {
    const callbacks = audioListeners.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        audioListeners.delete(eventName);
      }
    }
  }
});
