import { EventEmitter } from './EventEmitter';

export interface MicState {
  isActive: boolean;
  isMuted: boolean;
  volume: number;
}

export class MicEngine {
  public id: string;
  private audioContext: AudioContext;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  public events = new EventEmitter();

  private state: MicState = {
    isActive: false,
    isMuted: false,
    volume: 1.0,
  };

  private animationFrameId: number | null = null;

  constructor(id: string, audioContext: AudioContext) {
    this.id = id;
    this.audioContext = audioContext;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.state.volume;

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    this.gainNode.connect(this.analyserNode);
  }

  public async enable(): Promise<void> {
    if (this.state.isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.gainNode);

      this.state.isActive = true;
      this.updateGain();
      this.events.emit('stateChanged', this.state);
      this.startMetering();
    } catch (err) {
      console.error(`[MicEngine] Failed to enable mic ${this.id}:`, err);
      throw err;
    }
  }

  public disable(): void {
    if (!this.state.isActive) return;

    this.stopMetering();

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.state.isActive = false;
    this.events.emit('stateChanged', this.state);
    this.events.emit('meter', 0); // Reset meter to 0
  }

  public setMute(isMuted: boolean): void {
    this.state.isMuted = isMuted;
    this.updateGain();
    this.events.emit('stateChanged', this.state);
    if (isMuted) {
      this.events.emit('meter', 0);
    }
  }

  public setVolume(volume: number): void {
    // Volume from UI is typically 0-100, normalize to 0-1
    this.state.volume = Math.max(0, Math.min(1, volume / 100));
    this.updateGain();
    this.events.emit('stateChanged', this.state);
  }

  public getState(): MicState {
    return { ...this.state };
  }

  public getOutputNode(): AudioNode {
    return this.analyserNode;
  }

  private updateGain(): void {
    // If muted or inactive, gain is 0. Otherwise, it's the requested volume.
    const targetGain = this.state.isMuted || !this.state.isActive ? 0 : this.state.volume;
    this.gainNode.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, 0.05);
  }

  private startMetering(): void {
    if (this.animationFrameId !== null) return;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const checkLevel = () => {
      if (!this.state.isActive) {
        this.animationFrameId = null;
        return;
      }

      if (this.state.isMuted) {
        this.animationFrameId = requestAnimationFrame(checkLevel);
        return;
      }

      this.analyserNode.getByteTimeDomainData(dataArray);
      
      // Calculate RMS
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
        sumSquares += normalized * normalized;
      }
      
      const rms = Math.sqrt(sumSquares / dataArray.length);
      
      // Map RMS to a 0-100 visual meter
      // rms of a full sine wave is ~0.707
      const percentage = Math.min(100, Math.max(0, (rms / 0.5) * 100));
      
      this.events.emit('meter', percentage);
      
      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    this.animationFrameId = requestAnimationFrame(checkLevel);
  }

  private stopMetering(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.disable();
    this.gainNode.disconnect();
    this.analyserNode.disconnect();
  }
}
