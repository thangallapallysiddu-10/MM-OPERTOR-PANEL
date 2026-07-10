/**
 * Podcast Studio Persistence
 * 
 * Saves and restores podcast studio state across sessions.
 */

import { isDesktop } from '../../../utils/platform';

export interface DSPSettings {
  gain: number;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  hpfEnabled: boolean;
  hpfCutoff: number;
  lpfEnabled: boolean;
  lpfCutoff: number;
  compEnabled: boolean;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  compMakeup: number;
  limEnabled: boolean;
  limThreshold: number;
  limRelease: number;
}

export interface MicrophoneState {
  isActive: boolean;
  isMuted: boolean;
  device: string;
  dsp: DSPSettings;
}

export interface MasterState {
  gain: number;
  compressor?: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeup: number;
  };
  limiter?: {
    enabled: boolean;
    threshold: number;
    release: number;
  };
}

export interface PodcastStudioState {
  version: number; // For migration
  microphones: {
    [micId: string]: MicrophoneState;
  };
  master: MasterState;
  preferences: {
    autoStartEngine: boolean;
    defaultSampleRate: number;
    defaultBitDepth: number;
  };
  lastSaved: number;
}

const STORAGE_KEY = 'podcast.studio.state';
const CURRENT_VERSION = 1;

/**
 * Save podcast studio state
 */
export const savePodcastState = async (state: PodcastStudioState): Promise<boolean> => {
  try {
    const stateWithMetadata = {
      ...state,
      version: CURRENT_VERSION,
      lastSaved: Date.now(),
    };

    if (isDesktop()) {
      // Electron store (if available)
      if (typeof window !== 'undefined' && (window as any).electronStore) {
        await (window as any).electronStore.set(STORAGE_KEY, stateWithMetadata);
      } else {
        // Fallback to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithMetadata));
      }
    } else {
      // Web: localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithMetadata));
    }

    console.log('[PERSISTENCE] State saved successfully');
    return true;
  } catch (error) {
    console.error('[PERSISTENCE] Failed to save state:', error);
    return false;
  }
};

/**
 * Load podcast studio state
 */
export const loadPodcastState = async (): Promise<PodcastStudioState | null> => {
  try {
    let stateData: any = null;

    if (isDesktop()) {
      // Electron store (if available)
      if (typeof window !== 'undefined' && (window as any).electronStore) {
        stateData = await (window as any).electronStore.get(STORAGE_KEY);
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          stateData = JSON.parse(stored);
        }
      }
    } else {
      // Web: localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        stateData = JSON.parse(stored);
      }
    }

    if (!stateData) {
      console.log('[PERSISTENCE] No saved state found');
      return null;
    }

    // Validate version and migrate if needed
    if (stateData.version !== CURRENT_VERSION) {
      console.log('[PERSISTENCE] Migrating state from version', stateData.version, 'to', CURRENT_VERSION);
      stateData = migrateState(stateData);
    }

    console.log('[PERSISTENCE] State loaded successfully');
    return stateData;
  } catch (error) {
    console.error('[PERSISTENCE] Failed to load state:', error);
    return null;
  }
};

/**
 * Clear saved state
 */
export const clearPodcastState = async (): Promise<boolean> => {
  try {
    if (isDesktop()) {
      if (typeof window !== 'undefined' && (window as any).electronStore) {
        await (window as any).electronStore.delete(STORAGE_KEY);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    console.log('[PERSISTENCE] State cleared successfully');
    return true;
  } catch (error) {
    console.error('[PERSISTENCE] Failed to clear state:', error);
    return false;
  }
};

/**
 * Migrate state between versions
 */
const migrateState = (oldState: any): PodcastStudioState => {
  // For now, just return as-is with updated version
  // Add migration logic here when needed
  return {
    ...oldState,
    version: CURRENT_VERSION,
  };
};

/**
 * Get default DSP settings
 */
export const getDefaultDSPSettings = (): DSPSettings => ({
  gain: 60,
  eqBass: 50,
  eqMid: 50,
  eqTreble: 50,
  hpfEnabled: false,
  hpfCutoff: 80,
  lpfEnabled: false,
  lpfCutoff: 10000,
  compEnabled: false,
  compThreshold: -20,
  compRatio: 4,
  compAttack: 5,
  compRelease: 120,
  compMakeup: 2,
  limEnabled: false,
  limThreshold: -1,
  limRelease: 80,
});

/**
 * Get default state
 */
export const getDefaultState = (): PodcastStudioState => ({
  version: CURRENT_VERSION,
  microphones: {
    mic1: {
      isActive: false,
      isMuted: false,
      device: '',
      dsp: getDefaultDSPSettings(),
    },
    mic2: {
      isActive: false,
      isMuted: false,
      device: '',
      dsp: getDefaultDSPSettings(),
    },
    mic3: {
      isActive: false,
      isMuted: false,
      device: '',
      dsp: getDefaultDSPSettings(),
    },
    mic4: {
      isActive: false,
      isMuted: false,
      device: '',
      dsp: getDefaultDSPSettings(),
    },
    mic5: {
      isActive: false,
      isMuted: false,
      device: '',
      dsp: getDefaultDSPSettings(),
    },
  },
  master: {
    gain: 75,
  },
  preferences: {
    autoStartEngine: true,
    defaultSampleRate: 48000,
    defaultBitDepth: 24,
  },
  lastSaved: Date.now(),
});
