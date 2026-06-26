# Native Microphone Enable Audit

## Scope

Audited and fixed only the native microphone enable path:

React GO LIVE button
-> Unified Audio SDK
-> Electron IPC
-> AudioService.enableMicrophone()
-> Addon
-> AudioBridge
-> InputManager
-> MicrophoneSource
-> DeviceManager

No playback, pitch, loop, sync, mixer, DSP, recording, broadcast, session, or UI design changes were made.

## Answers

### Does pressing GO LIVE call window.audio.enableMicrophone()?

Previously: NO.

The `Ready for Live` button opened `RjSetupModal`, but the modal `GO LIVE` handler only called `toggleLive()`.

Now: YES.

`handleToggleLiveFromModal()` calls the unified SDK `audio.enableMicrophone(...)`, which routes to `window.audio.enableMicrophone(...)` in the desktop adapter.

### Does enableMicrophone() reach the addon?

YES.

`DesktopAdapter.enableMicrophone(input)` invokes Electron IPC, Electron `main.js` handles `audio:enableMicrophone`, and `AudioService.enableMicrophone()` calls `addon.enableMicrophone(deviceName)`.

### Does the addon call AudioBridge::enableMicrophone()?

YES.

`addon.cpp::EnableMicrophone()` reads the optional device name and calls `getBridge().enableMicrophone(deviceName)`.

### Does AudioBridge call the native InputManager?

YES.

`AudioBridge::enableMicrophone()` calls `engine_->enableMicrophone(deviceName)`, and `AudioEngine::enableMicrophone()` calls `inputManager_.setCurrentInputDevice(deviceName)` followed by `inputManager_.startCapture(microphoneSource_)`.

### Does InputManager actually open the device and set enabled = true?

Previously: PARTIAL.

`DeviceManager` already opened audio devices through JUCE and `InputManager` registered its capture callback, but `InputManager::startCapture()` did not call `MicrophoneSource::setEnabled(true)`. Because of that, `MicrophoneSource::pushAudio()` rejected captured samples and `getMicrophoneSnapshot().enabled` stayed false.

Now: YES.

`InputManager::startCapture()` stores the source, sets `MicrophoneSource` enabled, and registers the input callback.

### Is getMicrophoneSnapshot() reading the real native state or returning a placeholder?

It reads real native state when the engine is initialized.

`AudioBridge::getMicrophoneSnapshot()` reads `MicrophoneSource` version, enabled, muted, gain, sample rate, channel count, and `InputManager` active device.

The false `enabled` result was caused by `MicrophoneSource` never being enabled, not by a placeholder snapshot.

### Are the microphone meters connected to the native MeterEngine or still using simulated UI values?

Previously: simulated or disconnected.

Native `AudioBridge::getMeterSnapshot()` returned `micPeakL = 0` and `micPeakR = 0`, while the RJ mic strip generated random VU values for displayed channels.

Now: connected to native microphone metering.

`MicrophoneSource` owns a `MeterEngine`, processes microphone output into that meter, `AudioBridge::getMeterSnapshot()` reads it, and the RJ mic hook maps `micPeakL/R` into the active RJ mic volume.

The previous `DualMicSetup` random VU fallback was also removed so the RJ microphone strip no longer simulates level movement when native meter data is absent.

## Execution Trace

1. `RjSetupModal` GO LIVE calls `onToggleLive`.
2. `RJStudio.handleToggleLiveFromModal()` calls `audio.enableMicrophone(selectedInput)`.
3. `DesktopAdapter.enableMicrophone()` calls `window.audio.enableMicrophone(...)`.
4. `preload.js` invokes `audio:enableMicrophone`.
5. `main.js` routes `audio:enableMicrophone` to `invokeAudio('enableMicrophone', deviceName)`.
6. `AudioService.enableMicrophone()` calls `addon.enableMicrophone(deviceName)`.
7. `addon.cpp::EnableMicrophone()` calls `AudioBridge::enableMicrophone(deviceName)`.
8. `AudioBridge::enableMicrophone()` calls `AudioEngine::enableMicrophone(deviceName)`.
9. `AudioEngine::enableMicrophone()` selects the input device and calls `InputManager::startCapture(microphoneSource_)`.
10. `InputManager::startCapture()` enables `MicrophoneSource` and registers itself with `DeviceManager`.
11. `DeviceManager` delivers input audio to `InputManager::audioDeviceIOCallbackWithContext()`.
12. `InputManager` pushes captured samples into `MicrophoneSource`.
13. `MicrophoneSource::process()` mixes enabled microphone audio and updates its native `MeterEngine`.

## Files Modified

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/index.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/useMicSystem.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/modals/RjSetupModal.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/DualMicSetup.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp`
- `Melodymeet-audio-engine/src/audio/input/InputManager.cpp`
- `Melodymeet-audio-engine/src/audio/input/MicrophoneSource.h`
- `Melodymeet-audio-engine/src/audio/input/MicrophoneSource.cpp`

## Verification Results

Code inspection verifies:

- GO LIVE now calls the unified SDK microphone enable path.
- IPC, AudioService, addon, AudioBridge, AudioEngine, InputManager, MicrophoneSource, and DeviceManager remain on the frozen architecture path.
- `MicrophoneSource` is now set to enabled on capture start.
- `getMicrophoneSnapshot()` reads native state and should now report `enabled = true` after a successful enable.
- Native mic meter values now originate from `MicrophoneSource`'s `MeterEngine`.
- RJ mic meter display now consumes native `micPeakL/R` instead of random VU values.

Automated validation:

- `npx tsc --noEmit` passed.
- `npm run build:native` passed and produced `electron/native/build/Release/melodymeet_addon.node`.

Manual hardware validation is still required for:

- Press GO LIVE and confirm the native snapshot reports `enabled = true`.
- Speak into the selected microphone and confirm `micPeakL/R` rise above zero.
- Confirm the RJ mic strip meter follows the native meter.
- Press STOP LIVE and confirm the native snapshot reports `enabled = false`.

## Remaining Microphone Issues

- The native engine currently exposes one microphone source, so the frontend maps native `micPeakL/R` onto the active RJ mic or the first RJ mic.
- Additional independent native microphone sources would be a new feature and were intentionally not implemented in this sprint.
