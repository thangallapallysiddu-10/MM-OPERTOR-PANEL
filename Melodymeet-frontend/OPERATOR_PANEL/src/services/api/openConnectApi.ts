import { apiGet } from './apiClient';

export interface OpenConnectHealthResponse {
  connected: boolean;
  success: boolean;
  details?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: boolean;
    redis: boolean;
  };
  error?: string;
}

export interface OpenConnectUser {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpenConnectStation {
  id: string;
  name: string;
  description?: string;
  streamUrl?: string;
  status?: string;
}

export interface OpenConnectRJ {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
}

export interface OpenConnectPodcast {
  id: string;
  title: string;
  description?: string;
  author?: string;
}

export interface OpenConnectReport {
  id: string;
  reason: string;
  status: string;
  createdAt?: string;
}

export const OpenConnectApi = {
  getHealth: async (): Promise<OpenConnectHealthResponse> => {
    return apiGet<OpenConnectHealthResponse>('/openconnect/health');
  },

  getUsers: async (params?: Record<string, unknown>): Promise<OpenConnectUser[]> => {
    return apiGet<OpenConnectUser[]>('/openconnect/users', params);
  },

  getRjs: async (params?: Record<string, unknown>): Promise<OpenConnectRJ[]> => {
    return apiGet<OpenConnectRJ[]>('/openconnect/rjs', params);
  },

  getStations: async (params?: Record<string, unknown>): Promise<OpenConnectStation[]> => {
    return apiGet<OpenConnectStation[]>('/openconnect/stations', params);
  },

  getPodcasts: async (params?: Record<string, unknown>): Promise<OpenConnectPodcast[]> => {
    return apiGet<OpenConnectPodcast[]>('/openconnect/podcasts', params);
  },

  getReports: async (params?: Record<string, unknown>): Promise<OpenConnectReport[]> => {
    return apiGet<OpenConnectReport[]>('/openconnect/reports', params);
  },
};
