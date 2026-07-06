const path = require('path');
let addon;

const audioEvents = require('./AudioEvents');

class AudioService {
    constructor() {
        this.initialized = false;
        this.pollInterval = null;
        this.lastSnapshot = null;
        this.lastMixerSnapshot = null;
        
        console.log("[AudioService TRACE] AudioService constructor entered.");
        try {
            // Load the compiled native addon
            let addonPath = path.join(__dirname, '..', 'native', 'build', 'Release', 'melodymeet_addon.node');
            
            // Handle electron-builder ASAR unpacking in production
            if (addonPath.includes('app.asar')) {
                const unpackedPath = addonPath.replace('app.asar', 'app.asar.unpacked');
                console.log(`[AudioService TRACE] ASAR detected. Redirecting addon path from ${addonPath} to ${unpackedPath}`);
                addonPath = unpackedPath;
            }

            console.log("[AudioService TRACE] Attempting to load addon from:", addonPath);

            try {
                addon = require(addonPath);
                console.log("[AudioService TRACE] Addon required successfully. typeof addon:", typeof addon);
                console.log("================================");
                console.log("NATIVE ADDON PATH:", addonPath);
                console.log("NATIVE EXPORTS:");
                console.log(Object.keys(addon));
                console.log("================================");
                if (!addon) {
                    console.log("[AudioService TRACE] WARNING: addon is falsy after successful require! Value:", addon);
                }
            } catch (err) {
                console.error("[AudioService TRACE] CRITICAL: Addon require() threw an exception:");
                console.error(err);
                if (err.code) console.error("[AudioService TRACE] Error code:", err.code);
                // We WILL swallow this temporarily just to see if this is why the app doesn't crash,
                // BUT we will record the error so we can print it in getEngineInfo.
                this.requireError = err;
            }
        } catch (err) {
            console.error('[AudioService TRACE] FATAL: Outer catch hit:', err);
            this.requireError = err;
        }
        console.log("[AudioService TRACE] AudioService constructor finished.");
    }

    _requireInitialized() {
        if (!this.initialized) {
            throw new Error('AudioEngine not initialized');
        }
    }

    _hasAddonFunction(name) {
        return addon && typeof addon[name] === 'function';
    }

    _callAddonIfAvailable(name, ...args) {
        if (!this._hasAddonFunction(name)) {
            console.warn(`[AudioService] Native addon does not expose ${name}(); skipping. Rebuild the addon to enable this path.`);
            return false;
        }
        return addon[name](...args);
    }

    initialize() {
        console.log("[AudioService TRACE] initialize() called.");
        if (this.requireError) {
            console.error("[AudioService TRACE] initialize() failing because require() previously failed with:", this.requireError);
            return false;
        }
        if (!addon) {
            console.error("[AudioService TRACE] Cannot initialize: addon is undefined/null. (requireError was not set)");
            return false;
        }
        if (!this.initialized) {
            console.log("[AudioService] Calling addon.initialize()...");
            try {
                addon.initialize();
                console.log("[AudioService] addon.initialize() succeeded.");
                this.initialized = true;
            } catch (err) {
                console.error("[AudioService TRACE] addon.initialize() threw an exception:");
                console.error(err);
                this.initError = err;
                throw err; // Re-throw so main.js logs it as well
            }
            
            // Notify frontend
            audioEvents.emit('engine:initialized', { version: addon.getEngineInfo().version });

            // Initialize versions and snapshots
            this.lastVersions = addon.getVersions();
            this.lastSnapshot = addon.getSnapshot();
            this.lastMixerSnapshot = addon.getMixerSnapshot();
            this.lastMicrophoneSnapshot = addon.getMicrophoneSnapshot();
            this.lastRecordingSnapshot = addon.getRecordingSnapshot();
            this.lastBroadcastSnapshot = addon.getBroadcastSnapshot();
            this.lastDSPSnapshot = addon.getDSPSnapshot();
            
            // Start polling loop isolated within AudioService
            this.pollInterval = setInterval(() => this._pollEngine(), 50);
        }
        return this.initialized;
    }

