# Native Deck Feature Audit

Date: 2026-06-25

Scope:

React UI -> Unified Audio SDK -> Electron IPC -> AudioService -> Native Addon -> AudioBridge -> AudioEngine -> PlaybackController -> DeckPlayer -> Transport

The audit started from the existing engine implementation. Features were not treated as missing until the native engine, bridge, addon, service, SDK, and React controls were inspected.

## 1. Cue Audit

Exists? YES, partially before this sprint.

Location:

- Engine cue state existed in `melodymeet-audio-engine/src/playback/PlaybackController.h`.
- `PlaybackController` stored `cuePointSeconds_` per controller instance.
- Each deck owns its own `DeckPlayer`, and each `DeckPlayer` owns its own `PlaybackController`, so cue state is per deck.

Pre-sprint engine support:

- Cue position storage: YES, via `PlaybackController::setCue()`.
- Cue recall: PARTIAL. The stored value could be read with `getCue()`, but there was no deck command path from the UI to recall it.
- Cue seek: PARTIAL. Generic `seek()` existed, but no `jumpToCue()` command existed.
- Per-deck cue state: YES, because Deck A and Deck B own separate controllers.

Execution Path Before Fix:

React `DualPlayer.tsx`
-> local cue marker / saved cue state only
-> no Unified Audio SDK cue method
-> no preload cue method
-> no IPC cue handler
-> no `AudioService` cue method
-> no addon cue export
-> no `AudioBridge` cue method
-> existing native `PlaybackController::setCue()` unreachable

Execution stopped at the React component / SDK boundary. The UI updated, but no native command was sent.

Implementation:

- Added `jumpToCue()` to `PlaybackController`.
- Added cue forwarding on `DeckPlayer`.
- Added cue command forwarding through `AudioEngine`, `AudioBridge`, addon, `AudioService`, Electron IPC, preload, `DesktopAdapter`, and SDK types.
- Wired RJ deck cue controls to call `audio.setCue()` and `audio.jumpToCue()` in order.

Missing Wiring Fixed:

- `setCue(deckId, seconds)`
- `jumpToCue(deckId)`

## 2. Pitch Audit

Exists? NO, not as an audio-affecting deck feature before this sprint.

Location:

- React `DualPlayer.tsx` had local `pitchA` / `pitchB` state.
- No native deck playback-rate, pitch, time-stretch, or resampling command path existed.
- No engine playback-rate state existed before this sprint.

Pre-sprint engine support:

- Playback rate: NO.
- Pitch control: NO.
- Time stretching: NO.
- Resampling for speed changes: NO.
- Playback speed changes: NO.

Execution Path Before Fix:

React `DualPlayer.tsx`
-> local `pitchA` / `pitchB` state only
-> no Unified Audio SDK pitch method
-> no preload pitch method
-> no IPC pitch handler
-> no `AudioService` pitch method
-> no addon pitch export
-> no `AudioBridge` pitch method
-> no native playback-rate state

Execution stopped inside React. The pitch display changed, but playback was unaffected.

Implementation:

- Added playback-rate state to `PlaybackController`.
- Added `DeckPlayer::setPitch(percent)` and per-deck pitch storage.
- Added linear interpolated reads in `AudioDecoder::readInterpolatedSamples()`.
- Updated `DeckPlayer::process()` to read at a rate-adjusted source step and advance transport position by playback rate.
- Added `setPitch(deckId, percent)` through `AudioEngine`, `AudioBridge`, addon, `AudioService`, IPC, preload, `DesktopAdapter`, and SDK types.
- Wired RJ pitch +/- controls to `audio.setPitch()`.

Important behavior note:

- This implements playback-speed pitch control through resampling. It changes speed and audible pitch together.
- It does not implement independent key-preserving time stretching.

Missing Engine Components Added:

- Playback-rate state.
- Rate-adjusted decode read.
- Interpolated resampling read path.
- Native pitch command path.

## 3. Loop Audit

