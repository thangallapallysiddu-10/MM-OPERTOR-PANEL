export interface DSPNodes {
  highPass: BiquadFilterNode;
  lowPass: BiquadFilterNode;
  bass: BiquadFilterNode;
  treble: BiquadFilterNode;
  delayNode: DelayNode;
  delayGain: GainNode;
  dryGain: GainNode;
  masterGain: GainNode;
}

export class DSPChain {
  public nodes: DSPNodes;

  constructor(private context: AudioContext) {
    this.nodes = this.createNodes();
  }

  private createNodes(): DSPNodes {
    const highPass = this.context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.Q.value = 0.7;

    const lowPass = this.context.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.Q.value = 0.7;

    const bass = this.context.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 120; // Fixed at 120Hz per requirements

    const treble = this.context.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 10000; // Fixed at 10kHz per requirements

    const delayNode = this.context.createDelay(2.0);
    const delayGain = this.context.createGain();
    const dryGain = this.context.createGain();
    dryGain.gain.value = 1.0;

    const masterGain = this.context.createGain();

    return {
      highPass,
      lowPass,
      bass,
      treble,
      delayNode,
      delayGain,
      dryGain,
      masterGain
    };
  }
}
