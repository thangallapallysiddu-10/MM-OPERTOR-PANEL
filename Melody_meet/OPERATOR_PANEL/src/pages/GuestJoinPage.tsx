// GuestJoinPage.tsx
// Public page — no JWT required.
// URL shape: /podcast/guest/:slotId/:roomId
//
// Phase 3 — Real audio:
//   1. Guest opens link → enters name → Join
//   2. POST /api/podcasts/guest-slots/join → auto-approved
//   3. Socket guest_joined → operator UI updates
//   4. getUserMedia() captures guest mic
//   5. RTCPeerConnection: guest sends SDP offer via webrtc_offer socket event
//   6. Host receives offer → sends answer → ICE exchange → audio flows
//   7. Guest hears host through remote audio track
//   8. My Mic ON/OFF → mutes/unmutes the local MediaStreamTrack (real audio)
//   9. Host Volume slider → controls the gain on the remote (host) audio element
//  10. Leave → peer closed + slot released

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { io as socketIo } from 'socket.io-client';
import { PodcastApi } from '../services/api/operatorApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');
const SOCKET_BASE = API_BASE.replace(/\/api$/, '');

const SLOT_LABELS: Record<string, string> = {
  mic2: 'MIC 2 — Guest Slot 1',
  mic3: 'MIC 3 — Guest Slot 2',
  mic4: 'MIC 4 — Guest Slot 3',
  mic5: 'MIC 5 — Backup Guest Slot',
};

const VALID_SLOTS = ['mic2', 'mic3', 'mic4', 'mic5'];

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
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

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'enter_name' | 'joining' | 'connected' | 'slot_taken' | 'session_ended' | 'left';

interface GuestJoinPageProps {
  slotId: string;
  roomId: string;
  onLeave?: () => void;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const C = {
  bg:            '#0F172A',
  card:          '#1E293B',
  border:        '#334155',
  text:          '#F1F5F9',
  textMuted:     '#64748B',
  textSecondary: '#94A3B8',
  accent:        '#4F6AF0',
  success:       '#22C55E',
  error:         '#EF4444',
  warning:       '#F59E0B',
};

// ── Component ─────────────────────────────────────────────────────────────────

const GuestJoinPage: React.FC<GuestJoinPageProps> = ({ slotId, roomId, onLeave }) => {
  const [pageState, setPageState]   = useState<PageState>('enter_name');
  const [guestName, setGuestName]   = useState('');
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');

  // Audio controls
  const [micOn, setMicOn]           = useState(true);   // true = unmuted
  const [hostVolume, setHostVolume] = useState(80);     // 0–100
  const [wasKicked, setWasKicked]   = useState(false);
  const [audioError, setAudioError] = useState('');

  // Refs
  const socketRef        = useRef<any>(null);
  const guestIdRef       = useRef<number | null>(null);
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const hostAudioRef     = useRef<HTMLAudioElement | null>(null);
  const hostGainRef      = useRef<GainNode | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  // ICE candidate queue — holds candidates that arrive before setRemoteDescription
  // completes. Drained immediately after remote description is set.
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const slotLabel   = SLOT_LABELS[slotId] ?? `Slot ${slotId}`;
  const isValidSlot = VALID_SLOTS.includes(slotId);
  const isWeb = Platform.OS === 'web' && typeof RTCPeerConnection !== 'undefined';

  // ── Audio context ─────────────────────────────────────────────────────────
  const getAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // ── Get mic stream ────────────────────────────────────────────────────────
  const getMicStream = async (): Promise<MediaStream | null> => {
    if (!isWeb) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      setAudioError('Microphone access denied. Audio will not work.');
      return null;
    }
  };

