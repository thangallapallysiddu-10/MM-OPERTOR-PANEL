/**
 * socketService.ts
 * Socket.IO client for the MelodyMeet Operator backend.
 *
 * Two namespaces:
 *   /stream  — stream health, viewer counts, go-live / end-stream events
 *   /chat    — chat messages, gifts, stickers, song requests, likes, pin
 *
 * IMPORTANT: Install socket.io-client if not already present:
 *   npx expo install socket.io-client
 */

import { Platform } from 'react-native';

// ─── Dynamic import helper (avoids bundler issues on web) ────────────────────
let io: any = null;
async function getIo() {
  if (!io) {
    try {
      const mod = await import('socket.io-client');
      io = mod.io ?? mod.default;
    } catch {
      console.warn('[SocketService] socket.io-client not installed. Run: npx expo install socket.io-client');
      io = null;
    }
  }
  return io;
}

const SERVER_URL =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL?.replace('/api', '') ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamHealthPayload {
  status: 'stable' | 'unstable' | 'offline';
  bitrate: number;
  uptime: number;
  listeners: number;
  bufferHealth: number;
  droppedFrames: number;
  networkLatency: number;
}

export interface ChatMessage {
  id: string | number;
  username: string;
  text: string;
  timestamp: number;
  type: 'message';
}

export interface SongRequest {
  id: string | number;
  username: string;
  songTitle: string;
  votes: number;
  timestamp: number;
  type: 'request';
}

// ─── Stream Socket ────────────────────────────────────────────────────────────

class StreamSocketService {
  private socket: any = null;

