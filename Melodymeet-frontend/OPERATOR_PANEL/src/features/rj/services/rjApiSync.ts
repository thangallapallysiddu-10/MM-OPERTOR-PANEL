/**
 * Debounced + immediate sync helpers for RJ ↔ backend.
 */
import { RjApi } from '../../../services/api/rjApi';
import { rjBackend } from './rjBackend';
import { useAppStore } from '../../../store/useAppStore';
import { applyStudioRecordToStore } from '../utils/studioMapper';
import { rjSocket } from '../../../services/socketService';

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

export function debouncedRjSync(key: string, fn: () => Promise<void>, ms = 350) {
  if (!rjBackend.isEnabled()) return;
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    void fn().catch((e) => console.warn(`[RJ sync:${key}]`, (e as Error).message));
  }, ms);
}


export async function syncMicsToBackend() {
  const sid = rjBackend.getStudioId();
  if (!sid) return;
  const { rjStudio } = useAppStore.getState();
  const studio = await RjApi.patchState(sid, { mics: rjStudio.rjMics });
  if (studio?.mics) {
    useAppStore.getState().updateRjStudioState({ rjMics: studio.mics as never });
  }
}

export async function syncDualPlayer(
  action: string,
  extra?: Record<string, unknown>
) {
  const sid = rjBackend.getStudioId();
  if (!sid) return null;
  try {
    const studio = await RjApi.dualPlayerAction(sid, { action, ...extra });

    applyStudioRecordToStore(studio);

    // FIX 1: REMOVED rjSocket.dualPlayerAction(sid, { action, ...extra })
    // The HTTP API call already executes the action on the backend.
    // Firing via socket too caused applyDualPlayerAction to run TWICE,
    // and the socket echo (rj_dual_player_updated) overwrote the store
    // without the deckHasLoaded guard — causing phantom track contamination.

    return studio;
  } catch (err) {
    console.warn('[RJ] dualPlayer sync failed:', (err as Error).message);
    return null;
  }
}

export async function syncTimerTick() {
  const sid = rjBackend.getStudioId();
  if (!sid) return;
  const studio = await RjApi.tickTimer(sid);
  useAppStore.getState().updateRjStudioState({
    liveTimerSeconds: Number(studio.liveTimerSeconds) || 0,
    isTimerPaused: Boolean(studio.isTimerPaused),
  });
}

export async function syncPlaylistTick() {
  const sid = rjBackend.getStudioId();
  if (!sid) return;
  const result = await RjApi.tickPlaylist(sid);
  if (!result?.studio) return;

  const studio = result.studio as Record<string, unknown>;
  applyStudioRecordToStore(studio);

  const patch: Record<string, unknown> = {
    isPlaylistActive: Boolean(studio.isPlaylistActive),
    isPlaylistPaused: Boolean(studio.isPlaylistPaused),
    playlistTimerRemaining: Number(studio.playlistTimerRemaining) ?? 0,
  };
  if (studio.currentTrack) patch.currentTrack = studio.currentTrack;

  useAppStore.getState().updateRjStudioState(patch as never);

  if (result.advanced && result.currentTrack) {
    const track = result.currentTrack as Record<string, unknown>;
    useAppStore.getState().updateRjStudioState({
      currentTrack: track as never,
      localPlayback: undefined,
    });
  }
}

export async function syncTimerPauseToBackend(paused: boolean) {
  const sid = rjBackend.getStudioId();
  if (!sid) return;
  await RjApi.patchState(sid, { isTimerPaused: paused });
}

export async function pushNotificationToBackend(
  type: 'system' | 'request' | 'alert',
  message: string,
  title?: string
) {
  const sid = rjBackend.getStudioId();
  if (!sid) return;
  try {
    await RjApi.createNotification(sid, {
      title: title || (type === 'alert' ? 'Alert' : type === 'request' ? 'Request' : 'System'),
      message,
      type,
    });
  } catch {
    /* local notification still shown */
  }
}
