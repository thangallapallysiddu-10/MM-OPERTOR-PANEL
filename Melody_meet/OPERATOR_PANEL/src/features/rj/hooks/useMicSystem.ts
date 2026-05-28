// hooks/useMicSystem.ts - Updated with string IDs
import { useState, useEffect } from 'react';
import { MicUser } from '../types';
import { useAppStore } from '../../../store/useAppStore';

export const useMicSystem = (addNotification: (type: "request" | "system" | "alert", message: string) => void) => {
  // Get from Zustand store
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  // Local state (doesn't need persistence - UI only)
  const [newMicName, setNewMicName] = useState("");
  
  // Get values from store (these persist across navigation)
  const allMics = rjStudio.rjMics;
  const showAddMicModal = rjStudio.showAddMicModal;
  const setShowAddMicModal = (value: boolean) => updateRjStudioState({ showAddMicModal: value });
  
  const setMics = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ rjMics: fn(rjStudio.rjMics) });
    } else {
      updateRjStudioState({ rjMics: fn });
    }
  };

  // Simulate mic volume levels when active
  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    
    allMics.forEach((mic) => {
      if (mic.isActive && !mic.isMuted) {
        const interval = setInterval(() => {
          setMics((prev: any[]) => prev.map(m => 
            m.id === mic.id ? { ...m, volume: Math.random() * 100 } : m
          ));
        }, 100);
        intervals.push(interval);
      } else {
        setMics((prev: any[]) => prev.map(m => 
          m.id === mic.id ? { ...m, volume: 0 } : m
        ));
      }
    });
    
    return () => intervals.forEach(interval => clearInterval(interval));
  }, [allMics.map(m => `${m.id}-${m.isActive}-${m.isMuted}`).join(',')]);

  const addNewMic = () => {
    if (!newMicName.trim()) {
      return false;
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
    setMics((prev: any[]) => [...prev, newMic]);
    addNotification("system", `🎙️ ${newMicName} joined the studio!`);
    setNewMicName("");
    return true;
  };

  const toggleMicActive = (micId: string) => {
    setMics((prev: any[]) => prev.map(mic => 
      mic.id === micId ? { ...mic, isActive: !mic.isActive } : mic
    ));
    const mic = allMics.find(m => m.id === micId);
    if (mic) {
      addNotification("system", `${mic.name} ${mic.isActive ? 'left the stage' : 'joined the stage'}!`);
    }
  };

  const toggleMicMute = (micId: string) => {
    setMics((prev: any[]) => prev.map(mic => 
      mic.id === micId ? { ...mic, isMuted: !mic.isMuted } : mic
    ));
  };

  const removeExtraMic = (micId: string) => {
    const micToRemove = allMics.find(m => m.id === micId && m.id !== "mic1" && m.id !== "mic2");
    setMics((prev: any[]) => prev.filter(mic => mic.id !== micId));
    if (micToRemove) {
      addNotification("system", `❌ ${micToRemove.name} removed from studio`);
    }
  };

  // Split mics for main and extra
  const mainMics = allMics.filter(mic => mic.id === "mic1" || mic.id === "mic2");
  const extraMics = allMics.filter(mic => mic.id !== "mic1" && mic.id !== "mic2");

  return {
    mainMics,
    extraMics,
    allMics,
    showAddMicModal,
    setShowAddMicModal,
    newMicName,
    setNewMicName,
    addNewMic,
    toggleMicActive,
    toggleMicMute,
    removeExtraMic,
  };
};