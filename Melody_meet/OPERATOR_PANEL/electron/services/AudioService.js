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
            audioEvents.emit('engine:initialized', { version: addon.version() });

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
            if (newState.state === 2) audioEvents.emit('deck:play', { deckId });
            else if (newState.state === 3) audioEvents.emit('deck:pause', { deckId });
            else if (newState.state === 0) audioEvents.emit('deck:stop', { deckId });
            else if (newState.state === 4) audioEvents.emit('deck:end', { deckId });
        }

        if (!oldState.isLoaded && newState.isLoaded) {
            audioEvents.emit('deck:loaded', { deckId });
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
            return addon.engineInfo();
        } catch (err) {
            console.error("[AudioService TRACE] addon.engineInfo() threw:", err);
            return { initialized: false, error: "addon.engineInfo threw: " + err.message };
        }
    }

    getPlaybackSnapshot() {
        if (!addon) return null;
        return addon.getSnapshot();
    }

    // --- Generic Deck APIs ---

    async loadDeck(deckId, filePath) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.loadDeck(deckId, filePath);
    }

    async unloadDeck(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.loadDeck(deckId, "");
    }

    async play(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.play(deckId);
    }

    async pause(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.pause(deckId);
    }

    async stop(deckId) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.stop(deckId);
    }

    async seek(deckId, seconds) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.seek(deckId, seconds);
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
        addon.setMasterGain(gain);
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
        if (!this.initialized) return null;
        return addon.getMixerSnapshot();
    }

    // --- Microphone APIs ---

    getAvailableInputDevices() {
        if (!this.initialized) return [];
        return addon.getAvailableInputDevices();
    }

    enableMicrophone(deviceName = "") {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        return addon.enableMicrophone(deviceName);
    }

    disableMicrophone() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.disableMicrophone();
    }

    setMicrophoneGain(gain) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setMicrophoneGain(gain);
    }

    muteMicrophone(muted) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.muteMicrophone(muted);
    }

    getMicrophoneSnapshot() {
        if (!this.initialized) return null;
        return addon.getMicrophoneSnapshot();
    }

    // --- Recording APIs ---

    startRecording() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        const { app } = require('electron');
        
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
        if (!this.initialized) return null;
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
        addon.stopBroadcast();
    }

    getBroadcastSnapshot() {
        if (!this.initialized) return null;
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
        if (!this.initialized) return null;
        return addon.getEQ(channelId);
    }

    setCompressor(settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setCompressor(settings);
    }

    getCompressor() {
        if (!this.initialized) return null;
        return addon.getCompressor();
    }

    setLimiter(settings) {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.setLimiter(settings);
    }

    getLimiter() {
        if (!this.initialized) return null;
        return addon.getLimiter();
    }

    resetDSP() {
        if (!this.initialized) throw new Error('AudioEngine not initialized');
        addon.resetDSP();
    }

    getDSPSnapshot() {
        if (!this.initialized) return null;
        return addon.getDSPSnapshot();
    }
}

module.exports = new AudioService();
