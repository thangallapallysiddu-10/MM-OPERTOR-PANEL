// hooks/usePlaylist.ts - WITH PAUSE & STOP (FULLY FIXED)
import { useState, useEffect, useRef } from 'react';
import { PlaylistTrack, Track } from '../types';
import { trackLibrary, availableSongs } from '../constants';
import { useAppStore } from '../../../store/useAppStore';

interface UsePlaylistProps {
  setCurrentTrack: (track: Track) => void;
  setLocalCurrentTrack: (track: Track) => void;
  addNotification: (type: "request" | "system" | "alert", message: string) => void;
}

export const usePlaylist = ({ setCurrentTrack, setLocalCurrentTrack, addNotification }: UsePlaylistProps) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number>(0);
  const [customDuration, setCustomDuration] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const songTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get values from store
  const playlist = rjStudio.playlist;
  const setPlaylist = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ playlist: fn(playlist) });
    } else {
      updateRjStudioState({ playlist: fn });
    }
  };
  
  const showPlaylistModal = rjStudio.showPlaylistModal;
  const setShowPlaylistModal = (value: boolean) => updateRjStudioState({ showPlaylistModal: value });
  
  const playlistDuration = rjStudio.playlistDuration;
  const setPlaylistDuration = (value: number) => updateRjStudioState({ playlistDuration: value });
  
  const timerRemaining = rjStudio.playlistTimerRemaining;
  const setTimerRemaining = (value: number) => updateRjStudioState({ playlistTimerRemaining: value });
  
  const isPlaylistActive = rjStudio.isPlaylistActive;
  const setIsPlaylistActive = (value: boolean) => updateRjStudioState({ isPlaylistActive: value });
  
  // Pause state
  const isPlaylistPaused = rjStudio.isPlaylistPaused || false;
  const setIsPlaylistPaused = (value: boolean) => updateRjStudioState({ isPlaylistPaused: value });

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (songTimeoutRef.current) {
      clearTimeout(songTimeoutRef.current);
      songTimeoutRef.current = null;
    }
  };

  // Playlist timer countdown (with pause support)
  useEffect(() => {
    if (isPlaylistActive && !isPlaylistPaused && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        const currentRemaining = timerRemaining;
        if (currentRemaining <= 1) {
          clearAllTimeouts();
          setIsPlaylistActive(false);
          setIsPlaylistPaused(false);
          setTimerRemaining(0);
          addNotification("system", "✅ Playlist completed!");
        } else {
          setTimerRemaining(currentRemaining - 1);
        }
      }, 60000);
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [isPlaylistActive, isPlaylistPaused, timerRemaining]);

  // Auto-play next song (with pause support)
  useEffect(() => {
    if (isPlaylistActive && !isPlaylistPaused && playlist.length > 0 && currentPlaylistIndex < playlist.length) {
      const currentSong = playlist[currentPlaylistIndex];
      const minutes = parseInt(currentSong.duration.split(':')[0]);
      const seconds = parseInt(currentSong.duration.split(':')[1]);
      const songDuration = (minutes * 60) + seconds;
      
      songTimeoutRef.current = setTimeout(() => {
        if (currentPlaylistIndex + 1 < playlist.length) {
          const nextSong = playlist[currentPlaylistIndex + 1];
          const nextTrack = trackLibrary.find(t => t.title === nextSong.title) || trackLibrary[0];
          setCurrentTrack(nextTrack);
          setLocalCurrentTrack(nextTrack);
          setCurrentPlaylistIndex((prev: number) => prev + 1);
          addNotification("system", `▶️ Now playing: ${nextSong.title}`);
        }
      }, songDuration * 1000);
      return () => {
        if (songTimeoutRef.current) {
          clearTimeout(songTimeoutRef.current);
          songTimeoutRef.current = null;
        }
      };
    }
  }, [currentPlaylistIndex, isPlaylistActive, isPlaylistPaused, playlist]);

  const addToPlaylistFromLibrary = (song: PlaylistTrack) => {
    setPlaylist((prev: PlaylistTrack[]) => [...prev, { ...song, id: Date.now() }]);
    addNotification("system", `➕ Added to playlist: ${song.title}`);
  };

  const removeFromPlaylist = (id: number) => {
    setPlaylist((prev: PlaylistTrack[]) => prev.filter(track => track.id !== id));
  };

  const startPlaylist = () => {
    if (playlist.length === 0) {
      addNotification("system", "❌ Cannot start empty playlist");
      return false;
    }
    const duration = customDuration ? parseInt(customDuration) : playlistDuration;
    setTimerRemaining(duration);
    setIsPlaylistActive(true);
    setIsPlaylistPaused(false);
    setCurrentPlaylistIndex(0);
    const firstSong = playlist[0];
    const firstTrack = trackLibrary.find(t => t.title === firstSong.title) || trackLibrary[0];
    setCurrentTrack(firstTrack);
    setLocalCurrentTrack(firstTrack);
    setShowPlaylistModal(false);
    addNotification("system", `🎵 Playlist started! Duration: ${duration} mins`);
    return true;
  };

  // Pause playlist
  const pausePlaylist = () => {
    if (isPlaylistActive && !isPlaylistPaused) {
      clearAllTimeouts();
      setIsPlaylistPaused(true);
      addNotification("system", "⏸️ Playlist paused");
    }
  };

  // Resume playlist
  const resumePlaylist = () => {
    if (isPlaylistActive && isPlaylistPaused) {
      setIsPlaylistPaused(false);
      addNotification("system", "▶️ Playlist resumed");
    }
  };

  // Stop playlist completely
  const stopPlaylist = () => {
    clearAllTimeouts();
    setIsPlaylistActive(false);
    setIsPlaylistPaused(false);
    setTimerRemaining(0);
    setCurrentPlaylistIndex(0);
    addNotification("system", "⏹️ Playlist stopped");
  };

  const handleSetCustomDuration = (value: string) => {
    const duration = parseInt(value);
    if (duration > 0 && duration <= 480) {
      setPlaylistDuration(duration);
      setCustomDuration(value);
      addNotification("system", `⏱️ Duration set to ${duration} minutes`);
      return true;
    }
    addNotification("system", "❌ Invalid duration! Please enter 1-480 minutes");
    return false;
  };

  const formatTimer = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return {
    playlist,
    showPlaylistModal,
    setShowPlaylistModal,
    playlistDuration,
    setPlaylistDuration,
    customDuration,
    setCustomDuration,
    timerRemaining,
    isPlaylistActive,
    isPlaylistPaused,
    availableSongs,
    addToPlaylistFromLibrary,
    removeFromPlaylist,
    startPlaylist,
    pausePlaylist,
    resumePlaylist,
    stopPlaylist,
    handleSetCustomDuration,
    formatTimer,
  };
};