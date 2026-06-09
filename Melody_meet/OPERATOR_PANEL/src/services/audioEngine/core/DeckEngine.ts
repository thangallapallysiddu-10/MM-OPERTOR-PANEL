import { PublicEngineAPI, DeckState, FXParameters } from '../types';
import { EngineEvents, EngineEventName } from '../events/EngineEvents';
import { DeckStateStore, DEFAULT_FX } from '../store/DeckStateStore';
import { DSPChain } from '../dsp/DSPChain';
import { AudioGraph } from '../dsp/AudioGraph';
import { ParameterManager } from '../dsp/ParameterManager';
import { PlaybackController } from '../playback/PlaybackController';

export class DeckEngine implements PublicEngineAPI {
  private events: EngineEvents;
  private stateStore: DeckStateStore;
  private dspChain: DSPChain;
  private graph: AudioGraph;
  private parameters: ParameterManager;
  private playback: PlaybackController;

  constructor(private deckId: string, private context: AudioContext) {
    this.events = new EngineEvents();
    this.stateStore = new DeckStateStore();
    
    this.dspChain = new DSPChain(context);
    this.graph = new AudioGraph(this.deckId, this.dspChain, context);
    this.parameters = new ParameterManager(this.dspChain);
    this.playback = new PlaybackController(this.deckId, context);

    // Apply defaults to DSP immediately
    this.parameters.updateParameters(DEFAULT_FX, this.context.currentTime);
  }

  // --- Public API ---

  public async loadTrack(uri: string): Promise<void> {
    const source = await this.playback.loadTrack(uri);
    if (source) {
      this.graph.connect(source);
      
      // Ensure the DSP graph immediately matches the current store state after connection
      this.parameters.updateParameters(this.stateStore.getState().fx, this.context.currentTime);
      
      this.events.emit('trackLoaded', this.deckId, uri);
    } else {
      console.warn(`[DECK ${this.deckId}] LOADTRACK: PlaybackController returned null source for`, uri);
    }
  }

  public async unloadTrack(): Promise<void> {
    this.graph.disconnect(null); // Disconnects DSP nodes
    this.playback.unloadTrack(); // Cleans up source and element
    this.events.emit('playbackStateChanged', this.deckId, false);
  }

  public async play(): Promise<void> {
    await this.playback.play();
    this.stateStore.setPlaying(true);
    this.events.emit('playbackStateChanged', this.deckId, true);
  }

  public async pause(): Promise<void> {
    await this.playback.pause();
    this.stateStore.setPlaying(false);
    this.events.emit('playbackStateChanged', this.deckId, false);
  }

  public async stop(): Promise<void> {
    await this.playback.stop();
    this.stateStore.setPlaying(false);
    this.events.emit('playbackStateChanged', this.deckId, false);
  }

  public seek(timeSeconds: number): void {
    this.playback.seek(timeSeconds);
  }

  public restart(): void {
    this.seek(0);
    this.play();
  }

  public getCurrentTrack(): string | null {
    return this.playback.getMediaElement()?.src || null;
  }

  public hasLoadedTrack(): boolean {
    return !!this.getCurrentTrack();
  }

  // --- Parameter Controls ---

  public setVolume(volume: number): void {
    this.updateFX({ volume });
  }

  public setHighPass(hz: number): void {
    this.updateFX({ highPassFilter: hz });
  }

  public setLowPass(hz: number): void {
    this.updateFX({ lowPassFilter: hz });
  }

  public setBass(gainPercent: number): void {
    this.updateFX({ eqBass: gainPercent });
  }

  public setTreble(gainPercent: number): void {
    this.updateFX({ eqTreble: gainPercent });
  }

  public setDelay(ms: number): void {
    this.updateFX({ echoDelay: ms });
  }

  public updateFX(updates: Partial<FXParameters>) {
    this.stateStore.updateFX(updates);
    this.parameters.updateParameters(updates, this.context.currentTime);
    this.events.emit('fxUpdated', this.deckId, this.stateStore.getState().fx);
  }

  public getState(): DeckState {
    return this.stateStore.getState();
  }

  public serializeState(): string {
    return JSON.stringify(this.getState());
  }

  public restoreState(stateJson: string): void {
    try {
      const parsed = JSON.parse(stateJson) as Partial<DeckState>;
      
      if (parsed.fx) {
        this.updateFX(parsed.fx);
      }
      
      if (parsed.isMuted !== undefined) {
        this.stateStore.setMuted(parsed.isMuted);
        const elem = this.playback.getMediaElement();
        if (elem) elem.muted = parsed.isMuted;
      }
      
      // Intentionally omitting automatic playback restoration (isPlaying) 
      // to prevent unexpected autoplay violations when hydrating state.
    } catch (e) {
      console.error(`[DeckEngine ${this.deckId}] Failed to restore state:`, e);
    }
  }

  public destroy(): void {
    this.unloadTrack();
    this.events.removeAllListeners();
  }
  
  // Expose the raw media element to allow external components (like the old crossfader) to control standard volume 
  // without interfering with the internal DSP master gain, per requirements.
  public getMediaElement(): HTMLAudioElement | null {
      return this.playback.getMediaElement();
  }

  // Expose the DSP master output node so it can be routed through the Crossfader
  public getOutputNode(): GainNode {
      return this.graph.getOutputNode();
  }
}
