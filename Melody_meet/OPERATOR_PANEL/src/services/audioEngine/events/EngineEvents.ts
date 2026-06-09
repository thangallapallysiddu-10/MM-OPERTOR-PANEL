export type EngineEventName = 
  | 'trackLoaded'
  | 'playbackStateChanged'
  | 'timeUpdate'
  | 'error'
  | 'fxUpdated';

export class EngineEvents {
  private listeners: Map<EngineEventName, Set<Function>> = new Map();

  on(event: EngineEventName, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: EngineEventName, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: EngineEventName, ...args: any[]) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(...args);
        } catch (err) {
          console.error(`Error in EngineEvents listener for ${event}:`, err);
        }
      });
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}
