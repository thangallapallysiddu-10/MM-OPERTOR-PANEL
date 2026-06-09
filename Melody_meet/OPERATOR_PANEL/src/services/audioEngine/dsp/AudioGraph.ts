import { DSPChain } from './DSPChain';

export class AudioGraph {
  constructor(private deckId: string, private chain: DSPChain, private context: AudioContext) {}

  /**
   * Connects all nodes in the proper signal flow.
   * Source -> HighPass -> LowPass -> Bass -> Treble -> [Dry | Delay] -> MasterGain -> Destination
   */
  public connect(source: AudioNode) {
    const { nodes } = this.chain;

    source.connect(nodes.highPass);
    nodes.highPass.connect(nodes.lowPass);
    nodes.lowPass.connect(nodes.bass);
    nodes.bass.connect(nodes.treble);

    // Split signal: Dry Path
    nodes.treble.connect(nodes.dryGain);
    nodes.dryGain.connect(nodes.masterGain);

    // Split signal: Wet (Echo/Delay) Path
    nodes.treble.connect(nodes.delayNode);
    nodes.delayNode.connect(nodes.delayGain);
    nodes.delayGain.connect(nodes.masterGain);
    
    // Feedback loop for echo
    nodes.delayGain.connect(nodes.delayNode);

    if (this.deckId === 'B') {
      // masterGain is controlled by Crossfader — do not hard-set here
    }

    // Node is no longer directly connected to destination. 
    // It must be routed by AudioEngineManager.
  }

  public getOutputNode(): GainNode {
    return this.chain.nodes.masterGain;
  }

  /**
   * Disconnects the graph safely.
   */
  public disconnect(source: AudioNode | null) {
    try {
      if (source) {
        source.disconnect();
      }
      
      const { nodes } = this.chain;
      nodes.highPass.disconnect();
      nodes.lowPass.disconnect();
      nodes.bass.disconnect();
      nodes.treble.disconnect();
      nodes.dryGain.disconnect();
      nodes.delayNode.disconnect();
      nodes.delayGain.disconnect();
      // WE MUST NOT DISCONNECT masterGain, as it breaks the permanent connection to the Crossfader
    } catch (e) {
      console.warn('Error disconnecting AudioGraph:', e);
    }
  }
}
