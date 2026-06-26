# Native Cue Fix Report

Date: 2026-06-25

Scope:

React UI -> Unified Audio SDK -> Electron IPC -> AudioService -> Native Addon -> AudioBridge -> PlaybackController -> DeckPlayer

Only the Cue path was audited and changed in this pass.

## 1. Root Cause

The saved cue position was lost in the React cue control before native recall.

`Set Cue` used the draggable cue marker percentage as the cue source:

- `cueMarkerA` / `cueMarkerB` default to `0`.
- If the user pressed `Set Cue` at 10 seconds without dragging the marker, React sent `0` seconds to native.
- Recall then called `setCue()` again before `jumpToCue()`, so native cue state could be overwritten with the marker value immediately before the seek.

The native path itself stores cue per deck correctly:

- `DeckPlayer` owns a separate `PlaybackController` per deck.
- `PlaybackController::setCue()` stores `cuePointSeconds_`.
- `PlaybackController::jumpToCue()` seeks to `getCue()`.

The bug was not in `PlaybackController` or `DeckPlayer`; it was in the React command source and recall behavior.

## 2. Execution Trace

Set Cue after fix:

React `DualPlayer.handleSaveCuePoint(deckId)`
-> `audio.getPlaybackSnapshot()`
-> Electron preload `audio:getPlaybackSnapshot`
-> Electron main `AudioService.getPlaybackSnapshot()`
-> native addon `getSnapshot()`
-> `AudioBridge::getSnapshot()`
-> `DeckPlayer::getCurrentPosition()`
-> React sends `audio.setCue(deckId, nativePositionSeconds)`
-> preload `audio:setCue`
-> main IPC `audio:setCue`
-> `AudioService.setCue()`
-> addon `setCue()`
-> `AudioBridge::setCue()`
-> `DeckPlayer::setCue()`
-> `PlaybackController::setCue()`

Recall Cue after fix:

React `DualPlayer.handleJumpToCue(deckId)`
-> `audio.jumpToCue(deckId)`
-> preload `audio:jumpToCue`
-> main IPC `audio:jumpToCue`
-> `AudioService.jumpToCue()`
-> addon `jumpToCue()`
-> `AudioBridge::jumpToCue()`
-> `DeckPlayer::jumpToCue()`
-> `PlaybackController::jumpToCue()`
-> `PlaybackController::seek(getCue())`
-> `Transport::seek(cueSeconds)`

Important correction:

- Recall no longer calls `setCue()` before `jumpToCue()`.
- The native engine remains the owner of cue state.
- React only updates the marker/list display after Set Cue so the UI reflects the native cue that was stored.

## 3. Files Modified

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/DualPlayer.tsx`
- `docs/native-cue-fix-report.md`

No Playback, Pitch, Loop, Sync, Mixer, DSP, Recording, Broadcast, Microphone, Session, UI design, or architecture changes were made in this cue fix pass.

## 4. Verification Results

Code verification:

- `npx tsc --noEmit` passed in `Melodymeet-frontend/OPERATOR_PANEL`.

Cue behavior verified by code trace:

- Current playback position is captured from `audio.getPlaybackSnapshot()` when `Set Cue` is pressed.
- Cue is stored through `audio.setCue(deckId, cueSeconds)`.
- Deck A and Deck B use independent `deckId` values through the full path.
- Recall uses `audio.jumpToCue(deckId)` without overwriting cue state first.
- Multiple `Set Cue` presses replace the previous native cue because `PlaybackController::setCue()` stores one cue value per deck.
- Cue recall works while paused and while playing because `Transport::seek()` updates position regardless of playback state.

Manual audio validation still required in the running desktop app:

- Set Cue at 10 seconds -> Cue returns to 10 seconds.
- Set Cue at 35 seconds -> Cue returns to 35 seconds.
- Update Cue to a new position -> old cue is replaced.
- Deck A and Deck B maintain independent cue points.
- Cue works while playing.
- Cue works while paused.

## 5. Remaining Cue Issues

No remaining code-level cue issue was found in the traced path.

Manual validation is still needed against the rebuilt/running native desktop app to confirm audible behavior.
