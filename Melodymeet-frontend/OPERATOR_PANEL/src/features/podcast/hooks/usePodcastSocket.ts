import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { podcastSocket, type PodcastChatMessage } from '../../../services/socketService';
import { useAppStore } from '../../../store/useAppStore';
import { extractRoomId } from '../utils/podcastMappers';

interface UsePodcastSocketOptions {
  isLive: boolean;
  roomLink: string;
  userName: string;
}

export function usePodcastSocket({
  isLive,
  roomLink,
  userName,
}: UsePodcastSocketOptions) {
  const { updatePodcastState, setGuestSlots, updateGuestSlot } = useAppStore();
  const [liveChatMessages, setLiveChatMessages] = useState<PodcastChatMessage[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');

  // ─── CLEAR CHAT ────────────────────────────────────────────────────────────
  const clearLiveChat = useCallback(() => {
    setLiveChatMessages([]);
  }, []);

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendHostChatMessage = () => {
    const text = liveChatInput.trim();
    if (!text) return;

    // Create local message immediately (Optimistic UI Update)
    // This guarantees messages appear in your list layout instantly
    const newMessage: PodcastChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Bulletproof unique ID
      senderName: userName || 'Host',
      senderRole: 'host',
      text: text,
      createdAt: new Date().toISOString(),
    };

    setLiveChatMessages(prev => [...prev, newMessage]);
    setLiveChatInput(''); // Instantly clear input field for fluid UX

    // ─── SOCKET SYSTEM SYNC ──────────────────────────────────────────────────
    // If the room isn't live or connection hasn't finished handshake, gracefully skip server delivery
    if (!isLive) {
      console.log('Chat local-only: Studio session is not Live.');
      return;
    }

    const roomId = extractRoomId(roomLink);
    if (!roomId || !podcastSocket.isConnected()) {
      console.warn('Chat Delivery Skipped: Socket connection offline.');
      return;
    }

    // Deliver payload out to connected peers via backend socket channel
    podcastSocket.hostChatMessage(roomId, userName, text);
  };

  useEffect(() => {
    if (!isLive || !roomLink) {
      podcastSocket.disconnect();
      setLiveChatMessages([]);
      return;
    }

    const roomId = extractRoomId(roomLink);
    if (!roomId) return;

    const cleanups: Array<() => void> = [];

    // Register all listeners synchronously BEFORE connecting to prevent race conditions
    cleanups.push(
      (podcastSocket as any).onRoomSnapshot((snapshot: any) => {
        updatePodcastState({ liveViewers: snapshot?.viewerCount || 0 });
        if (snapshot?.chatHistory) {
          setLiveChatMessages(snapshot.chatHistory);
        }
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onChatHistory(({ messages }) => {
        setLiveChatMessages(messages || []);
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onChatMessage((message) => {
        setLiveChatMessages((prev) => {
          if (prev.some((item) => item.id === message.id)) return prev;
          return [...prev.slice(-99), message];
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onChatError(({ message }) => {
        Alert.alert('Chat Error', message || 'Could not send chat message');
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onViewerCount(({ viewerCount }) => {
        updatePodcastState({ liveViewers: Number(viewerCount || 0) });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onLiveEnded(() => {
        updatePodcastState({
          isLive: false,
          liveSeconds: 0,
          liveViewers: 0,
        });
        setGuestSlots([
          { slotId: 'mic2', label: 'MIC 2', status: 'empty', guestName: null, guestId: null, isSpeaking: false, speakingSeconds: 0, speakingStartedAt: null, micHealth: undefined, connectionQuality: null },
          { slotId: 'mic3', label: 'MIC 3', status: 'empty', guestName: null, guestId: null, isSpeaking: false, speakingSeconds: 0, speakingStartedAt: null, micHealth: undefined, connectionQuality: null },
          { slotId: 'mic4', label: 'MIC 4', status: 'empty', guestName: null, guestId: null, isSpeaking: false, speakingSeconds: 0, speakingStartedAt: null, micHealth: undefined, connectionQuality: null },
          { slotId: 'mic5', label: 'MIC 5', status: 'empty', guestName: null, guestId: null, isSpeaking: false, speakingSeconds: 0, speakingStartedAt: null, micHealth: undefined, connectionQuality: null },
        ]);
        setLiveChatMessages([]);
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onSlotUpdated((payload) => {
        updateGuestSlot(payload.slotId, {
          status: payload.status,
          guestName: payload.guestName,
          guestId: payload.guestId ?? null,
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onGuestJoined((payload) => {
        updateGuestSlot(payload.slotId, {
          status: 'connected',
          guestName: payload.guestName,
          guestId: payload.guestId ?? null,
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onGuestLeft((payload) => {
        updateGuestSlot(payload.slotId, {
          status: 'empty',
          guestName: null,
          guestId: null,
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onGuestMicToggle((payload) => {
        updateGuestSlot(payload.slotId, {
          guestSelfMuted: payload.muted,
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onGuestSpeaking((payload) => {
        const store = useAppStore.getState();
        const slot = store.podcast.guestSlots.find(s => s.slotId === payload.slotId);
        if (!slot) return;

        const now = Date.now();
        if (payload.speaking && !slot.isSpeaking) {
          updateGuestSlot(payload.slotId, {
            isSpeaking: true,
            speakingStartedAt: now,
          });
        } else if (!payload.speaking) {
          const started = slot.speakingStartedAt ?? now;
          const elapsed = Math.round((now - started) / 1000);
          updateGuestSlot(payload.slotId, {
            isSpeaking: false,
            speakingStartedAt: null,
            speakingSeconds: (slot.speakingSeconds ?? 0) + elapsed,
          });
        }
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onWebRtcOffer((payload) => {
        updatePodcastState({ pendingWebRtcSignal: { ...payload, type: 'offer' } });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onWebRtcAnswer((payload) => {
        updatePodcastState({ pendingWebRtcSignal: { ...payload, type: 'answer' } });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onWebRtcIceCandidate((payload) => {
        updatePodcastState({ pendingWebRtcSignal: { ...payload, type: 'ice' } });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onSpeakRequest((payload) => {
        const { rjStudio, updateRjStudioState, addRjNotification } = useAppStore.getState();
        const exist = rjStudio.speakRequests || [];
        if (exist.some(r => r.id === payload.id)) return;
        
        updateRjStudioState({
          speakRequests: [...exist, { id: payload.id, userName: payload.userName, timestamp: payload.timestamp, status: 'pending' }]
        });
        
        addRjNotification({
          title: "New Speak Request",
          message: `🎙️ ${payload.userName} wants to speak live!`,
          type: "request" as const,
          read: false,
        });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onSpeakRequestAccepted((payload) => {
        const { rjStudio, updateRjStudioState } = useAppStore.getState();
        const exist = rjStudio.speakRequests || [];
        const updated = exist.map(r => r.id === payload.requestId ? { ...r, status: 'accepted' as const } : r);
        updateRjStudioState({ speakRequests: updated });
      }) || (() => {})
    );

    cleanups.push(
      podcastSocket.onSpeakRequestRejected((payload) => {
        const { rjStudio, updateRjStudioState } = useAppStore.getState();
        const exist = rjStudio.speakRequests || [];
        const updated = exist.map(r => r.id === payload.requestId ? { ...r, status: 'rejected' as const } : r);
        updateRjStudioState({ speakRequests: updated });
      }) || (() => {})
    );

    const run = async () => {
      try {
        await podcastSocket.connect();
        podcastSocket.hostJoin(roomId);
      } catch (err) {
        console.warn('[usePodcastSocket] Connect failed:', err);
      }
    };

    void run();

    return () => {
      cleanups.forEach((fn) => fn());
      podcastSocket.disconnect();
    };
  }, [isLive, roomLink]);

  return {
    liveChatMessages,
    liveChatInput,
    setLiveChatInput,
    sendHostChatMessage,
    clearLiveChat,
  };
}