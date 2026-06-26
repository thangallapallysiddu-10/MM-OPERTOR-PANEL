import { Platform } from 'react-native';

const defaultHost =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const ENV = {
  API_URL:
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env
      ?.EXPO_PUBLIC_API_URL || `${defaultHost}/api`,
};

export const SERVER_ROOT = ENV.API_URL.replace(/\/api$/, '');
