/**
 * usePlaylist.ts — Playlist state, session tracking, and sequencing.
 *
 * REAL AUDIO: This hook no longer relies on setTimeout for auto-advance.
 * It drives a dedicated PlaylistPlayerAPI (from usePlaylistPlayer) which
 * fires onEnded from actual audio playback completion events.
 *
 * ISOLATION:
 *   - Does NOT touch Deck A, Deck B, or Crossfader.
 *   - Does NOT affect RJ Setup, Podcast, Live Broadcast, Chat, or Notifications.
 *   - The Listen Music "preview" in PlaylistModal is a separate isolated component
 *     (PlaylistPreviewPlayer) and is NOT wired through this hook.
 *
 * REFRESH RECOVERY:
 *   On mount, if the store shows an active playlist (restored from backend),
 *   the hook forces it to PAUSED and pre-loads the saved track position into
 *   refs. Resume then seeks to that position before starting audio.
 *   No audio is auto-played. No timers are auto-started. No duplicate sessions.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlaylistTrack, Track } from '../types';
import { trackLibrary, availableSongs } from '../constants';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import { mapPlaylistItemFromApi, hydrateRjStoreFromBundle } from '../utils/studioMapper';
import {
  pickAndUploadLocalFile,
  buildTrackFromLocalFile,
  type UploadedLocalFile,
} from '../utils/localFileUpload';
import type { PlaylistPlayerAPI } from './usePlaylistPlayer';

interface UsePlaylistProps {
  player: PlaylistPlayerAPI;                    // injected dedicated audio player
  setCurrentTrack: (track: Track) => void;
  setLocalCurrentTrack: (track: Track) => void;
  addNotification: (type: 'request' | 'system' | 'alert', message: string) => void;
}

// ─── Duration helpers ────────────────────────────────────────────────────────
const parseDuration = (dur: string): number => {
  const parts = dur.split(':');
  if (parts.length !== 2) return 0;
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
};

const fmtTime = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const usePlaylist = ({
  player,
  setCurrentTrack,
  setLocalCurrentTrack,
  addNotification,
}: UsePlaylistProps) => {
  const { rjStudio, updateRjStudioState } = useAppStore();

  const [customDuration, setCustomDuration] = useState('');

  // ── Real-time elapsed refs ────────────────────────────────────────────────
  // These survive pauses by accumulating before clearing the start timestamp.
  const sessionStartRef    = useRef<number | null>(null);
  const sessionAccumRef    = useRef<number>(0);
  const trackStartRef      = useRef<number | null>(null);
  const trackAccumRef      = useRef<number>(0);
  const tickRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  // Prevent concurrent advance calls (e.g. onEnded fires while user presses Next)
  const advancingRef = useRef(false);

  // ── Refresh-recovery refs ─────────────────────────────────────────────────
  // Set on mount when a previously-active playlist is detected without audio.
  // resumePlaylist reads this to seek to the saved position before playing.
  const recoveryPositionMsRef = useRef<number>(0);
  const isRecoveredPauseRef   = useRef(false);
  const recoveryRunRef        = useRef(false); // guard: recovery fires at most once

  // ── Display state updated by the tick ────────────────────────────────────
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [trackElapsedSec,   setTrackElapsedSec]   = useState(0);

  // ── Store selectors ───────────────────────────────────────────────────────
  const playlist            = rjStudio.playlist;
  const uploadedLocalFiles  = rjStudio.uploadedLocalFiles || [];
  const currentPlaylistIndex = rjStudio.playlistCurrentIndex ?? 0;
  const playlistSession     = rjStudio.playlistSession;
  const trackStats          = rjStudio.trackStats ?? {};
  const isPlaylistActive    = rjStudio.isPlaylistActive;
  const isPlaylistPaused    = rjStudio.isPlaylistPaused || false;
  const showPlaylistModal   = rjStudio.showPlaylistModal;
  const playlistDuration    = rjStudio.playlistDuration;
  const timerRemaining      = rjStudio.playlistTimerRemaining;

  // ── Store setters ─────────────────────────────────────────────────────────
  const setShowPlaylistModal    = (v: boolean)  => updateRjStudioState({ showPlaylistModal: v });
  const setPlaylistDuration     = (v: number)   => updateRjStudioState({ playlistDuration: v });
  const setTimerRemaining       = (v: number)   => updateRjStudioState({ playlistTimerRemaining: v });
  const setIsPlaylistActive     = (v: boolean)  => updateRjStudioState({ isPlaylistActive: v });
  const setIsPlaylistPaused     = (v: boolean)  => updateRjStudioState({ isPlaylistPaused: v });
  const setCurrentPlaylistIndex = (idx: number) => updateRjStudioState({ playlistCurrentIndex: idx });
  const setPlaylistDirect       = (next: PlaylistTrack[]) => updateRjStudioState({ playlist: next });

  const getPlaylistFromStore = () => useAppStore.getState().rjStudio.playlist;

  // ── Refresh-recovery: detect active playlist restored without audio ───────
  // Watches for the first time isPlaylistActive becomes true after mount.
  // hydrateRjStoreFromBundle fires asynchronously (after await RjApi.getStudio),
  // so a mount-only [] effect would always see the default isPlaylistActive=false.
  // Instead we watch the store field and fire once when it transitions to true
  // with no audio loaded, which is exactly the refresh-restore scenario.
  useEffect(() => {
    if (recoveryRunRef.current) return;   // already ran
    if (!isPlaylistActive) return;        // not yet hydrated, or stopped
    if (isPlaylistPaused) {
      // Already paused (e.g. backend was paused before refresh) — seed refs
      // with the saved position so Resume seeks correctly, but don't
      // force-pause or call the API again.
      recoveryRunRef.current = true;
      const store = useAppStore.getState().rjStudio;
      const savedTrackMs   = Number(store.playlistTrackElapsedMs) || 0;
      const savedSessionMs = store.playlistSession?.accumulatedMs ?? 0;
      trackAccumRef.current   = savedTrackMs;
      trackStartRef.current   = null;
      sessionAccumRef.current = savedSessionMs;
      sessionStartRef.current = null;
      setTrackElapsedSec(Math.floor(savedTrackMs / 1000));
      setSessionElapsedSec(Math.floor(savedSessionMs / 1000));
      recoveryPositionMsRef.current = savedTrackMs;
      isRecoveredPauseRef.current   = true;
      return;
    }

    // isPlaylistActive=true, isPlaylistPaused=false — was playing before refresh.
    // No audio is loaded (engine resets on every page load). Force to paused.
    recoveryRunRef.current = true;
    const store = useAppStore.getState().rjStudio;
    const savedTrackMs   = Number(store.playlistTrackElapsedMs) || 0;
    const savedSessionMs = store.playlistSession?.accumulatedMs ?? 0;

    trackAccumRef.current   = savedTrackMs;
    trackStartRef.current   = null;
    sessionAccumRef.current = savedSessionMs;
    sessionStartRef.current = null;
    setTrackElapsedSec(Math.floor(savedTrackMs / 1000));
    setSessionElapsedSec(Math.floor(savedSessionMs / 1000));
    recoveryPositionMsRef.current = savedTrackMs;
    isRecoveredPauseRef.current   = true;

    // Force store to paused — no audio auto-plays, no timers auto-start.
    updateRjStudioState({ isPlaylistPaused: true });

    // Tell backend to pause so the server-side minute timer stops ticking.
    const sid = rjBackend.getStudioId();
    if (sid) {
      RjApi.pausePlaylist(sid).catch(() => {});
    }

  }, [isPlaylistActive, isPlaylistPaused, updateRjStudioState]);

  // ── Tick: updates display counters at 500ms intervals ────────────────────
  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const now = Date.now();
      if (sessionStartRef.current !== null) {
        const live = now - sessionStartRef.current;
        setSessionElapsedSec(Math.floor((sessionAccumRef.current + live) / 1000));
      }
      if (trackStartRef.current !== null) {
        const live = now - trackStartRef.current;
        setTrackElapsedSec(Math.floor((trackAccumRef.current + live) / 1000));
      }
    }, 500);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  useEffect(() => { return () => stopTick(); }, [stopTick]);

  // ── Track stats ───────────────────────────────────────────────────────────
  const recordTrackPlay = useCallback((trackTitle: string) => {
    const stats = { ...useAppStore.getState().rjStudio.trackStats };
    const existing = stats[trackTitle] || { playCount: 0, lastPlayedAt: '' };
    stats[trackTitle] = {
      playCount: existing.playCount + 1,
      lastPlayedAt: new Date().toISOString(),
    };
    updateRjStudioState({ trackStats: stats });
  }, [updateRjStudioState]);

  // ── Resolve a PlaylistTrack → Track with audioUrl ─────────────────────────
  const resolveTrack = useCallback((song: PlaylistTrack): Track => {
    // 1. Local files stored in the app
    if (song.artist === 'Local File') {
      const files = useAppStore.getState().rjStudio.uploadedLocalFiles || [];
      const match = song.localFileId
        ? files.find((f) => f.id === song.localFileId)
        : files.find((f) => f.name.replace(/\.[^/.]+$/, '') === song.title);
      if (match) {
        const track = buildTrackFromLocalFile(match);
        return { ...track, audioUrl: match.filePath };
      }
    }
    // 2. Built-in track library
    const fromLibrary = trackLibrary.find((t) => t.title === song.title);
    if (fromLibrary) return fromLibrary;
    // 3. Fallback: minimal Track shape (no audioUrl — player will throw, handled below)
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      bpm: song.bpm || 120,
      channel: 1,
      beatIntensity: 70,
      shortTitle: song.title.substring(0, 6).toUpperCase(),
      gain: 70,
      eq: { low: 50, mid: 50, high: 50 },
      fx: { echo: 0, flanger: 0, loop: 0, reverse: 0, hotCue: 0 },
    };
  }, []);

  // ── Internal stop (no notification, used by auto-complete / session expire) ─
  const stopPlaylistInternal = useCallback(() => {
    stopTick();
    void player.stop().catch(() => {});

    const now = Date.now();
    let finalRuntime = sessionAccumRef.current;
    if (sessionStartRef.current !== null) finalRuntime += now - sessionStartRef.current;

    const session = useAppStore.getState().rjStudio.playlistSession;
    updateRjStudioState({
      isPlaylistActive: false,
      isPlaylistPaused: false,
      playlistTimerRemaining: 0,
      playlistCurrentIndex: 0,
      playlistTrackElapsedMs: 0,
      playlistSession: session ? {
        ...session,
        stoppedAt: new Date().toISOString(),
        totalRuntime: Math.round(finalRuntime / 1000),
      } : null,
    });

    sessionStartRef.current    = null;
    sessionAccumRef.current    = 0;
    trackStartRef.current      = null;
    trackAccumRef.current      = 0;
    advancingRef.current       = false;
    setSessionElapsedSec(0);
    setTrackElapsedSec(0);
  }, [player, stopTick, updateRjStudioState]);

  // ── Play a specific index (shared by start, next, and onEnded) ────────────
  const playIndex = useCallback(async (idx: number) => {
    const pl = getPlaylistFromStore();
    if (idx >= pl.length) {
      addNotification('system', '✅ Playlist completed!');
      stopPlaylistInternal();
      return;
    }

    const song  = pl[idx];
    const track = resolveTrack(song);

    // Update store and NowPlaying display
    setCurrentTrack(track);
    setLocalCurrentTrack(track);
    setCurrentPlaylistIndex(idx);

    // Reset per-track timing
    trackAccumRef.current = 0;
    trackStartRef.current = Date.now();
    setTrackElapsedSec(0);
    advancingRef.current  = false;

    if (!track.audioUrl) {
      console.warn('[PlaylistPlayer] No audioUrl for track:', track.title, '— skipping');
      addNotification('alert', `⚠️ No audio for "${track.title}" — skipping`);
      // Try the next track immediately
      await playIndex(idx + 1);
      return;
    }

    try {
      await player.loadAndPlay(track.audioUrl, () => {
        // ── onEnded: fired by real audio completion ──────────────────────
        if (advancingRef.current) return;   // already being handled
        advancingRef.current = true;

        // Record the track that just finished
        recordTrackPlay(song.title);
        const session = useAppStore.getState().rjStudio.playlistSession;
        if (session) {
          updateRjStudioState({
            playlistSession: { ...session, tracksPlayed: session.tracksPlayed + 1 },
          });
        }

        const nextIdx = useAppStore.getState().rjStudio.playlistCurrentIndex + 1;
        addNotification('system', `▶️ Now playing: ${getPlaylistFromStore()[nextIdx]?.title ?? '(end)'}`);
        void playIndex(nextIdx);
      });
    } catch (err) {
      console.warn('[PlaylistPlayer] loadAndPlay failed for', track.title, err);
      addNotification('alert', `⚠️ Failed to play "${track.title}" — skipping`);
      await playIndex(idx + 1);
    }
  }, [
    player,
    resolveTrack,
    setCurrentTrack,
    setLocalCurrentTrack,
    addNotification,
    recordTrackPlay,
    updateRjStudioState,
    stopPlaylistInternal,
  ]);

  // ── Session timer countdown (minute-based) ────────────────────────────────
  useEffect(() => {
    if (rjBackend.isEnabled()) return;
    if (!isPlaylistActive || isPlaylistPaused || timerRemaining <= 0) return;

    const interval = setInterval(() => {
      const current = useAppStore.getState().rjStudio.playlistTimerRemaining;
      if (current <= 1) {
        clearInterval(interval);
        addNotification('system', '⏱️ Session time expired!');
        stopPlaylistInternal();
      } else {
        updateRjStudioState({ playlistTimerRemaining: current - 1 });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isPlaylistActive, isPlaylistPaused, timerRemaining, stopPlaylistInternal]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const isSongInPlaylist = (title: string, artist: string) =>
    getPlaylistFromStore().some((s) => s.title === title && s.artist === artist);

  const addLocalFileToPlaylist = async (file: Pick<UploadedLocalFile, 'id' | 'name' | 'duration'>) => {
    const title  = file.name.replace(/\.[^/.]+$/, '');
    const artist = 'Local File';
    if (isSongInPlaylist(title, artist)) {
      addNotification('alert', `"${title}" is already in the playlist`);
      return false;
    }
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const item   = await RjApi.addPlaylistItem(sid, { title, artist, duration: file.duration || '0:00', bpm: 120, source: 'local', localFileId: file.id });
        const mapped = mapPlaylistItemFromApi(item, getPlaylistFromStore().length);
        setPlaylistDirect([...getPlaylistFromStore(), mapped]);
        addNotification('system', `➕ Added: ${title}`);
        return true;
      } catch { /* local fallback */ }
    }
    setPlaylistDirect([...getPlaylistFromStore(), {
      id: Date.now() + Math.floor(Math.random() * 1000),
      localFileId: file.id,
      title,
      artist,
      duration: file.duration || '0:00',
      bpm: 120,
    }]);
    addNotification('system', `➕ Added: ${title}`);
    return true;
  };

  const uploadLocalFile = async () => {
    const file = await pickAndUploadLocalFile();
    if (!file) return null;
    addNotification('system', `📁 Uploaded: ${file.name.replace(/\.[^/.]+$/, '')}`);
    return file;
  };

  const uploadAndAddLocalFile = async () => {
    const file = await uploadLocalFile();
    if (file) await addLocalFileToPlaylist(file);
  };

  const clearPlaylist = async () => {
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try { await RjApi.clearPlaylist(sid); } catch { /* local */ }
    }
    setPlaylistDirect([]);
    addNotification('system', '🗑️ Playlist cleared');
  };

  const removeFromPlaylist = async (id: number) => {
    const item = getPlaylistFromStore().find((t) => t.id === id);
    const sid  = rjBackend.getStudioId();

    if (rjBackend.isEnabled() && sid) {
      if (item?.serverId) {
        try {
          await RjApi.removePlaylistItem(sid, item.serverId);
        } catch (err) {
          console.error('[removeFromPlaylist] backend delete failed:', err);
          /* local fallback — still remove from store below */
        }
      } else {
        // Item has no serverId — it was never persisted to the backend,
        // so no API call is needed. Removing from store only is correct.
        console.warn('[usePlaylist] removeFromPlaylist: item has no serverId, removing locally only', item);
      }
    }
    setPlaylistDirect(getPlaylistFromStore().filter((t) => t.id !== id));
  };

  // ── START ─────────────────────────────────────────────────────────────────
  const startPlaylist = async () => {
    const pl = getPlaylistFromStore();
    if (pl.length === 0) {
      addNotification('system', '❌ Cannot start empty playlist');
      return false;
    }

    const duration = customDuration
      ? parseInt(customDuration, 10)
      : playlistDuration > 0 ? playlistDuration : 60;

    // Backend sync (if available)
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const result = await RjApi.startPlaylist(sid, { durationMinutes: duration });
        const studio = result.studio as Record<string, unknown> | undefined;
        if (studio) {
          updateRjStudioState({
            isPlaylistActive: Boolean(studio.isPlaylistActive),
            isPlaylistPaused: false,
            playlistDuration: Number(studio.playlistDuration) || duration,
            playlistTimerRemaining: Number(studio.playlistTimerRemaining) || duration,
            playlistCurrentIndex: 0,
          });
        }
      } catch { /* local fallback — proceed */ }
    }

    // Initialize local session
    const now = Date.now();
    sessionStartRef.current = now;
    sessionAccumRef.current = 0;
    trackStartRef.current   = now;
    trackAccumRef.current   = 0;
    advancingRef.current    = false;
    setSessionElapsedSec(0);
    setTrackElapsedSec(0);

    setTimerRemaining(duration);
    setIsPlaylistActive(true);
    setIsPlaylistPaused(false);
    setCurrentPlaylistIndex(0);

    updateRjStudioState({
      playlistSession: {
        startedAt: new Date().toISOString(),
        stoppedAt: null,
        totalRuntime: 0,
        tracksPlayed: 0,
        pausedAt: null,
        accumulatedMs: 0,
      },
    });

    startTick();
    await playIndex(0);

    addNotification('system', `🎵 Playlist started! Duration: ${duration} min`);
    return true;
  };

  // ── PAUSE ─────────────────────────────────────────────────────────────────
  const pausePlaylist = async () => {
    if (!isPlaylistActive || isPlaylistPaused) return;

    // Freeze timestamps before any async work
    const now = Date.now();
    if (sessionStartRef.current !== null) {
      sessionAccumRef.current += now - sessionStartRef.current;
      sessionStartRef.current  = null;
    }
    if (trackStartRef.current !== null) {
      trackAccumRef.current += now - trackStartRef.current;
      trackStartRef.current  = null;
    }

    stopTick();
    await player.pause().catch(() => {});
    setIsPlaylistPaused(true);

    const session = useAppStore.getState().rjStudio.playlistSession;
    if (session) {
      updateRjStudioState({
        playlistSession: { ...session, pausedAt: new Date().toISOString(), accumulatedMs: sessionAccumRef.current },
      });
    }

    // Backend fire-and-forget
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      RjApi.pausePlaylist(sid).catch(() => {});
    }

    addNotification('system', '⏸️ Playlist paused');
  };

  // ── RESUME ────────────────────────────────────────────────────────────────
  const resumePlaylist = async () => {
    if (!isPlaylistActive || !isPlaylistPaused) return;

    // ── Refresh-recovery path ──────────────────────────────────────────────
    // After a page refresh, no audio is loaded. We must load the current track,
    // seek to the saved position, then start playing.
    if (isRecoveredPauseRef.current) {
      isRecoveredPauseRef.current = false;

      const pl  = getPlaylistFromStore();
      const idx = useAppStore.getState().rjStudio.playlistCurrentIndex ?? 0;
      const song = pl[idx];

      if (!song) {
        // Playlist is empty or index is out of range — stop cleanly.
        stopPlaylistInternal();
        return;
      }

      const track = resolveTrack(song);

      if (!track.audioUrl) {
        addNotification('alert', `⚠️ No audio for "${track.title}" — cannot resume`);
        stopPlaylistInternal();
        return;
      }

      const seekMs = recoveryPositionMsRef.current;
      recoveryPositionMsRef.current = 0;

      // Restart timestamps from current accumulated values (set during recovery init).
      const now = Date.now();
      sessionStartRef.current = now;
      trackStartRef.current   = now;

      // Load audio, seek to saved position, then play.
      try {
        await player.loadAndPlay(track.audioUrl, () => {
          // onEnded — same logic as normal playIndex
          if (advancingRef.current) return;
          advancingRef.current = true;
          recordTrackPlay(song.title);
          const session = useAppStore.getState().rjStudio.playlistSession;
          if (session) {
            updateRjStudioState({
              playlistSession: { ...session, tracksPlayed: session.tracksPlayed + 1 },
            });
          }
          const nextIdx = useAppStore.getState().rjStudio.playlistCurrentIndex + 1;
          addNotification('system', `▶️ Now playing: ${getPlaylistFromStore()[nextIdx]?.title ?? '(end)'}`);
          void playIndex(nextIdx);
        });

        // Seek after audio has started — position is preserved across the refresh.
        if (seekMs > 0) {
          await player.seek(seekMs);
        }
      } catch (err) {
        console.warn('[usePlaylist] Recovery resume failed for', track.title, err);
        addNotification('alert', `⚠️ Failed to resume "${track.title}"`);
        stopPlaylistInternal();
        return;
      }

      setCurrentTrack(track);
      setLocalCurrentTrack(track);
      setIsPlaylistPaused(false);
      startTick();

      const session = useAppStore.getState().rjStudio.playlistSession;
      if (session) {
        updateRjStudioState({ playlistSession: { ...session, pausedAt: null } });
      }

      const sid = rjBackend.getStudioId();
      if (rjBackend.isEnabled() && sid) {
        RjApi.resumePlaylist(sid).catch(() => {});
      }

      addNotification('system', `▶️ Playlist resumed from ${Math.floor(seekMs / 1000)}s`);
      return;
    }

    // ── Normal resume path (user paused intentionally) ─────────────────────
    // Restart timestamps from current accumulated values.
    const now = Date.now();
    sessionStartRef.current = now;
    trackStartRef.current   = now;

    await player.resume().catch(() => {});
    setIsPlaylistPaused(false);
    startTick();

    const session = useAppStore.getState().rjStudio.playlistSession;
    if (session) {
      updateRjStudioState({ playlistSession: { ...session, pausedAt: null } });
    }

    // Backend fire-and-forget
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      RjApi.resumePlaylist(sid).catch(() => {});
    }

    addNotification('system', '▶️ Playlist resumed');
  };

  // ── STOP ──────────────────────────────────────────────────────────────────
  const stopPlaylist = async () => {
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try { await RjApi.stopPlaylist(sid); } catch { /* local */ }
    }
    stopPlaylistInternal();
    addNotification('system', '⏹️ Playlist stopped');
  };

  // ── NEXT ──────────────────────────────────────────────────────────────────
  const skipToNext = useCallback(async () => {
    if (!isPlaylistActive || advancingRef.current) return;
    advancingRef.current = true;

    const pl  = getPlaylistFromStore();
    const idx = useAppStore.getState().rjStudio.playlistCurrentIndex ?? 0;
    const cur = pl[idx];

    // Record partial play if track actually started
    if (cur && trackAccumRef.current > 0) {
      recordTrackPlay(cur.title);
      const session = useAppStore.getState().rjStudio.playlistSession;
      if (session) {
        updateRjStudioState({
          playlistSession: { ...session, tracksPlayed: session.tracksPlayed + 1 },
        });
      }
    }

    const nextIdx = idx + 1;

    // Backend advance (try first)
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        const result = await RjApi.advancePlaylist(sid);
        const data   = result as Record<string, unknown>;
        if (data.completed) {
          addNotification('system', '⏭️ Last track — playlist stopped');
          stopPlaylistInternal();
          return;
        }
        const studioData = data.studio as Record<string, unknown> | undefined;
        if (studioData) {
          updateRjStudioState({
            playlistCurrentIndex: Number(studioData.playlistCurrentIndex ?? nextIdx),
            isPlaylistPaused: false,
          });
        }
        // If paused, restart tick
        if (isPlaylistPaused) {
          sessionStartRef.current = Date.now();
          setIsPlaylistPaused(false);
          startTick();
        }
        // Play local audio for the new index
        const newIdx = Number(studioData?.playlistCurrentIndex ?? nextIdx);
        addNotification('system', `⏭️ Skipped to: ${pl[newIdx]?.title ?? 'next track'}`);
        await playIndex(newIdx);
        return;
      } catch { /* fall through */ }
    }

    // Local-only path
    if (nextIdx >= pl.length) {
      addNotification('system', '⏭️ Last track — playlist stopped');
      stopPlaylistInternal();
      return;
    }

    // If paused, restart session tick
    if (isPlaylistPaused) {
      sessionStartRef.current = Date.now();
      setIsPlaylistPaused(false);
      startTick();
    }

    addNotification('system', `⏭️ Skipped to: ${pl[nextIdx].title}`);
    await playIndex(nextIdx);
  }, [
    isPlaylistActive,
    isPlaylistPaused,
    player,
    recordTrackPlay,
    updateRjStudioState,
    addNotification,
    startTick,
    playIndex,
    stopPlaylistInternal,
  ]);

  // ── Custom duration ───────────────────────────────────────────────────────
  const handleSetCustomDuration = (value: string) => {
    const dur = parseInt(value, 10);
    if (dur > 0 && dur <= 480) {
      setPlaylistDuration(dur);
      setCustomDuration(value);
      addNotification('system', `⏱️ Duration set to ${dur} minutes`);
      return true;
    }
    addNotification('system', '❌ Invalid duration (1–480 minutes)');
    return false;
  };

  const formatTimer = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // ── Monitor data (derived) ────────────────────────────────────────────────
  const currentSong = useMemo(() => {
    if (!isPlaylistActive || playlist.length === 0) return null;
    return playlist[currentPlaylistIndex] ?? null;
  }, [isPlaylistActive, playlist, currentPlaylistIndex]);

  const currentTrackDurationSec = useMemo(() => {
    if (!currentSong) return 0;
    return parseDuration(currentSong.duration);
  }, [currentSong]);

  const currentTrackAudioUrl = useMemo(() => {
    if (!currentSong) return null;
    if (currentSong.artist === 'Local File') {
      const files = useAppStore.getState().rjStudio.uploadedLocalFiles || [];
      const match = currentSong.localFileId
        ? files.find((f) => f.id === currentSong.localFileId)
        : files.find((f) => f.name.replace(/\.[^/.]+$/, '') === currentSong.title);
      if (match?.filePath) return match.filePath;
    }
    const fromLib = trackLibrary.find((t) => t.title === currentSong.title);
    return fromLib?.audioUrl ?? null;
  }, [currentSong]);

  const monitorData = useMemo(() => ({
    currentTrackTitle:  currentSong?.title  ?? '—',
    currentTrackArtist: currentSong?.artist ?? '—',
    trackPosition:   fmtTime(Math.min(trackElapsedSec, currentTrackDurationSec)),
    trackDuration:   fmtTime(currentTrackDurationSec),
    sessionRuntime:  fmtTime(sessionElapsedSec),
    sessionTarget:   fmtTime((playlistDuration || 60) * 60),
    tracksPlayed:    playlistSession?.tracksPlayed ?? 0,
    remainingTracks: Math.max(0, playlist.length - currentPlaylistIndex - (isPlaylistActive ? 1 : 0)),
    playlistStatus:  (!isPlaylistActive ? 'Stopped' : isPlaylistPaused ? 'Paused' : 'Playing') as 'Playing' | 'Paused' | 'Stopped',
    totalTracks:     playlist.length,
    currentTrackAudioUrl,
  }), [
    currentSong, trackElapsedSec, currentTrackDurationSec,
    sessionElapsedSec, playlistDuration, playlistSession,
    playlist, currentPlaylistIndex, isPlaylistActive, isPlaylistPaused,
    currentTrackAudioUrl,
  ]);

  return {
    // State
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
    uploadedLocalFiles,
    isSongInPlaylist,
    // CRUD
    addLocalFileToPlaylist,
    uploadLocalFile,
    uploadAndAddLocalFile,
    clearPlaylist,
    removeFromPlaylist,
    // Playback controls
    startPlaylist,
    pausePlaylist,
    resumePlaylist,
    stopPlaylist,
    skipToNext,
    // Duration
    handleSetCustomDuration,
    formatTimer,
    // Monitor
    monitorData,
    trackStats,
    currentPlaylistIndex,
  };
};
