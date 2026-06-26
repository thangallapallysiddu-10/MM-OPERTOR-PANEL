// hooks/useAudioEffects.ts - Hook for managing player audio effects

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../services/api/apiClient';
import { rjBackend } from '../features/rj/services/rjBackend';
import { audio } from '../services/audio';
import type { FXParameters } from '../services/audio';

interface AudioEffectState {
  // Filters
  highPassFilter: number; // Hz (20-20000)
  lowPassFilter: number; // Hz (20-20000)

  // EQ Bands
  eqBass: number; // 0-100
  eqTreble: number; // 0-100

  // Time-based effects
  echoDelay: number; // ms (0-2000)
}

interface PlayerAudioSettings {
  volume: number;
  fx: AudioEffectState;
}

const DEFAULT_FX: AudioEffectState = {
  highPassFilter: 20,
  lowPassFilter: 20000,
  eqBass: 50,
  eqTreble: 50,
  echoDelay: 0,
};

export const useAudioEffects = (studioId: string | null, playerName: 'A' | 'B') => {
  const [settings, setSettings] = useState<PlayerAudioSettings>({
    volume: 75,
    fx: { ...DEFAULT_FX },
  });

  const [effectMetadata, setEffectMetadata] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<{ [key: string]: any }>({});

  const getEffectiveStudioId = useCallback(
    () => studioId ?? rjBackend.getStudioId(),
    [studioId]
  );

  // Fetch effect metadata once
  const fetchEffectMetadata = useCallback(async () => {
    try {
      const response = await apiClient.get('/rj/effects/metadata');
      if (response.data?.data) {
        setEffectMetadata(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching effect metadata:', err);
    }
  }, []);

  // Fetch player settings and apply to engine
  const fetchPlayerSettings = useCallback(async () => {
    const effectiveStudioId = getEffectiveStudioId();
    if (!effectiveStudioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        `/rj/${effectiveStudioId}/players/${playerName}/settings`
      );
      if (response.data?.data) {
        setSettings(response.data.data);
        // Route through unified SDK — adapter decides Desktop vs Web
        if (response.data.data.fx) {
          audio.setEQ(playerName, response.data.data.fx).catch(() => {});
        }
        if (response.data.data.volume !== undefined) {
          audio.setDeckGain(playerName, response.data.data.volume).catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch player settings');
      console.error('Error fetching player settings:', err);
    } finally {
      setLoading(false);
    }
  }, [getEffectiveStudioId, playerName]);

  // Load metadata on mount — settings are loaded by useRjSessionPersistence
  useEffect(() => {
    fetchEffectMetadata();
  }, [fetchEffectMetadata]);

  // Update single effect
  const updateEffect = useCallback(
    (effectName: string, value: number) => {
      setSettings((prev) => {
        const newSettings: PlayerAudioSettings = {
          ...prev,
          fx: { ...prev.fx, [effectName]: value },
        };
        // Send to engine via SDK
        audio.setEQ(playerName, newSettings.fx as FXParameters).catch(() => {});
        return newSettings;
      });

      const effectiveStudioId = getEffectiveStudioId();
      if (!effectiveStudioId) return;

      if (debounceTimers.current[effectName]) {
        clearTimeout(debounceTimers.current[effectName]);
      }

      debounceTimers.current[effectName] = setTimeout(async () => {
        try {
          await apiClient.patch(
            `/rj/${effectiveStudioId}/players/${playerName}/effect`,
            { effectName, value }
          );
        } catch (err: any) {
          console.error('Error updating effect:', err);
          setError(err?.message || 'Failed to update effect');
        }
      }, 500);
    },
    [getEffectiveStudioId, playerName]
  );

  // Update multiple effects
  const updateEffects = useCallback(
    async (fxValues: Partial<AudioEffectState>) => {
      setSettings((prev) => {
        const newSettings: PlayerAudioSettings = {
          ...prev,
          fx: { ...prev.fx, ...fxValues },
        };
        audio.setEQ(playerName, newSettings.fx as FXParameters).catch(() => {});
        return newSettings;
      });

      const effectiveStudioId = getEffectiveStudioId();
      if (!effectiveStudioId) return;

      try {
        const response = await apiClient.patch(
          `/rj/${effectiveStudioId}/players/${playerName}/effects`,
          fxValues
        );

        if (response.data?.data) {
          setSettings((prev) => {
            const newSettings: PlayerAudioSettings = {
              ...prev,
              fx: response.data.data,
            };
            audio.setEQ(playerName, newSettings.fx as FXParameters).catch(() => {});
            return newSettings;
          });
        }
      } catch (err: any) {
        console.error('Error updating effects:', err);
        setError(err?.message || 'Failed to update effects');
      }
    },
    [getEffectiveStudioId, playerName]
  );

  // Update volume
  const updateVolume = useCallback(
    (volume: number) => {
      const roundedVolume = Math.round(volume);

      setSettings((prev) => {
        audio.setDeckGain(playerName, roundedVolume).catch(() => {});
        return { ...prev, volume: roundedVolume };
      });

      const effectiveStudioId = getEffectiveStudioId();
      if (!effectiveStudioId) return;

      if (debounceTimers.current['volume']) {
        clearTimeout(debounceTimers.current['volume']);
      }

      debounceTimers.current['volume'] = setTimeout(async () => {
        try {
          await apiClient.patch(
            `/rj/${effectiveStudioId}/players/${playerName}/volume`,
            { volume: roundedVolume }
          );
        } catch (err: any) {
          console.error('Error updating volume:', err);
          setError(err?.message || 'Failed to update volume');
        }
      }, 500);
    },
    [getEffectiveStudioId, playerName]
  );

  // Reset all effects to defaults
  const resetEffects = useCallback(async () => {
    setSettings((prev) => {
      const newSettings: PlayerAudioSettings = { ...prev, fx: { ...DEFAULT_FX } };
      audio.setEQ(playerName, newSettings.fx as FXParameters).catch(() => {});
      return newSettings;
    });

    const effectiveStudioId = getEffectiveStudioId();
    if (!effectiveStudioId) return;

    try {
      const response = await apiClient.post(
        `/rj/${effectiveStudioId}/players/${playerName}/effects/reset`
      );

      if (response.data?.data) {
        setSettings((prev) => {
          const newSettings: PlayerAudioSettings = { ...prev, fx: response.data.data };
          audio.setEQ(playerName, newSettings.fx as FXParameters).catch(() => {});
          return newSettings;
        });
      }
    } catch (err: any) {
      console.error('Error resetting effects:', err);
      setError(err?.message || 'Failed to reset effects');
    }
  }, [getEffectiveStudioId, playerName]);

  return {
    settings,
    volume: settings.volume,
    fx: settings.fx,
    effectMetadata,
    loading,
    error,
    updateEffect,
    updateEffects,
    updateVolume,
    resetEffects,
    fetchPlayerSettings,
    fetchEffectMetadata,
  };
};

export default useAudioEffects;
