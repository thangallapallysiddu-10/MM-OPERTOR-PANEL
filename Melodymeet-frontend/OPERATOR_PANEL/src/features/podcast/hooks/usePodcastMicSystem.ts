import { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { audio } from '../../../services/audio';

// ============================================================================
// PODCAST MIC MODEL
// ============================================================================

export interface PodcastMic {
  id: string;                  // "mic1" | "mic2" | "mic3" | "mic4" | "mic5"
  label: string;               // "Host" | "Co-Host" | "Guest 1" | "Guest 2" | "Guest 3"
  isActive: boolean;           // Is microphone enabled in native engine?
  isMuted: boolean;            // Is microphone muted in native engine?
  isSoloed: boolean;           // Is microphone soloed in native engine?
  input?: string;              // Selected input device name
  volume: number;              // Peak meter level (0-100)
  rms: number;                 // RMS value (raw decimal)
  connected: boolean;          // Is device physically connected?
  clipped: boolean;            // Has signal clipped recently?
  signalPresent: boolean;      // Is there audio signal above threshold?
  noiseFloor?: string;         // Noise floor in dB (e.g., "-45.3 dB")
}

// ============================================================================
// MIC ID TO NATIVE INDEX MAPPING
// ============================================================================
// Podcast Studio uses:
//   mic1 = Host       → Native Index 0
//   mic2 = Co-Host    → Native Index 1
//   mic3 = Guest 1    → Native Index 2
//   mic4 = Guest 2    → Native Index 3
//   mic5 = Guest 3    → Native Index 4

const getPodcastMicIndex = (micId: string): number => {
  const match = micId.match(/^mic(\d+)$/);
  if (!match) return -1;
  const num = Number(match[1]);
  if (num < 1 || num > 5) return -1;
  return num - 1; // mic1 -> 0, mic2 -> 1, ..., mic5 -> 4
};

// ============================================================================
// INITIAL MIC STATE
// ============================================================================

const createInitialPodcastMics = (): PodcastMic[] => [
  {
    id: 'mic1',
    label: 'Host',
    isActive: false,
    isMuted: true,
    isSoloed: false,
    input: undefined,
    volume: 0,
    rms: 0,
    connected: false,
    clipped: false,
    signalPresent: false,
    noiseFloor: '-',
  },
  {
    id: 'mic2',
    label: 'Co-Host',
    isActive: false,
    isMuted: true,
    isSoloed: false,
    input: undefined,
    volume: 0,
    rms: 0,
    connected: false,
    clipped: false,
    signalPresent: false,
    noiseFloor: '-',
  },
  {
    id: 'mic3',
    label: 'Guest 1',
    isActive: false,
    isMuted: true,
    isSoloed: false,
    input: undefined,
    volume: 0,
    rms: 0,
    connected: false,
    clipped: false,
    signalPresent: false,
    noiseFloor: '-',
  },
  {
    id: 'mic4',
    label: 'Guest 2',
    isActive: false,
    isMuted: true,
    isSoloed: false,
    input: undefined,
    volume: 0,
    rms: 0,
    connected: false,
    clipped: false,
    signalPresent: false,
    noiseFloor: '-',
  },
  {
    id: 'mic5',
    label: 'Guest 3',
    isActive: false,
    isMuted: true,
    isSoloed: false,
    input: undefined,
    volume: 0,
    rms: 0,
    connected: false,
    clipped: false,
    signalPresent: false,
    noiseFloor: '-',
  },
];

// ============================================================================
// HOOK: usePodcastMicSystem
// ============================================================================

export const usePodcastMicSystem = (
  addNotification?: (type: "request" | "system" | "alert", message: string) => void
) => {
  // Local mic state (single source of truth for UI)
  const [allMics, setAllMics] = useState<PodcastMic[]>(createInitialPodcastMics());
  
  // Available audio input devices
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);

  // ── DEVICE ENUMERATION ──────────────────────────────────────────────────

  const refreshDevices = async () => {
    try {
      const devices = await audio.getAvailableInputDevices();
      setAvailableDevices(devices);

      // Auto-reconnect disturbed active microphones
      const activeMic = allMics.find((m) => m.isActive);
      if (activeMic && devices.length > 0) {
        const currentInput = activeMic.input;
        // Check if current input got disturbed/disconnected (not in the list anymore)
        if (currentInput && !devices.includes(currentInput)) {
          // Connect to the first available input device
          const newDevice = devices[0];
          await updateMicDevice(activeMic.id, newDevice);
          addNotification?.(
            "alert",
            `🎙️ Microphone "${currentInput}" disturbed! Auto-reconnected to "${newDevice}".`
          );
        }
      }
    } catch (err) {
      console.error('[PODCAST MIC DEVICES ERROR]', err);
    }
  };

  // ── MIC ACTIVATION ──────────────────────────────────────────────────────

  const toggleMicActive = async (micId: string) => {
    const mic = allMics.find((m) => m.id === micId);
    if (!mic) return;

    const previousActive = mic.isActive;
    const nextActive = !previousActive;
    const nativeIdx = getPodcastMicIndex(micId);
    
    if (nativeIdx === -1) {
      console.error('[PODCAST MIC] Invalid mic ID:', micId);
      return;
    }

    const inputDev = mic.input || '';

    // 1. OPTIMISTIC UI UPDATE
    setAllMics((prev) =>
      prev.map((m) => (m.id === micId ? { ...m, isActive: nextActive } : m))
    );

    try {
      if (nextActive) {
        // PREVENT WASAPI CRASH: Do not send invalid default strings to the engine.
        // Use the globally active device if one is already running (to prevent hardware restarts).
        // Otherwise, pick the first valid device from the dropdown list.
        let safeInputDev = inputDev;

        const globalActiveMic = allMics.find(
          (m) => m.isActive && m.id !== micId && m.input
        );
        const globalActiveDevice = globalActiveMic ? globalActiveMic.input : '';

        if (globalActiveDevice && availableDevices.includes(globalActiveDevice)) {
          safeInputDev = globalActiveDevice;
        } else if (!availableDevices.includes(inputDev)) {
          safeInputDev = availableDevices.length > 0 ? availableDevices[0] : '';
        }

        console.log('[PODCAST MIC ENABLE]', { micId, nativeIdx, safeInputDev });
        await audio.enableMicrophoneByIndex(nativeIdx, safeInputDev);

        // Update device if it changed
        if (safeInputDev !== inputDev) {
          setAllMics((prev) =>
            prev.map((m) => (m.id === micId ? { ...m, input: safeInputDev } : m))
          );
        }

        // Apply mute state to newly enabled microphone
        const startMuted = mic.isMuted;
        await audio.muteMicrophoneByIndex(nativeIdx, startMuted).catch(() => {});
      } else {
        console.log('[PODCAST MIC DISABLE]', { micId, nativeIdx });
        await audio.disableMicrophoneByIndex(nativeIdx);
      }

      addNotification?.(
        "system",
        `🎙️ ${mic.label} ${nextActive ? 'enabled' : 'disabled'}`
      );
    } catch (err) {
      console.error('[PODCAST MIC FAILED] Audio SDK call threw:', err);
      
      // Rollback optimistic update
      setAllMics((prev) =>
        prev.map((m) => (m.id === micId ? { ...m, isActive: previousActive } : m))
      );
      
      addNotification?.(
        "system",
        `Failed to change mic state: ${(err as Error).message}`
      );
    }
  };

  // ── MIC MUTE ────────────────────────────────────────────────────────────

  const toggleMicMute = async (micId: string) => {
    const mic = allMics.find((m) => m.id === micId);
    if (!mic) return;

    const previousMuted = mic.isMuted;
    const nextMuted = !previousMuted;
    const nativeIdx = getPodcastMicIndex(micId);

    if (nativeIdx === -1) {
      console.error('[PODCAST MIC MUTE] Invalid mic ID:', micId);
      return;
    }

    // 1. OPTIMISTIC UI UPDATE
    setAllMics((prev) =>
      prev.map((m) => (m.id === micId ? { ...m, isMuted: nextMuted } : m))
    );

    try {
      console.log('[PODCAST MIC MUTE]', { micId, nextMuted, nativeIdx });
      await audio.muteMicrophoneByIndex(nativeIdx, nextMuted);
      
      addNotification?.(
        "system",
        `🎙️ ${mic.label} ${nextMuted ? 'muted' : 'unmuted'}`
      );
    } catch (err) {
      console.error('[PODCAST MIC MUTE ERROR]', err);
      
      // Rollback optimistic update
      setAllMics((prev) =>
        prev.map((m) => (m.id === micId ? { ...m, isMuted: previousMuted } : m))
      );
      
      addNotification?.(
        "system",
        `Failed to change mute state: ${(err as Error).message}`
      );
    }
  };

  // ── MIC SOLO ────────────────────────────────────────────────────────────

  const toggleMicSolo = async (micId: string) => {
    const mic = allMics.find((m) => m.id === micId);
    if (!mic) return;

    const previousSoloed = mic.isSoloed;
    const nextSoloed = !previousSoloed;

    // 1. OPTIMISTIC UI UPDATE
    setAllMics((prev) =>
      prev.map((m) => (m.id === micId ? { ...m, isSoloed: nextSoloed } : m))
    );

    try {
      addNotification?.(
        "system",
        `🎙️ ${mic.label} ${nextSoloed ? 'soloed' : 'unsolved'}`
      );
    } catch (err) {
      console.error('[PODCAST MIC SOLO ERROR]', err);
      
      // Rollback optimistic update
      setAllMics((prev) =>
        prev.map((m) => (m.id === micId ? { ...m, isSoloed: previousSoloed } : m))
      );
      
      addNotification?.(
        "system",
        `Failed to change solo state: ${(err as Error).message}`
      );
    }
  };

  // ── DEVICE ASSIGNMENT ───────────────────────────────────────────────────

  const updateMicDevice = async (micId: string, deviceName: string) => {
    const mic = allMics.find((m) => m.id === micId);
    if (!mic) return;

    const nativeIdx = getPodcastMicIndex(micId);
    
    if (nativeIdx === -1) {
      console.error('[PODCAST MIC DEVICE] Invalid mic ID:', micId);
      return;
    }

    // 1. UPDATE STORE
    setAllMics((prev) =>
      prev.map((m) => (m.id === micId ? { ...m, input: deviceName } : m))
    );

    // 2. IF ACTIVE, REBIND NATIVE DEVICE
    if (mic.isActive) {
      try {
        console.log('[PODCAST MIC DEVICE SWITCH]', {
          micId,
          deviceName,
          nativeIdx,
        });
        await audio.enableMicrophoneByIndex(nativeIdx, deviceName);
        
        addNotification?.(
          "system",
          `🎙️ ${mic.label} switched to ${deviceName}`
        );
      } catch (err) {
        console.error('[PODCAST MIC DEVICE SWITCH ERROR]', err);
        addNotification?.(
          "alert",
          `Failed to switch device: ${(err as Error).message}`
        );
      }
    }
  };

  // ── METER SUBSCRIPTION ──────────────────────────────────────────────────

  useEffect(() => {
    // Initial device refresh
    refreshDevices();

    // Listen for plug/unplug of audio devices
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    }

    // Subscribe to meter updates via SDK event bus
    const handleMetersUpdate = (data: any) => {
      setAllMics((prev) =>
        prev.map((m) => {
          const idx = getPodcastMicIndex(m.id);
          if (idx === -1) return m;

          const payloadPeak = data.rjMicPeak?.[idx] ?? 0;
          const payloadRms = data.rjMicRms?.[idx] ?? 0;
          const payloadConnected = data.rjMicConnected?.[idx] ?? false;
          const payloadClipped = data.rjMicClipped?.[idx] ?? false;

          const volume = Math.floor(Number(payloadPeak) * 100);
          const signalPresent = payloadPeak > 0.01; // Signal threshold

          // Convert raw RMS decimal to dB noise floor (approximate for UI)
          let noiseFloor = "-";
          if (payloadRms > 0) {
            const db = 20 * Math.log10(payloadRms);
            if (db > -100) noiseFloor = `${db.toFixed(1)} dB`;
          }

          // Only update if values changed (prevent unnecessary re-renders)
          if (
            m.volume !== volume ||
            m.rms !== payloadRms ||
            m.connected !== payloadConnected ||
            m.clipped !== payloadClipped ||
            m.signalPresent !== signalPresent ||
            m.noiseFloor !== noiseFloor
          ) {
            return {
              ...m,
              volume,
              rms: payloadRms,
              connected: payloadConnected,
              clipped: payloadClipped,
              signalPresent,
              noiseFloor,
            };
          }

          return m;
        })
      );
    };

    audio.on('meters:update', handleMetersUpdate);

    return () => {
      audio.off('meters:update', handleMetersUpdate);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      }
    };
  }, []); // Only run once on mount

  // ── PUBLIC API ──────────────────────────────────────────────────────────

  return {
    allMics,
    availableDevices,
    toggleMicActive,
    toggleMicMute,
    toggleMicSolo,
    updateMicDevice,
    refreshDevices,
  };
};