    _pollEngine() {
        if (!this.initialized) return;

        // 1. Unconditional polling for Meters & Health
        const healthSnap = addon.getEngineHealthSnapshot();
        audioEvents.emit('engine:health', healthSnap);

        const meterSnap = addon.getMeterSnapshot();
        audioEvents.emit('meters:update', meterSnap);

        // 2. Playback polling (continuous, as position changes constantly)
        const current = addon.getSnapshot();
        this._diffDeck('A', this.lastSnapshot.deckA, current.deckA);
        this._diffDeck('B', this.lastSnapshot.deckB, current.deckB);
        this.lastSnapshot = current;

        // 3. Version-based polling for subsystems
        const versions = addon.getVersions();

        if (versions.mixer !== this.lastVersions.mixer) {
            const snap = addon.getMixerSnapshot();
            audioEvents.emit('mixer:changed', snap);
            this.lastMixerSnapshot = snap;
        }

        if (versions.microphone !== this.lastVersions.microphone) {
            const snap = addon.getMicrophoneSnapshot();
            if (this.lastMicrophoneSnapshot.activeDevice !== snap.activeDevice) {
                audioEvents.emit('microphone:deviceChanged', snap);
            }
            audioEvents.emit('microphone:changed', snap);
            this.lastMicrophoneSnapshot = snap;
        }

        if (versions.recording !== this.lastVersions.recording) {
            const snap = addon.getRecordingSnapshot();
            this._diffRecording(this.lastRecordingSnapshot, snap);
            this.lastRecordingSnapshot = snap;
        }

        if (versions.broadcast !== this.lastVersions.broadcast) {
            const snap = addon.getBroadcastSnapshot();
            this._diffBroadcast(this.lastBroadcastSnapshot, snap);
            this.lastBroadcastSnapshot = snap;
        } else if (this.lastBroadcastSnapshot.broadcasting) {
            // Unconditionally poll stats if broadcasting, even if version hasn't changed.
            // (Version only changes on start/stop)
            const snap = addon.getBroadcastSnapshot();
            this._diffBroadcastStatsOnly(this.lastBroadcastSnapshot, snap);
            this.lastBroadcastSnapshot = snap;
        }

        if (versions.dsp !== this.lastVersions.dsp) {
            const snap = addon.getDSPSnapshot();
            audioEvents.emit('dsp:changed', snap);
            this.lastDSPSnapshot = snap;
        }

        this.lastVersions = versions;
    }

    _diffDeck(deckId, oldState, newState) {
        // State Enum (PlaybackState::State):
        // Stopped = 0, Loading = 1, Playing = 2, Paused = 3, Ended = 4
        if (oldState.state !== newState.state) {
            if (newState.state === 2) audioEvents.emit('deck:play',   { deckId });
            else if (newState.state === 3) audioEvents.emit('deck:pause',  { deckId });
            else if (newState.state === 0) audioEvents.emit('deck:stop',   { deckId });
            else if (newState.state === 4) audioEvents.emit('deck:ended',  { deckId });
        }

        // Background decode in progress → notify UI so it can show a spinner.
        if (!oldState.isLoading && newState.isLoading) {
            audioEvents.emit('deck:loading', { deckId });
        }

        // Decode complete — file is now available on the audio thread.
        if (!oldState.isLoaded && newState.isLoaded) {
            audioEvents.emit('deck:loaded', { deckId, duration: newState.duration });
        }

        if (!oldState.loadFailed && newState.loadFailed) {
            audioEvents.emit('deck:load-failed', { deckId });
        }

        if (oldState.position !== newState.position) {
            audioEvents.emit('deck:position', { deckId, position: newState.position, duration: newState.duration });
        }

        if (oldState.duration !== newState.duration) {
            audioEvents.emit('deck:duration', { deckId, duration: newState.duration });
        }
    }

