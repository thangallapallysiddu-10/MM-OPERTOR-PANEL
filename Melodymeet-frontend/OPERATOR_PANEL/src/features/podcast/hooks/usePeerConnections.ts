import { useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';

type SlotId = 'mic2' | 'mic3' | 'mic4' | 'mic5';

interface UsePeerConnectionsOptions {
  isLive: boolean;
  roomLink: string;
  hostStream: MediaStream | null;
}

export function usePeerConnections({ isLive }: UsePeerConnectionsOptions) {
  const { updateGuestSlot } = useAppStore();

  const applyVolume = useCallback((_slotId: SlotId, _volume: number) => {}, []);
  const applyMute = useCallback((_slotId: SlotId, _muted: boolean) => {}, []);
  const closePeer = useCallback((_slotId: SlotId) => {}, []);
  const closeAll = useCallback(() => {}, []);

  useEffect(() => {
    if (!isLive) closeAll();
    return () => { closeAll(); };
  }, [isLive, closeAll]);

  useEffect(() => {
    if (!isLive) return;
    useAppStore.getState().podcast.guestSlots.forEach((slot) => {
      updateGuestSlot(slot.slotId as SlotId, { micHealth: 'disconnected' });
    });
  }, [isLive, updateGuestSlot]);

  return { applyVolume, applyMute, closePeer, closeAll };
}
