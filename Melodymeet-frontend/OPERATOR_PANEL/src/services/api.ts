/**
 * services/api.ts
 * Re-exports all API modules for backward compatibility.
 * All actual logic lives in services/api/operatorApi.ts and services/api/authApi.ts
 */

export { AuthApi } from './api/authApi';
export { OpenConnectApi, OpenConnectApi as openConnectApi } from './api/openConnectApi';

export {
  StreamApi as streamApi,
  PodcastApi as podcastApi,
  AnalyticsApi as analyticsApi,
  UsersApi as supervisorApi,
  ActivityApi as chatApi,
} from './api/operatorApi';