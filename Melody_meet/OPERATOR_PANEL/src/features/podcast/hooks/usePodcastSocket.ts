import { useEffect, useState } from 'react';
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

      cleanups.push(
        podcastSocket.onRoomSnapshot((snapshot: {
          viewerCount?: number;
          chatHistory?: PodcastChatMessage[];
        }) => {
          updatePodcastState({ liveViewers: snapshot.viewerCount || 0 });
          setLiveChatMessages(snapshot.chatHistory || []);
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

  const sendHostChatMessage = () => {
    const text = liveChatInput.trim();
    if (!text || !isLive) return;

    const roomId = extractRoomId(roomLink);
    if (!roomId || !podcastSocket.isConnected()) {
      Alert.alert('Chat Offline', 'Live chat is not connected yet.');
      return;
    }

    podcastSocket.hostChatMessage(roomId, userName, text);
    setLiveChatInput('');
  };

  return {
    liveChatMessages,
    liveChatInput,
    setLiveChatInput,
    sendHostChatMessage,
  };
}
