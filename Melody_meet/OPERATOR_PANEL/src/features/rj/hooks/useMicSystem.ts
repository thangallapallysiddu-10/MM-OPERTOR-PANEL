import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import { debouncedRjSync, syncMicsToBackend } from '../services/rjApiSync';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { isDesktop } from '../../../utils/platform';

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

  // Bind WebAudio state to UI state
  useEffect(() => {
    if (isDesktop()) {
      if ((window as any).audio?.getAvailableInputDevices) {
        (window as any).audio.getAvailableInputDevices().then(setAvailableDevices);
      }

      const handleMetersUpdate = (data: any) => {
        const payloadMics = data.mics || {};
        const { rjStudio } = useAppStore.getState();
        let changed = false;
        
        const newMics = rjStudio.rjMics.map(m => {
          const level = payloadMics[m.id]?.peak?.[0] ? Math.floor(payloadMics[m.id].peak[0] * 100) : 0;
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

      if ((window as any).audio?.on) {
        (window as any).audio.on('meters:update', handleMetersUpdate);
      }

      return () => {
        if ((window as any).audio?.off) {
          (window as any).audio.off('meters:update', handleMetersUpdate);
        }
      };
    } else {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setAvailableDevices(devices.filter(d => d.kind === 'audioinput').map(d => d.label || d.deviceId));
      }).catch(() => {});

      const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
      const micManager = audioEngineManager.getMicrophoneManager();
      const cleanups: (() => void)[] = [];

      allMics.forEach(mic => {
        const engine = micManager.getOrCreateMic(mic.id);
        
        const onMeter = (vol: number) => {
          updateRjStudioState({
            rjMics: useAppStore.getState().rjStudio.rjMics.map(m => 
              m.id === mic.id ? { ...m, volume: vol } : m
            ) as never
          });
        };

        engine.events.on('meter', onMeter);
        cleanups.push(() => engine.events.off('meter', onMeter));
      });

      return () => cleanups.forEach(c => c());
    }
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
    const nextActive = mic ? !mic.isActive : false;

    if (isDesktop()) {
      if (nextActive) {
        await (window as any).audio.enableMicrophone(mic?.input || "");
      } else {
        await (window as any).audio.disableMicrophone();
      }
    } else {
      const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
      const micManager = audioEngineManager.getMicrophoneManager();
      const engine = micManager.getOrCreateMic(micId);
      if (nextActive) {
        try {
          await engine.enable();
        } catch (e) {
          addNotification('alert', 'Microphone permission denied.');
          return;
        }
      } else {
        engine.disable();
      }
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

    setMics((prev) => prev.map(m => 
      m.id === micId ? { ...m, isActive: !m.isActive } : m
    ));
    if (mic) {
      addNotification("system", `${mic.name} ${mic.isActive ? 'left the stage' : 'joined the stage'}!`);
    }
  };

  const toggleMicMute = async (micId: string) => {
    const mic = allMics.find(m => m.id === micId);
    const nextMuted = mic ? !mic.isMuted : true;
    
    if (isDesktop()) {
      await (window as any).audio.muteMicrophone(nextMuted);
    } else {
      const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
      const micManager = audioEngineManager.getMicrophoneManager();
      const engine = micManager.getOrCreateMic(micId);
      engine.setMute(nextMuted);
    }

    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid && mic) {
      try {
        const studio = await RjApi.patchMic(sid, { micId, isMuted: nextMuted });
        applyStudioRecordToStore(studio);
        return;
      } catch {
        /* local */
      }
    }
    setMics((prev) => prev.map(m => 
      m.id === micId ? { ...m, isMuted: nextMuted } : m
    ));
  };

  const updateMicDevice = async (micId: string, deviceName: string) => {
    setMics((prev) => prev.map(m => 
      m.id === micId ? { ...m, input: deviceName } : m
    ));
    
    // If it's active and we are native, immediately switch device
    const mic = allMics.find(m => m.id === micId);
    if (mic?.isActive && isDesktop()) {
      await (window as any).audio.enableMicrophone(deviceName);
    }
  };

  const removeExtraMic = async (micId: string) => {
    const micToRemove = allMics.find(m => m.id === micId && m.id !== "mic1" && m.id !== "mic2");
    
    if (!isDesktop()) {
      const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
      const micManager = audioEngineManager.getMicrophoneManager();
      micManager.removeMic(micId);
    }

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

  const mainMics = allMics.filter(mic => mic.id === "mic1" || mic.id === "mic2");
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
