import { Platform } from 'react-native';

export const isDesktop = () => {
  return typeof window !== 'undefined' && !!(window as any).audio;
};
