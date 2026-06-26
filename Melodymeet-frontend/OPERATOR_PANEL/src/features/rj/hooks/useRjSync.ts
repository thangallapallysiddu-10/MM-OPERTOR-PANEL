/**
 * Loads RJ studio from backend and subscribes to /rj socket updates.
 */
import { useEffect, useState, useRef } from 'react';
import { StorageService } from '../../../services/storageService';
import { RjApi } from '../../../services/api/rjApi';
import { rjSocket } from '../../../services/socketService';
import { chatSocket } from '../../../services/socketService';
import { rjBackend } from '../services/rjBackend';
import { hydrateRjStoreFromBundle } from '../utils/studioMapper';
import type { RjStudioBundle } from '../../../services/api/rjApi';
import { useAppStore } from '../../../store/useAppStore';
import { syncTimerTick, syncPlaylistTick } from '../services/rjApiSync';
import { mapMixerChannelsFromApi } from '../utils/mixerMapper';
import { audio } from '../../../services/audio';

export { syncDualPlayer as syncDualPlayerToBackend } from '../services/rjApiSync';

export function useRjSync(
  studioId: string | number | null | undefined,
  isLive = false
) {
  const [ready, setReady] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    const run = async () => {
      setReady(false);
      rjBackend.clear();

      const sid = studioId ? String(studioId) : null;
      idRef.current = sid;

      if (!sid) {
        setBackendOnline(false);
        setReady(true);
        return;
      }

      const token = await StorageService.getSessionToken();
      if (!token) {
        console.warn('[useRjSync] No auth token — RJ runs in local-only mode');
        setBackendOnline(false);
        setReady(true);
        return;
      }

      try {
        const bundle = await RjApi.getStudio(sid);
        if (cancelled) return;

        await hydrateRjStoreFromBundle(bundle);
        rjBackend.setSession(sid, true);
        setBackendOnline(true);

        await rjSocket.connect(token);
        await chatSocket.connect();
        rjSocket.joinStudio(sid, 'RJ');
        chatSocket.joinStudio(sid, 'RJ');

        cleanups.push(
          rjSocket.onStudioState(async (payload) => {
            if (payload && typeof payload === 'object') {
              await hydrateRjStoreFromBundle(payload as RjStudioBundle);
            }
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onDualPlayerUpdated(async (payload) => {
            const data = payload as { dualPlayer?: unknown; currentTrack?: unknown } | null;
            const patch: Record<string, unknown> = {};
            if (data?.dualPlayer) {
              const dual = data.dualPlayer as Record<string, unknown>;

              let deckALoaded = false;
              let deckBLoaded = false;

              try {
                const snap = await audio.getPlaybackSnapshot();
                deckALoaded = snap?.deckA?.isLoaded || false;
                deckBLoaded = snap?.deckB?.isLoaded || false;
              } catch {
                deckALoaded = false;
                deckBLoaded = false;
              }

              const rawA = dual.playerATrack as Record<string, unknown> | null | undefined;
              const rawB = dual.playerBTrack as Record<string, unknown> | null | undefined;

              patch.playerATrack = (deckALoaded && rawA && typeof rawA === 'object' && rawA.title)
                ? rawA
                : null;
              patch.playerBTrack = (deckBLoaded && rawB && typeof rawB === 'object' && rawB.title)
                ? rawB
                : null;

              patch.activePlayer = dual.activePlayer;
              patch.crossfadeValue = dual.crossfadeValue;
              patch.isCrossfading = dual.isCrossfading;
            }
            if (data?.currentTrack) patch.currentTrack = data.currentTrack;
            useAppStore.getState().updateRjStudioState(patch as never);
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onMixerUpdated((data) => {
            const channels = mapMixerChannelsFromApi(
              (data as { mixerChannels?: unknown }).mixerChannels
            );
            const xf = (data as { mixerCrossfader?: number }).mixerCrossfader;
            const patch: Record<string, unknown> = {};
            if (channels) patch.mixerChannels = channels as never;
            const masterGain = (data as { masterGain?: number }).masterGain;
            if (typeof masterGain === 'number') patch.masterGain = masterGain;
            if (typeof xf === 'number') {
              patch.mixerCrossfader = xf;
              patch.crossfadeValue = xf;
            }
            const selectedFX = (data as { selectedFX?: string }).selectedFX;
            if (typeof selectedFX === 'string' && selectedFX.trim()) {
              patch.selectedFX = [selectedFX.trim()];
            }
            const activeChannel = (data as { activeChannel?: number }).activeChannel;
            if (typeof activeChannel === 'number') patch.activeChannel = activeChannel;
            useAppStore.getState().updateRjStudioState(patch as never);
          }) || (() => {})
        );

        cleanups.push(
        rjSocket.onReceiveMessage((msg: any) => {
            const { rjStudio, updateRjStudioState } = useAppStore.getState();
            const chatMessages = Array.isArray(rjStudio.chatMessages) ? rjStudio.chatMessages : [];
            const newMsg = {
              id: typeof msg.id === 'number' ? msg.id : Date.now(),
              user: msg.username || 'Guest',
              text: msg.text,
              time: new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              system: msg.type === 'system',
              likeCount: 0,
              isLiked: false,
              avatar: (msg.username || '?').charAt(0).toUpperCase(),
              isVIP: false,
            };
            updateRjStudioState({ chatMessages: [...chatMessages, newMsg] });
          }) || (() => {})
        );

        cleanups.push(
          chatSocket.onReceiveMessage((msg: any) => {
            const { rjStudio, updateRjStudioState } = useAppStore.getState();
            const chatMessages = Array.isArray(rjStudio.chatMessages) ? rjStudio.chatMessages : [];
            const exists = chatMessages.some((m) => String(m.id) === String(msg.id));
            if (exists) return;
            updateRjStudioState({
              chatMessages: [
                ...chatMessages,
                {
                  id: typeof msg.id === 'number' ? msg.id : Date.now(),
                  user: msg.username,
                  text: msg.text,
                  time: new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  system: msg.type === 'system',
                  likeCount: 0,
                  isLiked: false,
                  avatar: msg.username.charAt(0).toUpperCase(),
                  isVIP: false,
                },
              ],
            });
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onStatsUpdated((payload) => {
            const data = payload as {
              stats?: unknown;
              activeListeners?: number;
              listenerHistory?: number[];
            } | null;
            useAppStore.getState().updateRjStudioState({
              rjStats: data?.stats as never,
              activeListeners: data?.activeListeners,
              listenerHistory: data?.listenerHistory as never,
            });
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onMicsUpdated((data) => {
            if (data?.mics) {
              useAppStore.getState().updateRjStudioState({ rjMics: data.mics as never });
            }
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onPlaylistUpdated((data) => {
            const playlistItems = Array.isArray(data?.playlist) ? data.playlist : [];
            if (playlistItems.length) {
              const playlist = playlistItems.map((raw, i: number) => {
                const item = raw as Record<string, unknown>;
                return {
                id: i + 1,
                serverId: item.id ? String(item.id) : undefined,
                localFileId: item.localFileId ? String(item.localFileId) : undefined,
                title: String(item.title),
                artist: String(item.artist || 'Unknown'),
                duration: String(item.duration || '0:00'),
                bpm: Number(item.bpm) || 120,
                channel: typeof item.channel === 'number' ? item.channel : undefined,
              };
              });
              useAppStore.getState().updateRjStudioState({ playlist });
            }
          }) || (() => {})
        );

        cleanups.push(
          rjSocket.onMessagePinned((data) => {
            const { updateRjStudioState } = useAppStore.getState();
            updateRjStudioState({
              pinnedMessage: {
                id: data.messageId as never,
                user: 'Pinned',
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                system: true,
              },
            });
          }) || (() => {})
        );

      } catch (err) {
        console.warn('[useRjSync] Backend unavailable:', (err as Error).message);
        rjBackend.setSession(sid, false);
        setBackendOnline(false);
      }

      if (!cancelled) setReady(true);
    };

    run();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      rjBackend.clear();
    };
  }, [studioId, isLive]);

  const refreshStudio = async () => {
    const sid = idRef.current;
    if (!sid || !rjBackend.isEnabled()) return;
    try {
      const bundle = await RjApi.getStudio(sid);
      await hydrateRjStoreFromBundle(bundle);
    } catch (err) {
      console.warn('[useRjSync] refresh failed:', (err as Error).message);
    }
  };

  return { ready, backendOnline, studioId: idRef.current, refreshStudio };
}
