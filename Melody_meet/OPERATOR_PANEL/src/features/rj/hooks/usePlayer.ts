// hooks/usePlayer.ts - Fixed to properly clear the track

import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '../types';
import { trackLibrary } from '../constants';
import { useAppStore } from '../../../store/useAppStore';
import { syncDualPlayer } from '../services/rjApiSync';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { isDesktop } from '../../../utils/platform';
interface UsePlayerProps {
  setCurrentTrack: (track: Track) => void;
  setLocalCurrentTrack: (track: Track) => void;
  addNotification: (type: "request" | "system" | "alert", message: string) => void;
}

// Empty track for clearing display
const emptyTrack: Track = {
  id: 0,
  title: "No song playing",
  artist: "",
  bpm: 0,
  beatIntensity: 0,
  duration: "0:00",
  channel: 1,
  shortTitle: "",
  gain: 0,
  eq: { low: 0, mid: 0, high: 0 },
  fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
};

// Helper to abstract audio implementation behind the expo-av Sound interface
const createDesktopAudioAdapter = (deckId: 'A' | 'B') => ({
  playAsync: async () => (window as any).audio.play(deckId),
  pauseAsync: async () => (window as any).audio.pause(deckId),
  stopAsync: async () => (window as any).audio.stop(deckId),
  // Desktop unload must call window.audio.unloadDeck — never a no-op
  unloadAsync: async () => {
    if ((window as any).audio?.unloadDeck) {
      await (window as any).audio.unloadDeck(deckId);
    }
  },
  setIsMutedAsync: async (_muted: boolean) => {},
  setVolumeAsync: async (_volume: number) => {},
  setPositionAsync: async (ms: number) => (window as any).audio.seek(deckId, ms / 1000),
});

const createBrowserAudioAdapter = (deckId: 'A' | 'B') => {
  const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
  const deck = audioEngineManager.getDeck(deckId);
  return {
    playAsync: async () => deck.play(),
    pauseAsync: async () => deck.pause(),
    stopAsync: async () => deck.stop(),
    unloadAsync: async () => deck.unloadTrack(),
    setIsMutedAsync: async (muted: boolean) => {
       const elem = deck.getMediaElement();
       if (elem) elem.muted = muted;
    },
    setVolumeAsync: async (volume: number) => {
       const elem = deck.getMediaElement();
       if (elem) elem.volume = Math.max(0, Math.min(1, volume));
    },
    setPositionAsync: async (ms: number) => deck.seek(ms / 1000)
  };
};

