import { useCallback, useEffect, useRef } from 'react';
import { audio } from '../../../services/audio';

export interface PlaylistPlayerAPI {
  loadAndPlay(uri: string, onEnded: () => void): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  getPositionMs(): Promise<number>;
  unload(): Promise<void>;
  setMuted(muted: boolean): void;
}

export function usePlaylistPlayer(): PlaylistPlayerAPI {
  const mutedRef = useRef(true);
  const onEndedRef = useRef<(() => void) | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    return () => {
      void audio.unloadDeck('A').catch(() => {});
    };
  }, []);

  const loadAndPlay = useCallback(async (uri: string, onEnded: () => void) => {
    onEndedRef.current = onEnded;
    loadedRef.current = true;
    console.log('[React TRACE] usePlaylistPlayer.loadAndPlay', { uri });
    await audio.loadDeck('A', uri);
    await audio.muteDeck('A', mutedRef.current);
    await audio.play('A');
  }, []);

  const pause = useCallback(async () => {
    if (!loadedRef.current) return;
    await audio.pause('A');
  }, []);

  const resume = useCallback(async () => {
    if (!loadedRef.current) return;
    await audio.play('A');
  }, []);

  const stop = useCallback(async () => {
    if (!loadedRef.current) return;
    await audio.stop('A');
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    if (!loadedRef.current) return;
    await audio.seek('A', positionMs / 1000);
  }, []);

  const getPositionMs = useCallback(async (): Promise<number> => {
    const snapshot = await audio.getPlaybackSnapshot().catch(() => null);
    return Number((snapshot as any)?.positionMs ?? 0);
  }, []);

  const unload = useCallback(async () => {
    loadedRef.current = false;
    onEndedRef.current = null;
    await audio.unloadDeck('A');
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    void audio.muteDeck('A', muted);
  }, []);

  return { loadAndPlay, pause, resume, stop, seek, getPositionMs, unload, setMuted };
}
