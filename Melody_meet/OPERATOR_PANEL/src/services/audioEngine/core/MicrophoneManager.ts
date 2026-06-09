import { MicEngine } from './MicEngine';

export class MicrophoneManager {
  private mics: Map<string, MicEngine> = new Map();
  private audioContext: AudioContext;
  private mixerNode: GainNode;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.mixerNode = this.audioContext.createGain();
    this.mixerNode.gain.value = 1.0;
  }

  public getOrCreateMic(id: string): MicEngine {
    if (!this.mics.has(id)) {
      const mic = new MicEngine(id, this.audioContext);
      // Connect the mic's output directly to the mixer
      mic.getOutputNode().connect(this.mixerNode);
      this.mics.set(id, mic);
    }
    return this.mics.get(id)!;
  }

  public getMic(id: string): MicEngine | undefined {
    return this.mics.get(id);
  }

  public removeMic(id: string): void {
    const mic = this.mics.get(id);
    if (mic) {
      mic.destroy();
      this.mics.delete(id);
    }
  }

  public getMixerNode(): AudioNode {
    return this.mixerNode;
  }

  public destroy(): void {
    this.mics.forEach((mic) => mic.destroy());
    this.mics.clear();
    this.mixerNode.disconnect();
  }
}
