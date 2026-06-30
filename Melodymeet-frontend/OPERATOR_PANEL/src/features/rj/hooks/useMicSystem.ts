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
      await audio.enableMicrophone(deviceName).catch(() => {});
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
        .catch(() => {});
    };

    // Initial check
    refreshDevices();

    // Listen for plug/unplug of audio devices
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    }

    // Subscribe to meter updates via SDK event bus
    const handleMetersUpdate = (data: any) => {
      const payloadMics = data.mics || {};
      const nativeMicPeak = Math.max(
        Number(data.micPeakL ?? 0),
        Number(data.micPeakR ?? 0),
      );
      const { rjStudio } = useAppStore.getState();
      const nativeMicId = rjStudio.rjMics.find((m: any) => m.isActive)?.id ?? rjStudio.rjMics[0]?.id;
      let changed = false;

      const newMics = rjStudio.rjMics.map(m => {
        const payloadPeak = payloadMics[m.id]?.peak?.[0];
        const level = payloadPeak != null
          ? Math.floor(Number(payloadPeak) * 100)
          : (m.id === nativeMicId ? Math.floor(nativeMicPeak * 100) : 0);
        if (m.volume !== level) {
          changed = true;
          return { ...m, volume: level };
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
    const nextActive = mic ? !mic.isActive : true;

    // Route through SDK — Desktop → window.audio IPC, Web → POST /audio/microphone/enable
    if (nextActive) {
      const inputDev = mic ? (mic as any).input : '';
      await audio.enableMicrophone(inputDev || '').catch(() => {});
    } else {
      await audio.disableMicrophone().catch(() => {});
    }

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const studio = await RjApi.patchMic(sid, { micId, isActive: nextActive });
        applyStudioRecordToStore(studio);
        if (mic) {
          addNotification("system", `${mic.name} ${nextActive ? 'joined the stage' : 'left the stage'}!`);
        }
        return;
      } catch {
        /* local */
      }
    }

    setMics((prev) => {
      const exists = prev.some(m => m.id === micId);
      if (exists) {
        return prev.map(m => m.id === micId ? { ...m, isActive: !m.isActive } : m);
      } else {
        const idx = parseInt(micId.replace('mic', '')) - 1 || 0;
        const baseLabels = ['RJ Mic 1', 'Guest Mic 1', 'Guest Mic 2', 'Guest Mic 3', 'Call-in Mic 1'];
        const baseNames = ['Sejal', 'Leo', 'Riya', 'Arjun', 'Live Caller'];
        return [...prev, {
          id: micId,
          name: baseNames[idx] || 'Guest',
          label: baseLabels[idx] || 'Guest Mic',
          isActive: nextActive,
          isMuted: true,
          volume: 0,
        }];
      }
    });
  };

  const toggleMicMute = async (micId: string) => {
    const mic = allMics.find(m => m.id === micId);
    const nextMuted = mic ? !mic.isMuted : true;

    // Route through SDK
    await audio.muteMicrophone(nextMuted).catch(() => {});

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const studio = await RjApi.patchMic(sid, { micId, isMuted: nextMuted });
        applyStudioRecordToStore(studio);
        return;
      } catch {
        /* local */
      }
    }

    setMics((prev) => {
      const exists = prev.some(m => m.id === micId);
      if (exists) {
        return prev.map(m => m.id === micId ? { ...m, isMuted: nextMuted } : m);
      } else {
        const idx = parseInt(micId.replace('mic', '')) - 1 || 0;
        const baseLabels = ['RJ Mic 1', 'Guest Mic 1', 'Guest Mic 2', 'Guest Mic 3', 'Call-in Mic 1'];
        const baseNames = ['Sejal', 'Leo', 'Riya', 'Arjun', 'Live Caller'];
        return [...prev, {
          id: micId,
          name: baseNames[idx] || 'Guest',
          label: baseLabels[idx] || 'Guest Mic',
          isActive: false,
          isMuted: nextMuted,
          volume: 0,
        }];
      }
    });
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
