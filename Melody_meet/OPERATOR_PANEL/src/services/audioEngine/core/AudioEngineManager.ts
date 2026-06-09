import { DeckEngine } from './DeckEngine';
import { MicrophoneManager } from './MicrophoneManager';
import { Crossfader } from './Crossfader';

export class AudioEngineManager {
  private static instance: AudioEngineManager;
  private context: AudioContext | null = null;
  
  private decks: Map<string, DeckEngine> = new Map();
  private microphoneManager: MicrophoneManager | null = null;
  private crossfader: Crossfader | null = null;
  
  // The global mix bus
  private masterMixer: GainNode | null = null;
  // The final output trim before speakers
  private masterOutputGain: GainNode | null = null;

  private constructor() {}

  public static getInstance(): AudioEngineManager {
    if (!AudioEngineManager.instance) {
      AudioEngineManager.instance = new AudioEngineManager();
    }
    return AudioEngineManager.instance;
  }

  public getContext(): AudioContext {
    if (!this.context || this.context.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioCtx();
      
      // Initialize Master Routing Bus once Context is created
      this.masterMixer = this.context.createGain();
      this.masterOutputGain = this.context.createGain();
      
      this.masterMixer.connect(this.masterOutputGain);
      this.masterOutputGain.connect(this.context.destination);

      // Eagerly instantiate both decks and crossfader to guarantee signal flow
      // even if the user only loads a single track on one deck.
      const deckA = new DeckEngine('A', this.context);
      const deckB = new DeckEngine('B', this.context);
      this.decks.set('A', deckA);
      this.decks.set('B', deckB);
      
      this.crossfader = new Crossfader(this.context, deckA, deckB);
      this.crossfader.getOutputNode().connect(this.masterMixer);
    }
    return this.context;
  }

  public getDeck(deckId: string): DeckEngine {
    // Context creation automatically initializes the decks.
    this.getContext();
    return this.decks.get(deckId)!;
  }

  public destroyDeck(deckId: string): void {
    const deck = this.decks.get(deckId);
    if (deck) {
      deck.destroy();
      this.decks.delete(deckId);
    }
  }

  public getMicrophoneManager(): MicrophoneManager {
    if (!this.microphoneManager) {
      this.microphoneManager = new MicrophoneManager(this.getContext());
      // Connect to the master mix bus instead of destination directly
      this.microphoneManager.getMixerNode().connect(this.masterMixer!);
    }
    return this.microphoneManager;
  }

  public getCrossfader(): Crossfader | null {
    return this.crossfader;
  }
}

export const audioEngineManager = AudioEngineManager.getInstance();
