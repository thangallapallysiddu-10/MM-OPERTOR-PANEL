/**
 * operatorApi.ts
 * Wires every operator-panel backend endpoint (excluding RJ).
 * Base URL auto-selects between Android emulator, iOS/web localhost.
 */

import { apiClient, API_BASE, SERVER_ROOT, normalizeApiError } from './apiClient';

export const getFileUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SERVER_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
};

const BASE = API_BASE;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeError = normalizeApiError;

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
      const { data } = await apiClient.get('/streams');
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/streams — create a new channel */
  create: async (payload: { name: string; description?: string }): Promise<Stream> => {
    try {
      const { data } = await apiClient.post(`/streams`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/streams/:id/live — go live */
  goLive: async (id: number | string): Promise<Stream> => {
    try {
      const { data } = await apiClient.put(`/streams/${id}/live`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/streams/:id/stop — stop live */
  stopLive: async (id: number | string): Promise<Stream> => {
    try {
      const { data } = await apiClient.put(`/streams/${id}/stop`);
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
      const { data } = await apiClient.post(`/streams/${streamId}/tracks`, formData, {
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
      await apiClient.delete(`/streams/tracks/${trackId}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/streams/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/streams/${id}`);
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
      const { data } = await apiClient.get(`/podcasts`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts — create metadata-only podcast */
  create: async (payload: Partial<Podcast>): Promise<Podcast> => {
    try {
      const { data } = await apiClient.post(`/podcasts`, payload);
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
      const { data } = await apiClient.post(`/podcasts/upload`, formData, {
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
      const { data } = await apiClient.post(`/podcasts/cover-art`, formData, {
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
      const { data } = await apiClient.put(`/podcasts/${id}/status`, { status });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/podcasts/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Recordings ─────────────────────────────────────────────────────────────

  /** GET /api/podcasts/recordings */
  getRecordings: async (): Promise<any[]> => {
    try {
      const { data } = await apiClient.get(`/podcasts/recordings`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/recordings/upload */
  uploadRecording: async (formData: FormData): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/podcasts/recordings/upload`, formData, {
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
      const { data } = await apiClient.post(`/podcasts/recordings/${id}/trim`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/recordings/:id/volume */
  adjustVolume: async (id: number | string, volumeMultiplier: number): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/podcasts/recordings/${id}/volume`, { volumeMultiplier });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/recordings/:id */
  deleteRecording: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/podcasts/recordings/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Live Sessions ──────────────────────────────────────────────────────────

  /** GET /api/podcasts/live/sessions */
  getLiveSessions: async (): Promise<any[]> => {
    try {
      const { data } = await apiClient.get(`/podcasts/live/sessions`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/start */
  startLiveSession: async (payload: { title: string; description?: string; roomId: string; roomLink?: string; host?: string }): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/podcasts/live/start`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/stop */
  stopLiveSession: async (payload: { roomId: string; peakViewers: number; lastViewerCount: number }): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/podcasts/live/stop`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/live/viewers */
  updateLiveViewers: async (roomId: string, viewerCount: number): Promise<any> => {
    try {
      const { data } = await apiClient.put(`/podcasts/live/viewers`, { roomId, viewerCount });
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
      const { data } = await apiClient.get(`/podcasts/live/guests/${roomId}`, { params });
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/podcasts/live/guests/join */
  joinLiveSession: async (payload: { roomId: string; name: string; device?: string }): Promise<any> => {
    try {
      const { data } = await apiClient.post(`/podcasts/live/guests/join`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/live/guests/:id/respond */
  respondToGuest: async (id: number | string, action: 'approve' | 'deny'): Promise<any> => {
    try {
      const { data } = await apiClient.put(`/podcasts/live/guests/${id}/respond`, { action });
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/live/guests/:id */
  removeGuest: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/podcasts/live/guests/${id}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── Guest Slots (Podcast Audio Deck — shareable mic links) ─────────────────

  /**
   * POST /api/podcasts/guest-slots/links/generate
   * Returns shareable join URLs for MIC 2–5.
   * Called once per session after startLiveSession.
   */
  generateGuestLinks: async (payload: { roomId: string; baseUrl?: string }): Promise<
    Array<{ slotId: string; label: string; url: string }>
  > => {
    try {
      const { data } = await apiClient.post(`/podcasts/guest-slots/links/generate`, payload);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * GET /api/podcasts/guest-slots/slots/:roomId
   * Returns current occupancy for MIC 2–5.
   */
  getGuestSlots: async (roomId: string): Promise<
    Array<{ slotId: string; label: string; status: string; guestName: string | null; guestId: number | null }>
  > => {
    try {
      const { data } = await apiClient.get(`/podcasts/guest-slots/slots/${roomId}`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * POST /api/podcasts/guest-slots/join (public — no JWT)
   * Called by the guest join page.
   */
  joinGuestSlot: async (payload: {
    roomId: string;
    slotId: string;
    guestName: string;
    guestToken?: string;
  }): Promise<{ id: number; slotId: string; guestToken: string; status: string }> => {
    try {
      const { data } = await apiClient.post(`/podcasts/guest-slots/join`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * POST /api/podcasts/guest-slots/leave (public — no JWT)
   * Called by the guest join page on leave.
   */
  leaveGuestSlot: async (payload: {
    roomId: string;
    slotId: string;
    guestToken: string;
  }): Promise<void> => {
    try {
      await apiClient.post(`/podcasts/guest-slots/leave`, payload);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * DELETE /api/podcasts/guest-slots/slots/:roomId/:slotId
   * Operator-kick a guest from a slot.
   */
  kickGuestSlot: async (roomId: string, slotId: string): Promise<void> => {
    try {
      await apiClient.delete(`/podcasts/guest-slots/slots/${roomId}/${slotId}`);
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/mute
   * Operator mutes or unmutes a connected guest slot.
   */
  muteGuestSlot: async (roomId: string, slotId: string, muted: boolean): Promise<void> => {
    try {
      await apiClient.patch(`/podcasts/guest-slots/slots/${roomId}/${slotId}/mute`, { muted });
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * PATCH /api/podcasts/guest-slots/slots/:roomId/:slotId/volume
   * Operator sets absolute volume (0–200) on a guest slot.
   */
  setGuestSlotVolume: async (roomId: string, slotId: string, volume: number): Promise<void> => {
    try {
      await apiClient.patch(`/podcasts/guest-slots/slots/${roomId}/${slotId}/volume`, { volume });
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // ─── MICS ────────────────────────────────────────────────────────
  getMics: async () => {
    try {
      const { data } = await apiClient.get(`/podcasts/mics`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  createMic: async (payload: any) => {
    try {
      const { data } = await apiClient.post(`/podcasts/mics`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  updateMic: async (id: number | string, payload: any) => {
    try {
      const { data } = await apiClient.put(`/podcasts/mics/${id}`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  deleteMic: async (id: number | string) => {
    try {
      const { data } = await apiClient.delete(`/podcasts/mics/${id}`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/podcasts/notifications */
  getNotifications: async (): Promise<any[]> => {
    try {
      const { data } = await apiClient.get(`/podcasts/notifications`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/notifications/:id/read */
  markNotificationRead: async (id: string): Promise<any> => {
    try {
      const { data } = await apiClient.put(`/podcasts/notifications/${id}/read`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/podcasts/notifications/mark-all-read */
  markAllNotificationsRead: async (): Promise<any> => {
    try {
      const { data } = await apiClient.put(`/podcasts/notifications/mark-all-read`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/podcasts/notifications */
  clearNotifications: async (): Promise<any> => {
    try {
      const { data } = await apiClient.delete(`/podcasts/notifications`);
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
      const { data } = await apiClient.get(`/analytics/dashboard`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/analytics/streams/:id */
  getStreamAnalytics: async (streamId: number | string) => {
    try {
      const { data } = await apiClient.get(`/analytics/streams/${streamId}`);
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
      const { data } = await apiClient.get(`/users`, { params });
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/users/:id */
  getById: async (id: number | string): Promise<BackendUser> => {
    try {
      const { data } = await apiClient.get(`/users/${id}`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/users/:id — update profile */
  update: async (id: number | string, payload: Partial<BackendUser>): Promise<BackendUser> => {
    try {
      const { data } = await apiClient.put(`/users/${id}`, payload);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** PUT /api/users/:id/ban — toggle ban */
  ban: async (id: number | string): Promise<BackendUser> => {
    try {
      const { data } = await apiClient.put(`/users/${id}/ban`);
      return data.data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** POST /api/users/:id/report */
  report: async (id: number | string, reason: string): Promise<void> => {
    try {
      await apiClient.post(`/users/${id}/report`, { reason });
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** DELETE /api/users/:id */
  delete: async (id: number | string): Promise<void> => {
    try {
      await apiClient.delete(`/users/${id}`);
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
      const { data } = await apiClient.get(
        `/activity/studios/${studioId}/messages`,
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
      const { data } = await apiClient.get(
        `/activity/studios/${studioId}/song-requests`
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
      const { data } = await apiClient.put(
        `/activity/studios/${studioId}/song-requests/${requestId}/status`,
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
      const { data } = await apiClient.get(
        `/activity/studios/${studioId}/reactions`
      );
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /** GET /api/activity/live-sessions */
  getLiveSessions: async () => {
    try {
      const { data } = await apiClient.get(`/activity/live-sessions`);
      return data.data ?? [];
    } catch (err) {
      throw normalizeError(err);
    }
  },
};