export const usePlayer = ({ setCurrentTrack, setLocalCurrentTrack, addNotification }: UsePlayerProps) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [isCrossfading, setIsCrossfading] = useState(false);
  
  const playerA = rjStudio.playerATrack;
  const playerB = rjStudio.playerBTrack;
  const isPlayingA = rjStudio.isPlayingA ?? false;
  const isPlayingB = rjStudio.isPlayingB ?? false;
  const isLocalAudioMuted = rjStudio.isLocalAudioMuted ?? false;
  
  const soundARef = useRef<Audio.Sound | any | null>(null);
  const soundBRef = useRef<Audio.Sound | any | null>(null);

  // Sync mute state — dispatch to native mixer on desktop, adapter fallback otherwise
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).audio?.muteDeck) {
      try {
        (window as any).audio.muteDeck('A', isLocalAudioMuted).catch(() => {});
        (window as any).audio.muteDeck('B', isLocalAudioMuted).catch(() => {});
      } catch { /* engine not yet initialized */ }
      return;
    }
    if (soundARef.current) soundARef.current.setIsMutedAsync(isLocalAudioMuted).catch(() => {});
    if (soundBRef.current) soundBRef.current.setIsMutedAsync(isLocalAudioMuted).catch(() => {});
  }, [isLocalAudioMuted]);

  // Wire up DeckEngine to soundRefs on mount if running on web
  useEffect(() => {
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
    if (!isWeb) return;

    if (!soundARef.current) {
      if (typeof window !== 'undefined' && (window as any).audio) {
        soundARef.current = createDesktopAudioAdapter('A');
      } else {
        soundARef.current = createBrowserAudioAdapter('A');
      }
    }
    
    if (!soundBRef.current) {
      if (typeof window !== 'undefined' && (window as any).audio) {
        soundBRef.current = createDesktopAudioAdapter('B');
      } else {
        soundBRef.current = createBrowserAudioAdapter('B');
      }
    }
  }, []);

  const loadSound = async (track: Track | null, isPlayerA: boolean) => {
    const ref = isPlayerA ? soundARef : soundBRef;
    const chainId = isPlayerA ? 'A' : 'B';

    // Foolproof web detection used throughout this function
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
    const hasDesktopEngine = isWeb && typeof window !== 'undefined' && !!(window as any).audio;

    // Unload the previous track from this deck before loading a new one.
    // Desktop: call window.audio.unloadDeck directly — never touch soundRef for Expo AV cleanup.
    // Browser/native: delegate to the existing adapter / Expo AV object.
    if (hasDesktopEngine) {
      if ((window as any).audio?.unloadDeck) {
        try { await (window as any).audio.unloadDeck(chainId); } catch { /* engine not yet ready */ }
      }
      ref.current = null;
    } else if (ref.current) {
      // Browser adapter or Expo AV Sound object — safe to call stop+unload here
      try { await ref.current.stopAsync(); } catch { /* ignore */ }
      try { await ref.current.unloadAsync(); } catch { /* ignore */ }
      ref.current = null;
    }

    if (!track) {
      return;
    }

    const url = track.audioUrl || (track as any).fileUrl;

    if (!url) {
      console.warn("LOADSOUND: track.audioUrl and fileUrl are UNDEFINED for", track.title, "— no audio will load");
      return;
    }

    try {
      if (isWeb) {
        if (hasDesktopEngine) {
          // Desktop path: delegate entirely to the native C++ AudioEngine.
          // Never create an Expo AV Sound object here.
          await (window as any).audio.loadDeck(chainId, url);
          ref.current = createDesktopAudioAdapter(chainId);
        } else {
          // Browser path: use the Web Audio DeckEngine adapter.
          const { audioEngineManager } = require('../../../services/audioEngine/core/AudioEngineManager');
          const deck = audioEngineManager.getDeck(chainId);
          await deck.loadTrack(url);
          ref.current = createBrowserAudioAdapter(chainId as 'A' | 'B');
        }
      } else {
        // Native mobile path: Expo AV only — never reached on desktop.
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, isMuted: isLocalAudioMuted }
        );
        ref.current = sound;
      }
    } catch (err) {
      console.warn("Failed to load sound:", err);
    }
  };
  
  const setPlayerA = (track: Track | null) => {
    if (track && !track.title) {
      console.error('[usePlayer] setPlayerA called with invalid track (no title):', track);
      return;
    }
    updateRjStudioState({ playerATrack: track ?? null, isPlayingA: false });
    void loadSound(track, true);
  };
  
  const setPlayerB = (track: Track | null) => {
    if (track && !track.title) {
      console.error('[usePlayer] setPlayerB called with invalid track (no title):', track);
      return;
    }
    updateRjStudioState({ playerBTrack: track ?? null, isPlayingB: false });
    void loadSound(track, false);
  };
  
  const activePlayer = rjStudio.activePlayer;
  const setActivePlayer = (player: "A" | "B") => {
    updateRjStudioState({ activePlayer: player });
  };
  
  const crossfadeValue = rjStudio.crossfadeValue ?? 50;
  const setCrossfadeValue = (value: number) => updateRjStudioState({ crossfadeValue: value });

  // Apply Crossfade — React sends intent only; native Mixer owns the math.
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).audio?.setCrossfade) {
      try {
        (window as any).audio.setCrossfade(crossfadeValue).catch(() => {});
      } catch { /* engine not yet initialized */ }
      return;
    }

    // Legacy fallback for non-desktop platforms (expo-av linear math)
    const volA = crossfadeValue <= 50 ? 1 : Math.max(0, 1 - ((crossfadeValue - 50) / 50));
    const volB = crossfadeValue >= 50 ? 1 : Math.max(0, crossfadeValue / 50);

    if (soundARef.current && typeof soundARef.current.setVolumeAsync === 'function') {
      soundARef.current.setVolumeAsync(volA).catch(() => {});
    }
    if (soundBRef.current && typeof soundBRef.current.setVolumeAsync === 'function') {
      soundBRef.current.setVolumeAsync(volB).catch(() => {});
    }
  }, [crossfadeValue]);

  // Update Now Playing whenever active player or tracks change
  useEffect(() => {
    if (activePlayer === "A" && playerA) {
      setCurrentTrack(playerA);
      setLocalCurrentTrack(playerA);
    } else if (activePlayer === "B" && playerB) {
      setCurrentTrack(playerB);
      setLocalCurrentTrack(playerB);
    } else {
      // No track playing - send empty track to clear Now Playing
      setCurrentTrack(emptyTrack);
      setLocalCurrentTrack(emptyTrack);
    }
  }, [activePlayer, playerA, playerB]);

  // Sync actual audio playback with global store (for socket updates)
  useEffect(() => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;
    if (hasDesktopEngine) {
      try {
        if (playerA) {
          if (isPlayingA) (window as any).audio.play('A').catch(() => {});
          else (window as any).audio.pause('A').catch(() => {});
        }
      } catch { /* engine not yet ready */ }
      return;
    }
    if (soundARef.current && playerA) {
      if (isPlayingA) void soundARef.current.playAsync();
      else void soundARef.current.pauseAsync();
    }
  }, [isPlayingA, playerA]);

  useEffect(() => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;
    if (hasDesktopEngine) {
      try {
        if (playerB) {
          if (isPlayingB) (window as any).audio.play('B').catch(() => {});
          else (window as any).audio.pause('B').catch(() => {});
        }
      } catch { /* engine not yet ready */ }
      return;
    }
    if (soundBRef.current && playerB) {
      if (isPlayingB) void soundBRef.current.playAsync();
      else void soundBRef.current.pauseAsync();
    }
  }, [isPlayingB, playerB]);

  const animateCrossfade = (targetValue: number, targetPlayer: "A" | "B") => {
    if (isCrossfading) return;
    setIsCrossfading(true);
    
    const startValue = crossfadeValue;
    const step = targetValue > startValue ? 4 : -4;
    let currentValue = startValue;
    
    const interval = setInterval(() => {
      currentValue += step;
      
      if ((step > 0 && currentValue >= targetValue) || (step < 0 && currentValue <= targetValue)) {
        clearInterval(interval);
        setIsCrossfading(false);
        setCrossfadeValue(targetValue);
        setActivePlayer(targetPlayer);
        updateRjStudioState({ isCrossfading: false });
        void syncDualPlayer(
          targetPlayer === 'A' ? 'crossfade_to_a' : 'crossfade_to_b',
          { crossfadeValue: targetValue }
        );
      } else {
        setCrossfadeValue(currentValue);
      }
    }, 40);
  };

  // Play library track
  const playLibraryTrack = (track: Track) => {
    if (activePlayer === "A") {
      setPlayerB(track);
      animateCrossfade(100, "B");
    } else {
      setPlayerA(track);
      animateCrossfade(0, "A");
    }
    addNotification("system", `🎵 Now playing: ${track.title}`);
  };

  const applyStudioDualToLocal = (studio: Record<string, unknown> | null) => {
    if (!studio) return;
    applyStudioRecordToStore(studio);
    const dual = (studio.dualPlayer as Record<string, unknown>) || {};
    const current = studio.currentTrack as Track | null;
    if (dual.playerATrack) setPlayerA(dual.playerATrack as Track);
    if (dual.playerBTrack) setPlayerB(dual.playerBTrack as Track);
    if (dual.activePlayer) setActivePlayer(dual.activePlayer as 'A' | 'B');
    if (typeof dual.isPlayingA === 'boolean') updateRjStudioState({ isPlayingA: dual.isPlayingA });
    if (typeof dual.isPlayingB === 'boolean') updateRjStudioState({ isPlayingB: dual.isPlayingB });
    if (typeof dual.crossfadeValue === 'number') setCrossfadeValue(dual.crossfadeValue);
    if (current) {
      setCurrentTrack(current);
      setLocalCurrentTrack(current);
    }
  };



  const loadIntoStandby = (track: Track, targetPlayer: 'A' | 'B' = 'A') => {
    const fullTrack = {
      ...track,
      beatIntensity: track.beatIntensity || 70,
      shortTitle: track.shortTitle || track.title.substring(0, 6).toUpperCase(),
      gain: track.gain || 70,
      eq: track.eq || { low: 50, mid: 50, high: 50 },
      fx: track.fx || { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
    };
    
    if (targetPlayer === "A") {
      setPlayerA(fullTrack);
      addNotification("system", `📀 "${track.title}" loaded into Player A.`);
    } else {
      setPlayerB(fullTrack);
      addNotification("system", `📀 "${track.title}" loaded into Player B.`);
    }
    void syncDualPlayer('load_to_player', { track: fullTrack, playerId: targetPlayer });
  };

  const switchAtoB = () => {
    if (!playerA) return;
    setPlayerB(playerA);
    setPlayerA(null);
    addNotification("system", `🔁 Moved "${playerA.title}" from Player A to Player B.`);
    void syncDualPlayer('switch_a_to_b');
  };

  const playStandbyTrack = (playerId: "A" | "B") => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (playerId === "A" && playerA) {
      // Stop Player B audio (but keep its track loaded)
      if (isPlayingB) {
        if (hasDesktopEngine) {
          try { (window as any).audio.stop('B'); } catch { /* engine not yet ready */ }
        } else if (soundBRef.current) {
          void soundBRef.current.stopAsync();
        }
        updateRjStudioState({ isPlayingB: false });
      }
      setActivePlayer("A");
      updateRjStudioState({ isPlayingA: true });
      if (hasDesktopEngine) {
        try { (window as any).audio.play('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.playAsync();
      }
      setCurrentTrack(playerA);
      setLocalCurrentTrack(playerA);
      addNotification("system", `🎵 Now playing: ${playerA.title}`);
    } else if (playerId === "B" && playerB) {
      // Stop Player A audio (but keep its track loaded)
      if (isPlayingA) {
        if (hasDesktopEngine) {
          try { (window as any).audio.stop('A'); } catch { /* engine not yet ready */ }
        } else if (soundARef.current) {
          void soundARef.current.stopAsync();
        }
        updateRjStudioState({ isPlayingA: false });
      }
      setActivePlayer("B");
      updateRjStudioState({ isPlayingB: true });
      if (hasDesktopEngine) {
        try { (window as any).audio.play('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.playAsync();
      }
      setCurrentTrack(playerB);
      setLocalCurrentTrack(playerB);
      addNotification("system", `🎵 Now playing: ${playerB.title}`);
    }
    void syncDualPlayer('play_standby', { playerId });
  };

  // PAUSE ACTIVE TRACK
  const pauseActiveTrack = () => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (activePlayer === "A" && playerA) {
      updateRjStudioState({ isPlayingA: false });
      if (hasDesktopEngine) {
        try { (window as any).audio.pause('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.pauseAsync();
      }
      addNotification("system", `⏸️ Paused: ${playerA.title}`);
    } else if (activePlayer === "B" && playerB) {
      updateRjStudioState({ isPlayingB: false });
      if (hasDesktopEngine) {
        try { (window as any).audio.pause('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.pauseAsync();
      }
      addNotification("system", `⏸️ Paused: ${playerB.title}`);
    }
    void syncDualPlayer('pause_active');
  };

  const togglePlayActive = () => {
    const isPlaying = activePlayer === "A" ? isPlayingA : isPlayingB;
    if (isPlaying) {
      pauseActiveTrack();
    } else {
      playStandbyTrack(activePlayer);
      void syncDualPlayer('toggle_play');
    }
  };

  // STOP ACTIVE TRACK - Stops playing but keeps track in deck
  const stopActiveTrack = () => {
    const trackName = activePlayer === "A" ? playerA?.title : playerB?.title;
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (activePlayer === "A") {
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.stopAsync();
      }
      updateRjStudioState({ isPlayingA: false });
    } else {
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.stopAsync();
      }
      updateRjStudioState({ isPlayingB: false });
    }

    addNotification("system", `⏹️ Stopped: ${trackName || "Current song"}`);
    void syncDualPlayer('stop_active');
  };

  // PAUSE STANDBY TRACK
  const pauseStandby = (playerId: "A" | "B") => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (playerId === "A" && playerA && activePlayer !== "A") {
      updateRjStudioState({ isPlayingA: false });
      if (hasDesktopEngine) {
        try { (window as any).audio.pause('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.pauseAsync();
      }
      addNotification("system", `⏸️ Paused (Standby): ${playerA.title}`);
    } else if (playerId === "B" && playerB && activePlayer !== "B") {
      updateRjStudioState({ isPlayingB: false });
      if (hasDesktopEngine) {
        try { (window as any).audio.pause('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.pauseAsync();
      }
      addNotification("system", `⏸️ Paused (Standby): ${playerB.title}`);
    }
    void syncDualPlayer('pause_standby', { playerId });
  };

  const stopStandby = (playerId: "A" | "B") => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (playerId === "A" && activePlayer !== "A") {
      const trackName = playerA?.title;
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.stopAsync();
      }
      updateRjStudioState({ isPlayingA: false });
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    } else if (playerId === "B" && activePlayer !== "B") {
      const trackName = playerB?.title;
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.stopAsync();
      }
      updateRjStudioState({ isPlayingB: false });
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    }
    void syncDualPlayer('stop_standby', { playerId });
  };

  const clearDeck = (playerId: "A" | "B") => {
    const hasDesktopEngine = typeof window !== 'undefined' && !!(window as any).audio;

    if (playerId === "A") {
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('A'); } catch { /* engine not yet ready */ }
      } else if (soundARef.current) {
        void soundARef.current.stopAsync();
      }
      setPlayerA(null);
      addNotification("system", `🗑️ Cleared Player A`);
    } else {
      if (hasDesktopEngine) {
        try { (window as any).audio.stop('B'); } catch { /* engine not yet ready */ }
      } else if (soundBRef.current) {
        void soundBRef.current.stopAsync();
      }
      setPlayerB(null);
      addNotification("system", `🗑️ Cleared Player B`);
    }
    void syncDualPlayer('clear_deck', { playerId });
  };

  const clearStandby = () => {
    if (activePlayer === "A") {
      setPlayerB(null);
    } else {
      setPlayerA(null);
    }
  };

  return {
    playerA,
    playerB,
    isPlayingA,
    isPlayingB,
    activePlayer,
    crossfadeValue,
    isCrossfading,

    loadIntoStandby,
    switchAtoB,
    playStandbyTrack,
    pauseActiveTrack,
    stopActiveTrack,
    pauseStandby,
    stopStandby,
    clearStandby,
    clearDeck,
    togglePlayActive,
    setPlayerA,
    setPlayerB,
    animateCrossfade: (targetValue: number) => animateCrossfade(targetValue, activePlayer === "A" ? "B" : "A"),
  };
};