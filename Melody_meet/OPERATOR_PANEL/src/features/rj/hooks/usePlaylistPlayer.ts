/**
 * usePlaylistPlayer — Dedicated audio engine for the Playlist module.
 *
 * ISOLATION RULES:
 *   - Does NOT touch Deck A, Deck B, Crossfader, or AudioEngineManager.
 *   - Does NOT read or write any playlist state/store directly.
 *   - Does NOT affect RJ Setup, Podcast, Live Broadcast, Chat, or Notifications.
 *   - Owns one audio instance at a time (web: HTMLAudioElement, native: expo-av Sound).
 *   - Exposes a simple imperative API: load / play / pause / resume / stop / seek.
 *   - Fires onEnded callback when a track finishes naturally — callers own sequencing logic.
 *
 * Listen Music note:
 *   The "Listen Music" feature in PlaylistModal uses a completely separate
 *   PlaylistPreviewPlayer component with its own refs. It never touches this hook.
 */

import { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// ─── Platform detection ──────────────────────────────────────────────────────
const isWeb =
  Platform.OS === 'web' ||
  (typeof window !== 'undefined' && typeof window.document !== 'undefined');

// ─── Internal player abstraction ─────────────────────────────────────────────
interface InternalPlayer {
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  getPositionMs(): Promise<number>;
  unload(): Promise<void>;
  /** Register a callback that fires once when natural playback ends. */
  setOnEnded(cb: () => void): void;
  /** Mute or unmute without stopping playback. Used by Listen Music toggle. */
  setMuted(muted: boolean): void;
}

async function createInternalPlayer(uri: string): Promise<InternalPlayer> {
  if (isWeb) {
    const el = new window.Audio(uri) as HTMLAudioElement;
    let endedCb: (() => void) | null = null;

    // Muted by default — Listen toggle controls audibility
    el.muted = true;
    el.preload = 'auto';

    // Wait for enough data to play
    await new Promise<void>((resolve) => {
      if (el.readyState >= 3) { resolve(); return; }
      el.addEventListener('canplay', () => resolve(), { once: true });
      el.load();
    });

    el.addEventListener('ended', () => { endedCb?.(); });

    return {
      play: async () => { await el.play(); },
      pause: async () => { el.pause(); },
      stop: async () => { el.pause(); el.currentTime = 0; },
      seek: async (ms) => { el.currentTime = ms / 1000; },
      getPositionMs: async () => el.currentTime * 1000,
      unload: async () => {
        el.pause();
        el.src = '';
        endedCb = null;
      },
      setOnEnded: (cb) => { endedCb = cb; },
      setMuted: (muted: boolean) => { el.muted = muted; },
    };
  }

  // Native: expo-av
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    allowsRecordingIOS: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: false, progressUpdateIntervalMillis: 500 }
  );

  let endedCb: (() => void) | null = null;

  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      endedCb?.();
    }
  });

  return {
    play: async () => { await sound.playAsync(); },
    pause: async () => { await sound.pauseAsync(); },
    stop: async () => { await sound.stopAsync(); await sound.setPositionAsync(0); },
    seek: async (ms) => { await sound.setPositionAsync(ms); },
    getPositionMs: async () => {
      const status = await sound.getStatusAsync();
      return status.isLoaded ? (status.positionMillis ?? 0) : 0;
    },
    unload: async () => {
      endedCb = null;
      try { await sound.stopAsync(); } catch { /* ignore */ }
      try { await sound.unloadAsync(); } catch { /* ignore */ }
    },
    setOnEnded: (cb) => { endedCb = cb; },
    setMuted: (muted: boolean) => {
      sound.setIsMutedAsync(muted).catch(() => {});
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface PlaylistPlayerAPI {
  /** Load a new track URL and begin playing immediately. Unloads any previous track. */
  loadAndPlay(uri: string, onEnded: () => void): Promise<void>;
  /** Pause playback. Position is preserved. */
  pause(): Promise<void>;
  /** Resume from the paused position. */
  resume(): Promise<void>;
  /** Stop and seek to beginning. Fires no onEnded. */
  stop(): Promise<void>;
  /** Seek to a specific position in milliseconds. */
  seek(positionMs: number): Promise<void>;
  /** Get current playback position in milliseconds. */
  getPositionMs(): Promise<number>;
  /** Unload the current track and release resources. */
  unload(): Promise<void>;
  /**
   * Listen Music toggle — mute/unmute the EXISTING playing track.
   * Does NOT start a new audio instance. Does NOT change playlist state.
   * This is the only correct way to implement the Listen button.
   */
  setMuted(muted: boolean): void;
}

export function usePlaylistPlayer(): PlaylistPlayerAPI {
  const playerRef  = useRef<InternalPlayer | null>(null);
  // Tracks the current mute state so newly loaded tracks inherit it
  const mutedRef   = useRef<boolean>(true);   // muted by default until Listen is toggled ON

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      void playerRef.current?.unload().catch(() => {});
      playerRef.current = null;
    };
  }, []);

  const unload = useCallback(async () => {
    const p = playerRef.current;
    playerRef.current = null;
    if (p) await p.unload().catch(() => {});
  }, []);

  const loadAndPlay = useCallback(async (uri: string, onEnded: () => void) => {
    // Tear down existing player first
    await unload();

    try {
      const player = await createInternalPlayer(uri);
      player.setOnEnded(onEnded);
      // Apply current mute state so new tracks inherit Listen preference
      player.setMuted(mutedRef.current);
      playerRef.current = player;
      await player.play();
    } catch (err) {
      console.warn('[PlaylistPlayer] Failed to load/play:', uri, err);
      throw err;
    }
  }, [unload]);

  const pause = useCallback(async () => {
    await playerRef.current?.pause().catch(() => {});
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current?.play().catch(() => {});
  }, []);

  const stop = useCallback(async () => {
    await playerRef.current?.stop().catch(() => {});
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    await playerRef.current?.seek(positionMs).catch(() => {});
  }, []);

  const getPositionMs = useCallback(async (): Promise<number> => {
    return (await playerRef.current?.getPositionMs().catch(() => 0)) ?? 0;
  }, []);

  /**
   * Listen Music — mute/unmute only. Never touches playback state.
   * muted=true  → operator hears nothing (default)
   * muted=false → operator hears the currently playing track
   */
  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    playerRef.current?.setMuted(muted);
  }, []);

  return { loadAndPlay, pause, resume, stop, seek, getPositionMs, unload, setMuted };
}
