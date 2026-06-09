import { useEffect } from 'react';
import { songData } from '../constants';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';

export const useStats = (currentTrackTitle: string) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const rjStats = rjStudio.rjStats;
  const activeListeners = rjStudio.activeListeners;
  const listenerHistory = rjStudio.listenerHistory;

  useEffect(() => {
    if (rjBackend.isEnabled()) return;

    const songStats = songData[currentTrackTitle as keyof typeof songData] || songData["STARGAZING"];
    updateRjStudioState({
      rjStats: {
        listeners: songStats.listeners + Math.floor(Math.random() * 20),
        likes: songStats.likes + Math.floor(Math.random() * 10),
        subscribers: songStats.subscribers + Math.floor(Math.random() * 5),
        followers: songStats.followers + Math.floor(Math.random() * 15),
        shares: songStats.shares + Math.floor(Math.random() * 8),
      },
      activeListeners: songStats.listeners,
    });
  }, [currentTrackTitle]);

  const updateListeners = (isLive: boolean) => {
    if (!isLive || rjBackend.isEnabled()) return activeListeners;
    const change = Math.random() > 0.5 ? 1 : -1;
    const newCount = Math.max(5, activeListeners + change);
    updateRjStudioState({
      activeListeners: newCount,
      listenerHistory: [...listenerHistory, newCount].slice(-24),
    });
    return newCount;
  };

  return {
    rjStats,
    activeListeners,
    listenerHistory,
    updateListeners,
  };
};
