import { RjApi } from '../../../services/api/rjApi';
type Track = any;

export interface AudioEffectState {
  highPassFilter: number;
  lowPassFilter: number;
  eqBass: number;
  eqTreble: number;
  echoDelay: number;
  echoWetDry: number;
  reverb: number;
  reverbDecay: number;
  flanger: number;
  flangerRate: number;
  phaser: number;
  phaserRate: number;
}

export interface RjPlayerSession {
  track: Track | null;
  audioUrl: string | null;
  volume: number;
  fx: AudioEffectState;
  playbackPosition: number;
  isLoaded: boolean;
  wasPlaying: boolean;
}

export interface RjSessionData {
  version: 1;
  savedAt: number;
  playerA: RjPlayerSession;
  playerB: RjPlayerSession;
}

export interface SessionProvider {
  loadSession(studioId: string): Promise<{ data: RjSessionData | null; source: 'Backend' | 'LocalStorage' | null }>;
  saveSession(studioId: string, data: RjSessionData): Promise<void>;
}

export class RjSessionManager implements SessionProvider {
  private static readonly LOCAL_STORAGE_KEY_PREFIX = 'rj_session_state_';

  public async loadSession(studioId: string): Promise<{ data: RjSessionData | null; source: 'Backend' | 'LocalStorage' | null }> {
    let backendSession: RjSessionData | null = null;
    let backendUpdatedAt = 0;
    
    // 1. Fetch Backend Session
    try {
      const response = await RjApi.getStudio(studioId);
      const studio = (response as any).data?.studio ?? (response as any).studio;
      if (studio?.dualPlayer?.version === 1 && studio?.dualPlayer?.savedAt) {
        backendSession = studio.dualPlayer as RjSessionData;
        backendUpdatedAt = studio.updatedAt ? new Date(studio.updatedAt).getTime() : backendSession.savedAt;
      }
    } catch (err) {
      console.warn('Failed to load backend session', err);
    }

    // 2. Fetch LocalStorage Session
    let localSession: RjSessionData | null = null;
    try {
      const stored = localStorage.getItem(`${RjSessionManager.LOCAL_STORAGE_KEY_PREFIX}${studioId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as RjSessionData;
        if (parsed.version === 1 && parsed.savedAt) {
          localSession = parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse local session', err);
    }

    // 3. Resolve Newest Session
    if (backendSession && localSession) {
      if (backendSession.savedAt >= localSession.savedAt) {
        return { data: backendSession, source: 'Backend' };
      }
      return { data: localSession, source: 'LocalStorage' };
    } else if (backendSession) {
      return { data: backendSession, source: 'Backend' };
    } else if (localSession) {
      return { data: localSession, source: 'LocalStorage' };
    }

    return { data: null, source: null };
  }

  public async saveSession(studioId: string, data: RjSessionData): Promise<void> {
    // Strip track objects before persisting — local file:/// URIs are meaningless
    // after a page reload (the audio engine has no loaded audio). Only FX state
    // and volume are worth keeping; tracks must always be reloaded manually.
    const safeData: RjSessionData = {
      ...data,
      playerA: {
        ...data.playerA,
        track: null,
        audioUrl: null,
        isLoaded: false,
        wasPlaying: false,
        playbackPosition: 0,
      },
      playerB: {
        ...data.playerB,
        track: null,
        audioUrl: null,
        isLoaded: false,
        wasPlaying: false,
        playbackPosition: 0,
      },
    };

    // Save to LocalStorage as offline fallback
    try {
      localStorage.setItem(`${RjSessionManager.LOCAL_STORAGE_KEY_PREFIX}${studioId}`, JSON.stringify(safeData));
    } catch (err) {
      console.warn('Failed to save session to localStorage', err);
    }

    // Patch backend — send only the sanitised (track-free) dual player state
    try {
      await RjApi.patchState(studioId, { dualPlayer: safeData });
    } catch (err) {
      console.warn('Failed to save session to backend', err);
    }
  }
}

export const sessionManager = new RjSessionManager();
