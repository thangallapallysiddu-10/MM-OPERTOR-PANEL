# Unified Audio SDK Contract Audit

## 1. Current Contract
The desktop renderer contract now centers on `src/services/audio/AudioSDK.ts` and `DesktopAdapter.ts`, with Electron preload exposing the same method names to `window.audio`.

Current public SDK surface:

```text
initialize()
shutdown()
getEngineInfo()
getEngineHealthSnapshot()
getVersions()
getMeterSnapshot()
getMixerSnapshot()
getMicrophoneSnapshot()
loadDeck()
unloadDeck()
play()
pause()
stop()
seek()
setCrossfade()
setDeckGain()
setMasterGain()
muteDeck()
soloDeck()
resetMixer()
setEQ()
getEQ()
setCompressor()
getCompressor()
setLimiter()
getLimiter()
getAvailableInputDevices()
enableMicrophone()
disableMicrophone()
setMicrophoneGain()
muteMicrophone()
startRecording()
pauseRecording()
resumeRecording()
stopRecording()
startBroadcast()
stopBroadcast()
getPlaybackSnapshot()
getDSPSnapshot()
getRecordingSnapshot()
getBroadcastSnapshot()
on()
off()
```

The desktop TypeScript build passes with this surface in place.

## 2. Missing APIs
From the phase 2 target list, no public API is currently missing in the desktop SDK surface.

Notes:

- `getEngineHealthSnapshot`, `getVersions`, `getMeterSnapshot`, `getMixerSnapshot`, and `getMicrophoneSnapshot` were added to the SDK surface and Electron bridge.
- `pauseRecording` and `resumeRecording` are now part of the public contract.
- `soloDeck`, `resetMixer`, `resetDSP`, and `setMicrophoneGain` are present end to end.

## 3. Incorrect Names
The contract was normalized to `get*` naming where the SDK exposes data:

- `engineInfo()` -> `getEngineInfo()`
- `version()` and `isInitialized()` are no longer part of the public SDK contract.
- `getEngineInfo()` is now the name exposed through preload and the native addon bridge.

Remaining legacy names are still present only as internal native helpers or in stale debug UI code:

- `window.audioEngine` still appears in `src/App.tsx` debug UI.
- Native bridge internals still include `version()` / `isInitialized()` helpers, but they are not exposed as the desktop SDK API.

## 4. Missing IPC
Electron preload and main IPC now expose the full desktop SDK surface.

Added IPC endpoints:

- `audio:getEngineHealthSnapshot`
- `audio:getVersions`
- `audio:getMeterSnapshot`
- `audio:getMixerSnapshot`
- `audio:getMicrophoneSnapshot`
- `audio:getRecordingSnapshot`
- `audio:getBroadcastSnapshot`
- `audio:getDSPSnapshot`

## 5. Missing Bridge Methods
The native bridge and addon now expose the required names for the SDK contract:

- `getEngineInfo()`
- `getEngineHealthSnapshot()`
- `getVersions()`
- `getMeterSnapshot()`
- `getMixerSnapshot()`
- `getMicrophoneSnapshot()`

Remaining bridge concern:

- `AudioBridge::getMeterSnapshot()` still returns zeroed deck and microphone meter fields. The method exists, but the data is incomplete.

## 6. Missing Engine Methods
No native engine method was required for the SDK surface beyond the current engine implementation.

The remaining gap is not method absence, but data completeness and lifecycle behavior:

- Metering is only fully populated for master output.
- `AudioClock`, recorder state, and some control-path ownership patterns still need future engine cleanup, but they are not blocking the SDK contract itself.

## 7. Event Contract
Event names are now aligned through the desktop bridge stack:

- `engine:initialized`
- `engine:health`
- `meters:update`
- `deck:play`
- `deck:pause`
- `deck:stop`
- `deck:end`
- `deck:loaded`
- `deck:load-failed`
- `deck:position`
- `deck:duration`
- `mixer:changed`
- `microphone:deviceChanged`
- `microphone:changed`
- `recording:started`
- `recording:stopped`
- `recording:paused`
- `recording:resumed`
- `recording:duration`
- `recording:fileReady`
- `recording:error`
- `broadcast:started`
- `broadcast:stopped`
- `broadcast:stats`
- `broadcast:error`
- `dsp:changed`

## 8. Required Changes
Completed in this phase:

- Unified the desktop SDK names around `get*` methods.
- Added the missing snapshot methods to preload and main IPC.
- Aligned `AudioService` to call `getEngineInfo()` and related snapshot methods.
- Aligned `AudioBridge` and the addon export name to `getEngineInfo()`.
- Removed silent `undefined` returns from the desktop adapter path by throwing structured errors when a bridge method is missing.

Still worth tracking outside this phase:

- The native meter snapshot is structurally present but still incomplete for deck and microphone channels.
- Stale debug UI still references `window.audioEngine`.
- The browser fallback adapter remains in the tree but is not used by the desktop renderer.

## 9. Pass / Fail Table
| API | SDK | DesktopAdapter | Preload | Main IPC | AudioService | Addon | AudioBridge | AudioEngine | Status |
|---|---|---|---|---|---|---|---|---|---|
| initialize() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| shutdown() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getEngineInfo() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getEngineHealthSnapshot() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getVersions() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getMeterSnapshot() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getMixerSnapshot() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| getMicrophoneSnapshot() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| loadDeck()/unloadDeck() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| play()/pause()/stop()/seek() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| mixer APIs | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DSP APIs | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| microphone APIs | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| recording APIs | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| broadcast APIs | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| on()/off() | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## 10. Phase 2 Completion Status
Phase 2 is functionally complete for the desktop renderer contract.

What passed:

- The renderer TypeScript build passes.
- The public SDK surface matches the desktop IPC surface by name.
- The preload, main IPC, AudioService, addon, bridge, and engine paths are aligned for the declared contract.

What remains outside this phase:

- Native meter completeness for deck and microphone channels.
- Legacy debug UI references to `window.audioEngine`.
- Browser fallback code that still exists in the repo but is not part of the desktop contract.

Overall status:

`PASS with residual native data-completeness debt`