Exists? YES, partially before this sprint.

Location:

- Loop enabled flag existed in `PlaybackController::looping_`.
- End-of-track detection existed in `Transport::hasEnded()`.
- Automatic restart existed in `PlaybackController::advancePosition()`.
- Per-deck loop state existed because each deck owns its own controller.

Pre-sprint engine support:

- Loop enabled flag: YES.
- End-of-track detection: YES.
- Automatic restart: YES.
- Per-deck looping: YES.
- Loop range: NO.
- Frontend command wiring: NO.

Execution Path Before Fix:

React `DualPlayer.tsx`
-> local `loopActiveA` / `loopActiveB` animation state only
-> no Unified Audio SDK loop method
-> no preload loop method
-> no IPC loop handler
-> no `AudioService` loop method
-> no addon loop export
-> no `AudioBridge` loop method
-> existing native `PlaybackController::setLoop()` unreachable

Execution stopped at the React component / SDK boundary. The UI loop marker moved, but native playback did not loop.

Implementation:

- Added loop range state to `PlaybackController`.
- Updated `advancePosition()` to restart at the configured loop start when current position reaches loop end.
- Kept existing end-of-track loop behavior and made its fallback restart from cue when a cue is defined.
- Added `setLoop(deckId, enabled)` and `setLoopRange(deckId, startSeconds, endSeconds)` through `AudioEngine`, `AudioBridge`, addon, `AudioService`, IPC, preload, `DesktopAdapter`, and SDK types.
- Wired RJ loop button to send `setLoopRange()` followed by `setLoop(true)` in order, and `setLoop(false)` on disable.

Missing Wiring Fixed:

- `setLoop(deckId, enabled)`
- `setLoopRange(deckId, startSeconds, endSeconds)`

## 4. Files Modified

- `melodymeet-audio-engine/src/playback/AudioDecoder.h`
- `melodymeet-audio-engine/src/playback/AudioDecoder.cpp`
- `melodymeet-audio-engine/src/playback/PlaybackController.h`
- `melodymeet-audio-engine/src/playback/PlaybackController.cpp`
- `melodymeet-audio-engine/src/deck/DeckPlayer.h`
- `melodymeet-audio-engine/src/deck/DeckPlayer.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.h`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.h`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/addon.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/services/AudioService.js`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/main.js`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/preload.js`
- `Melodymeet-frontend/OPERATOR_PANEL/src/services/audio/types.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/services/audio/adapters/DesktopAdapter.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/services/audio/adapters/WebAdapter.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/DualPlayer.tsx`
- `docs/native-deck-feature-audit.md`

No Mixer, DSP, Recording, Broadcast, or future-feature implementations were modified.

## 5. Manual Validation Results

Automated/code validation completed:

- `npx tsc --noEmit` passed in `Melodymeet-frontend/OPERATOR_PANEL`.
- Native compile reached and built `MelodyMeetEngineLibrary.lib`, including the changed engine files.
- Full addon link did not complete because `electron/native/build/Release/melodymeet_addon.node` was locked by running Electron/Node processes. The linker failed with `LNK1104: cannot open file ... melodymeet_addon.node`.
- `npm run build:native` also could not clean `electron/native/build` while the existing native addon/build folder was locked.

Manual audible QA still required after stopping the running Electron/Node process that holds the addon:

- Cue: Set Cue, Recall Cue, Recall while paused, Recall while playing, multiple cue recalls.
- Pitch: Increase Pitch, Decrease Pitch, reset Pitch through Clear, audible playback-speed/pitch change, stable playback.
- Loop: Enable Loop, Disable Loop, automatic restart at loop end, continuous looping, independent Deck A / Deck B looping.

## 6. Summary

Cue and loop were native-engine features that already existed partially but were disconnected above the engine. They are now connected through the existing desktop audio path.

Pitch did not exist as a native playback-affecting feature. A single native implementation was added inside the deck playback path using playback-rate state and interpolated resampling.
