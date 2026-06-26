/**
 * src/services/audio/adapters/WebAdapter.ts
 *
 * Web adapter — implements IAudioAdapter using the MelodyMeet backend REST API.
 * The backend is the gateway to the same native C++ audio engine used on Desktop.
 *
 * Events (on/off) are implemented via polling when handlers are registered:
 *   - 'meters:update'  → polls GET /audio/meters every 500 ms
 *   - 'dsp:changed'    → polls GET /audio/dsp every 2 000 ms
 *   - 'broadcast:stats'→ polls GET /audio/broadcast every 3 000 ms
 *
 * React components and hooks must NEVER import this file directly.
 * Always import `audio` from `src/services/audio`.
 */

import { apiClient } from '../../api/apiClient';
import type {
  IAudioAdapter,
  DeckId,
  FXParameters,
  CompressorSettings,
  LimiterSettings,
  PlaybackSnapshot,
  DSPSnapshot,
  RecordingSnapshot,
  BroadcastSnapshot,
  EngineInfo,
  AudioEventHandler,
} from '../types';

// ─── Polling configuration ────────────────────────────────────────────────────

const POLL_INTERVALS: Record<string, number> = {
  'meters:update':   500,
  'dsp:changed':     2000,
  'broadcast:stats': 3000,
  'playback:update': 1000,
};

