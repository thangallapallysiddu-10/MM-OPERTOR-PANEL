/**
 * Authenticated axios instance for MelodyMeet operator API.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { StorageService } from '../storageService';
import { AuthApi } from './authApi';

export const API_BASE =
  (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

export const SERVER_ROOT = API_BASE.replace(/\/api\/?$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = AuthApi.refreshTokens()
      .then((user) => Boolean(user))
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await StorageService.getSessionToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config as RetryConfig | undefined;
    const url = String(config?.url || '');

    if (status !== 401 || !config || config._retry || url.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // Refresh returned false (no refresh token stored) — session is gone
        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }

      const token = await StorageService.getSessionToken();
      if (!token) {
        return Promise.reject(new Error('Session expired. Please sign in again.'));
      }

      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return apiClient(config);
    } catch {
      // Refresh request itself failed (network error, invalid refresh token, etc.)
      // Do NOT wipe storage here — let the user manually log out if they choose.
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }
  }
);

export function normalizeApiError(err: unknown): Error {
  const anyErr = err as {
    response?: { status?: number; data?: { error?: string; message?: string } };
    message?: string;
  };
  const backendMsg = anyErr?.response?.data?.error || anyErr?.response?.data?.message;
  if (backendMsg) return new Error(backendMsg);
  if (anyErr?.response?.status === 401) {
    return new Error('Session expired. Please sign in again.');
  }
  const msg = anyErr?.message || 'Request failed';
  if (msg.includes('status code 401')) {
    return new Error('Session expired. Please sign in again.');
  }
  return new Error(msg);
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get(path, { params });
  return data.data as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post(path, body ?? {});
  return data.data as T;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put(path, body ?? {});
  return data.data as T;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch(path, body ?? {});
  return data.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const { data } = await apiClient.delete(path);
  return data.data as T;
}
