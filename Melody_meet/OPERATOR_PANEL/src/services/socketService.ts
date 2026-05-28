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

    this.socket.on('connect', () =>
      console.log('[Stream Socket] Connected:', this.socket.id)
    );
    this.socket.on('disconnect', () =>
      console.log('[Stream Socket] Disconnected')
    );
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

  async connect() {
    const ioFn = await getIo();
    if (!ioFn) return;
    if (this.socket?.connected) return;

    this.socket = ioFn(`${SERVER_URL}/chat`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () =>
      console.log('[Chat Socket] Connected:', this.socket.id)
    );
    this.socket.on('disconnect', () =>
      console.log('[Chat Socket] Disconnected')
    );
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

export const streamSocket = new StreamSocketService();
export const chatSocket = new ChatSocketService();
