// global.d.ts
declare module '*.css' {
  const content: any;
  export default content;
}

// ─── Electron IPC bridge — injected by preload script ────────────────────────
// This interface mirrors IAudioAdapter exactly so TypeScript can validate
// direct window.audio calls in DesktopAdapter.ts.
interface WindowAudioBridge {
  // Lifecycle
  initialize():    Promise<{ success: boolean }>;
  shutdown():      Promise<{ success: boolean }>;
  version():       Promise<string>;
  isInitialized(): Promise<boolean>;
  engineInfo():    Promise<{ version: string; initialized: boolean; sampleRate: number; bufferSize: number }>;

  // Deck transport
  loadDeck(deckId: 'A' | 'B', url: string): Promise<void>;
  unloadDeck(deckId: 'A' | 'B'):            Promise<void>;
  play(deckId: 'A' | 'B'):                  Promise<void>;
  pause(deckId: 'A' | 'B'):                 Promise<void>;
  stop(deckId: 'A' | 'B'):                  Promise<void>;
  seek(deckId: 'A' | 'B', seconds: number): Promise<void>;

  // Mixer
  setCrossfade(value: number):                   Promise<void>;
  setDeckGain(deckId: 'A' | 'B', gain: number):  Promise<void>;
  setMasterGain(gain: number):                   Promise<void>;
  muteDeck(deckId: 'A' | 'B', muted: boolean):   Promise<void>;

  // DSP
  setEQ(deckId: 'A' | 'B', fx: Record<string, number>): Promise<void>;
  setCompressor(deckId: 'A' | 'B', settings: Record<string, number>): Promise<void>;
  setLimiter(settings: Record<string, number>): Promise<void>;

  // Microphone
  getAvailableInputDevices(): Promise<string[]>;
  enableMicrophone(input: string): Promise<void>;
  disableMicrophone():             Promise<void>;
  muteMicrophone(muted: boolean):  Promise<void>;

  // Recording
  startRecording(): Promise<void>;
  stopRecording():  Promise<void>;

  // Audio File Serving
  readRecordingFile(filePath: string): Promise<{ success: boolean; data?: Uint8Array; size?: number; error?: string }>;

  // Broadcast
  startBroadcast(config?: Record<string, unknown>): Promise<void>;
  stopBroadcast(): Promise<void>;

  // Snapshots
  getPlaybackSnapshot():  Promise<{ deckA: any; deckB: any }>;
  getDSPSnapshot():       Promise<{ deckA: any; deckB: any }>;
  getRecordingSnapshot(): Promise<{ isRecording: boolean; durationMs: number }>;
  getBroadcastSnapshot(): Promise<{ isBroadcasting: boolean; bitrate: number; uptime: number }>;

  // Events
  on(event: string,  handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

interface Window {
  /** Electron IPC bridge — present only in the Desktop (Electron) environment. */
  audio?: WindowAudioBridge;

  desktop?: {
    ping: () => Promise<string>;
  };

  /** Legacy test panel — kept for Electron diagnostics only. */
  audioEngine?: {
    initialize: () => Promise<{ success: boolean }>;
    shutdown:   () => Promise<{ success: boolean }>;
    version:    () => Promise<string>;
    isInitialized: () => Promise<boolean>;
    engineInfo: () => Promise<{
      version: string;
      initialized: boolean;
      sampleRate: number;
      bufferSize: number;
    }>;
  };
}