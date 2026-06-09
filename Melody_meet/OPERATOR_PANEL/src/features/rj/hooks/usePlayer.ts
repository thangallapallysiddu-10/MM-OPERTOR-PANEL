// hooks/usePlayer.ts - Fixed to properly clear the track

import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '../types';
import { trackLibrary } from '../constants';
import { useAppStore } from '../../../store/useAppStore';
import { syncDualPlayer } from '../services/rjApiSync';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { audioEngineManager } from '../../../services/audioEngine/core/AudioEngineManager';
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

  // Sync mute state for both sounds
  useEffect(() => {
    if (soundARef.current) soundARef.current.setIsMutedAsync(isLocalAudioMuted).catch(() => {});
    if (soundBRef.current) soundBRef.current.setIsMutedAsync(isLocalAudioMuted).catch(() => {});
  }, [isLocalAudioMuted]);

  // Wire up DeckEngine to soundRefs on mount if running on web
  useEffect(() => {
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
    if (!isWeb) return;

    if (!soundARef.current) {
      const deckA = audioEngineManager.getDeck('A');
      soundARef.current = {
        playAsync: async () => deckA.play(),
        pauseAsync: async () => deckA.pause(),
        stopAsync: async () => deckA.stop(),
        unloadAsync: async () => deckA.unloadTrack(),
        setIsMutedAsync: async (muted: boolean) => {
           const elem = deckA.getMediaElement();
           if (elem) elem.muted = muted;
        },
        setVolumeAsync: async (volume: number) => {
           const elem = deckA.getMediaElement();
           if (elem) elem.volume = Math.max(0, Math.min(1, volume));
        }
      };
    }
    
    if (!soundBRef.current) {
      const deckB = audioEngineManager.getDeck('B');
      soundBRef.current = {
        playAsync: async () => deckB.play(),
        pauseAsync: async () => deckB.pause(),
        stopAsync: async () => deckB.stop(),
        unloadAsync: async () => deckB.unloadTrack(),
        setIsMutedAsync: async (muted: boolean) => {
           const elem = deckB.getMediaElement();
           if (elem) elem.muted = muted;
        },
        setVolumeAsync: async (volume: number) => {
           const elem = deckB.getMediaElement();
           if (elem) elem.volume = Math.max(0, Math.min(1, volume));
        }
      };
    }
  }, []);

  const loadSound = async (track: Track | null, isPlayerA: boolean) => {
    const ref = isPlayerA ? soundARef : soundBRef;
    const chainId = isPlayerA ? 'A' : 'B';
    
    if (ref.current) {
      await ref.current.stopAsync();
      await ref.current.unloadAsync();
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
        // Foolproof web detection: Use DeckEngine if Platform is web OR if we are in a browser environment
        const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
        
        if (isWeb) {
          const deck = audioEngineManager.getDeck(chainId);
          await deck.loadTrack(url);
          
          ref.current = {
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
            }
          };
        } else {
          // Native platforms use expo-av
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

  // Apply Crossfade
  useEffect(() => {
    // 1. WebAudio Hardware Crossfader (Broadcast Grade Constant-Power)
    const crossfader = audioEngineManager.getCrossfader();
    if (crossfader) {
      crossfader.setCrossfade(crossfadeValue);
      // We do NOT modify setVolumeAsync here on Web because it alters pre-DSP source volume.
      return;
    }

    // 2. Native Fallback (Linear Math for expo-av)
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
    if (soundARef.current) {
      if (isPlayingA) void soundARef.current.playAsync();
      else void soundARef.current.pauseAsync();
    }
  }, [isPlayingA, playerA]);

  useEffect(() => {
    if (soundBRef.current) {
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
    if (playerId === "A" && playerA) {
      // Stop Player B audio (but keep its track loaded)
      if (isPlayingB && soundBRef.current) {
        void soundBRef.current.stopAsync();
        updateRjStudioState({ isPlayingB: false });
      }
      setActivePlayer("A");
      updateRjStudioState({ isPlayingA: true });
      if (soundARef.current) void soundARef.current.playAsync();
      setCurrentTrack(playerA);
      setLocalCurrentTrack(playerA);
      addNotification("system", `🎵 Now playing: ${playerA.title}`);
    } else if (playerId === "B" && playerB) {
      // Stop Player A audio (but keep its track loaded)
      if (isPlayingA && soundARef.current) {
        void soundARef.current.stopAsync();
        updateRjStudioState({ isPlayingA: false });
      }
      setActivePlayer("B");
      updateRjStudioState({ isPlayingB: true });
      if (soundBRef.current) void soundBRef.current.playAsync();
      setCurrentTrack(playerB);
      setLocalCurrentTrack(playerB);
      addNotification("system", `🎵 Now playing: ${playerB.title}`);
    }
    void syncDualPlayer('play_standby', { playerId });
  };

  // PAUSE ACTIVE TRACK
  const pauseActiveTrack = () => {
    if (activePlayer === "A" && playerA) {
      updateRjStudioState({ isPlayingA: false });
      if (soundARef.current) void soundARef.current.pauseAsync();
      addNotification("system", `⏸️ Paused: ${playerA.title}`);
    } else if (activePlayer === "B" && playerB) {
      updateRjStudioState({ isPlayingB: false });
      if (soundBRef.current) void soundBRef.current.pauseAsync();
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
    
    if (activePlayer === "A") {
      if (soundARef.current) void soundARef.current.stopAsync();
      updateRjStudioState({ isPlayingA: false });
    } else {
      if (soundBRef.current) void soundBRef.current.stopAsync();
      updateRjStudioState({ isPlayingB: false });
    }
    
    addNotification("system", `⏹️ Stopped: ${trackName || "Current song"}`);
    void syncDualPlayer('stop_active');
  };

  // PAUSE STANDBY TRACK
  const pauseStandby = (playerId: "A" | "B") => {
    if (playerId === "A" && playerA && activePlayer !== "A") {
      updateRjStudioState({ isPlayingA: false });
      if (soundARef.current) void soundARef.current.pauseAsync();
      addNotification("system", `⏸️ Paused (Standby): ${playerA.title}`);
    } else if (playerId === "B" && playerB && activePlayer !== "B") {
      updateRjStudioState({ isPlayingB: false });
      if (soundBRef.current) void soundBRef.current.pauseAsync();
      addNotification("system", `⏸️ Paused (Standby): ${playerB.title}`);
    }
    void syncDualPlayer('pause_standby', { playerId });
  };

  const stopStandby = (playerId: "A" | "B") => {
    if (playerId === "A" && activePlayer !== "A") {
      const trackName = playerA?.title;
      if (soundARef.current) void soundARef.current.stopAsync();
      updateRjStudioState({ isPlayingA: false });
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    } else if (playerId === "B" && activePlayer !== "B") {
      const trackName = playerB?.title;
      if (soundBRef.current) void soundBRef.current.stopAsync();
      updateRjStudioState({ isPlayingB: false });
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    }
    void syncDualPlayer('stop_standby', { playerId });
  };

  const clearDeck = (playerId: "A" | "B") => {
    if (playerId === "A") {
      if (soundARef.current) void soundARef.current.stopAsync();
      setPlayerA(null);
      addNotification("system", `🗑️ Cleared Player A`);
    } else {
      if (soundBRef.current) void soundBRef.current.stopAsync();
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