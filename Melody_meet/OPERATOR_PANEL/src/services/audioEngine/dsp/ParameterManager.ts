import { DSPChain } from './DSPChain';
import { FXParameters } from '../types';

export class ParameterManager {
  private chain: DSPChain;

  constructor(chain: DSPChain) {
    this.chain = chain;
  }

  /**
   * Applies smooth parameter changes to the audio nodes to prevent clicks and zipper noise.
   */
  public updateParameters(fx: Partial<FXParameters>, currentTime: number) {

    if (fx.highPassFilter !== undefined) {
      const hz = Math.max(20, Math.min(20000, fx.highPassFilter));
      this.setParam(this.chain.nodes.highPass.frequency, hz, currentTime);
    }

    if (fx.lowPassFilter !== undefined) {
      const hz = Math.max(20, Math.min(20000, fx.lowPassFilter));
      this.setParam(this.chain.nodes.lowPass.frequency, hz, currentTime);
    }

    if (fx.eqBass !== undefined) {
      this.setParam(this.chain.nodes.bass.gain, this.eqToGain(fx.eqBass), currentTime);
    }

    if (fx.eqTreble !== undefined) {
      this.setParam(this.chain.nodes.treble.gain, this.eqToGain(fx.eqTreble), currentTime);
    }

    if (fx.echoDelay !== undefined) {
      const delaySec = Math.max(0, Math.min(2, fx.echoDelay / 1000));
      this.setParam(this.chain.nodes.delayNode.delayTime, delaySec, currentTime, 0.05);
      
      const wetMix = delaySec > 0 ? 0.4 : 0;
      this.setParam(this.chain.nodes.delayGain.gain, wetMix, currentTime);
    }

    if (fx.volume !== undefined) {
      const vol = Math.max(0, Math.min(1, fx.volume / 100));
      this.setParam(this.chain.nodes.masterGain.gain, vol, currentTime);
    }
  }

  /**
   * Safely automates a Web Audio parameter.
   * Canceling scheduled values and anchoring with setValueAtTime is strictly 
   * required by many browsers before setTargetAtTime to prevent ignored ramps.
   */
  private setParam(param: AudioParam, targetValue: number, currentTime: number, timeConstant: number = 0.02) {
    param.cancelScheduledValues(currentTime);
    param.setValueAtTime(param.value, currentTime);
    param.setTargetAtTime(targetValue, currentTime, timeConstant);
  }

  private eqToGain(value: number): number {
    return ((value - 50) / 50) * 12;
  }
}
