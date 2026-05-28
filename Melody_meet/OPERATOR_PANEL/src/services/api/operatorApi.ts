/**
 * operatorApi.ts
 * Wires every operator-panel backend endpoint (excluding RJ).
 * Base URL auto-selects between Android emulator, iOS/web localhost.
 */

import axios from 'axios';
import { Platform } from 'react-native';

const BASE =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

export const getFileUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Strip /api from BASE to get the root server URL, then append path
  const rootServer = BASE.replace(/\/api$/, '');
  return `${rootServer}${path.startsWith('/') ? path : `/${path}`}`;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeError(err: any): Error {
  const msg =
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Request failed';
  return new Error(msg);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stream {
  id: number | string;
  name: string;
  description?: string;
  isLive: boolean;
  viewers: number;
  bitrate?: number;
  quality?: string;
  createdAt?: string;
}

export interface Track {
  id: number | string;
  title: string;
  artist: string;
  fileUrl?: string;
  fileSize?: number;
  format?: string;
  streamId?: number | string;
  createdAt?: string;
}

export interface Podcast {
  id: number | string;
  title: string;
  description?: string;
  genre?: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string | number;
  scheduleDate?: string | null;
  duration?: string | null;
  status: 'Draft' | 'Published' | 'Scheduled';
  host?: string;
  coverArt?: string | null;
  source?: 'upload' | 'recording' | 'metadata' | 'trimmed';
  createdAt?: string;
}

export interface DashboardStats {
  streams: { total: number; live: number; totalViewers: number };
  podcasts: { total: number; published: number };
  users: { total: number; rjs: number; hosts: number; banned: number };
  activity: any;
}

export interface BackendUser {
  id: number | string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  followers?: number;
  isBanned?: boolean;
  reports?: number;
  joinDate?: string;
  createdAt?: string;
}

// ─── Stream API ───────────────────────────────────────────────────────────────

export const StreamApi = {
  /** GET /api/streams — fetch all channels/streams */
  getAll: async (): Promise<Stream[]> => {
    try {
      const { data } = await axios.get(`${BASE}/streams`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/streams — create a new channel */
  create: async (payload: { name: string; description?: string }): Promise<Stream> => {
    try {
      const { data } = await axios.post(`${BASE}/streams`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/streams/:id/live — go live */
  goLive: async (id: number | string): Promise<Stream> => {
    try {
      const { data } = await axios.put(`${BASE}/streams/${id}/live`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/streams/:id/stop — stop live */
  stopLive: async (id: number | string): Promise<Stream> => {
    try {
      const { data } = await axios.put(`${BASE}/streams/${id}/stop`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/streams/:streamId/tracks — upload a track (multipart) */
  uploadTrack: async (
    streamId: number | string,
    formData: FormData,
    onProgress?: (pct: number) => void
  ): Promise<Track> => {
    try {
      const { data } = await axios.post(`${BASE}/streams/${streamId}/tracks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/streams/tracks/:trackId */
  deleteTrack: async (trackId: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/streams/tracks/${trackId}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/streams/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/streams/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },
};

// ─── Podcast API ──────────────────────────────────────────────────────────────

export const PodcastApi = {
  /** GET /api/podcasts */
  getAll: async (): Promise<Podcast[]> => {
    try {
      const { data } = await axios.get(`${BASE}/podcasts`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts — create metadata-only podcast */
  create: async (payload: Partial<Podcast>): Promise<Podcast> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/upload — upload podcast file + create record (multipart) */
  upload: async (
    formData: FormData,
    onProgress?: (pct: number) => void
  ): Promise<Podcast> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/cover-art - upload episode thumbnail */
  uploadCoverArt: async (formData: FormData): Promise<{ coverArt: string }> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/cover-art`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/:id/status */
  updateStatus: async (
    id: number | string,
    status: 'Draft' | 'Published' | 'Scheduled'
  ): Promise<Podcast> => {
    try {
      const { data } = await axios.put(`${BASE}/podcasts/${id}/status`, { status });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/podcasts/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Recordings ─────────────────────────────────────────────────────────────

  /** GET /api/podcasts/recordings */
  getRecordings: async (): Promise<any[]> => {
    try {
      const { data } = await axios.get(`${BASE}/podcasts/recordings`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/recordings/upload */
  uploadRecording: async (formData: FormData): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/recordings/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/recordings/:id/trim */
  trimRecording: async (id: number | string, payload: { name: string; trimRanges: any[] }): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/recordings/${id}/trim`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/recordings/:id/volume */
  adjustVolume: async (id: number | string, volumeMultiplier: number): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/recordings/${id}/volume`, { volumeMultiplier });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/recordings/:id */
  deleteRecording: async (id: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/podcasts/recordings/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Live Sessions ──────────────────────────────────────────────────────────

  /** GET /api/podcasts/live/sessions */
  getLiveSessions: async (): Promise<any[]> => {
    try {
      const { data } = await axios.get(`${BASE}/podcasts/live/sessions`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/start */
  startLiveSession: async (payload: { title: string; description?: string; roomId: string; roomLink?: string; host?: string }): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/live/start`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/stop */
  stopLiveSession: async (payload: { roomId: string; peakViewers: number; lastViewerCount: number }): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/live/stop`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/live/viewers */
  updateLiveViewers: async (roomId: string, viewerCount: number): Promise<any> => {
    try {
      const { data } = await axios.put(`${BASE}/podcasts/live/viewers`, { roomId, viewerCount });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Guests ─────────────────────────────────────────────────────────────────

  /** GET /api/podcasts/live/guests/:roomId */
  getGuests: async (roomId: string, status?: string): Promise<any[]> => {
    try {
      const params = status ? { status } : {};
      const { data } = await axios.get(`${BASE}/podcasts/live/guests/${roomId}`, { params });
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/guests/join */
  joinLiveSession: async (payload: { roomId: string; name: string; device?: string }): Promise<any> => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/live/guests/join`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/live/guests/:id/respond */
  respondToGuest: async (id: number | string, action: 'approve' | 'deny'): Promise<any> => {
    try {
      const { data } = await axios.put(`${BASE}/podcasts/live/guests/${id}/respond`, { action });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/live/guests/:id */
  removeGuest: async (id: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/podcasts/live/guests/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── MICS ────────────────────────────────────────────────────────
  getMics: async () => {
    try {
      const { data } = await axios.get(`${BASE}/podcasts/mics`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  createMic: async (payload: any) => {
    try {
      const { data } = await axios.post(`${BASE}/podcasts/mics`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  updateMic: async (id: number | string, payload: any) => {
    try {
      const { data } = await axios.put(`${BASE}/podcasts/mics/${id}`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  deleteMic: async (id: number | string) => {
    try {
      const { data } = await axios.delete(`${BASE}/podcasts/mics/${id}`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────

export const AnalyticsApi = {
  /** GET /api/analytics/dashboard */
  getDashboard: async (): Promise<DashboardStats> => {
    try {
      const { data } = await axios.get(`${BASE}/analytics/dashboard`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/analytics/streams/:id */
  getStreamAnalytics: async (streamId: number | string) => {
    try {
      const { data } = await axios.get(`${BASE}/analytics/streams/${streamId}`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const UsersApi = {
  /** GET /api/users?role=RJ|Podcast Host|Listener */
  getAll: async (role?: string): Promise<BackendUser[]> => {
    try {
      const params = role ? { role } : {};
      const { data } = await axios.get(`${BASE}/users`, { params });
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/users/:id */
  getById: async (id: number | string): Promise<BackendUser> => {
    try {
      const { data } = await axios.get(`${BASE}/users/${id}`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/users/:id — update profile */
  update: async (id: number | string, payload: Partial<BackendUser>): Promise<BackendUser> => {
    try {
      const { data } = await axios.put(`${BASE}/users/${id}`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/users/:id/ban — toggle ban */
  ban: async (id: number | string): Promise<BackendUser> => {
    try {
      const { data } = await axios.put(`${BASE}/users/${id}/ban`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/users/:id/report */
  report: async (id: number | string, reason: string): Promise<void> => {
    try {
      await axios.post(`${BASE}/users/${id}/report`, { reason });
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/users/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await axios.delete(`${BASE}/users/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },
};

// ─── Activity API ─────────────────────────────────────────────────────────────

export const ActivityApi = {
  /** GET /api/activity/studios/:studioId/messages */
  getMessages: async (studioId: string | number, limit = 50) => {
    try {
      const { data } = await axios.get(
        `${BASE}/activity/studios/${studioId}/messages`,
        { params: { limit } }
      );
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/activity/studios/:studioId/song-requests */
  getSongRequests: async (studioId: string | number) => {
    try {
      const { data } = await axios.get(
        `${BASE}/activity/studios/${studioId}/song-requests`
      );
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/activity/studios/:studioId/song-requests/:requestId/status */
  updateSongRequestStatus: async (
    studioId: string | number,
    requestId: string | number,
    status: string
  ) => {
    try {
      const { data } = await axios.put(
        `${BASE}/activity/studios/${studioId}/song-requests/${requestId}/status`,
        { status }
      );
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/activity/studios/:studioId/reactions */
  getReactions: async (studioId: string | number) => {
    try {
      const { data } = await axios.get(
        `${BASE}/activity/studios/${studioId}/reactions`
      );
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/activity/live-sessions */
  getLiveSessions: async () => {
    try {
      const { data } = await axios.get(`${BASE}/activity/live-sessions`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },
};
