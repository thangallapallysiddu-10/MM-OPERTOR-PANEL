/**
 * OperatorContext.tsx
 * Wired to backend: go-live / stop-live via StreamApi + streamSocket.
 * Falls back gracefully if backend is unreachable (local state still toggles).
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import { StreamApi, Stream } from '../services/api/operatorApi';
import { RjApi } from '../services/api/rjApi';
import { StorageService } from '../services/storageService';
import { streamSocket } from '../services/socketService';
import { useAppStore } from '../store/useAppStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
}

interface Podcast {
  id: number;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  schedule: string;
  status: string;
  date: string;
}

interface OperatorContextType {
  isLive: boolean;
  listeners: number;
  activeStreamId: number | string | null;
  streams: Stream[];
  streamsLoading: boolean;
  toggleLive: () => void;
  goLiveWithId: (streamId: number | string, streamName?: string) => Promise<void>;
  stopLiveWithId: (streamId: number | string) => Promise<void>;
  refreshStreams: () => Promise<void>;
  currentTrack: Track;
  setCurrentTrack: React.Dispatch<React.SetStateAction<Track>>;
  activeChannel: number;
  setActiveChannel: React.Dispatch<React.SetStateAction<number>>;
  addPodcast: (podcast: Podcast) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

export const useOperator = (): OperatorContextType => {
  const ctx = useContext(OperatorContext);
  if (!ctx) throw new Error('useOperator must be used within OperatorProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const OperatorProvider = ({ children }: { children: ReactNode }) => {
  const [isLive, setIsLive] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [activeStreamId, setActiveStreamId] = useState<number | string | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  const [currentTrack, setCurrentTrack] = useState<Track>({
    id: 1,
    title: 'STARGAZING',
    artist: 'Kygo',
    duration: '3:24',
    bpm: 120,
  });
  const [activeChannel, setActiveChannel] = useState<number>(1);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch streams on mount ─────────────────────────────────────────────────
  const refreshStreams = async () => {
    setStreamsLoading(true);
    try {
      const data = await StreamApi.getAll();
      setStreams(data);

      // Restore live state if any stream is already live
      const liveStream = data.find((s) => s.isLive);
      if (liveStream) {
        setIsLive(true);
        setActiveStreamId(liveStream.id);
        setListeners(liveStream.viewers || 0);
      }
    } catch (err) {
      // Backend might be offline — silent fail, use local state
      console.warn('[OperatorContext] Could not fetch streams:', (err as Error).message);
    } finally {
      setStreamsLoading(false);
    }
  };

  useEffect(() => {
    refreshStreams();
    // Connect stream socket
    streamSocket.connect();

    return () => {
      streamSocket.disconnect();
    };
  }, []);

  // Subscribe to viewer count updates via socket
  useEffect(() => {
    const unsub = streamSocket.onViewerUpdate((viewers) => {
      setListeners(viewers);
    });
    return () => unsub?.();
  }, []);

  // Cleanup health ping on unmount
  useEffect(() => {
    return () => {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    };
  }, []);

  // ── Go Live with a specific stream ID ──────────────────────────────────────
  const goLiveWithId = async (streamId: number | string, streamName = 'MelodyMeet') => {
    try {
      const token = await StorageService.getSessionToken();
      if (token) {
        try {
          await RjApi.goLive(streamId, { streamName, viewerCount: 0 });
        } catch {
          /* stream-only fallback */
        }
      }
      await StreamApi.goLive(streamId);
      setIsLive(true);
      setActiveStreamId(streamId);
      setListeners(0);
      useAppStore.getState().updateRjStudioState({ chatMessages: [], rjNotifications: [] });

      streamSocket.joinStream(streamId);
      streamSocket.goLive(streamId, streamName);

      // Clean up previous interval if any
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
      }

      // Start health polling
      healthIntervalRef.current = setInterval(() => {
        streamSocket.pingHealth(streamId);
      }, 10000);

      // Clean up on stop
      const unsub = streamSocket.onStreamEnded(() => {
        if (healthIntervalRef.current) {
          clearInterval(healthIntervalRef.current);
          healthIntervalRef.current = null;
        }
        unsub?.();
      });
    } catch (err: any) {
      Alert.alert('Go Live Failed', err.message || 'Could not start stream');
    }
  };

  // ── Stop Live ──────────────────────────────────────────────────────────────
  const stopLiveWithId = async (streamId: number | string) => {
    try {
      const token = await StorageService.getSessionToken();
      if (token) {
        try {
          await RjApi.stopLive(streamId, { viewerCount: listeners });
        } catch {
          /* continue */
        }
      }
      await StreamApi.stopLive(streamId);
      setIsLive(false);
      setActiveStreamId(null);
      setListeners(0);
      useAppStore.getState().updateRjStudioState({ chatMessages: [], rjNotifications: [] });
      useAppStore.getState().updateRjStudioState({
        activeListeners: 0,
        rjStats: { ...useAppStore.getState().rjStudio.rjStats, listeners: 0 }
      });
      streamSocket.endStream(streamId);
    } catch (err: any) {
      Alert.alert('Stop Live Failed', err.message || 'Could not stop stream');
    }
  };

  // ── Legacy toggleLive (uses first stream or local-only) ───────────────────
  const toggleLive = () => {
    if (isLive) {
      if (activeStreamId) {
        stopLiveWithId(activeStreamId);
      } else {
        setIsLive(false);
        setListeners(0);
        useAppStore.getState().updateRjStudioState({
          activeListeners: 0,
          rjStats: { ...useAppStore.getState().rjStudio.rjStats, listeners: 0 }
        });
      }
    } else {
      if (streams.length > 0) {
        const firstStream = streams[0];
        goLiveWithId(firstStream.id, firstStream.name);
      } else {
        // Local-only fallback (no streams created yet)
        setIsLive(true);
        setListeners(Math.floor(Math.random() * 200) + 100);
      }
    }
  };

  const addPodcast = (podcast: Podcast) => {
    setPodcasts((prev) => [podcast, ...prev]);
  };

  return (
    <OperatorContext.Provider
      value={{
        isLive,
        listeners,
        activeStreamId,
        streams,
        streamsLoading,
        toggleLive,
        goLiveWithId,
        stopLiveWithId,
        refreshStreams,
        currentTrack,
        setCurrentTrack,
        activeChannel,
        setActiveChannel,
        addPodcast,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
};