/**
 * usePeerConnections.ts
 * Operator-side WebRTC audio hook for the Podcast Studio.
 *
 * Manages one RTCPeerConnection per guest slot (MIC 2–5).
 * - Host hears each connected guest through the peer audio track.
 * - Host mic stream is sent to every connected guest.
 * - Operator mute  → applies via muteGuestSlot API + locally silences the
 *   inbound audio track so the operator doesn't hear the guest either.
 * - Operator volume → applied via a GainNode per slot on the host's output.
 * - Remove guest   → closes the peer connection for that slot.
 * - Live end       → closes all peer connections and releases mic.
 *
 * WebRTC signaling travels through the existing /podcast Socket.IO namespace:
 *   Guest sends offer  → podcast.socket.js forwards to podcast:roomId:hosts
 *   Host sends answer  → podcast.socket.js forwards to guest_slot:roomId:slotId
 *   ICE candidates     → relayed in both directions by the server
 *
 * SCOPE: Host ↔ Guest only.
 * Guest ↔ Guest, Listener audio, and Sound Bed are NOT built here.
 *
 * Platform: Web only (RTCPeerConnection is a browser API).
 * On React Native mobile the hook is a no-op — mobile WebRTC would require
 * react-native-webrtc which is out of scope for this phase.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { podcastSocket } from '../../../services/socketService';
import { useAppStore } from '../../../store/useAppStore';
import { extractRoomId } from '../utils/podcastMappers';

// ── Types ─────────────────────────────────────────────────────────────────────

type SlotId = 'mic2' | 'mic3' | 'mic4' | 'mic5';

const GUEST_SLOTS: SlotId[] = ['mic2', 'mic3', 'mic4', 'mic5'];

interface SlotPeerState {
  pc: RTCPeerConnection;
  gainNode: GainNode;           // per-slot output gain for operator volume control
  audioEl: HTMLAudioElement;    // plays guest audio locally to the operator
}

interface UsePeerConnectionsOptions {
  isLive: boolean;
  roomLink: string;
  hostStream: MediaStream | null;  // operator's microphone stream (from useLiveStream)
}

// ICE server config — uses Google STUN for P2P when both sides are on public
// IPs. Add TURN credentials via env var for NAT traversal in production.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN: add production credentials via EXPO_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL
  ...(
    (globalThis as any)?.process?.env?.EXPO_PUBLIC_TURN_URL
      ? [{
          urls: (globalThis as any).process.env.EXPO_PUBLIC_TURN_URL as string,
          username: (globalThis as any).process.env.EXPO_PUBLIC_TURN_USERNAME as string,
          credential: (globalThis as any).process.env.EXPO_PUBLIC_TURN_CREDENTIAL as string,
        }]
      : []
  ),
];

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePeerConnections({
  isLive,
  roomLink,
  hostStream,
}: UsePeerConnectionsOptions) {

  // Only active on web — RTCPeerConnection is browser-only
  const isSupported = Platform.OS === 'web' && typeof RTCPeerConnection !== 'undefined';

  const peersRef  = useRef<Map<SlotId, SlotPeerState>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Per-slot ICE candidate queue — holds candidates that arrive before the
  // peer's remote description is set (offer processing is async).
  const iceCandidateQueuesRef = useRef<Map<SlotId, RTCIceCandidateInit[]>>(new Map());

  const { podcast, updateGuestSlot, updatePodcastState } = useAppStore();
  const roomId = extractRoomId(roomLink) ?? '';

  // ── Audio context (shared across all slots) ────────────────────────────────
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // ── Create peer connection for one slot ─────────────────────────────────────
  const createPeer = useCallback((slotId: SlotId): SlotPeerState => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const audioCtx = getAudioContext();

    // Gain node for per-slot volume control (maps 0–200 store value → 0–2.0)
    const gainNode = audioCtx.createGain();
    const slotData = podcast.guestSlots.find(s => s.slotId === slotId);
    gainNode.gain.value = ((slotData?.volume ?? 100) / 100);
    gainNode.connect(audioCtx.destination);

    // Audio element receives the remote guest stream
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;

    // When guest audio track arrives, route through gain node
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      const source = audioCtx.createMediaStreamSource(remoteStream);
      source.connect(gainNode);

      // Also wire to the audio element for fallback / monitoring
      audioEl.srcObject = remoteStream;
    };

    // ICE candidate ready — send to guest via server relay
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        podcastSocket.webRtcIceCandidate({
          roomId,
          slotId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      // Phase 2 — mic health: map RTCPeerConnection state to health tier
      const state = pc.connectionState;
      const health =
        state === 'connected'     ? 'connected'     :
        state === 'connecting' || state === 'new' ? 'reconnecting' :
        'disconnected';
      updateGuestSlot(slotId, { micHealth: health });

      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Guest disconnected ungracefully — will be cleaned up by socket disconnect path
        updateGuestSlot(slotId, { status: 'empty', guestName: null, guestId: null, guestSelfMuted: false, micHealth: 'disconnected' });
      }
    };

    // Add host mic track to this peer so the guest can hear the host
    if (hostStream) {
      hostStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, hostStream);
      });
    }

    return { pc, gainNode, audioEl };
  }, [roomId, hostStream, podcast.guestSlots]);

  // ── Handle incoming SDP offer from a guest ──────────────────────────────────
  const handleOffer = useCallback(async (payload: { roomId: string; slotId: string; sdp: RTCSessionDescriptionInit }) => {
    if (!isSupported || !roomId) return;
    const slotId = payload.slotId as SlotId;
    if (!GUEST_SLOTS.includes(slotId)) return;

    // Close stale peer if one exists (guest refreshed)
    const existing = peersRef.current.get(slotId);
    if (existing) {
      existing.pc.close();
      peersRef.current.delete(slotId);
    }
    // Clear any stale queued candidates for this slot
    iceCandidateQueuesRef.current.delete(slotId);

    const state = createPeer(slotId);
    peersRef.current.set(slotId, state);

    await state.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await state.pc.createAnswer();
    await state.pc.setLocalDescription(answer);

    podcastSocket.webRtcAnswer({
      roomId,
      slotId,
      sdp: state.pc.localDescription!,
    });

    // Drain any ICE candidates that arrived before remote description was set
    const queued = iceCandidateQueuesRef.current.get(slotId) ?? [];
    iceCandidateQueuesRef.current.delete(slotId);
    for (const candidate of queued) {
      try {
        await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Stale queued candidate — safe to ignore
      }
    }
  }, [isSupported, roomId, createPeer]);

  // ── Handle incoming ICE candidate from a guest ──────────────────────────────
  const handleIceCandidate = useCallback(async (payload: { roomId: string; slotId: string; candidate: RTCIceCandidateInit }) => {
    if (!isSupported) return;
    const slotId = payload.slotId as SlotId;
    const state = peersRef.current.get(slotId);
    if (!state) return;

    // If remote description is not set yet, queue the candidate
    if (!state.pc.remoteDescription) {
      const queue = iceCandidateQueuesRef.current.get(slotId) ?? [];
      queue.push(payload.candidate);
      iceCandidateQueuesRef.current.set(slotId, queue);
      return;
    }

    try {
      await state.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      // Stale candidate — safe to ignore
    }
  }, [isSupported]);

  // ── React to signaling messages forwarded via the store ─────────────────────
  // usePodcastSocket writes incoming offers/answers/ice into pendingWebRtcSignal.
  // This effect picks them up and routes to the correct handler.
  useEffect(() => {
    if (!isSupported || !isLive) return;
    const signal = podcast.pendingWebRtcSignal;
    if (!signal) return;

    // Clear immediately so the same signal isn't processed twice
    updatePodcastState({ pendingWebRtcSignal: null });

    if (signal.type === 'offer') handleOffer(signal as any);
    if (signal.type === 'ice')   handleIceCandidate(signal as any);
    // 'answer' type is only relevant on the guest side — host never receives answers
  }, [podcast.pendingWebRtcSignal]);

  // ── Apply operator volume change to the live gain node ─────────────────────
  // Called when the operator moves the volume slider — adjusts real audio output.
  const applyVolume = useCallback((slotId: SlotId, volume: number) => {
    const state = peersRef.current.get(slotId);
    if (state) {
      state.gainNode.gain.value = Math.max(0, Math.min(200, volume)) / 100;
    }
  }, []);

  // ── Apply operator mute to the live audio track ─────────────────────────────
  // Called when the operator hits the mute button. Silences the inbound gain
  // and also sends the API call (handled by GuestMicCard) to persist + notify guest.
  const applyMute = useCallback((slotId: SlotId, muted: boolean) => {
    const state = peersRef.current.get(slotId);
    if (state) {
      // Silence the output gain so operator doesn't hear the guest either
      state.gainNode.gain.value = muted ? 0 : ((podcast.guestSlots.find(s => s.slotId === slotId)?.volume ?? 100) / 100);
    }
  }, [podcast.guestSlots]);

  // ── Close a single peer connection (guest removed) ──────────────────────────
  const closePeer = useCallback((slotId: SlotId) => {
    const state = peersRef.current.get(slotId);
    if (state) {
      state.pc.close();
      state.audioEl.srcObject = null;
      peersRef.current.delete(slotId);
    }
    iceCandidateQueuesRef.current.delete(slotId);
  }, []);

  // ── Close all peers when session ends ────────────────────────────────────────
  const closeAll = useCallback(() => {
    peersRef.current.forEach((state) => {
      state.pc.close();
      state.audioEl.srcObject = null;
    });
    peersRef.current.clear();
    iceCandidateQueuesRef.current.clear();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  // Close all when session ends or component unmounts
  useEffect(() => {
    if (!isLive) closeAll();
    return () => { closeAll(); };
  }, [isLive]);

  // Re-add host track to existing peer connections when hostStream changes
  useEffect(() => {
    if (!hostStream || !isSupported) return;
    peersRef.current.forEach((state) => {
      const senders = state.pc.getSenders();
      hostStream.getAudioTracks().forEach(track => {
        const alreadySending = senders.some(s => s.track === track);
        if (!alreadySending) state.pc.addTrack(track, hostStream);
      });
    });
  }, [hostStream]);

  // ── Phase 3 — connection quality polling (WebRTC getStats) ──────────────────
  // Poll RTCPeerConnection stats every 5 s while live.
  // Reads RTT, packet loss, and jitter from inbound-rtp / candidate-pair reports.
  // Maps to 'excellent' | 'good' | 'poor' and writes back to the GuestSlot.
  useEffect(() => {
    if (!isSupported || !isLive) return;

    const pollStats = async () => {
      for (const [slotId, peerState] of peersRef.current) {
        const pc = peerState.pc;
        if (pc.connectionState !== 'connected') continue;

        try {
          const reports = await pc.getStats();
          let rtt: number | null = null;
          let packetLoss: number | null = null;
          let jitter: number | null = null;

          reports.forEach((report: RTCStats) => {
            const r = report as any;
            // candidate-pair: gives current RTT
            if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
              if (typeof r.currentRoundTripTime === 'number') {
                rtt = Math.round(r.currentRoundTripTime * 1000); // convert s → ms
              }
            }
            // inbound-rtp (audio): gives jitter and packet loss
            if (r.type === 'inbound-rtp' && r.kind === 'audio') {
              if (typeof r.jitter === 'number') {
                jitter = Math.round(r.jitter * 1000); // convert s → ms
              }
              if (typeof r.packetsLost === 'number' && typeof r.packetsReceived === 'number') {
                const total = r.packetsReceived + r.packetsLost;
                packetLoss = total > 0 ? Math.round((r.packetsLost / total) * 100) : 0;
              }
            }
          });

          // Map to quality tier:
          // excellent: RTT < 80ms, loss < 1%, jitter < 15ms
          // good:      RTT < 200ms, loss < 5%, jitter < 40ms
          // poor:      anything worse
          let quality: 'excellent' | 'good' | 'poor' = 'excellent';
          if (
            (rtt != null && rtt > 200) ||
            (packetLoss != null && packetLoss > 5) ||
            (jitter != null && jitter > 40)
          ) {
            quality = 'poor';
          } else if (
            (rtt != null && rtt > 80) ||
            (packetLoss != null && packetLoss > 1) ||
            (jitter != null && jitter > 15)
          ) {
            quality = 'good';
          }

          updateGuestSlot(slotId, { connectionQuality: quality, rtt, packetLoss, jitter });
        } catch {
          // Stats not available — non-fatal
        }
      }
    };

    const statsInterval = setInterval(pollStats, 5000);
    return () => clearInterval(statsInterval);
  }, [isLive, isSupported]);

  return { applyVolume, applyMute, closePeer, closeAll };
}
