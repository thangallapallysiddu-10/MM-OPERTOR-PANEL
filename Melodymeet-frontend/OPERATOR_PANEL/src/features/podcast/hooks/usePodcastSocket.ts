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

    const run = async () => {
      await podcastSocket.connect();
      podcastSocket.hostJoin(roomId);

      // ─── ROOM SNAPSHOT ──────────────────────────────────────────────────────
      cleanups.push(
        (podcastSocket as any).onRoomSnapshot((snapshot: any) => {
          updatePodcastState({ liveViewers: snapshot?.viewerCount || 0 });
          if (snapshot?.chatHistory) {
            setLiveChatMessages(snapshot.chatHistory);
          }
        }) || (() => {})
      );

      // ─── CHAT HISTORY ───────────────────────────────────────────────────────
      cleanups.push(
        podcastSocket.onChatHistory(({ messages }) => {
          setLiveChatMessages(messages || []);
        }) || (() => {})
      );

      // ─── INCOMING CHAT MESSAGES ─────────────────────────────────────────────
      cleanups.push(
        podcastSocket.onChatMessage((message) => {
          setLiveChatMessages((prev) => {
            if (prev.some((item) => item.id === message.id)) return prev;
            return [...prev.slice(-99), message];
          });
        }) || (() => {})
      );

      // ─── ERROR HANDLING ─────────────────────────────────────────────────────
      cleanups.push(
        podcastSocket.onChatError(({ message }) => {
          Alert.alert('Chat Error', message || 'Could not send chat message');
        }) || (() => {})
      );

      // ─── VIEWER METRICS ─────────────────────────────────────────────────────
      cleanups.push(
        podcastSocket.onViewerCount(({ viewerCount }) => {
          updatePodcastState({ liveViewers: Number(viewerCount || 0) });
        }) || (() => {})
      );

      // ─── STREAM LIFECYCLE ────────────────────────────────────────────────────
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

      // ─── RTC GUEST SLOTS & CHANNELS ─────────────────────────────────────────
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

          if (payload.speaking) {
            if (!slot.isSpeaking) {
              updateGuestSlot(payload.slotId, {
                isSpeaking: true,
                speakingStartedAt: now,
              });
            }
          } else {
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

      // ─── WEBRTC SIGNALING PASSES ────────────────────────────────────────────
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