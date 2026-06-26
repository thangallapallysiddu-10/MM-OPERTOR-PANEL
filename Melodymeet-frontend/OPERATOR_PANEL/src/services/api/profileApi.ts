/**
 * Operator RJ profile API — /api/profile/*
 */
import { apiClient, apiGet, apiPatch, apiPut, normalizeApiError } from './apiClient';

async function profileRequest<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export const ProfileApi = {
  getMe: () => profileRequest(() => apiGet<Record<string, unknown>>('/profile/me')),

  getMyDashboard: () => profileRequest(() => apiGet<Record<string, unknown>>('/profile/me/dashboard')),

  /** Full save (create or replace fields) */
  saveMe: (body: Record<string, unknown>) =>
    profileRequest(() => apiPut<Record<string, unknown>>('/profile/me', body)),

  /** Partial update */
  updateMe: (patch: Record<string, unknown>) =>
    profileRequest(() => apiPatch<Record<string, unknown>>('/profile/me', patch)),

  uploadMyAvatar: async (file: { uri: string; name: string; type?: string }) =>
    profileRequest(async () => {
      const form = new FormData();
      form.append('avatar', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'image/jpeg',
      } as unknown as Blob);
      const { data } = await apiClient.post('/profile/me/avatar', form);
      return extractUploadedAvatarUrl(data);
    }),

  uploadMyAvatarForm: async (form: FormData) =>
    profileRequest(async () => {
      const { data } = await apiClient.post('/profile/me/avatar', form);
      return extractUploadedAvatarUrl(data);
    }),
};

function extractUploadedAvatarUrl(payload: unknown): string {
  const body = payload as {
    data?: { avatarUrl?: string; profile?: { operatorProfile?: { avatarUrl?: string } } };
    avatarUrl?: string;
  };
  const url =
    body?.data?.avatarUrl ||
    body?.data?.profile?.operatorProfile?.avatarUrl ||
    body?.avatarUrl ||
    '';
  if (!url) {
    throw new Error('Upload succeeded but server did not return an image path');
  }
  return url;
}