    _diffRecording(oldSnap, newSnap) {
        if (!oldSnap.recording && newSnap.recording) {
            audioEvents.emit('recording:started', newSnap);
        }
        if (oldSnap.recording && !newSnap.recording) {
            audioEvents.emit('recording:stopped', newSnap);
            // Include file ready metadata when stopped
            audioEvents.emit('recording:fileReady', {
                outputFile: oldSnap.outputFile,
                duration: oldSnap.duration,
                sampleRate: oldSnap.sampleRate,
                channels: oldSnap.channels,
                fileSize: oldSnap.fileSize,
                peakLevel: oldSnap.peakLevel
            });
        }
        
        if (newSnap.recording) {
            if (!oldSnap.paused && newSnap.paused) {
                audioEvents.emit('recording:paused', newSnap);
            }
            if (oldSnap.paused && !newSnap.paused) {
                audioEvents.emit('recording:resumed', newSnap);
            }
            if (oldSnap.duration !== newSnap.duration) {
                audioEvents.emit('recording:duration', { duration: newSnap.duration });
            }
        }
    }

    shutdown() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (addon && this.initialized) {
            addon.shutdown();
            this.initialized = false;
        }
    }

    getEngineInfo() {
        console.log("[AudioService TRACE] getEngineInfo called. addon exists?", !!addon);
        if (this.requireError) {
            return { initialized: false, error: "Addon require failed: " + this.requireError.message };
        }
        if (this.initError) {
            return { initialized: false, error: "Initialization failed: " + this.initError.message };
        }
        if (!addon) {
            return { initialized: false, error: 'Addon not loaded (addon is falsy, no error recorded)' };
        }
        try {
            return addon.getEngineInfo();
        } catch (err) {
            console.error("[AudioService TRACE] addon.getEngineInfo() threw:", err);
            return { initialized: false, error: "addon.getEngineInfo threw: " + err.message };
        }
    }

    getEngineHealthSnapshot() {
        this._requireInitialized();
        return addon.getEngineHealthSnapshot();
    }

    getVersions() {
        this._requireInitialized();
        return addon.getVersions();
    }

    setActiveSession(sessionType) {
        this._requireInitialized();
        return this._callAddonIfAvailable('setActiveSession', sessionType);
    }

    setOutputSession(sessionType) {
        this._requireInitialized();
        return this._callAddonIfAvailable('setOutputSession', sessionType);
    }

    getMeterSnapshot() {
        this._requireInitialized();
        return addon.getMeterSnapshot();
    }

    getPlaybackSnapshot() {
        this._requireInitialized();
        return addon.getSnapshot();
    }

    // --- Generic Deck APIs ---

    async loadDeck(deckId, filePath) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        this._callAddonIfAvailable('setActiveSession', 'RJ');
        this._callAddonIfAvailable('setOutputSession', 'RJ');
        console.log('[AudioService TRACE] loadDeck()', { deckId, filePath });
        return addon.loadDeck(deckId, filePath);
    }

    async unloadDeck(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.unloadDeck(deckId);
    }

    async play(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        this._callAddonIfAvailable('setActiveSession', 'RJ');
        this._callAddonIfAvailable('setOutputSession', 'RJ');
        console.log("[AUDIOSERVICE PLAY]", deckId);
        const result = addon.play(deckId);
        console.log("[AUDIOSERVICE PLAY RESULT]", result);
        return result;
    }

    async pause(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.pause(deckId);
    }

    async stop(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.stop(deckId);
    }

    async seek(deckId, seconds) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.seek(deckId, seconds);
    }

    async setCue(deckId, seconds) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.setCue(deckId, seconds);
    }

    async jumpToCue(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.jumpToCue(deckId);
    }

    async setLoop(deckId, loop) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.setLoop(deckId, loop);
    }

    async setLoopRange(deckId, startSeconds, endSeconds) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.setLoopRange(deckId, startSeconds, endSeconds);
    }

    async setPitch(deckId, percent) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.setPitch(deckId, percent);
    }

    // --- Mixer APIs ---

    setCrossfade(value) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setCrossfade(value);
    }

    setDeckGain(deckId, gain) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setDeckGain(deckId, gain);
    }

    setMasterGain(gain) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        // Sanitize at the service boundary — never forward NaN, Infinity, or
        // out-of-range values to the native engine.
        const safeGain = (typeof gain === 'number' && Number.isFinite(gain))
            ? Math.max(1e-6, Math.min(4.0, gain))
            : 1.0;
        if (safeGain !== gain) {
            console.warn('[AudioService] setMasterGain clamped:', gain, '->', safeGain);
        }
        return addon.setMasterGain(safeGain);
    }

    muteDeck(deckId, muted) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.muteDeck(deckId, muted);
    }

    soloDeck(deckId, soloed) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.soloDeck(deckId, soloed);
    }

    resetMixer() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.resetMixer();
    }

    getMixerSnapshot() {
        this._requireInitialized();
        return addon.getMixerSnapshot();
    }

    // --- Microphone APIs ---

    getAvailableInputDevices() {
        this._requireInitialized();
        return addon.getAvailableInputDevices();
    }

    enableMicrophone(deviceName = "") {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.enableMicrophone(deviceName);
    }

    enableMicrophoneByIndex(micIndex, deviceName = "") {
        console.log('[AUDIOSERVICE ENABLE MIC]', { micIndex, deviceName, initialized: this.initialized });
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        if (this._hasAddonFunction('enableMicrophoneByIndex')) {
            console.log('[AUDIOSERVICE] Calling addon.enableMicrophoneByIndex', micIndex, deviceName);
            const result = addon.enableMicrophoneByIndex(micIndex, deviceName);
            console.log('[AUDIOSERVICE] addon.enableMicrophoneByIndex returned:', result);
            return result;
        }
        if (Number(micIndex) === 0) {
            console.log('[AUDIOSERVICE] Falling back to addon.enableMicrophone', deviceName);
            const result = addon.enableMicrophone(deviceName);
            console.log('[AUDIOSERVICE] addon.enableMicrophone returned:', result);
            return result;
        }
        console.warn('[AudioService] Indexed microphones require a rebuilt native addon; ignoring enable for mic index:', micIndex);
        return false;
    }

    disableMicrophone() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.disableMicrophone();
    }

    disableMicrophoneByIndex(micIndex) {
        console.log('[AUDIOSERVICE DISABLE MIC]', { micIndex, initialized: this.initialized });
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        if (this._hasAddonFunction('disableMicrophoneByIndex')) {
            console.log('[AUDIOSERVICE] Calling addon.disableMicrophoneByIndex', micIndex);
            return addon.disableMicrophoneByIndex(micIndex);
        }
        if (Number(micIndex) === 0) {
            console.log('[AUDIOSERVICE] Falling back to addon.disableMicrophone');
            return addon.disableMicrophone();
        }
        console.warn('[AudioService] Indexed microphones require a rebuilt native addon; ignoring disable for mic index:', micIndex);
        return false;
    }

    setMicrophoneGain(gain) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setMicrophoneGain(gain);
    }

    setMicrophoneGainByIndex(micIndex, gain) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        if (this._hasAddonFunction('setMicrophoneGainByIndex')) {
            addon.setMicrophoneGainByIndex(micIndex, gain);
            return;
        }
        if (Number(micIndex) === 0) {
            addon.setMicrophoneGain(gain);
            return;
        }
        console.warn('[AudioService] Indexed microphones require a rebuilt native addon; ignoring gain for mic index:', micIndex);
    }

    muteMicrophone(muted) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.muteMicrophone(muted);
    }

    muteMicrophoneByIndex(micIndex, muted) {
        console.log('[AUDIOSERVICE MUTE MIC]', { micIndex, muted, initialized: this.initialized });
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        if (this._hasAddonFunction('muteMicrophoneByIndex')) {
            console.log('[AUDIOSERVICE] Calling addon.muteMicrophoneByIndex', micIndex, muted);
            addon.muteMicrophoneByIndex(micIndex, muted);
            return;
        }
        if (Number(micIndex) === 0) {
            console.log('[AUDIOSERVICE] Falling back to addon.muteMicrophone', muted);
            addon.muteMicrophone(muted);
            return;
        }
        console.warn('[AudioService] Indexed microphones require a rebuilt native addon; ignoring mute for mic index:', micIndex);
    }

    getMicrophoneSnapshot() {
        this._requireInitialized();
        return addon.getMicrophoneSnapshot();
    }

    // --- Recording APIs ---

    startRecording() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        const { app } = require('electron');
        this._callAddonIfAvailable('setActiveSession', 'Podcast');
        this._callAddonIfAvailable('setOutputSession', 'Podcast');
        
        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `recording_${timestamp}.wav`;
        const outputPath = path.join(app.getPath('userData'), filename);
        
        const success = addon.startRecording(outputPath);
        if (!success) {
            audioEvents.emit('recording:error', { error: 'Failed to start native recording' });
        }
        return success;
    }

    pauseRecording() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.pauseRecording();
    }

    resumeRecording() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.resumeRecording();
    }

    stopRecording() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.stopRecording();
    }

    getRecordingSnapshot() {
        this._requireInitialized();
        return addon.getRecordingSnapshot();
    }

    // --- Broadcast APIs ---

    startBroadcast(config = {}) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        const broadcastConfig = {
            server: config.server || '',
            streamKey: config.streamKey || '',
            bitrate: config.bitrate || 128,
        };
        const success = addon.startBroadcast(broadcastConfig);
        if (!success) {
            audioEvents.emit('broadcast:error', { error: 'Failed to start native broadcast' });
        }
        return success;
    }

    stopBroadcast() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.stopBroadcast();
    }

    getBroadcastSnapshot() {
        this._requireInitialized();
        return addon.getBroadcastSnapshot();
    }

    _diffBroadcast(oldSnap, newSnap) {
        if (!oldSnap.broadcasting && newSnap.broadcasting) {
            audioEvents.emit('broadcast:started', newSnap);
        }
        if (oldSnap.broadcasting && !newSnap.broadcasting) {
            audioEvents.emit('broadcast:stopped', {
                server: oldSnap.server,
                uptime: oldSnap.uptime,
                bytesSent: oldSnap.bytesSent,
            });
        }
        if (newSnap.reconnecting && !oldSnap.reconnecting) {
            audioEvents.emit('broadcast:error', { error: 'Connection lost, reconnecting...' });
        }
    }

    _diffBroadcastStatsOnly(oldSnap, newSnap) {
        audioEvents.emit('broadcast:stats', {
            server: newSnap.server,
            bitrate: newSnap.bitrate,
            sampleRate: newSnap.sampleRate,
            reconnecting: newSnap.reconnecting,
            bytesSent: newSnap.bytesSent,
            uptime: newSnap.uptime,
        });
    }

    // --- DSP APIs ---

    setEQ(channelId, settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setEQ(channelId, settings);
    }

    getEQ(channelId) {
        this._requireInitialized();
        return addon.getEQ(channelId);
    }

    setCompressor(settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setCompressor(settings);
    }

    getCompressor() {
        this._requireInitialized();
        return addon.getCompressor();
    }

    setLimiter(settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setLimiter(settings);
    }

    setMicrophoneCompressor(micIndex, settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        this._callAddonIfAvailable('setMicrophoneCompressor', micIndex, settings);
    }

    setMicrophoneLimiter(micIndex, settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        this._callAddonIfAvailable('setMicrophoneLimiter', micIndex, settings);
    }

    getLimiter() {
        this._requireInitialized();
        return addon.getLimiter();
    }

    resetDSP() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.resetDSP();
    }

    getDSPSnapshot() {
        this._requireInitialized();
        return addon.getDSPSnapshot();
    }
}

module.exports = new AudioService();
