# Native Playback Debug Report

## 1. Execution Trace

Trace points were added across the full desktop load path:

React hook -> Unified Audio SDK -> Electron preload -> Electron main IPC -> AudioService.loadDeck() -> Native addon -> AudioBridge.loadDeck() -> AudioEngine/DeckPlayer -> AudioFileManager -> AudioDecoder -> Deck state

Observed behavior for a valid local WAV after the fix:

1. React sends the track URI/path into `audio.loadDeck(...)`.
2. `DesktopAdapter` normalizes `file://` URIs to a filesystem path before IPC.
3. Preload forwards the normalized path.
4. Electron main forwards the same value to `AudioService.loadDeck()`.
5. `AudioService` forwards to the native addon.
6. `addon.loadDeck()` forwards to `AudioBridge.loadDeck()`.
7. `AudioBridge.loadDeck()` forwards to `AudioEngine::DeckPlayer::load()`.
8. `DeckPlayer::load()` calls `AudioFileManager::loadFile()`.
9. `AudioFileManager::loadFile()` calls `AudioDecoder::load()`.
10. `AudioDecoder::load()` successfully opens the local file, decodes it, and returns success.
11. Deck state is updated with `isLoaded = true` and `loadFailed = false`.

Runtime smoke test on a generated local WAV confirmed:

- `loadDeck('A', <local-path>)` returned `true`
- `getSnapshot().deckA.isLoaded === true`
- `getSnapshot().deckA.loadFailed === false`

## 2. Failure Point

The failure was happening before decode, at the path boundary.

When the renderer passed a URI form such as `file://...`, the native loader treated it as a plain filesystem path. `juce::File(...).existsAsFile()` then failed, and the deck never reached the decode stage.

The first layer that had enough context to fix the issue cleanly was the desktop SDK adapter.

## 3. Root Cause

Root cause: incorrect file path / URI conversion.

The frontend stored and forwarded local audio locations as URI strings, but the native engine expects a real local filesystem path.

Before the fix:

- React track state carried `audioUrl` / `uri`
- `DesktopAdapter.loadDeck()` forwarded that string unchanged
- Native `AudioDecoder::load()` rejected the value because it was not a valid filesystem path

After the fix:

- `DesktopAdapter.loadDeck()` normalizes `file://` URIs to a local path before IPC
- Native code receives the exact path the decoder expects

## 4. Files Modified

- [src/services/audio/adapters/DesktopAdapter.ts](../Melodymeet-frontend/OPERATOR_PANEL/src/services/audio/adapters/DesktopAdapter.ts)
- [electron/preload.js](../Melodymeet-frontend/OPERATOR_PANEL/electron/preload.js)
- [electron/main.js](../Melodymeet-frontend/OPERATOR_PANEL/electron/main.js)
- [electron/services/AudioService.js](../Melodymeet-frontend/OPERATOR_PANEL/electron/services/AudioService.js)
- [electron/native/addon.cpp](../Melodymeet-frontend/OPERATOR_PANEL/electron/native/addon.cpp)
- [electron/native/AudioBridge.cpp](../Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp)
- [melodymeet-audio-engine/src/deck/DeckPlayer.cpp](../melodymeet-audio-engine/src/deck/DeckPlayer.cpp)
- [melodymeet-audio-engine/src/playback/AudioFileManager.cpp](../melodymeet-audio-engine/src/playback/AudioFileManager.cpp)
- [melodymeet-audio-engine/src/playback/AudioDecoder.cpp](../melodymeet-audio-engine/src/playback/AudioDecoder.cpp)
- [src/features/rj/hooks/usePlayer.ts](../Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/usePlayer.ts)
- [src/features/rj/hooks/usePlaylistPlayer.ts](../Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/usePlaylistPlayer.ts)

## 5. Verification

Verification performed:

- TypeScript renderer check passed.
- Native addon smoke test passed with a generated local WAV file.
- Native snapshot after load:
  - `isLoaded = true`
  - `loadFailed = false`
  - `duration > 0`

This confirms the desktop renderer now reaches the native engine with a valid local path and the deck load completes successfully.
