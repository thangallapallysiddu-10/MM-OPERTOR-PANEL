import { DeckState, FXParameters } from '../types';

export const DEFAULT_FX: FXParameters = {
  volume: 75,
  highPassFilter: 20,
  lowPassFilter: 20000,
  eqBass: 50,
  eqTreble: 50,
  echoDelay: 0,
};

export class DeckStateStore {
  private state: DeckState;

  constructor(initialState?: Partial<DeckState>) {
    this.state = {
      isPlaying: false,
      isMuted: false,
      fx: { ...DEFAULT_FX, ...initialState?.fx },
      ...initialState,
    };
  }

  getState(): DeckState {
    return { ...this.state, fx: { ...this.state.fx } };
  }

  setPlaying(isPlaying: boolean) {
    this.state.isPlaying = isPlaying;
  }

  setMuted(isMuted: boolean) {
    this.state.isMuted = isMuted;
  }

  updateFX(fxUpdates: Partial<FXParameters>) {
    this.state.fx = { ...this.state.fx, ...fxUpdates };
  }
}
