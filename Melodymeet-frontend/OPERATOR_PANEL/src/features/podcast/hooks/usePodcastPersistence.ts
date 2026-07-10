/**
 * usePodcastPersistence Hook
 * 
 * Manages saving and restoring podcast studio state.
 */

import { useEffect, useCallback, useRef } from 'react';
import { audio } from '../../../services/audio';
import { 
  savePodcastState, 
  loadPodcastState, 
  PodcastStudioState,
  getDefaultState,
} from '../utils/persistence';
import { useErrorHandler } from './useErrorHandler';

interface UsePodcastPersistenceOptions {
  autoSave?: boolean;
  autoRestore?: boolean;
  saveDebounceMs?: number;
}

export const usePodcastPersistence = (
  currentState: Partial<PodcastStudioState>,
  options: UsePodcastPersistenceOptions = {}
) => {
  const {
    autoSave = true,
    autoRestore = true,
    saveDebounceMs = 1000,
  } = options;

  const { handleError } = useErrorHandler();
  const saveTimeoutRef = useRef<any>(null);
  const hasRestoredRef = useRef(false);

  /**
   * Save current state with debouncing
   */
  const saveState = useCallback(async (immediate = false) => {
    if (!currentState) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const performSave = async () => {
      try {
        const fullState: PodcastStudioState = {
          ...getDefaultState(),
          ...currentState,
        };

        const success = await savePodcastState(fullState);
        if (!success) {
          handleError('engine', 'Failed to save studio state', 'warning');
        }
      } catch (error: any) {
        handleError('engine', `Failed to save studio state: ${error.message}`, 'error', error);
      }
    };

    if (immediate) {
      await performSave();
    } else {
      // Debounce save
      saveTimeoutRef.current = setTimeout(performSave, saveDebounceMs);
    }
  }, [currentState, saveDebounceMs, handleError]);

  /**
   * Restore state and apply to audio engine
   */
  const restoreState = useCallback(async (): Promise<PodcastStudioState | null> => {
    try {
      const state = await loadPodcastState();
      if (!state) {
        console.log('[PERSISTENCE] No state to restore');
        return null;
      }

      console.log('[PERSISTENCE] Restoring studio state...');

      // Restore master gain
      if (state.master?.gain !== undefined) {
        try {
          await audio.setMasterGain(state.master.gain / 100);
          console.log('[PERSISTENCE] ✓ Master gain restored:', state.master.gain);
        } catch (error: any) {
          handleError('engine', `Failed to restore master gain: ${error.message}`, 'warning');
        }
      }

      // Restore microphone states
      for (const [micId, micState] of Object.entries(state.microphones)) {
        const micIndex = parseInt(micId.replace('mic', '')) - 1;

        try {
          // Restore active state and device
          if (micState.isActive && micState.device) {
            await audio.enableMicrophoneByIndex(micIndex, micState.device);
            console.log(`[PERSISTENCE] ✓ Mic ${micIndex + 1} enabled with device:`, micState.device);
          }

          // Restore mute state
          if (micState.isMuted) {
            await audio.muteMicrophoneByIndex(micIndex, true);
            console.log(`[PERSISTENCE] ✓ Mic ${micIndex + 1} muted`);
          }

          // Restore DSP settings
          if (micState.dsp) {
            const channelId = `Mic${micIndex + 1}`;
            const dsp = micState.dsp;

            // Gain
            if (dsp.gain !== undefined) {
              await audio.setMicrophoneGainByIndex(micIndex, dsp.gain / 100);
            }

            // EQ
            await audio.setEQ(channelId, {
              eqBass: dsp.eqBass / 100,
              eqMid: dsp.eqMid / 100,
              eqTreble: dsp.eqTreble / 100,
            });

            // Compressor
            if (dsp.compEnabled) {
              await audio.setMicrophoneCompressor(micIndex, {
                enabled: dsp.compEnabled,
                threshold: dsp.compThreshold,
                ratio: dsp.compRatio,
                attack: dsp.compAttack,
                release: dsp.compRelease,
                makeup: dsp.compMakeup,
              });
            }

            // Limiter
            if (dsp.limEnabled) {
              await audio.setMicrophoneLimiter(micIndex, {
                enabled: dsp.limEnabled,
                threshold: dsp.limThreshold,
                release: dsp.limRelease,
              });
            }

            console.log(`[PERSISTENCE] ✓ Mic ${micIndex + 1} DSP settings restored`);
          }
        } catch (error: any) {
          handleError(
            'device',
            `Failed to restore mic ${micIndex + 1}: ${error.message}`,
            'warning'
          );
        }
      }

      console.log('[PERSISTENCE] ✅ Studio state restored successfully');
      return state;
    } catch (error: any) {
      handleError('engine', `Failed to restore studio state: ${error.message}`, 'error', error);
      return null;
    }
  }, [handleError]);

  /**
   * Auto-save on state changes
   */
  useEffect(() => {
    if (!autoSave) return;
    saveState();

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoSave, currentState, saveState]);

  /**
   * Auto-restore on mount
   */
  useEffect(() => {
    if (!autoRestore || hasRestoredRef.current) return;

    hasRestoredRef.current = true;
    restoreState();
  }, [autoRestore, restoreState]);

  /**
   * Save immediately on unmount
   */
  useEffect(() => {
    return () => {
      if (currentState) {
        // Synchronous save on unmount
        const fullState: PodcastStudioState = {
          ...getDefaultState(),
          ...currentState,
        };
        // Use synchronous localStorage as fallback
        try {
          localStorage.setItem('podcast.studio.state', JSON.stringify(fullState));
        } catch (error) {
          console.error('[PERSISTENCE] Failed to save on unmount:', error);
        }
      }
    };
  }, [currentState]);

  return {
    saveState,
    restoreState,
  };
};
