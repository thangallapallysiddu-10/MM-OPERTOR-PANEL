/**
 * src/services/audio/index.ts
 *
 * Public API of the Unified Audio SDK.
 *
 * Import pattern for all hooks and components:
 *   import { audio } from '../../services/audio';
 *   import type { DeckId, FXParameters, PlaybackSnapshot } from '../../services/audio';
 */

export { audio }        from './AudioSDK';
export type {
  IAudioAdapter,
  DeckId,
  FXParameters,
  CompressorSettings,
  LimiterSettings,
  DeckSnapshot,
  PlaybackSnapshot,
  DSPSnapshot,
  RecordingSnapshot,
  BroadcastSnapshot,
  EngineInfo,
  AudioEventHandler,
} from './types';
