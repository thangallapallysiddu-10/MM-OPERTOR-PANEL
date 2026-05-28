// hooks/useTimer.ts - Fixed for accurate timing

import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';

export const useTimer = (isLive: boolean) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef<number>(0);
  
  const isPaused = rjStudio.isTimerPaused;
  const setIsPaused = (value: boolean) => updateRjStudioState({ isTimerPaused: value });
  
  const seconds = rjStudio.liveTimerSeconds;
  
  // Update ref when seconds changes
  secondsRef.current = seconds;

  // Timer effect - runs every second
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Start new interval only if live and not paused
    if (isLive && !isPaused) {
      intervalRef.current = setInterval(() => {
        // Use ref to get current value, then update store
        const newValue = secondsRef.current + 1;
        secondsRef.current = newValue;
        updateRjStudioState({ liveTimerSeconds: newValue });
      }, 1000);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, isPaused]);

  // Reset timer when live ends
  useEffect(() => {
    if (!isLive) {
      updateRjStudioState({ liveTimerSeconds: 0, isTimerPaused: false });
      secondsRef.current = 0;
    }
  }, [isLive]);

  const formatTime = (): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const setIsPausedWrapper = (value: boolean) => {
    setIsPaused(value);
  };

  return {
    isPaused,
    setIsPaused: setIsPausedWrapper,
    seconds,
    formatTime,
  };
};