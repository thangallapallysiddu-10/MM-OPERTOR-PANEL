// hooks/usePlayer.ts - Fixed to properly clear the track

import { useState, useEffect } from 'react';
import { Track } from '../types';
import { trackLibrary } from '../constants';
import { useAppStore } from '../../../store/useAppStore';

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
  
  const setPlayerA = (track: Track | null) => {
    updateRjStudioState({ playerATrack: track });
  };
  
  const setPlayerB = (track: Track | null) => {
    updateRjStudioState({ playerBTrack: track });
  };
  
  const activePlayer = rjStudio.activePlayer;
  const setActivePlayer = (player: "A" | "B") => {
    updateRjStudioState({ activePlayer: player });
  };
  
  const crossfadeValue = rjStudio.crossfadeValue;
  const setCrossfadeValue = (value: number) => updateRjStudioState({ crossfadeValue: value });

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

  // Next track
  const handleNextTrack = () => {
    const nextIndex = (trackIndex + 1) % trackLibrary.length;
    setTrackIndex(nextIndex);
    playLibraryTrack(trackLibrary[nextIndex]);
  };

  // Previous track
  const handlePrevTrack = () => {
    const prevIndex = (trackIndex - 1 + trackLibrary.length) % trackLibrary.length;
    setTrackIndex(prevIndex);
    playLibraryTrack(trackLibrary[prevIndex]);
  };

  const loadIntoStandby = (track: Track) => {
    const fullTrack = {
      ...track,
      beatIntensity: track.beatIntensity || 70,
      shortTitle: track.shortTitle || track.title.substring(0, 6).toUpperCase(),
      gain: track.gain || 70,
      eq: track.eq || { low: 50, mid: 50, high: 50 },
      fx: track.fx || { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 }
    };
    
    if (activePlayer === "A") {
      setPlayerB(fullTrack);
      addNotification("system", `📀 "${track.title}" loaded into Player TWO. Click PLAY SONG to broadcast!`);
    } else {
      setPlayerA(fullTrack);
      addNotification("system", `📀 "${track.title}" loaded into Player ONE. Click PLAY SONG to broadcast!`);
    }
  };

  const playStandbyTrack = (playerId: "A" | "B") => {
    if (playerId === "A" && playerA && activePlayer !== "A") {
      if (activePlayer === "B") {
        setPlayerB(null);
        animateCrossfade(0, "A");
      } else {
        setActivePlayer("A");
      }
      addNotification("system", `🎵 Now playing: ${playerA.title}`);
    } else if (playerId === "B" && playerB && activePlayer !== "B") {
      if (activePlayer === "A") {
        setPlayerA(null);
        animateCrossfade(100, "B");
      } else {
        setActivePlayer("B");
      }
      addNotification("system", `🎵 Now playing: ${playerB.title}`);
    }
  };

  // PAUSE ACTIVE TRACK
  const pauseActiveTrack = () => {
    if (activePlayer === "A" && playerA) {
      addNotification("system", `⏸️ Paused: ${playerA.title}`);
    } else if (activePlayer === "B" && playerB) {
      addNotification("system", `⏸️ Paused: ${playerB.title}`);
    }
  };

  // STOP ACTIVE TRACK - Clears EVERYTHING and shows "No song playing"
  const stopActiveTrack = () => {
    const trackName = activePlayer === "A" ? playerA?.title : playerB?.title;
    
    // Clear both players
    setPlayerA(null);
    setPlayerB(null);
    
    // Reset crossfade
    setCrossfadeValue(0);
    
    // Keep active player as A (but empty)
    setActivePlayer("A");
    
    // Manually clear the Now Playing in Dashboard
    setCurrentTrack(emptyTrack);
    setLocalCurrentTrack(emptyTrack);
    
    addNotification("system", `⏹️ Stopped: ${trackName || "Current song"}`);
  };

  // PAUSE STANDBY TRACK
  const pauseStandby = (playerId: "A" | "B") => {
    if (playerId === "A" && playerA && activePlayer !== "A") {
      addNotification("system", `⏸️ Paused (Standby): ${playerA.title}`);
    } else if (playerId === "B" && playerB && activePlayer !== "B") {
      addNotification("system", `⏸️ Paused (Standby): ${playerB.title}`);
    }
  };

  // STOP STANDBY TRACK
  const stopStandby = (playerId: "A" | "B") => {
    if (playerId === "A" && activePlayer !== "A") {
      const trackName = playerA?.title;
      setPlayerA(null);
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    } else if (playerId === "B" && activePlayer !== "B") {
      const trackName = playerB?.title;
      setPlayerB(null);
      addNotification("system", `⏹️ Stopped (Standby): ${trackName}`);
    }
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
    activePlayer,
    crossfadeValue,
    isCrossfading,
    handleNextTrack,
    handlePrevTrack,
    loadIntoStandby,
    playStandbyTrack,
    pauseActiveTrack,
    stopActiveTrack,
    pauseStandby,
    stopStandby,
    clearStandby,
    animateCrossfade: (targetValue: number) => animateCrossfade(targetValue, activePlayer === "A" ? "B" : "A"),
  };
};