  async connect() {
    const ioFn = await getIo();
    if (!ioFn) return;
    if (this.socket?.connected) return;

    this.socket = ioFn(`${SERVER_URL}/stream`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('stream_error', (err: any) =>
      console.warn('[Stream Socket] Error:', err?.message)
    );
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Join a stream room to receive viewer updates */
  joinStream(streamId: string | number) {
    this.socket?.emit('join_stream', { streamId: String(streamId) });
  }

  /** Tell backend the stream went live */
  goLive(streamId: string | number, streamName: string) {
    this.socket?.emit('go_live', { streamId: String(streamId), streamName });
  }

  /** Tell backend the stream ended */
  endStream(streamId: string | number) {
    this.socket?.emit('end_stream', { streamId: String(streamId) });
  }

  /** Ping backend for health stats */
  pingHealth(streamId: string | number) {
    this.socket?.emit('health_ping', { streamId: String(streamId) });
  }

  /** Listen for real-time viewer count */
  onViewerUpdate(cb: (viewers: number) => void) {
    this.socket?.on('viewer_update', ({ viewers }: { viewers: number }) => cb(viewers));
    return () => this.socket?.off('viewer_update');
  }

  /** Listen for health pong */
  onHealthPong(cb: (payload: StreamHealthPayload) => void) {
    this.socket?.on('health_pong', cb);
    return () => this.socket?.off('health_pong');
  }

  /** Listen for stream_started event */
  onStreamStarted(cb: (data: any) => void) {
    this.socket?.on('stream_started', cb);
    return () => this.socket?.off('stream_started');
  }

  /** Listen for stream_ended event */
  onStreamEnded(cb: (data: any) => void) {
    this.socket?.on('stream_ended', cb);
    return () => this.socket?.off('stream_ended');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// ─── Chat Socket ──────────────────────────────────────────────────────────────

class ChatSocketService {
  private socket: any = null;
  private token: string | null = null;

  async connect(token?: string) {
    const ioFn = await getIo();
    if (!ioFn) return;
    if (token) this.token = token;

    if (!this.token) {
      try {
        const { StorageService } = await import('./storageService');
        this.token = await StorageService.getSessionToken();
      } catch {
        /* ignore */
      }
    }

    if (this.socket?.connected) return;

    this.socket = ioFn(`${SERVER_URL}/chat`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: this.token ? { token: this.token } : undefined,
      extraHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });

    this.socket.on('chat_error', (err: any) =>
      console.warn('[Chat Socket] Error:', err?.message)
    );
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinStudio(studioId: string | number, username: string) {
    this.socket?.emit('join_studio', { studioId: String(studioId), username });
  }

  sendMessage(studioId: string | number, text: string, username: string) {
    this.socket?.emit('send_message', { studioId: String(studioId), text, username });
  }

  sendGift(studioId: string | number, gift: string, username: string) {
    this.socket?.emit('send_gift', { studioId: String(studioId), gift, username });
  }

  sendSticker(studioId: string | number, sticker: string, username: string) {
    this.socket?.emit('send_sticker', { studioId: String(studioId), sticker, username });
  }

  likeStream(studioId: string | number, username: string) {
    this.socket?.emit('like_stream', { studioId: String(studioId), username });
  }

  requestSong(studioId: string | number, songTitle: string, username: string) {
    this.socket?.emit('request_song', { studioId: String(studioId), songTitle, username });
  }

  voteSong(studioId: string | number, requestId: string | number, username: string) {
    this.socket?.emit('vote_song', { studioId: String(studioId), requestId, username });
  }

  pinMessage(studioId: string | number, messageId: string | number, text: string) {
    this.socket?.emit('pin_message', { studioId: String(studioId), messageId, text });
  }

  // ── Listeners ──────────────────────────────────────────────────────────────

  onReceiveMessage(cb: (msg: ChatMessage) => void) {
    this.socket?.on('receive_message', cb);
    return () => this.socket?.off('receive_message');
  }

  onUserJoined(cb: (data: { username: string; message: string }) => void) {
    this.socket?.on('user_joined', cb);
    return () => this.socket?.off('user_joined');
  }

  onUserLeft(cb: (data: { username: string }) => void) {
    this.socket?.on('user_left', cb);
    return () => this.socket?.off('user_left');
  }

  onSongRequested(cb: (req: SongRequest) => void) {
    this.socket?.on('song_requested', cb);
    return () => this.socket?.off('song_requested');
  }

  onSongVoted(cb: (data: { requestId: any; votes: number }) => void) {
    this.socket?.on('song_voted', cb);
    return () => this.socket?.off('song_voted');
  }

  onMessagePinned(cb: (data: { messageId: any; text: string }) => void) {
    this.socket?.on('message_pinned', cb);
    return () => this.socket?.off('message_pinned');
  }

  onReceiveGift(cb: (data: any) => void) {
    this.socket?.on('receive_gift', cb);
    return () => this.socket?.off('receive_gift');
  }

  onReceiveSticker(cb: (data: any) => void) {
    this.socket?.on('receive_sticker', cb);
    return () => this.socket?.off('receive_sticker');
  }

  onReceiveLike(cb: (data: any) => void) {
    this.socket?.on('receive_like', cb);
    return () => this.socket?.off('receive_like');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

// ─── RJ Studio Socket (/rj) ───────────────────────────────────────────────────

class RjSocketService {
  private socket: any = null;
  private token: string | null = null;

  async connect(token?: string) {
    const ioFn = await getIo();
    if (!ioFn) return;
    if (token) this.token = token;

    if (!this.token) {
      try {
        const { StorageService } = await import('./storageService');
        this.token = await StorageService.getSessionToken();
      } catch {
        /* ignore */
      }
    }

    if (this.socket?.connected) return;

    this.socket = ioFn(`${SERVER_URL}/rj`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: this.token ? { token: this.token } : undefined,
      extraHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });

    this.socket.on('rj_error', (err: { message?: string }) =>
      console.warn('[RJ Socket] Error:', err?.message)
    );
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinStudio(studioId: string | number, username = 'RJ') {
    this.socket?.emit('join_studio', { studioId: String(studioId), username });
  }

  onStudioState(cb: (bundle: unknown) => void) {
    this.socket?.on('rj_studio_state', cb);
    return () => this.socket?.off('rj_studio_state');
  }

  onDualPlayerUpdated(cb: (data: unknown) => void) {
    this.socket?.on('rj_dual_player_updated', cb);
    return () => this.socket?.off('rj_dual_player_updated');
  }

  onMixerUpdated(cb: (data: unknown) => void) {
    this.socket?.on('rj_mixer_updated', cb);
    return () => this.socket?.off('rj_mixer_updated');
  }

  onPlaylistUpdated(cb: (data: { playlist: unknown[] }) => void) {
    this.socket?.on('rj_playlist_updated', cb);
    return () => this.socket?.off('rj_playlist_updated');
  }

  onReceiveMessage(cb: (msg: ChatMessage) => void) {
    this.socket?.on('rj_receive_message', (msg: ChatMessage) => cb(msg));
    return () => this.socket?.off('rj_receive_message');
  }

  onStatsUpdated(cb: (data: unknown) => void) {
    this.socket?.on('rj_stats_updated', cb);
    return () => this.socket?.off('rj_stats_updated');
  }

  onMessagePinned(cb: (data: { messageId: string; text: string }) => void) {
    this.socket?.on('rj_message_pinned', cb);
    return () => this.socket?.off('rj_message_pinned');
  }

  dualPlayerAction(studioId: string | number, body: Record<string, unknown>) {
    this.socket?.emit('dual_player_action', { studioId: String(studioId), ...body });
  }

  mixerUpdate(studioId: string | number, body: Record<string, unknown>) {
    this.socket?.emit('mixer_update', { studioId: String(studioId), ...body });
  }

  onMicsUpdated(cb: (data: { mics: unknown[] }) => void) {
    this.socket?.on('rj_mics_updated', cb);
    return () => this.socket?.off('rj_mics_updated');
  }

  onAnnouncement(cb: (data: unknown) => void) {
    this.socket?.on('rj_announcement', cb);
    return () => this.socket?.off('rj_announcement');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// ─── Podcast live socket (/podcast) ───────────────────────────────────────────

export interface PodcastChatMessage {
  id: string;
  roomId?: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

class PodcastSocketService {
  private socket: any = null;
  private token: string | null = null;

  async connect(token?: string) {
    const ioFn = await getIo();
    if (!ioFn) return;
    if (token) this.token = token;

    if (!this.token) {
      try {
        const { StorageService } = await import('./storageService');
        this.token = await StorageService.getSessionToken();
      } catch {
        /* ignore */
      }
    }

    if (this.socket?.connected) return;

    this.socket = ioFn(`${SERVER_URL}/podcast`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: this.token ? { token: this.token } : undefined,
      extraHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });

    this.socket.on('podcast_error', (err: { message?: string }) =>
      console.warn('[Podcast Socket] Error:', err?.message)
    );
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  hostJoin(roomId: string) {
    this.socket?.emit('host_join', { roomId });
  }

  hostChatMessage(roomId: string, name: string, text: string) {
    this.socket?.emit('host_chat_message', { roomId, name, text });
  }

  audienceJoin(roomId: string, name: string, device: string) {
    this.socket?.emit('audience_join', { roomId, name, device });
  }

  guestChatMessage(roomId: string, name: string, text: string) {
    this.socket?.emit('guest_chat_message', { roomId, name, text });
  }

  listenerChatMessage(roomId: string, name: string, text: string) {
    this.socket?.emit('listener_chat_message', { roomId, name, text });
  }

  guestMicState(roomId: string, guestId: string, isMuted: boolean) {
    this.socket?.emit('guest_mic_state', { roomId, guestId, isMuted });
  }

  guestLeave() {
    this.socket?.emit('guest_leave');
  }

  onConnect(cb: () => void) {
    this.socket?.on('connect', cb);
    return () => this.socket?.off('connect');
  }

  onConnectError(cb: (err: { message?: string }) => void) {
    this.socket?.on('connect_error', cb);
    return () => this.socket?.off('connect_error');
  }

  onListenerStatus(cb: (data: unknown) => void) {
    this.socket?.on('listener_status', cb);
    this.socket?.on('openconnect_status', cb);
    return () => {
      this.socket?.off('listener_status');
      this.socket?.off('openconnect_status');
    };
  }

  onGuestStatus(cb: (data: { status?: string; id?: string }) => void) {
    this.socket?.on('guest_status', cb);
    this.socket?.on('openconnect_mic_status', cb);
    return () => {
      this.socket?.off('guest_status');
      this.socket?.off('openconnect_mic_status');
    };
  }

  onRoomSnapshot(cb: (snapshot: unknown) => void) {
    this.socket?.on('room_snapshot', cb);
    return () => this.socket?.off('room_snapshot');
  }

  onChatHistory(cb: (data: { messages?: PodcastChatMessage[] }) => void) {
    this.socket?.on('chat_history', cb);
    return () => this.socket?.off('chat_history');
  }

  onChatMessage(cb: (message: PodcastChatMessage) => void) {
    this.socket?.on('chat_message', cb);
    return () => this.socket?.off('chat_message');
  }

  onChatError(cb: (data: { message?: string }) => void) {
    this.socket?.on('chat_error', cb);
    return () => this.socket?.off('chat_error');
  }

  onViewerCount(cb: (data: { viewerCount?: number }) => void) {
    this.socket?.on('viewer_count', cb);
    return () => this.socket?.off('viewer_count');
  }

  onLiveEnded(cb: (data?: unknown) => void) {
    this.socket?.on('live_ended', cb);
    return () => this.socket?.off('live_ended');
  }

  // ── Guest Slot events (Podcast Audio Deck) ────────────────────────────────

  /** Tell the backend this guest has joined a slot */
  guestJoined(payload: {
    roomId: string;
    slotId: string;
    guestName: string;
    guestId?: number;
    guestToken?: string;
  }) {
    this.socket?.emit('guest_joined', payload);
  }

  /** Tell the backend this guest is leaving their slot */
  guestLeft(payload: { roomId: string; slotId: string; guestToken?: string }) {
    this.socket?.emit('guest_left', payload);
  }

  /** Operator UI receives this when any slot changes (join / leave / kick) */
  onSlotUpdated(cb: (payload: {
    roomId: string;
    slotId: string;
    status: 'empty' | 'connected';
    guestName: string | null;
    guestId?: number | null;
  }) => void) {
    this.socket?.on('slot_updated', cb);
    return () => this.socket?.off('slot_updated');
  }

  /** Operator UI receives this when a guest joins their slot */
  onGuestJoined(cb: (payload: {
    roomId: string;
    slotId: string;
    guestName: string;
    guestId?: number;
    status: string;
  }) => void) {
    this.socket?.on('guest_joined', cb);
    return () => this.socket?.off('guest_joined');
  }

  /** Operator UI receives this when a guest leaves their slot */
  onGuestLeft(cb: (payload: {
    roomId: string;
    slotId: string;
    status: 'empty';
  }) => void) {
    this.socket?.on('guest_left', cb);
    return () => this.socket?.off('guest_left');
  }

  /** Guest page receives this when they are kicked by operator */
  onGuestRemoved(cb: (payload: { roomId: string; slotId: string; reason: string }) => void) {
    this.socket?.on('guest_removed', cb);
    return () => this.socket?.off('guest_removed');
  }

  /** Guest page: emits its current speaking state */
  guestSpeaking(roomId: string, slotId: string, speaking: boolean) {
    this.socket?.emit('guest_speaking', { roomId, slotId, speaking });
  }

  /** Guest page: emits its self-mute state */
  guestMicToggle(roomId: string, slotId: string, muted: boolean) {
    this.socket?.emit('guest_mic_toggle', { roomId, slotId, muted });
  }

  /** Operator receives guest self-mute state change */
  onGuestMicToggle(cb: (payload: { roomId: string; slotId: string; muted: boolean }) => void) {
    this.socket?.on('guest_mic_toggle', cb);
    return () => this.socket?.off('guest_mic_toggle');
  }

  /** Operator receives real-time speaking indicator from a guest slot */
  onGuestSpeaking(cb: (payload: { roomId: string; slotId: string; speaking: boolean }) => void) {
    this.socket?.on('guest_speaking', cb);
    return () => this.socket?.off('guest_speaking');
  }

  // ── WebRTC signaling (Phase 3 — Host ↔ Guest audio) ──────────────────────
  // All signaling travels through the existing /podcast namespace.
  // Guest emits offer → server forwards to host room.
  // Host emits answer → server forwards to guest slot room.
  // Both sides exchange ICE candidates through the server relay.

  /** Guest → Server: SDP offer to the host */
  webRtcOffer(payload: { roomId: string; slotId: string; sdp: RTCSessionDescriptionInit }) {
    this.socket?.emit('webrtc_offer', payload);
  }

  /** Host → Server: SDP answer to a specific guest slot */
  webRtcAnswer(payload: { roomId: string; slotId: string; sdp: RTCSessionDescriptionInit }) {
    this.socket?.emit('webrtc_answer', payload);
  }

  /** Either side → Server: ICE candidate relay */
  webRtcIceCandidate(payload: { roomId: string; slotId: string; candidate: RTCIceCandidateInit }) {
    this.socket?.emit('webrtc_ice_candidate', payload);
  }

  /** Host receives a SDP offer from a guest slot */
  onWebRtcOffer(cb: (payload: { roomId: string; slotId: string; sdp: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc_offer', cb);
    return () => this.socket?.off('webrtc_offer');
  }

  /** Guest receives a SDP answer from the host */
  onWebRtcAnswer(cb: (payload: { roomId: string; slotId: string; sdp: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc_answer', cb);
    return () => this.socket?.off('webrtc_answer');
  }

  /** Either side receives an ICE candidate from the other */
  onWebRtcIceCandidate(cb: (payload: { roomId: string; slotId: string; candidate: RTCIceCandidateInit }) => void) {
    this.socket?.on('webrtc_ice_candidate', cb);
    return () => this.socket?.off('webrtc_ice_candidate');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const streamSocket = new StreamSocketService();
export const chatSocket = new ChatSocketService();
export const rjSocket = new RjSocketService();
export const podcastSocket = new PodcastSocketService();
