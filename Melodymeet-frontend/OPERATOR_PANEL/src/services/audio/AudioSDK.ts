import type { IAudioAdapter } from './types';
import { DesktopAdapter } from './adapters/DesktopAdapter';

function createAdapter(): IAudioAdapter {
  if (typeof window === 'undefined' || typeof (window as any).audio !== 'object' || (window as any).audio === null) {
    throw new Error('Desktop audio bridge is unavailable');
  }

  return new DesktopAdapter();
}

export const audio: IAudioAdapter = createAdapter();
