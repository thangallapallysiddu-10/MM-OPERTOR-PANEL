export interface FXParameters {
  volume: number; // 0 - 100
  highPassFilter: number; // 20 - 20000 Hz
  lowPassFilter: number; // 20 - 20000 Hz
  eqBass: number; // 0 - 100
  eqTreble: number; // 0 - 100
  echoDelay: number; // 0 - 2000 ms
}

export interface DeckState {
  isPlaying: boolean;
  isMuted: boolean;
  fx: FXParameters;
}

export interface PublicEngineAPI {
  loadTrack(uri: string): Promise<void>;
  unloadTrack(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(timeSeconds: number): void;
  restart(): void;
  
  setVolume(volume: number): void;
  setHighPass(hz: number): void;
  setLowPass(hz: number): void;
  setBass(gainPercent: number): void;
  setTreble(gainPercent: number): void;
  setDelay(ms: number): void;
  updateFX(updates: Partial<FXParameters>): void;
  
  getState(): DeckState;
  serializeState(): string;
  restoreState(stateJson: string): void;
  destroy(): void;
}