  // ── Build peer connection (guest side) ────────────────────────────────────
  const buildPeerConnection = useCallback((stream: MediaStream | null) => {
    if (!isWeb) return null;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local mic tracks so the host can hear this guest
    if (stream) {
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
    }

    // When host audio arrives, route through gain node to an audio element
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      const audioCtx = getAudioCtx();
      // Resume context in case it was suspended (belt-and-suspenders after handleJoin resume)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(remoteStream);
      const gain = audioCtx.createGain();
      gain.gain.value = hostVolume / 100;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      hostGainRef.current = gain;

      // Attach to a DOM-mounted audio element.
      // Browsers only permit autoplay on elements that are in the document —
      // a detached element created with document.createElement is blocked silently.
      if (!hostAudioRef.current) {
        const el = document.createElement('audio');
        el.autoplay = true;
        el.style.display = 'none';
        document.body.appendChild(el);
        hostAudioRef.current = el;
      }
      hostAudioRef.current.srcObject = remoteStream;
      hostAudioRef.current.play().catch(() => {
        // Autoplay still blocked — AudioContext Web Audio path is the primary route;
        // the audio element is a fallback and its failure is non-fatal.
      });
    };

    // Send ICE candidates to the host via server relay
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc_ice_candidate', {
          roomId,
          slotId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setAudioError('Audio connection lost. Your slot is still reserved.');
      }
    };

    return pc;
  }, [roomId, slotId, hostVolume, isWeb]);

  // ── Create and send SDP offer ─────────────────────────────────────────────
  const sendOffer = useCallback(async (pc: RTCPeerConnection) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('webrtc_offer', { roomId, slotId, sdp: pc.localDescription });
  }, [roomId, slotId]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  const connectSocket = useCallback((token: string, name: string, guestId: number, pc: RTCPeerConnection | null) => {
    const socket = socketIo(`${SOCKET_BASE}/podcast`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    guestIdRef.current = guestId;

    socket.on('connect', () => {
      socket.emit('guest_joined', { roomId, slotId, guestName: name, guestId, guestToken: token });
      // Once registered in the slot room, initiate WebRTC offer
      if (pc) sendOffer(pc);
    });

    // Host sent SDP answer
    socket.on('webrtc_answer', async (payload: { slotId: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.slotId !== slotId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        // Drain any ICE candidates that arrived before remote description was set
        const queued = iceCandidateQueueRef.current.splice(0);
        for (const candidate of queued) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            // Stale queued candidate — safe to ignore
          }
        }
      } catch {
        setAudioError('Audio negotiation failed. Reconnect to retry.');
      }
    });

    // ICE candidate from host
    socket.on('webrtc_ice_candidate', async (payload: { slotId: string; candidate: RTCIceCandidateInit }) => {
      if (payload.slotId !== slotId || !pcRef.current) return;
      // If remote description is not yet set, queue the candidate instead of dropping it
      if (!pcRef.current.remoteDescription) {
        iceCandidateQueueRef.current.push(payload.candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        // Stale candidate — safe to ignore
      }
    });

    // Operator muted this guest
    socket.on('guest_muted', (payload: { slotId: string; micMuted: boolean }) => {
      if (payload.slotId !== slotId) return;
      setMicOn(!payload.micMuted);
      // Silence/restore the local track so the guest's audio doesn't transmit
      localStreamRef.current?.getAudioTracks().forEach(t => {
        t.enabled = !payload.micMuted;
      });
    });

    socket.on('guest_removed', (payload: { slotId: string }) => {
      if (payload.slotId === slotId) {
        cleanupAudio();
        socket.disconnect();
        socketRef.current = null;
        setWasKicked(true);
        setPageState('session_ended');
      }
    });

    socket.on('live_ended', () => {
      cleanupAudio();
      socket.disconnect();
      socketRef.current = null;
      setPageState('session_ended');
    });
  }, [roomId, slotId, sendOffer]);

  // ── Audio cleanup ─────────────────────────────────────────────────────────
  const cleanupAudio = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    iceCandidateQueueRef.current = [];
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (hostAudioRef.current) {
      hostAudioRef.current.pause();
      hostAudioRef.current.srcObject = null;
      // Remove from DOM if it was appended there for autoplay
      if (hostAudioRef.current.parentNode) {
        hostAudioRef.current.parentNode.removeChild(hostAudioRef.current);
      }
      hostAudioRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    hostGainRef.current = null;
  }, []);

  // ── Join ──────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const name = guestName.trim();
    if (!name)        { setErrorMsg('Please enter your name'); return; }
    if (!isValidSlot) { setErrorMsg('Invalid slot ID in this link'); return; }

    setErrorMsg('');
    setPageState('joining');

    try {
      // Claim the slot in the DB
      const result = await PodcastApi.joinGuestSlot({ roomId, slotId, guestName: name });
      setGuestToken(result.guestToken);

      // Request mic access and build peer connection (web only)
      let pc: RTCPeerConnection | null = null;
      if (isWeb) {
        // Resume AudioContext HERE — inside the user gesture handler.
        // Browsers require a user gesture before AudioContext can produce sound.
        // If we create/resume it later (e.g. in ontrack), it will be in
        // 'suspended' state and audio will be silently blocked.
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const stream = await getMicStream();
        pc = buildPeerConnection(stream);
      }

      connectSocket(result.guestToken, name, result.id, pc);
      setPageState('connected');
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already in use') || msg.includes('slot')) {
        setPageState('slot_taken');
      } else if (msg.includes('no active')) {
        setPageState('session_ended');
      } else {
        setErrorMsg(err?.message || 'Could not join this slot');
        setPageState('enter_name');
      }
    }
  };

  // ── Mic toggle ────────────────────────────────────────────────────────────
  const handleMicToggle = () => {
    const next = !micOn;
    setMicOn(next);
    // Mute/unmute the real audio track
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = next; });
    // Tell operator UI
    socketRef.current?.emit('guest_mic_toggle', { roomId, slotId, muted: !next });
  };

  // ── Host volume ───────────────────────────────────────────────────────────
  const handleHostVolumeChange = (val: number) => {
    setHostVolume(val);
    if (hostGainRef.current) {
      hostGainRef.current.gain.value = val / 100;
    }
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    cleanupAudio();
    try {
      if (guestToken) {
        socketRef.current?.emit('guest_left', { roomId, slotId, guestToken });
        await PodcastApi.leaveGuestSlot({ roomId, slotId, guestToken });
      }
    } catch (_) { /* best-effort */ }
    finally {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setPageState('left');
      onLeave?.();
    }
  };

  // Cleanup on unmount.
  // guestTokenRef mirrors guestToken state so the cleanup function always
  // reads the current value even though the effect has no deps.
  const guestTokenRef = useRef<string | null>(null);
  useEffect(() => { guestTokenRef.current = guestToken; }, [guestToken]);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (socketRef.current) {
        // Use ref so we get the live token value, not the stale closure value.
        socketRef.current.emit('guest_left', { roomId, slotId, guestToken: guestTokenRef.current });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ── Terminal states ───────────────────────────────────────────────────────

  if (!isValidSlot) {
    return (
      <View style={s.screen}>
        <Text style={s.emoji}>🔗</Text>
        <Text style={s.title}>Invalid Link</Text>
        <Text style={s.subtitle}>This guest link doesn't look right.{'\n'}Ask the host to resend it.</Text>
      </View>
    );
  }

  if (pageState === 'slot_taken') {
    return (
      <View style={s.screen}>
        <Text style={s.emoji}>🎤</Text>
        <Text style={s.title}>Slot Occupied</Text>
        <Text style={s.subtitle}>{slotLabel} is already taken.{'\n'}Ask the host for a different link.</Text>
      </View>
    );
  }

  if (pageState === 'session_ended') {
    return (
      <View style={s.screen}>
        <Text style={s.emoji}>{wasKicked ? '🚫' : '📻'}</Text>
        <Text style={s.title}>{wasKicked ? 'Removed by Host' : 'Session Ended'}</Text>
        <Text style={s.subtitle}>
          {wasKicked
            ? 'The host has removed you from the session.'
            : 'The host has ended this session. Thanks for joining!'}
        </Text>
      </View>
    );
  }

  if (pageState === 'left') {
    return (
      <View style={s.screen}>
        <Text style={s.emoji}>👋</Text>
        <Text style={s.title}>You Left</Text>
        <Text style={s.subtitle}>Thanks for being on the podcast!</Text>
      </View>
    );
  }

  if (pageState === 'joining') {
    return (
      <View style={s.screen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.subtitle, { marginTop: 16 }]}>Joining {slotLabel}…</Text>
      </View>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────

  if (pageState === 'connected') {
    return (
      <View style={s.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <Text style={s.headerTitle}>Podcast Guest Slot</Text>
        <Text style={s.guestNameLarge}>{guestName}</Text>

        <View style={s.statusRow}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>Connected</Text>
        </View>

        {audioError ? (
          <View style={s.audioErrorBanner}>
            <Text style={s.audioErrorText}>⚠️ {audioError}</Text>
          </View>
        ) : null}

        <View style={s.card}>

          {/* My Mic */}
          <View style={s.controlRow}>
            <View style={s.controlLeft}>
              <Text style={s.controlIcon}>🎤</Text>
              <View>
                <Text style={s.controlLabel}>My Mic</Text>
                <Text style={s.controlSub}>{micOn ? 'On — host can hear you' : 'Off — muted'}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleMicToggle}
              style={[s.toggleBtn, micOn ? s.toggleBtnOn : s.toggleBtnOff]}
              accessibilityLabel={micOn ? 'Turn mic off' : 'Turn mic on'}
              accessibilityRole="switch"
            >
              <Text style={[s.toggleBtnText, micOn ? s.toggleBtnTextOn : s.toggleBtnTextOff]}>
                {micOn ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* Host Volume */}
          <View style={s.volumeBlock}>
            <View style={s.volumeHeader}>
              <Text style={s.controlIcon}>🔊</Text>
              <Text style={s.controlLabel}>Host Volume</Text>
              <Text style={s.volumeValue}>{hostVolume}</Text>
            </View>
            <Slider
              style={s.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={hostVolume}
              onValueChange={handleHostVolumeChange}
              minimumTrackTintColor={C.accent}
              maximumTrackTintColor={C.border}
              thumbTintColor={C.accent}
              accessibilityLabel="Host volume"
            />
            <View style={s.sliderLabels}>
              <Text style={s.sliderLabelText}>0</Text>
              <Text style={s.sliderLabelText}>100</Text>
            </View>
          </View>

        </View>

        <TouchableOpacity style={s.leaveBtn} onPress={handleLeave} accessibilityLabel="Leave session">
          <Text style={s.leaveIcon}>🚪</Text>
          <Text style={s.leaveBtnText}>Leave Session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Enter name ────────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <Text style={s.emoji}>🎙️</Text>
      <Text style={s.title}>Podcast Guest Slot</Text>

      <View style={s.slotBadge}>
        <Text style={s.slotBadgeText}>{slotLabel}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.label}>Your Name</Text>
        <TextInput
          style={[s.input, errorMsg ? s.inputError : null]}
          placeholder="Enter your name"
          placeholderTextColor={C.textMuted}
          value={guestName}
          onChangeText={(t) => { setGuestName(t); setErrorMsg(''); }}
          onSubmitEditing={handleJoin}
          returnKeyType="done"
          autoFocus
          maxLength={80}
        />
        {errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[s.joinBtn, !guestName.trim() && s.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={!guestName.trim()}
          accessibilityLabel="Join podcast slot"
        >
          <Text style={s.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.footerNote}>One guest per slot. No approval needed.</Text>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 52, marginBottom: 12, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  slotBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: `${C.accent}20`, borderWidth: 1, borderColor: `${C.accent}40`,
    marginBottom: 24, marginTop: 4,
  },
  slotBadgeText: { fontSize: 12, fontWeight: '700', color: C.accent, letterSpacing: 0.5 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 20,
  },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, color: C.text, paddingHorizontal: 16, fontSize: 16, marginBottom: 4,
  },
  inputError: { borderColor: C.error },
  errorText: { fontSize: 12, color: C.error, marginBottom: 8 },
  joinBtn: { height: 52, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  joinBtnDisabled: { opacity: 0.35 },
  joinBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  footerNote: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  guestNameLarge: { fontSize: 28, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.success },
  statusText: { fontSize: 14, fontWeight: '600', color: C.success },
  audioErrorBanner: {
    backgroundColor: `${C.warning}20`, borderWidth: 1, borderColor: `${C.warning}40`,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12, maxWidth: 380, width: '100%',
  },
  audioErrorText: { fontSize: 12, color: C.warning, textAlign: 'center' },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  controlLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  controlIcon: { fontSize: 22 },
  controlLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  controlSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  toggleBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, minWidth: 62, alignItems: 'center' },
  toggleBtnOn: { backgroundColor: `${C.success}18`, borderColor: C.success },
  toggleBtnOff: { backgroundColor: `${C.error}14`, borderColor: C.error },
  toggleBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  toggleBtnTextOn: { color: C.success },
  toggleBtnTextOff: { color: C.error },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  volumeBlock: { gap: 6 },
  volumeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  volumeValue: { fontSize: 15, fontWeight: '700', color: C.text, marginLeft: 'auto' },
  slider: { width: '100%', height: 36, marginTop: 4 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderLabelText: { fontSize: 11, color: C.textMuted },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  leaveIcon: { fontSize: 18 },
  leaveBtnText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
});

export default GuestJoinPage;
