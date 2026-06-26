/**
 * usePlayer.ts
 *
 * Deck A / Deck B playback controller.
 * All audio operations route through the Unified Audio SDK (src/services/audio).
 * React holds NO playback implementation — it sends intent only.
 */

import { useState, useEffect } from 'react';
import { Track } from '../types';
import { useAppStore } from '../../../store/useAppStore';
import { syncDualPlayer } from '../services/rjApiSync';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { audio } from '../../../services/audio';
import type { DeckId } from '../../../services/audio';

interface UsePlayerProps {
  setCurrentTrack:      (track: Track) => void;
  setLocalCurrentTrack: (track: Track) => void;
  addNotification:      (type: 'request' | 'system' | 'alert', message: string) => void;
}

// Empty track sentinel for clearing the Now Playing display
const EMPTY_TRACK: Track = {
  id: 0,
  title: 'No song playing',
  artist: '',
  bpm: 0,
  beatIntensity: 0,
  duration: '0:00',
  channel: 1,
  shortTitle: '',
  gain: 0,
  eq: { low: 0, mid: 0, high: 0 },
  fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
};

export const usePlayer = ({
  setCurrentTrack,
  setLocalCurrentTrack,
  addNotification,
}: UsePlayerProps) => {
  const { rjStudio, updateRjStudioState } = useAppStore();

  const [isCrossfading, setIsCrossfading] = useState(false);

  const playerA    = rjStudio.playerATrack;
  const playerB    = rjStudio.playerBTrack;
  const isPlayingA = rjStudio.isPlayingA ?? false;
  const isPlayingB = rjStudio.isPlayingB ?? false;
  const isLocalAudioMuted = rjStudio.isLocalAudioMuted ?? false;

  // ─── Mute both decks when local-audio-muted flag changes ──────────────────
  useEffect(() => {
    audio.muteDeck('A', isLocalAudioMuted).catch(() => {});
    audio.muteDeck('B', isLocalAudioMuted).catch(() => {});
  }, [isLocalAudioMuted]);

  // ─── Crossfade ─────────────────────────────────────────────────────────────
  const crossfadeValue = rjStudio.crossfadeValue ?? 50;

  const setCrossfadeValue = (value: number) =>
    updateRjStudioState({ crossfadeValue: value });

  useEffect(() => {
    audio.setCrossfade(crossfadeValue).catch(() => {});
  }, [crossfadeValue]);

  // ─── Active player ─────────────────────────────────────────────────────────
  const activePlayer    = rjStudio.activePlayer;
  const setActivePlayer = (player: DeckId) =>
    updateRjStudioState({ activePlayer: player });

  // ─── Now Playing display ───────────────────────────────────────────────────
  useEffect(() => {
    if (activePlayer === 'A' && playerA) {
      setCurrentTrack(playerA);
      setLocalCurrentTrack(playerA);
    } else if (activePlayer === 'B' && playerB) {
      setCurrentTrack(playerB);
      setLocalCurrentTrack(playerB);
    } else {
      setCurrentTrack(EMPTY_TRACK);
      setLocalCurrentTrack(EMPTY_TRACK);
    }
  }, [activePlayer, playerA, playerB]);

  // ─── Sync store playback state → engine ───────────────────────────────────
  // (Needed when socket updates change isPlayingA/B without going through local actions)
  useEffect(() => {
    if (playerA) {
      if (isPlayingA) audio.play('A').catch(() => {});
      else            audio.pause('A').catch(() => {});
    }
  }, [isPlayingA, playerA]);

  useEffect(() => {
    if (playerB) {
      if (isPlayingB) audio.play('B').catch(() => {});
      else            audio.pause('B').catch(() => {});
    }
  }, [isPlayingB, playerB]);

  // ─── Deck load/unload ──────────────────────────────────────────────────────

  const loadDeck = async (deckId: DeckId, track: Track | null) => {
    if (!track) {
      await audio.unloadDeck(deckId).catch(() => {});
      return;
    }
    const url = track.filePath || track.audioUrl || (track as any).fileUrl;
    if (!url) {
      console.warn('[usePlayer] loadDeck: no audioUrl on track', track.title);
      return;
    }
    console.log('[React TRACE] usePlayer.loadDeck', { deckId, url, title: track.title });
    await audio.loadDeck(deckId, url).catch((err) =>
      console.warn('[usePlayer] loadDeck failed:', err)
    );
  };

  const setPlayerA = (track: Track | null) => {
    if (track && !track.title) {
      console.error('[usePlayer] setPlayerA: invalid track (no title)', track);
      return;
    }
    updateRjStudioState({ playerATrack: track ?? null, isPlayingA: false });
    void loadDeck('A', track);
  };

  const setPlayerB = (track: Track | null) => {
    if (track && !track.title) {
      console.error('[usePlayer] setPlayerB: invalid track (no title)', track);
      return;
    }
    updateRjStudioState({ playerBTrack: track ?? null, isPlayingB: false });
    void loadDeck('B', track);
  };

  // ─── Crossfade animation ───────────────────────────────────────────────────

  const animateCrossfadeToPlayer = (
    targetValue: number,
    targetPlayer: DeckId,
  ) => {
    if (isCrossfading) return;
    setIsCrossfading(true);
    setCrossfadeValue(targetValue);
    setActivePlayer(targetPlayer);
    updateRjStudioState({ isCrossfading: false });
    setIsCrossfading(false);
    void syncDualPlayer(
      targetPlayer === 'A' ? 'crossfade_to_a' : 'crossfade_to_b',
      { crossfadeValue: targetValue },
    );
  };

  // ─── High-level transport actions ──────────────────────────────────────────

  const playStandbyTrack = (playerId: DeckId) => {
    if (playerId === 'A' && playerA) {
      if (isPlayingB) {
        audio.stop('B').catch(() => {});
        updateRjStudioState({ isPlayingB: false });
      }
      setActivePlayer('A');
      updateRjStudioState({ isPlayingA: true });
      audio.play('A').catch(() => {});
      setCurrentTrack(playerA);
      setLocalCurrentTrack(playerA);
      addNotification('system', `🎵 Now playing: ${playerA.title}`);
    } else if (playerId === 'B' && playerB) {
      if (isPlayingA) {
        audio.stop('A').catch(() => {});
        updateRjStudioState({ isPlayingA: false });
      }
      setActivePlayer('B');
      updateRjStudioState({ isPlayingB: true });
      audio.play('B').catch(() => {});
      setCurrentTrack(playerB);
      setLocalCurrentTrack(playerB);
      addNotification('system', `🎵 Now playing: ${playerB.title}`);
    }
    void syncDualPlayer('play_standby', { playerId });
  };

  const pauseActiveTrack = () => {
    if (activePlayer === 'A' && playerA) {
      updateRjStudioState({ isPlayingA: false });
      audio.pause('A').catch(() => {});
      addNotification('system', `⏸️ Paused: ${playerA.title}`);
    } else if (activePlayer === 'B' && playerB) {
      updateRjStudioState({ isPlayingB: false });
      audio.pause('B').catch(() => {});
      addNotification('system', `⏸️ Paused: ${playerB.title}`);
    }
    void syncDualPlayer('pause_active');
  };

  const togglePlayActive = () => {
    const isPlaying = activePlayer === 'A' ? isPlayingA : isPlayingB;
    if (isPlaying) {
      pauseActiveTrack();
    } else {
      playStandbyTrack(activePlayer);
      void syncDualPlayer('toggle_play');
    }
  };

  const stopActiveTrack = () => {
    const trackName =
      activePlayer === 'A' ? playerA?.title : playerB?.title;
    audio.stop(activePlayer).catch(() => {});
    updateRjStudioState(
      activePlayer === 'A' ? { isPlayingA: false } : { isPlayingB: false }
    );
    addNotification('system', `⏹️ Stopped: ${trackName || 'Current song'}`);
    void syncDualPlayer('stop_active');
  };

  const pauseStandby = (playerId: DeckId) => {
    if (playerId === 'A' && playerA && activePlayer !== 'A') {
      updateRjStudioState({ isPlayingA: false });
      audio.pause('A').catch(() => {});
      addNotification('system', `⏸️ Paused (Standby): ${playerA.title}`);
    } else if (playerId === 'B' && playerB && activePlayer !== 'B') {
      updateRjStudioState({ isPlayingB: false });
      audio.pause('B').catch(() => {});
      addNotification('system', `⏸️ Paused (Standby): ${playerB.title}`);
    }
    void syncDualPlayer('pause_standby', { playerId });
  };

  const stopStandby = (playerId: DeckId) => {
    if (playerId === 'A' && activePlayer !== 'A') {
      audio.stop('A').catch(() => {});
      updateRjStudioState({ isPlayingA: false });
      addNotification('system', `⏹️ Stopped (Standby): ${playerA?.title}`);
    } else if (playerId === 'B' && activePlayer !== 'B') {
      audio.stop('B').catch(() => {});
      updateRjStudioState({ isPlayingB: false });
      addNotification('system', `⏹️ Stopped (Standby): ${playerB?.title}`);
    }
    void syncDualPlayer('stop_standby', { playerId });
  };

  const clearDeck = (playerId: DeckId) => {
    audio.stop(playerId).catch(() => {});
    if (playerId === 'A') {
      setPlayerA(null);
      addNotification('system', '🗑️ Cleared Player A');
    } else {
      setPlayerB(null);
      addNotification('system', '🗑️ Cleared Player B');
    }
    void syncDualPlayer('clear_deck', { playerId });
  };

  const clearStandby = () => {
    if (activePlayer === 'A') setPlayerB(null);
    else                       setPlayerA(null);
  };

  const switchAtoB = () => {
    if (!playerA) return;
    setPlayerB(playerA);
    setPlayerA(null);
    addNotification('system', `🔁 Moved "${playerA.title}" from Player A to Player B.`);
    void syncDualPlayer('switch_a_to_b');
  };

  const loadIntoStandby = (track: Track, targetPlayer: DeckId = 'A') => {
    const fullTrack: Track = {
      ...track,
      beatIntensity: track.beatIntensity || 70,
      shortTitle: track.shortTitle || track.title.substring(0, 6).toUpperCase(),
      gain: track.gain || 70,
      eq:   track.eq   || { low: 50,  mid: 50,  high: 50 },
      fx:   track.fx   || { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
    };

    if (targetPlayer === 'A') {
      setPlayerA(fullTrack);
      addNotification('system', `📀 "${track.title}" loaded into Player A.`);
    } else {
      setPlayerB(fullTrack);
      addNotification('system', `📀 "${track.title}" loaded into Player B.`);
    }
    void syncDualPlayer('load_to_player', { track: fullTrack, playerId: targetPlayer });
  };

  const playLibraryTrack = (track: Track) => {
    if (activePlayer === 'A') {
      setPlayerB(track);
      animateCrossfadeToPlayer(100, 'B');
    } else {
      setPlayerA(track);
      animateCrossfadeToPlayer(0, 'A');
    }
    addNotification('system', `🎵 Now playing: ${track.title}`);
  };

  const applyStudioDualToLocal = (studio: Record<string, unknown> | null) => {
    if (!studio) return;
    applyStudioRecordToStore(studio);
    const dual    = (studio.dualPlayer as Record<string, unknown>) || {};
    const current = studio.currentTrack as Track | null;
    if (dual.playerATrack) setPlayerA(dual.playerATrack as Track);
    if (dual.playerBTrack) setPlayerB(dual.playerBTrack as Track);
    if (dual.activePlayer) setActivePlayer(dual.activePlayer as DeckId);
    if (typeof dual.isPlayingA === 'boolean') updateRjStudioState({ isPlayingA: dual.isPlayingA });
    if (typeof dual.isPlayingB === 'boolean') updateRjStudioState({ isPlayingB: dual.isPlayingB });
    if (typeof dual.crossfadeValue === 'number') setCrossfadeValue(dual.crossfadeValue);
    if (current) {
      setCurrentTrack(current);
      setLocalCurrentTrack(current);
    }
  };

  // ─── Public API ────────────────────────────────────────────────────────────

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
    playLibraryTrack,
    applyStudioDualToLocal,
    setPlayerA,
    setPlayerB,
    animateCrossfade: (targetValue: number) =>
      animateCrossfadeToPlayer(
        targetValue,
        activePlayer === 'A' ? 'B' : 'A',
      ),
  };
};
