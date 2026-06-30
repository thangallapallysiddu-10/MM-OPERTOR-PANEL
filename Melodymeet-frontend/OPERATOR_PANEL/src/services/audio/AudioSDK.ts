import type { IAudioAdapter } from './types';
import { DesktopAdapter } from './adapters/DesktopAdapter';
import { WebAdapter } from './adapters/WebAdapter';

function createAdapter(): IAudioAdapter {
  if (typeof window === 'undefined' || typeof (window as any).audio !== 'object' || (window as any).audio === null) {
    console.log('[AudioSDK] window.audio is unavailable. Falling back to WebAdapter.');
    return new WebAdapter();
  }

  return new DesktopAdapter();
}

export const audio: IAudioAdapter = createAdapter();