const POLL_ENDPOINTS: Record<string, string> = {
  'meters:update':   '/audio/meters',
  'dsp:changed':     '/audio/dsp',
  'broadcast:stats': '/audio/broadcast',
  'playback:update': '/audio/playback',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function apiCall(method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
  try {
    const res = method === 'GET'
      ? await apiClient.get(path)
      : await apiClient.post(path, body ?? {});
    return res.data?.data ?? res.data;
  } catch (err: any) {
    // Swallow 404/501 gracefully — backend may not have all routes yet
    if (err?.response?.status === 404 || err?.response?.status === 501) return undefined;
    throw err;
  }
}

// ─── Default snapshot shapes ──────────────────────────────────────────────────

const DEFAULT_PLAYBACK: PlaybackSnapshot = {
  deckA: { isLoaded: false, isPlaying: false, position: 0 },
  deckB: { isLoaded: false, isPlaying: false, position: 0 },
};

const DEFAULT_DSP: DSPSnapshot = {
  deckA: { highPassFilter: 20, lowPassFilter: 20000, eqBass: 50, eqTreble: 50, echoDelay: 0 },
  deckB: { highPassFilter: 20, lowPassFilter: 20000, eqBass: 50, eqTreble: 50, echoDelay: 0 },
};

// ─── Adapter ─────────────────────────────────────────────────────────────────

export class WebAdapter implements IAudioAdapter {
  // Map of event name → Set of registered handlers
  private readonly handlers = new Map<string, Set<AudioEventHandler>>();
  // Map of event name → polling interval ID
  private readonly pollers  = new Map<string, ReturnType<typeof setInterval>>();
  // Track last polled data to emit only on change
  private readonly lastData = new Map<string, string>();

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await apiCall('POST', '/audio/initialize');
  }

  async shutdown(): Promise<void> {
    this.stopAllPollers();
    await apiCall('POST', '/audio/shutdown');
  }

  async getEngineInfo(): Promise<EngineInfo> {
    return (await apiCall('GET', '/audio/info')) ?? {
      version: 'unknown', initialized: false, sampleRate: 44100, bufferSize: 512,
    };
  }

  async getEngineHealthSnapshot(): Promise<Record<string, unknown>> {
    return (await apiCall('GET', '/audio/health')) ?? {};
  }

  async getVersions(): Promise<Record<string, number>> {
    return (await apiCall('GET', '/audio/versions')) ?? {};
  }

  async getMeterSnapshot(): Promise<Record<string, unknown>> {
    return (await apiCall('GET', '/audio/meters')) ?? {};
  }

  async getMixerSnapshot(): Promise<Record<string, unknown>> {
    return (await apiCall('GET', '/audio/mixer')) ?? {};
  }

  async getMicrophoneSnapshot(): Promise<Record<string, unknown>> {
    return (await apiCall('GET', '/audio/microphone')) ?? {};
  }

  async version(): Promise<string> {
    return (await apiCall('GET', '/audio/version'))?.version ?? 'unknown';
  }

  async isInitialized(): Promise<boolean> {
    return (await apiCall('GET', '/audio/status'))?.initialized ?? false;
  }

  // ─── Deck transport ───────────────────────────────────────────────────────

  loadDeck(deckId: DeckId, url: string): Promise<void> {
    return apiCall('POST', `/audio/decks/${deckId}/load`, { url });
  }

  unloadDeck(deckId: DeckId): Promise<void> {
    return apiCall('POST', `/audio/decks/${deckId}/unload`);
  }

  play(deckId: DeckId):  Promise<void> { return apiCall('POST', `/audio/decks/${deckId}/play`); }
  pause(deckId: DeckId): Promise<void> { return apiCall('POST', `/audio/decks/${deckId}/pause`); }
  stop(deckId: DeckId):  Promise<void> { return apiCall('POST', `/audio/decks/${deckId}/stop`); }

  seek(deckId: DeckId, seconds: number): Promise<void> {
    return apiCall('POST', `/audio/decks/${deckId}/seek`, { position: seconds });
  }

  setCue(_deckId: DeckId, _seconds: number): Promise<void> {
    return Promise.reject(new Error('setCue is not available in the web adapter'));
  }

  jumpToCue(_deckId: DeckId): Promise<void> {
    return Promise.reject(new Error('jumpToCue is not available in the web adapter'));
  }

  setLoop(_deckId: DeckId, _loop: boolean): Promise<void> {
    return Promise.reject(new Error('setLoop is not available in the web adapter'));
  }

  setLoopRange(_deckId: DeckId, _startSeconds: number, _endSeconds: number): Promise<void> {
    return Promise.reject(new Error('setLoopRange is not available in the web adapter'));
  }

  setPitch(_deckId: DeckId, _percent: number): Promise<void> {
    return Promise.reject(new Error('setPitch is not available in the web adapter'));
  }

  // ─── Mixer ────────────────────────────────────────────────────────────────

  setCrossfade(value: number): Promise<void> {
    return apiCall('POST', '/audio/mixer/crossfade', { value });
  }

  setDeckGain(deckId: DeckId, gain: number): Promise<void> {
    return apiCall('POST', `/audio/mixer/decks/${deckId}/gain`, { gain });
  }

  setMasterGain(gain: number): Promise<void> {
    return apiCall('POST', '/audio/mixer/master-gain', { gain });
  }

  muteDeck(deckId: DeckId, muted: boolean): Promise<void> {
    return apiCall('POST', `/audio/mixer/decks/${deckId}/mute`, { muted });
  }

  soloDeck(deckId: DeckId, soloed: boolean): Promise<void> {
    return apiCall('POST', `/audio/mixer/decks/${deckId}/solo`, { soloed });
  }

  resetMixer(): Promise<void> {
    return apiCall('POST', '/audio/mixer/reset');
  }

  // ─── DSP ──────────────────────────────────────────────────────────────────

  setEQ(channelId: string, fx: FXParameters): Promise<void> {
    return apiCall('POST', '/audio/dsp/eq', { deckId: channelId, ...fx });
  }

  getEQ(channelId: string): Promise<FXParameters> {
    return apiCall('GET', `/audio/dsp/eq/${channelId}`);
  }

  setCompressor(s: CompressorSettings): Promise<void> {
    return apiCall('POST', '/audio/dsp/compressor', s);
  }

  getCompressor(): Promise<CompressorSettings> {
    return apiCall('GET', '/audio/dsp/compressor');
  }

  setLimiter(s: LimiterSettings): Promise<void> {
    return apiCall('POST', '/audio/dsp/limiter', s);
  }

  getLimiter(): Promise<LimiterSettings> {
    return apiCall('GET', '/audio/dsp/limiter');
  }

  resetDSP(): Promise<void> {
    return apiCall('POST', '/audio/dsp/reset');
  }

  // ─── Microphone ───────────────────────────────────────────────────────────

  async getAvailableInputDevices(): Promise<string[]> {
    return (await apiCall('GET', '/audio/microphone/devices')) ?? [];
  }

  enableMicrophone(input: string): Promise<void> {
    return apiCall('POST', '/audio/microphone/enable', { input });
  }

  disableMicrophone(): Promise<void> {
    return apiCall('POST', '/audio/microphone/disable');
  }

  setMicrophoneGain(gain: number): Promise<void> {
    return apiCall('POST', '/audio/microphone/gain', { gain });
  }

  muteMicrophone(muted: boolean): Promise<void> {
    return apiCall('POST', '/audio/microphone/mute', { muted });
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  startRecording(): Promise<void> { return apiCall('POST', '/audio/recording/start'); }
  pauseRecording(): Promise<void> { return apiCall('POST', '/audio/recording/pause'); }
  resumeRecording(): Promise<void> { return apiCall('POST', '/audio/recording/resume'); }
  stopRecording():  Promise<void> { return apiCall('POST', '/audio/recording/stop');  }

  // ─── Broadcast ────────────────────────────────────────────────────────────

  startBroadcast(config?: Record<string, unknown>): Promise<void> {
    return apiCall('POST', '/audio/broadcast/start', config ?? {});
  }

  stopBroadcast(): Promise<void> { return apiCall('POST', '/audio/broadcast/stop'); }

  // ─── Snapshots ────────────────────────────────────────────────────────────

  async getPlaybackSnapshot(): Promise<PlaybackSnapshot> {
    return (await apiCall('GET', '/audio/playback')) ?? DEFAULT_PLAYBACK;
  }

  async getDSPSnapshot(): Promise<DSPSnapshot> {
    return (await apiCall('GET', '/audio/dsp')) ?? DEFAULT_DSP;
  }

  async getRecordingSnapshot(): Promise<RecordingSnapshot> {
    return (await apiCall('GET', '/audio/recording')) ?? { isRecording: false, durationMs: 0 };
  }

  async getBroadcastSnapshot(): Promise<BroadcastSnapshot> {
    return (await apiCall('GET', '/audio/broadcast')) ??
      { isBroadcasting: false, bitrate: 0, uptime: 0 };
  }

  // ─── Events (polling-based) ───────────────────────────────────────────────

  on(event: string, handler: AudioEventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Start polling for this event if we know an endpoint for it
    if (!this.pollers.has(event) && POLL_ENDPOINTS[event]) {
      this.startPoller(event);
    }
  }

  off(event: string, handler: AudioEventHandler): void {
    this.handlers.get(event)?.delete(handler);

    // Stop the poller when no handlers remain
    if ((this.handlers.get(event)?.size ?? 0) === 0) {
      this.stopPoller(event);
    }
  }

  // ─── Polling internals ────────────────────────────────────────────────────

  private startPoller(event: string): void {
    const endpoint = POLL_ENDPOINTS[event];
    const interval = POLL_INTERVALS[event] ?? 1000;

    const id = setInterval(async () => {
      try {
        const data = await apiCall('GET', endpoint);
        if (!data) return;
        const serialized = JSON.stringify(data);
        // Only dispatch when data changes
        if (serialized !== this.lastData.get(event)) {
          this.lastData.set(event, serialized);
          this.dispatch(event, data);
        }
      } catch { /* network error — swallow silently */ }
    }, interval);

    this.pollers.set(event, id);
  }

  private stopPoller(event: string): void {
    const id = this.pollers.get(event);
    if (id !== undefined) {
      clearInterval(id);
      this.pollers.delete(event);
      this.lastData.delete(event);
    }
  }

  private stopAllPollers(): void {
    for (const event of this.pollers.keys()) {
      this.stopPoller(event);
    }
  }

  private dispatch(event: string, ...args: any[]): void {
    this.handlers.get(event)?.forEach((h) => {
      try { h(...args); } catch { /* handler errors must not crash the poller */ }
    });
  }
}
