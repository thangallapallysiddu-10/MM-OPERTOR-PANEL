import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { syncTimerPauseToBackend } from '../services/rjApiSync';

export const useTimer = (isLive: boolean) => {
  const { rjStudio, updateRjStudioState } = useAppStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef<number>(0);
  
  const isPaused = rjStudio.isTimerPaused;
  const setIsPaused = (value: boolean) => {
    updateRjStudioState({ isTimerPaused: value });
    if (rjBackend.isEnabled()) {
      void syncTimerPauseToBackend(value);
    }
  };
  
  const seconds = rjStudio.liveTimerSeconds;
  secondsRef.current = seconds;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Local timer runs regardless of backend to avoid 429 HTTP polling
    // if (rjBackend.isEnabled()) return;

    if (isLive && !isPaused) {
      intervalRef.current = setInterval(() => {
        const newValue = secondsRef.current + 1;
        secondsRef.current = newValue;
        updateRjStudioState({ liveTimerSeconds: newValue });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, isPaused]);

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

  return {
    isPaused,
    setIsPaused,
    seconds,
    formatTime,
  };
};
