import { DeckEngine } from './DeckEngine';

export class Crossfader {
  private gainA: GainNode;
  private gainB: GainNode;
  private outputNode: GainNode;
  private context: AudioContext;

  constructor(context: AudioContext, deckA: DeckEngine, deckB: DeckEngine) {
    this.context = context;

    // Create the VCAs for both decks
    this.gainA = this.context.createGain();
    this.gainB = this.context.createGain();

    // Create the summing output bus
    this.outputNode = this.context.createGain();

    // Connect Deck A -> Crossfader A -> Output
    deckA.getOutputNode().connect(this.gainA);
    this.gainA.connect(this.outputNode);

    // Connect Deck B -> Crossfader B -> Output
    deckB.getOutputNode().connect(this.gainB);
    this.gainB.connect(this.outputNode);

    // Initialize to center position (Constant Power: cos(pi/4) and sin(pi/4) = ~0.707)
    this.setCrossfade(50);
  }

  /**
   * Sets the crossfader position using a constant power curve.
   * @param value 0 (Deck A full) to 100 (Deck B full)
   */
  public setCrossfade(value: number) {
    // Clamp between 0 and 100
    const clamped = Math.max(0, Math.min(100, value));
    
    // Normalize to 0.0 - 1.0 (x = 0 is A, x = 1 is B)
    const x = clamped / 100;

    // Constant power formula:
    // gainA = cos(x * pi/2)
    // gainB = sin(x * pi/2)
    const powerA = Math.cos(x * (Math.PI / 2));
    const powerB = Math.sin(x * (Math.PI / 2));

    // Smooth transition over 50ms to prevent zipper noise and clicks
    const time = this.context.currentTime;
    
    // Using setTargetAtTime is smoother than exponential/linear ramps for continuous UI sliders
    this.gainA.gain.setTargetAtTime(powerA, time, 0.05);
    this.gainB.gain.setTargetAtTime(powerB, time, 0.05);
  }

  public getOutputNode(): GainNode {
    return this.outputNode;
  }
}
