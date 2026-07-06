import type { IAudioAdapter } from './types';
import { DesktopAdapter } from './adapters/DesktopAdapter';
import { WebAdapter } from './adapters/WebAdapter';

const desktopAdapter = new DesktopAdapter();
const webAdapter = new WebAdapter();

function hasDesktopAudioBridge(): boolean {
  return typeof window !== 'undefined'
    && typeof (window as any).audio === 'object'
    && (window as any).audio !== null;
}

// Log adapter selection once at startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const bridge = hasDesktopAudioBridge();
    console.log('[AUDIO SDK] Desktop bridge detected:', bridge);
    console.log('[AUDIO SDK] window.audio type:', typeof (window as any).audio);
    if (bridge) {
      console.log('[AUDIO SDK] window.audio keys:', Object.keys((window as any).audio));
    }
    console.log('[AUDIO SDK] Using adapter:', bridge ? 'DesktopAdapter' : 'WebAdapter');
  }, 500);
}

function currentAdapter(): IAudioAdapter {
  if (hasDesktopAudioBridge()) {
    return desktopAdapter;
  }

  return webAdapter;
}

export const audio: IAudioAdapter = new Proxy({} as IAudioAdapter, {
  get(_target, prop: keyof IAudioAdapter) {
    const value = currentAdapter()[prop];
    if (typeof value === 'function') {
      return value.bind(currentAdapter());
    }
    return value;
  },
});
