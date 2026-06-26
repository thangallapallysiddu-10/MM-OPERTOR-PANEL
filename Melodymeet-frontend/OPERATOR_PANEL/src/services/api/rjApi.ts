/**
 * RJ Studio REST API — maps to /api/rj/:studioId/*
 */
import { apiClient, apiDelete, apiGet, apiPatch, apiPost, apiPut, normalizeApiError, SERVER_ROOT } from './apiClient';

export interface RjStudioBundle {
  studio: Record<string, unknown>;
  playlist: Array<Record<string, unknown>>;
  localFiles: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  bannedUsers: string[];
  chat: {
    messages: Array<Record<string, unknown>>;
    pinnedMessage: Record<string, unknown> | null;
  };
  libraryCatalog?: Array<Record<string, unknown>>;
}

const sid = (studioId: string | number) => `/rj/${studioId}`;

export const RjApi = {
  getStudio: (studioId: string | number) => apiGet<RjStudioBundle>(sid(studioId)),

  patchState: (studioId: string | number, patch: Record<string, unknown>) =>
    apiPatch<Record<string, unknown>>(`${sid(studioId)}/state`, patch),

  getLibrary: (studioId: string | number) =>
    apiGet<Array<Record<string, unknown>>>(`${sid(studioId)}/library`),

  goLive: (studioId: string | number, body?: { streamName?: string; viewerCount?: number }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/go-live`, body),

  stopLive: (studioId: string | number, body?: { viewerCount?: number }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/stop-live`, body),

  tickTimer: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/timer/tick`),

  addPlaylistItem: (studioId: string | number, song: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/items`, song),

  addPlaylistFromLibrary: (studioId: string | number, body: { title: string; artist?: string }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/library`, body),

  removePlaylistItem: (studioId: string | number, itemId: string) =>
    apiDelete<unknown>(`${sid(studioId)}/playlist/items/${itemId}`),

  clearPlaylist: (studioId: string | number) =>
    apiDelete<unknown>(`${sid(studioId)}/playlist`),

  startPlaylist: (studioId: string | number, body?: { durationMinutes?: number }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/start`, body),

  pausePlaylist: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/pause`),

  resumePlaylist: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/resume`),

  stopPlaylist: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/stop`),

  dualPlayerAction: (studioId: string | number, body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/dual-player`, body),

  patchMic: (studioId: string | number, body: Record<string, unknown>) =>
    apiPatch<Record<string, unknown>>(`${sid(studioId)}/mics`, body),

  addMic: (studioId: string | number, body: { name: string; avatar?: string }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/mics`, body),

  removeMic: (studioId: string | number, micId: string) =>
    apiDelete<Record<string, unknown>>(`${sid(studioId)}/mics/${micId}`),

  listLocalFiles: (studioId: string | number) =>
    apiGet<Array<Record<string, unknown>>>(`${sid(studioId)}/local-files`),

  uploadLocalFile: async (
    studioId: string | number,
    file: { uri: string; name: string; type?: string; file?: any },
    meta?: { duration?: string }
  ) => {
    const form = new FormData();
    if (file.file) {
      form.append('audioFile', file.file);
    } else {
      form.append('audioFile', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'audio/mpeg',
      } as unknown as Blob);
    }
    if (meta?.duration) form.append('duration', meta.duration);

    const { data } = await apiClient.post(`${sid(studioId)}/local-files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data as Record<string, unknown>;
  },

  deleteLocalFile: (studioId: string | number, fileId: string) =>
    apiDelete<unknown>(`${sid(studioId)}/local-files/${fileId}`),

  loadLocalToStandby: (studioId: string | number, fileId: string, playerId: 'A' | 'B' = 'A') =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/local-files/${fileId}/load-standby`, { playerId }),

  postChatMessage: (studioId: string | number, body: { text: string; username?: string }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/chat/messages`, {
      username: body.username || 'RJ',
      text: body.text,
    }),

  pinMessage: (studioId: string | number, messageId: string, text: string) =>
    apiPut(`${sid(studioId)}/chat/messages/${messageId}/pin`, { text }),

  banUser: (
    studioId: string | number,
    username: string,
    reason?: string,
    mode: 'cooldown' | 'ban' = 'cooldown',
    cooldownMinutes = 5
  ) => apiPost<unknown>(`${sid(studioId)}/chat/bans`, { username, reason, mode, cooldownMinutes }),

  unbanUser: (studioId: string | number, username: string) =>
    apiDelete<unknown>(`${sid(studioId)}/chat/bans/${encodeURIComponent(username)}`),

  clearChat: (studioId: string | number) =>
    apiPost<unknown>(`${sid(studioId)}/chat/clear`),

  getChatOptions: (studioId: string | number) =>
    apiGet<{ gifts: Array<Record<string, unknown>>; emojis: Array<Record<string, unknown>> }>(`${sid(studioId)}/chat/options`),

  sendGift: (studioId: string | number, body: { username?: string; giftId: string; giftLabel?: string }) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/chat/gifts`, body),

  sendEmoji: (
    studioId: string | number,
    body: { username?: string; emojiId: string; emoji: string; label?: string }
  ) => apiPost<Record<string, unknown>>(`${sid(studioId)}/chat/emojis`, body),

  syncListeners: (studioId: string | number, count: number) =>
    apiPut<Record<string, unknown>>(`${sid(studioId)}/listeners`, { count }),

  markNotificationRead: (studioId: string | number, id: string) =>
    apiPut<unknown>(`${sid(studioId)}/notifications/${id}/read`),

  markAllNotificationsRead: (studioId: string | number) =>
    apiPut<unknown>(`${sid(studioId)}/notifications/read-all`),

  createNotification: (
    studioId: string | number,
    body: { title: string; message: string; type?: 'system' | 'request' | 'alert' }
  ) => apiPost<Record<string, unknown>>(`${sid(studioId)}/notifications`, body),

  tickPlaylist: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/tick`),

  advancePlaylist: (studioId: string | number) =>
    apiPost<Record<string, unknown>>(`${sid(studioId)}/playlist/advance`),

  getProfile: (studioId: string | number) =>
    apiGet<Record<string, unknown>>(`${sid(studioId)}/profile`),

  getProfileDashboard: (studioId: string | number) =>
    apiGet<Record<string, unknown>>(`${sid(studioId)}/profile/dashboard`),

  patchProfile: (studioId: string | number, patch: Record<string, unknown>) =>
    apiPatch<Record<string, unknown>>(`${sid(studioId)}/profile`, patch),

  /** Logged-in operator — no stream / dashboard required */
  getMyProfileDashboard: () => apiGet<Record<string, unknown>>('/rj/me/profile/dashboard'),

  patchMyProfile: (patch: Record<string, unknown>) =>
    apiPatch<Record<string, unknown>>('/rj/me/profile', patch),

  uploadMyAvatar: async (file: { uri: string; name: string; type?: string }) => {
    const form = new FormData();
    form.append('avatar', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post('/rj/me/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (data.data as { avatarUrl: string }).avatarUrl;
  },

  uploadMyAvatarForm: async (form: FormData) => {
    const { data } = await apiClient.post('/rj/me/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (data.data as { avatarUrl: string }).avatarUrl;
  },

  getFileUrl: (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${SERVER_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
  },
};

export { normalizeApiError };
