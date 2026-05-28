/**
 * services/streamService.ts
 * Wraps socketService for backward compatibility with existing hooks/components.
 */

import { streamSocket, StreamHealthPayload } from './socketService';

interface StreamStatus {
  isLive: boolean;
  listeners: number;
  bitrate: number;
  uptime: number;
  health: 'stable' | 'unstable' | 'offline';
}

class StreamService {
  private static instance: StreamService;
  private healthInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): StreamService {
    if (!StreamService.instance) {
      StreamService.instance = new StreamService();
    }
    return StreamService.instance;
  }

  async connect() {
    await streamSocket.connect();
  }

  disconnect() {
    if (this.healthInterval) clearInterval(this.healthInterval);
    streamSocket.disconnect();
  }

  joinStream(streamId: string | number) {
    streamSocket.joinStream(streamId);
  }

  goLive(streamId: string | number, streamName: string) {
    streamSocket.goLive(streamId, streamName);
  }

  endStream(streamId: string | number) {
    streamSocket.endStream(streamId);
  }

  onViewerUpdate(cb: (viewers: number) => void) {
    return streamSocket.onViewerUpdate(cb);
  }

  /** Start periodic health pings and call back with status */
  monitorStreamHealth(
    streamId: string | number,
    callback: (health: StreamStatus) => void
  ): ReturnType<typeof setInterval> {
    // Ping immediately then every 10s
    streamSocket.pingHealth(streamId);

    const unsub = streamSocket.onHealthPong((payload: StreamHealthPayload) => {
      callback({
        isLive: true,
        listeners: payload.listeners,
        bitrate: payload.bitrate,
        uptime: payload.uptime,
        health: payload.status,
      });
    });

    this.healthInterval = setInterval(() => {
      streamSocket.pingHealth(streamId);
    }, 10000);

    return this.healthInterval;
  }

  stopMonitoring() {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  isConnected(): boolean {
    return streamSocket.isConnected();
  }
}

export default StreamService.getInstance();