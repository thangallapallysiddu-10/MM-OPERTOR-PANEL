import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import { debouncedRjSync, syncMicsToBackend } from '../services/rjApiSync';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { audio } from '../../../services/audio';

export const useMicSystem = (addNotification: (type: "request" | "system" | "alert", message: string) => void) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  const [newMicName, setNewMicName] = useState("");
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);

  const allMics = rjStudio.rjMics;
  const showAddMicModal = rjStudio.showAddMicModal;
  const setShowAddMicModal = (value: boolean) => updateRjStudioState({ showAddMicModal: value });

  const getNativeMicIndex = (micId: string) => {
    const match = micId.match(/^mic(\d+)$/);
    if (!match) return 0;
    return Math.max(0, Math.min(4, Number(match[1]) - 1));
  };

  const setMics = (fn: ((prev: typeof allMics) => typeof allMics) | typeof allMics) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ rjMics: fn(rjStudio.rjMics) });
    } else {
      updateRjStudioState({ rjMics: fn });
    }
    debouncedRjSync('mics', async () => { await syncMicsToBackend(); });
  };

  const updateMicDevice = async (micId: string, deviceName: string) => {
    setMics((prev) => {
      const exists = prev.some(m => m.id === micId);
      if (exists) {
        return prev.map(m => m.id === micId ? { ...m, input: deviceName } : m);
      } else {
        const idx = parseInt(micId.replace('mic', '')) - 1 || 0;
        const baseLabels = ['RJ Mic 1', 'Guest Mic 1', 'Guest Mic 2', 'Guest Mic 3', 'Call-in Mic 1'];
        const baseNames = ['Sejal', 'Leo', 'Riya', 'Arjun', 'Live Caller'];
        return [...prev, {
          id: micId,
          name: baseNames[idx] || 'Guest',
          label: baseLabels[idx] || 'Guest Mic',
          isActive: false,
          isMuted: true,
          input: deviceName,
          volume: 0,
        }];
      }
    });

    // If the mic is currently active, switch its input device via SDK
    const mic = rjStudio.rjMics.find(m => m.id === micId);
    if (mic?.isActive) {
      console.log('[MIC DEVICE SWITCH]', { micId, deviceName, nativeIdx: getNativeMicIndex(micId) });
      await audio.enableMicrophoneByIndex(getNativeMicIndex(micId), deviceName).catch((err) => {
        console.error('[MIC DEVICE SWITCH ERROR]', err);
      });
    }
  };

  // Bind audio engine state to UI state via unified SDK
  useEffect(() => {
    const refreshDevices = () => {
      audio.getAvailableInputDevices()
        .then((devices) => {
          setAvailableDevices(devices);
          
          // Auto-reconnect disturbed active microphones
          const { rjStudio: currentRjStudio } = useAppStore.getState();
          const activeMic = currentRjStudio.rjMics.find((m: any) => m.isActive);
          if (activeMic && devices.length > 0) {
            const currentInput = (activeMic as any).input;
            // Check if current input got disturbed/disconnected (not in the list anymore)
            if (currentInput && !devices.includes(currentInput)) {
              // Connect to the first available input device
              const newDevice = devices[0];
              updateMicDevice(activeMic.id, newDevice);
              addNotification("alert", `🎙️ Microphone "${currentInput}" disturbed! Auto-reconnected to "${newDevice}".`);
            }
          }
        })
        .catch((err) => { console.error('[MIC DEVICES ERROR]', err); });
    };

    // Initial check
    refreshDevices();

    // Listen for plug/unplug of audio devices
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    }

    // Subscribe to meter updates via SDK event bus
    const handleMetersUpdate = (data: any) => {
      // DEBUG: Verify schema mismatch as requested
      // console.log("[MetersUpdate] Raw payload from Native Engine:", data);

      const { rjStudio } = useAppStore.getState();
      let changed = false;

      const newMics = rjStudio.rjMics.map(m => {
        // Native indices map mic1 -> 0, mic2 -> 1, etc.
        const idx = parseInt(m.id.replace('mic', '')) - 1;
        if (isNaN(idx) || idx < 0 || idx > 4) return m;

        const payloadPeak = data.rjMicPeak?.[idx] ?? 0;
        const payloadRms = data.rjMicRms?.[idx] ?? 0;
        const payloadConnected = data.rjMicConnected?.[idx] ?? false;
        const payloadClipped = data.rjMicClipped?.[idx] ?? false;

        const level = Math.floor(Number(payloadPeak) * 100);

        // Convert raw RMS decimal to dB noise floor (approximate for UI)
        let noiseFloorStr = "-";
        if (payloadRms > 0) {
          const db = 20 * Math.log10(payloadRms);
          if (db > -100) noiseFloorStr = `${db.toFixed(1)} dB`;
        }

        if (
          m.volume !== level ||
          m.connected !== payloadConnected ||
          m.clipped !== payloadClipped ||
          m.rms !== payloadRms ||
          m.noiseFloor !== noiseFloorStr
        ) {
          changed = true;
          return {
            ...m,
            volume: level,
            connected: payloadConnected,
            clipped: payloadClipped,
            rms: payloadRms,
            noiseFloor: noiseFloorStr
          };
        }
        return m;
      });

      if (changed) {
        useAppStore.getState().updateRjStudioState({ rjMics: newMics as never });
      }
    };

    audio.on('meters:update', handleMetersUpdate);

    return () => {
      audio.off('meters:update', handleMetersUpdate);
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMics.map(m => m.id).join(',')]); // Only rebind when mic list changes

  const addNewMic = async () => {
    if (!newMicName.trim()) return false;

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const studio = await RjApi.addMic(sid, { name: newMicName });
        applyStudioRecordToStore(studio);
        addNotification("system", `🎙️ ${newMicName} joined the studio!`);
        setNewMicName("");
        return true;
      } catch {
        /* local fallback */
      }
    }

    const newMic = {
      id: `mic_${Date.now()}`,
      name: newMicName.toUpperCase(),
      avatar: newMicName.substring(0, 2).toUpperCase(),
      isActive: false,
      isMuted: false,
      volume: 0,
      isGuest: true,
      guestId: `guest_${Date.now()}`,
    };
    setMics((prev) => [...prev, newMic]);
    addNotification("system", `🎙️ ${newMicName} joined the studio!`);
    setNewMicName("");
    return true;
  };

  const toggleMicActive = async (micId: string) => {
    const mic = allMics.find(m => m.id === micId);
    if (!mic) return;

    const previousActive = mic.isActive;
    const nextActive = !previousActive;
    const nativeIdx = getNativeMicIndex(micId);
    const inputDev = (mic as any).input || '';

    // 1. OPTIMISTIC UI UPDATE
    setMics((prev) => prev.map(m => m.id === micId ? { ...m, isActive: nextActive } : m));

    let nativeCallSucceeded = false;

    try {
      if (nextActive) {
        // PREVENT WASAPI CRASH: Do not send invalid default strings like "Input 3" to the engine.
        // Doing so will crash the global hardware lock and silence all microphones.
        let safeInputDev = inputDev;
        
        // Use the globally active device if one is already running (to prevent hardware restarts).
        // Otherwise, pick the first valid device from the dropdown list.
        const globalActiveMic = allMics.find(m => m.isActive && m.id !== micId && m.input);
        const globalActiveDevice = globalActiveMic ? globalActiveMic.input : '';

        if (globalActiveDevice && availableDevices.includes(globalActiveDevice)) {
           safeInputDev = globalActiveDevice;
        } else if (!availableDevices.includes(inputDev)) {
           safeInputDev = availableDevices.length > 0 ? availableDevices[0] : '';
        }

        await audio.enableMicrophoneByIndex(nativeIdx, safeInputDev);
        
        if (safeInputDev !== inputDev) {
            updateMicDevice(micId, safeInputDev);
        }

        const startMuted = mic ? mic.isMuted : true;
        await audio.muteMicrophoneByIndex(nativeIdx, startMuted).catch(() => {});
      } else {
        await audio.disableMicrophoneByIndex(nativeIdx);
      }
      nativeCallSucceeded = true;
    } catch (err) {
      console.error('[MIC FAILED] Audio SDK call threw:', err);
      // Rollback optimistic update
      setMics((prev) => prev.map(m => m.id === micId ? { ...m, isActive: previousActive } : m));
      addNotification("system", `Failed to change mic state: ${(err as Error).message}`);
      return;
    }

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid && nativeCallSucceeded) {
      try {
        const studio = await RjApi.patchMic(sid, { micId, isActive: nextActive });
        // Prevent stale state overwrites: manually fix the isActive state on the returned object before applying
        if (studio && studio.rjMics) {
          const serverMic = studio.rjMics.find((m: any) => m.id === micId);
          if (serverMic && serverMic.isActive !== nextActive) {
            serverMic.isActive = nextActive; // Force correct state
          }
        }
        applyStudioRecordToStore(studio);
        addNotification("system", `${mic.name} ${nextActive ? 'joined the stage' : 'left the stage'}!`);
      } catch (err) {
        console.error('[MIC FAILED] Backend API call threw:', err);
        // Rollback optimistic update on API failure to keep everything in sync
        if (nextActive) {
          await audio.disableMicrophoneByIndex(nativeIdx).catch(() => {});
        } else {
          await audio.enableMicrophoneByIndex(nativeIdx, inputDev).catch(() => {});
        }
        setMics((prev) => prev.map(m => m.id === micId ? { ...m, isActive: previousActive } : m));
        addNotification("system", `Backend failed to save mic state. Reverted.`);
      }
    }
  };

  const toggleMicMute = async (micId: string) => {
    const mic = allMics.find(m => m.id === micId);
    if (!mic) return;

    const previousMuted = mic.isMuted;
    const nextMuted = !previousMuted;
    const nativeIdx = getNativeMicIndex(micId);

    // 1. OPTIMISTIC UI UPDATE
    setMics((prev) => prev.map(m => m.id === micId ? { ...m, isMuted: nextMuted } : m));

    let nativeCallSucceeded = false;

    try {
      console.log('[MIC MUTE]', { micId, nextMuted, nativeIdx });
      await audio.muteMicrophoneByIndex(nativeIdx, nextMuted);
      nativeCallSucceeded = true;
    } catch (err) {
      console.error('[MIC MUTE ERROR]', err);
      // Rollback optimistic update
      setMics((prev) => prev.map(m => m.id === micId ? { ...m, isMuted: previousMuted } : m));
      addNotification("system", `Failed to change mute state: ${(err as Error).message}`);
      return;
    }

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid && nativeCallSucceeded) {
      try {
        const studio = await RjApi.patchMic(sid, { micId, isMuted: nextMuted });
        // Prevent stale state overwrites: manually fix the isMuted state on the returned object before applying
        if (studio && studio.rjMics) {
          const serverMic = studio.rjMics.find((m: any) => m.id === micId);
          if (serverMic && serverMic.isMuted !== nextMuted) {
            serverMic.isMuted = nextMuted; // Force correct state
          }
        }
        applyStudioRecordToStore(studio);
      } catch (err) {
        console.error('[MIC MUTE API ERROR]', err);
        // Rollback optimistic update on API failure to keep everything in sync
        await audio.muteMicrophoneByIndex(nativeIdx, previousMuted).catch(() => {});
        setMics((prev) => prev.map(m => m.id === micId ? { ...m, isMuted: previousMuted } : m));
        addNotification("system", `Backend failed to save mute state. Reverted.`);
      }
    }
  };



  const removeExtraMic = async (micId: string) => {
    const micToRemove = allMics.find(m => m.id === micId && m.id !== "mic1" && m.id !== "mic2");

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const studio = await RjApi.removeMic(sid, micId);
        applyStudioRecordToStore(studio);
        if (micToRemove) addNotification("system", `❌ ${micToRemove.name} removed from studio`);
        return;
      } catch {
        /* local */
      }
    }
    setMics((prev) => prev.filter(mic => mic.id !== micId));
    if (micToRemove) addNotification("system", `❌ ${micToRemove.name} removed from studio`);
  };

  const mainMics  = allMics.filter(mic => mic.id === "mic1" || mic.id === "mic2");
  const extraMics = allMics.filter(mic => mic.id !== "mic1" && mic.id !== "mic2");

  return {
    mainMics,
    extraMics,
    allMics,
    availableDevices,
    showAddMicModal,
    setShowAddMicModal,
    newMicName,
    setNewMicName,
    addNewMic,
    toggleMicActive,
    toggleMicMute,
    updateMicDevice,
    removeExtraMic,
  };
};
