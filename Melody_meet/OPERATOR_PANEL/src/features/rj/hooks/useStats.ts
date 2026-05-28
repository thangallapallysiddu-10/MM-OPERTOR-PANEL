import { useEffect } from 'react';
import { songData } from '../constants';
import { useAppStore } from '../../../store/useAppStore';

export const useStats = (currentTrackTitle: string) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  // Get values from store (these persist across navigation)
  const rjStats = rjStudio.rjStats;
  const setRjStats = (stats: typeof rjStats) => updateRjStudioState({ rjStats: stats });
  
  const activeListeners = rjStudio.activeListeners;
  const setActiveListeners = (value: number) => updateRjStudioState({ activeListeners: value });
  
  const listenerHistory = rjStudio.listenerHistory;
  const setListenerHistory = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ listenerHistory: fn(listenerHistory) });
    } else {
      updateRjStudioState({ listenerHistory: fn });
    }
  };

  // Update stats when track changes
  useEffect(() => {
    const songStats = songData[currentTrackTitle as keyof typeof songData] || songData["STARGAZING"];
    setRjStats({
      listeners: songStats.listeners + Math.floor(Math.random() * 20),
      likes: songStats.likes + Math.floor(Math.random() * 10),
      subscribers: songStats.subscribers + Math.floor(Math.random() * 5),
      followers: songStats.followers + Math.floor(Math.random() * 15),
      shares: songStats.shares + Math.floor(Math.random() * 8),
    });
    setActiveListeners(songStats.listeners);
  }, [currentTrackTitle]);

  const updateListeners = (isLive: boolean) => {
    if (!isLive) return;
    const change = Math.random() > 0.5 ? 1 : -1;
    const newCount = Math.max(5, activeListeners + change);
    setActiveListeners(newCount);
    setListenerHistory((prev: number[]) => {
      const newHistory = [...prev, newCount];
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
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