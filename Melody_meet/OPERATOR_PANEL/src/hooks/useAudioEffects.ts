// hooks/useAudioEffects.ts - Hook for managing player audio effects

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../services/api/apiClient';
import { audioEngineManager } from '../services/audioEngine/core/AudioEngineManager';

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

export const useAudioEffects = (studioId: string | null, playerName: 'A' | 'B') => {
  const [settings, setSettings] = useState<PlayerAudioSettings>({
    volume: 75,
    fx: {
      highPassFilter: 20,
      lowPassFilter: 20000,
      eqBass: 50,
      eqTreble: 50,
      echoDelay: 0,

    },
  });

  const [effectMetadata, setEffectMetadata] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<{ [key: string]: any }>({});

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

  // Fetch player settings
  const fetchPlayerSettings = useCallback(async () => {
    if (!studioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        `/rj/${studioId}/players/${playerName}/settings`
      );
      if (response.data?.data) {
        setSettings(response.data.data);
        audioEngineManager.getDeck(playerName).updateFX({ 
          ...response.data.data.fx,
          volume: response.data.data.volume
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch player settings');
      console.error('Error fetching player settings:', err);
    } finally {
      setLoading(false);
    }
  }, [studioId, playerName]);

  // Load metadata and settings on mount
  useEffect(() => {
    fetchEffectMetadata();
    // fetchPlayerSettings is deliberately omitted here.
    // Initialization is now handled by useRjSessionPersistence to enforce precedence rules.
  }, [fetchEffectMetadata]);

  // Update single effect
  const updateEffect = useCallback(
    (effectName: string, value: number) => {
      if (!studioId) return;

      // Optimistic update
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          fx: { ...prev.fx, [effectName]: value },
        };
        audioEngineManager.getDeck(playerName).updateFX(newSettings.fx);
        return newSettings;
      });

      if (debounceTimers.current[effectName]) {
        clearTimeout(debounceTimers.current[effectName]);
      }

      debounceTimers.current[effectName] = setTimeout(async () => {
        try {
          await apiClient.patch(
            `/rj/${studioId}/players/${playerName}/effect`,
            { effectName, value }
          );
        } catch (err: any) {
          console.error('Error updating effect:', err);
          setError(err?.message || 'Failed to update effect');
        }
      }, 500);
    },
    [studioId, playerName]
  );

  // Update multiple effects
  const updateEffects = useCallback(
    async (fxValues: Partial<AudioEffectState>) => {
      if (!studioId) return;

      try {
        const response = await apiClient.patch(
          `/rj/${studioId}/players/${playerName}/effects`,
          fxValues
        );

        if (response.data?.data) {
          setSettings((prev) => {
            const newSettings = {
              ...prev,
              fx: response.data.data,
            };
            audioEngineManager.getDeck(playerName).updateFX(newSettings.fx);
            return newSettings;
          });
        }
      } catch (err: any) {
        console.error('Error updating effects:', err);
        setError(err?.message || 'Failed to update effects');
      }
    },
    [studioId, playerName]
  );

  // Update volume
  const updateVolume = useCallback(
    (volume: number) => {
      if (!studioId) return;

      const roundedVolume = Math.round(volume);

      // Optimistic update
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          volume: roundedVolume,
        };
        audioEngineManager.getDeck(playerName).updateFX({ volume: roundedVolume });
        return newSettings;
      });

      if (debounceTimers.current['volume']) {
        clearTimeout(debounceTimers.current['volume']);
      }

      debounceTimers.current['volume'] = setTimeout(async () => {
        try {
          await apiClient.patch(
            `/rj/${studioId}/players/${playerName}/volume`,
            { volume: roundedVolume }
          );
        } catch (err: any) {
          console.error('Error updating volume:', err);
          setError(err?.message || 'Failed to update volume');
        }
      }, 500);
    },
    [studioId, playerName]
  );

  // Reset all effects to defaults
  const resetEffects = useCallback(async () => {
    if (!studioId) return;

    try {
      const response = await apiClient.post(
        `/rj/${studioId}/players/${playerName}/effects/reset`
      );

      if (response.data?.data) {
        setSettings((prev) => {
          const newSettings = {
            ...prev,
            fx: response.data.data,
          };
          audioEngineManager.getDeck(playerName).updateFX(newSettings.fx);
          return newSettings;
        });
      }
    } catch (err: any) {
      console.error('Error resetting effects:', err);
      setError(err?.message || 'Failed to reset effects');
    }
  }, [studioId, playerName]);

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
