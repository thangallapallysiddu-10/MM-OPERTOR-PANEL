import { Platform } from 'react-native';

export class PlaybackController {
  private mediaElement: HTMLAudioElement | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;

  constructor(private deckId: string, private context: AudioContext) {}

  public async loadTrack(uri: string): Promise<MediaElementAudioSourceNode | null> {
    const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.document !== 'undefined');
    if (!isWeb) {
      console.warn(`[DECK ${this.deckId}] PlaybackController is currently web-only.`);
      return null;
    }
    this.unloadTrack();

    this.mediaElement = new Audio(uri);
    
    if (!uri.startsWith('blob:')) {
      this.mediaElement.crossOrigin = 'anonymous';
    }
    
    this.mediaElement.volume = 1; // Always max volume on the HTML element. Mix is handled by DSP.

    try {
      this.mediaElementSource = this.context.createMediaElementSource(this.mediaElement);
      return this.mediaElementSource;
    } catch (err) {
      console.error('Error creating MediaElementSource:', err);
      return null;
    }
  }

  public async play(): Promise<void> {
    if (!this.mediaElement) return;

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    
    try {
      await this.mediaElement.play();
    } catch (err) {
      console.warn('PlaybackController play failed:', err);
    }
  }

  public async pause(): Promise<void> {
    if (this.mediaElement) {
      this.mediaElement.pause();
    }
  }

  public async stop(): Promise<void> {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0;
    }
  }

  public seek(timeSeconds: number): void {
    if (this.mediaElement) {
      this.mediaElement.currentTime = timeSeconds;
    }
  }

  public unloadTrack(): void {
    if (this.mediaElement) {
      this.mediaElement.pause();
      this.mediaElement.removeAttribute('src');
      this.mediaElement.load();
      this.mediaElement = null;
    }
    
    if (this.mediaElementSource) {
      try {
        this.mediaElementSource.disconnect();
      } catch (err) {
        // ignore disconnect errors if not connected
      }
      this.mediaElementSource = null;
    }
  }
  
  public getMediaElement(): HTMLAudioElement | null {
      return this.mediaElement;
  }
}
