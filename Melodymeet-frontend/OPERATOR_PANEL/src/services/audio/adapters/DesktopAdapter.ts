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

type WindowAudio = typeof window & { audio?: Record<string, any> };

class DesktopAudioError extends Error {
  constructor(method: string) {
    super(`Desktop audio bridge method unavailable: ${method}`);
    this.name = 'DesktopAudioError';
  }
}

const normalizeDesktopAudioPath = (value: string): string => {
  if (!value) return value;
  if (value.startsWith('file://')) {
    try {
      const decoded = decodeURI(value.replace(/^file:\/\//, ''));
      return decoded.startsWith('/') && /^[A-Za-z]:\//.test(decoded.slice(1))
        ? decoded.slice(1)
        : decoded;
    } catch {
      return value;
    }
  }
  return value;
};

export class DesktopAdapter implements IAudioAdapter {
  private get w(): Record<string, any> {
    return (window as WindowAudio).audio ?? {};
  }

  private invoke<T>(method: string, ...args: any[]): Promise<T> {
    const fn = this.w[method];
    if (typeof fn !== 'function') {
      return Promise.reject(new DesktopAudioError(method));
    }
    return Promise.resolve(fn.call(this.w, ...args));
  }

  initialize(): Promise<void> { return this.invoke('initialize'); }
  shutdown(): Promise<void> { return this.invoke('shutdown'); }
  getEngineInfo(): Promise<EngineInfo> { return this.invoke('getEngineInfo'); }
  getEngineHealthSnapshot(): Promise<Record<string, unknown>> { return this.invoke('getEngineHealthSnapshot'); }
  getVersions(): Promise<Record<string, number>> { return this.invoke('getVersions'); }
  getMeterSnapshot(): Promise<Record<string, unknown>> { return this.invoke('getMeterSnapshot'); }
  getMixerSnapshot(): Promise<Record<string, unknown>> { return this.invoke('getMixerSnapshot'); }
  getMicrophoneSnapshot(): Promise<Record<string, unknown>> { return this.invoke('getMicrophoneSnapshot'); }

  loadDeck(deckId: DeckId, url: string): Promise<void> {
    const normalizedPath = normalizeDesktopAudioPath(url);
    console.log('[AudioSDK TRACE] DesktopAdapter.loadDeck', { deckId, url, normalizedPath });
    return this.invoke('loadDeck', deckId, normalizedPath);
  }
  unloadDeck(deckId: DeckId): Promise<void> { return this.invoke('unloadDeck', deckId); }
  play(deckId: DeckId): Promise<void> { return this.invoke('play', deckId); }
  pause(deckId: DeckId): Promise<void> { return this.invoke('pause', deckId); }
  stop(deckId: DeckId): Promise<void> { return this.invoke('stop', deckId); }
  seek(deckId: DeckId, seconds: number): Promise<void> { return this.invoke('seek', deckId, seconds); }
  setCue(deckId: DeckId, seconds: number): Promise<void> { return this.invoke('setCue', deckId, seconds); }
  jumpToCue(deckId: DeckId): Promise<void> { return this.invoke('jumpToCue', deckId); }
  setLoop(deckId: DeckId, loop: boolean): Promise<void> { return this.invoke('setLoop', deckId, loop); }
  setLoopRange(deckId: DeckId, startSeconds: number, endSeconds: number): Promise<void> {
    return this.invoke('setLoopRange', deckId, startSeconds, endSeconds);
  }
  setPitch(deckId: DeckId, percent: number): Promise<void> { return this.invoke('setPitch', deckId, percent); }

  setCrossfade(value: number): Promise<void> { return this.invoke('setCrossfade', value); }
  setDeckGain(deckId: DeckId, gain: number): Promise<void> { return this.invoke('setDeckGain', deckId, gain); }
  setMasterGain(gain: number): Promise<void> { return this.invoke('setMasterGain', gain); }
  muteDeck(deckId: DeckId, muted: boolean): Promise<void> { return this.invoke('muteDeck', deckId, muted); }
  soloDeck(deckId: DeckId, soloed: boolean): Promise<void> { return this.invoke('soloDeck', deckId, soloed); }
  resetMixer(): Promise<void> { return this.invoke('resetMixer'); }

  setEQ(channelId: string, fx: FXParameters): Promise<void> { return this.invoke('setEQ', channelId, fx); }
  getEQ(channelId: string): Promise<FXParameters> { return this.invoke('getEQ', channelId); }
  setCompressor(s: CompressorSettings): Promise<void> { return this.invoke('setCompressor', s); }
  getCompressor(): Promise<CompressorSettings> { return this.invoke('getCompressor'); }
  setLimiter(s: LimiterSettings): Promise<void> { return this.invoke('setLimiter', s); }
  getLimiter(): Promise<LimiterSettings> { return this.invoke('getLimiter'); }
  resetDSP(): Promise<void> { return this.invoke('resetDSP'); }

  getAvailableInputDevices(): Promise<string[]> { return this.invoke('getAvailableInputDevices'); }
  enableMicrophone(input: string): Promise<void> { return this.invoke('enableMicrophone', input); }
  disableMicrophone(): Promise<void> { return this.invoke('disableMicrophone'); }
  setMicrophoneGain(gain: number): Promise<void> { return this.invoke('setMicrophoneGain', gain); }
  muteMicrophone(muted: boolean): Promise<void> { return this.invoke('muteMicrophone', muted); }

  startRecording(): Promise<void> { return this.invoke('startRecording'); }
  pauseRecording(): Promise<void> { return this.invoke('pauseRecording'); }
  resumeRecording(): Promise<void> { return this.invoke('resumeRecording'); }
  stopRecording(): Promise<void> { return this.invoke('stopRecording'); }

  startBroadcast(config?: Record<string, unknown>): Promise<void> { return this.invoke('startBroadcast', config ?? {}); }
  stopBroadcast(): Promise<void> { return this.invoke('stopBroadcast'); }

  getPlaybackSnapshot(): Promise<PlaybackSnapshot> { return this.invoke('getPlaybackSnapshot'); }
  getDSPSnapshot(): Promise<DSPSnapshot> { return this.invoke('getDSPSnapshot'); }
  getRecordingSnapshot(): Promise<RecordingSnapshot> { return this.invoke('getRecordingSnapshot'); }
  getBroadcastSnapshot(): Promise<BroadcastSnapshot> { return this.invoke('getBroadcastSnapshot'); }

  on(event: string, handler: AudioEventHandler): void {
    const fn = this.w.on;
    if (typeof fn !== 'function') throw new DesktopAudioError('on');
    fn.call(this.w, event, handler);
  }

  off(event: string, handler: AudioEventHandler): void {
    const fn = this.w.off;
    if (typeof fn !== 'function') throw new DesktopAudioError('off');
    fn.call(this.w, event, handler);
  }
}
