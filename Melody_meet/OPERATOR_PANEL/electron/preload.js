const { contextBridge, ipcRenderer } = require('electron');

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
  getPlaybackSnapshot: () => ipcRenderer.invoke('audio:getPlaybackSnapshot'),

  // Deck APIs
  loadDeck:      (deckId, path) => ipcRenderer.invoke('audio:loadDeck', deckId, path),
  unloadDeck:    (deckId) => ipcRenderer.invoke('audio:unloadDeck', deckId),
  play:          (deckId) => ipcRenderer.invoke('audio:play', deckId),
  pause:         (deckId) => ipcRenderer.invoke('audio:pause', deckId),
  stop:          (deckId) => ipcRenderer.invoke('audio:stop', deckId),
  seek:          (deckId, seconds) => ipcRenderer.invoke('audio:seek', deckId, seconds),

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
  disableMicrophone:        () => ipcRenderer.invoke('audio:disableMicrophone'),
  setMicrophoneGain:        (gain) => ipcRenderer.invoke('audio:setMicrophoneGain', gain),
  muteMicrophone:           (muted) => ipcRenderer.invoke('audio:muteMicrophone', muted),

  // Recording APIs
  startRecording:           () => ipcRenderer.invoke('audio:startRecording'),
  pauseRecording:           () => ipcRenderer.invoke('audio:pauseRecording'),
  resumeRecording:          () => ipcRenderer.invoke('audio:resumeRecording'),
  stopRecording:            () => ipcRenderer.invoke('audio:stopRecording'),
  getRecordingSnapshot:     () => ipcRenderer.invoke('audio:getRecordingSnapshot'),

  // Broadcast APIs
  startBroadcast:           (config) => ipcRenderer.invoke('audio:startBroadcast', config),
  stopBroadcast:            () => ipcRenderer.invoke('audio:stopBroadcast'),
  getBroadcastSnapshot:     () => ipcRenderer.invoke('audio:getBroadcastSnapshot'),

  // DSP APIs
  setEQ:                    (channelId, settings) => ipcRenderer.invoke('audio:setEQ', channelId, settings),
  getEQ:                    (channelId) => ipcRenderer.invoke('audio:getEQ', channelId),
  setCompressor:            (settings) => ipcRenderer.invoke('audio:setCompressor', settings),
  getCompressor:            () => ipcRenderer.invoke('audio:getCompressor'),
  setLimiter:               (settings) => ipcRenderer.invoke('audio:setLimiter', settings),
  getLimiter:               () => ipcRenderer.invoke('audio:getLimiter'),
  resetDSP:                 () => ipcRenderer.invoke('audio:resetDSP'),
  getDSPSnapshot:           () => ipcRenderer.invoke('audio:getDSPSnapshot'),

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
