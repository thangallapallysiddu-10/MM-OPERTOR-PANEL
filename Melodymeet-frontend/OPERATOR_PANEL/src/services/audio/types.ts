export type DeckId = 'A' | 'B';
export type AudioSessionType = 'RJ' | 'Podcast';

export interface FXParameters {
  highPassFilter?: number;
  lowPassFilter?: number;
  eqBass?: number;
  eqMid?: number;
  eqTreble?: number;
  echoDelay?: number;
}

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee?: number;
  makeup?: number;
}

export interface LimiterSettings {
  enabled: boolean;
  threshold: number;
  release: number;
}

export interface DeckSnapshot {
  isLoaded: boolean;
  isPlaying: boolean;
  position: number;
  url?: string;
}

export interface PlaybackSnapshot {
  deckA: DeckSnapshot;
  deckB: DeckSnapshot;
}

export interface DSPSnapshot {
  deckA: FXParameters;
  deckB: FXParameters;
  master?: {
    compressor: CompressorSettings;
    limiter: LimiterSettings;
  };
}

export interface RecordingSnapshot {
  isRecording: boolean;
  durationMs: number;
}

export interface BroadcastSnapshot {
  isBroadcasting: boolean;
  bitrate: number;
  uptime: number;
  reconnecting?: boolean;
}

export interface EngineInfo {
  version: string;
  initialized: boolean;
  sampleRate: number;
  bufferSize: number;
}

export type AudioEventHandler = (...args: any[]) => void;

export interface IAudioAdapter {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getEngineInfo(): Promise<EngineInfo>;
  getEngineHealthSnapshot(): Promise<Record<string, unknown>>;
  getVersions(): Promise<Record<string, number>>;
  setActiveSession(sessionType: AudioSessionType): Promise<void>;
  setOutputSession(sessionType: AudioSessionType): Promise<void>;
  getMeterSnapshot(): Promise<Record<string, unknown>>;
  getMixerSnapshot(): Promise<Record<string, unknown>>;
  getMicrophoneSnapshot(): Promise<Record<string, unknown>>;

  loadDeck(deckId: DeckId, url: string): Promise<void>;
  unloadDeck(deckId: DeckId): Promise<void>;
  play(deckId: DeckId): Promise<void>;
  pause(deckId: DeckId): Promise<void>;
  stop(deckId: DeckId): Promise<void>;
  seek(deckId: DeckId, seconds: number): Promise<void>;
  setCue(deckId: DeckId, seconds: number): Promise<void>;
  jumpToCue(deckId: DeckId): Promise<void>;
  setLoop(deckId: DeckId, loop: boolean): Promise<void>;
  setLoopRange(deckId: DeckId, startSeconds: number, endSeconds: number): Promise<void>;
  setPitch(deckId: DeckId, percent: number): Promise<void>;

  setCrossfade(value: number): Promise<void>;
  setDeckGain(deckId: DeckId, gain: number): Promise<void>;
  setMasterGain(gain: number): Promise<void>;
  muteDeck(deckId: DeckId, muted: boolean): Promise<void>;
  soloDeck(deckId: DeckId, soloed: boolean): Promise<void>;
  resetMixer(): Promise<void>;

  setEQ(channelId: string, fx: FXParameters): Promise<void>;
  getEQ(channelId: string): Promise<FXParameters>;
  setCompressor(s: CompressorSettings): Promise<void>;
  getCompressor(): Promise<CompressorSettings>;
  setLimiter(s: LimiterSettings): Promise<void>;
  getLimiter(): Promise<LimiterSettings>;
  setMicrophoneCompressor(micIndex: number, s: CompressorSettings): Promise<void>;
  setMicrophoneLimiter(micIndex: number, s: LimiterSettings): Promise<void>;
  resetDSP(): Promise<void>;

  getAvailableInputDevices(): Promise<string[]>;
  enableMicrophone(input: string): Promise<void>;
  enableMicrophoneByIndex(micIndex: number, input: string): Promise<void>;
  disableMicrophone(): Promise<void>;
  disableMicrophoneByIndex(micIndex: number): Promise<void>;
  setMicrophoneGain(gain: number): Promise<void>;
  setMicrophoneGainByIndex(micIndex: number, gain: number): Promise<void>;
  muteMicrophone(muted: boolean): Promise<void>;
  muteMicrophoneByIndex(micIndex: number, muted: boolean): Promise<void>;

  startRecording(): Promise<void>;
  pauseRecording(): Promise<void>;
  resumeRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  startBroadcast(config?: Record<string, unknown>): Promise<void>;
  stopBroadcast(): Promise<void>;

  getPlaybackSnapshot(): Promise<PlaybackSnapshot>;
  getDSPSnapshot(): Promise<DSPSnapshot>;
  getRecordingSnapshot(): Promise<RecordingSnapshot>;
  getBroadcastSnapshot(): Promise<BroadcastSnapshot>;

  on(event: string, handler: AudioEventHandler): void;
  off(event: string, handler: AudioEventHandler): void;
}
