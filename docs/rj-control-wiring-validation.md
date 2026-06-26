# RJ Control Wiring Validation

Date: 2026-06-26

Scope: RJ control-to-DSP wiring only. No SessionManager, AudioSession, playback engine, deck implementation, Podcast, Broadcast, Node API method, Electron main/preload, or frontend layout refactor was performed.

## Summary

Deck playback was left unchanged. The remaining RJ control failures were traced to disconnected UI callbacks, mismatched EQ parameter names, and a simulated master meter in the RJ master panel.

The native addon was rebuilt successfully after the fixes.

## Controls Audited

### Microphone Gain

Intended path:

React RJ mic gain knob
-> `audio.setMicrophoneGain()`
-> Desktop adapter
-> IPC `audio:setMicrophoneGain`
-> `AudioService.setMicrophoneGain()`
-> `AudioBridge::setMicrophoneGain()`
-> `AudioEngine::setMicrophoneGain()`
-> `MicrophoneSource::setGain()`
-> mic `GainProcessor`
-> audio callback.

Actual issue found:

The RJ mic strip called `applyChannelChange()`, but that helper only handled mute, on-air, and input selection. Gain changes stayed in local UI state and never called the SDK.

Correction:

`RjSetupModal` now sends primary RJ mic gain changes to `audio.setMicrophoneGain()`. The 0-100 UI value is mapped so 50 is unity gain, 0 is silence, and 100 is 2.0 linear gain. Gain ownership remains in `MicrophoneSource`/`GainProcessor`.

### Microphone EQ

Intended path:

React RJ EQ knobs
-> `audio.setEQ("Mic", fx)`
-> Desktop adapter
-> IPC `audio:setEQ`
-> `AudioService.setEQ()`
-> `AudioBridge::setEQ()`
-> `AudioEngine::setEQ()`
-> mic `EQProcessor`
-> audio callback.

Actual issues found:

The RJ mic strip did not call `audio.setEQ()` for low/mid/high changes.

The SDK type uses `eqBass`, `eqMid`, and `eqTreble`, but the native addon only read `low`, `mid`, and `high`.

The addon fallback value was `50`, while the native `EQProcessor` expects dB values where flat is `0`.

Corrections:

`RjSetupModal` now sends primary RJ mic EQ changes to `audio.setEQ("Mic", { eqBass, eqMid, eqTreble })`.

The 0-100 UI values are mapped to -12 dB to +12 dB, with 50 mapped to 0 dB.

The native addon now accepts both existing field styles: `eqBass`/`eqMid`/`eqTreble` and `low`/`mid`/`high`.

Flat fallback is now 0 dB.

### Microphone HPF

Intended path:

React/SDK `highPassFilter`
-> `audio.setEQ("Mic", fx)`
-> Desktop adapter
-> IPC `audio:setEQ`
-> `AudioService.setEQ()`
-> `AudioBridge::setEQ()`
-> `AudioEngine::setEQ()`
-> mic `HighPassFilter`
-> coefficient update
-> audio callback.

Actual issues found:

The SDK type already exposed `highPassFilter`, but the native addon and bridge did not carry that field into the engine.

The RJ mic panel currently exposes gain and low/mid/high EQ controls; no dedicated HPF control was found in the RJ mic UI during this audit.

Correction:

The existing `setEQ` payload now carries an optional `highPassFilter` field through `AudioBridge` and `AudioEngine`.

When present, `AudioEngine::setEQ()` updates the channel `HighPassFilter` cutoff and bypasses the HPF when the cutoff is `<= 0`.

### Master Gain

Intended path:

React master volume knob
-> `audio.setMasterGain()`
-> Desktop adapter
-> IPC `audio:setMasterGain`
-> `AudioService.setMasterGain()`
-> `AudioBridge::setMasterGain()`
-> `AudioEngine::setMasterGain()`
-> `MasterGainProcessor`
-> master DSP chain
-> complete mix level changes.

Actual issue found:

`PlayerAudioFXPanel` had an `onMasterVolumeChange` prop, but `RjSetupModal` mounted the panel without passing a callback. The knob only updated local React state.

Correction:

`RjSetupModal` now passes `onMasterVolumeChange` and converts the dB knob value to linear gain before calling `audio.setMasterGain()`.

The native engine path was already routed to `MasterGainProcessor`; it does not modify mixer channel gains.

### Master Meter

Intended path:

`OutputStage`
-> master DSP
-> `MeterEngine`
-> `AudioBridge::getMeterSnapshot()`
-> `AudioService` polling
-> `meters:update`
-> RJ master meter UI.

Actual issue found:

The RJ master output panel generated random VU values with `Math.random()` when its local live toggle was on. This made the meter move even when playback was stopped and microphones were silent.

Correction:

`PlayerAudioFXPanel` now subscribes to the existing `meters:update` event and displays `masterPeakL/masterPeakR`, falling back to RMS if needed. The random meter animation was removed.

## Processor Validation

`GainProcessor`: microphone gain is owned by `MicrophoneSource::setGain()` and processed inside the mic DSP chain.

`HighPassFilter`: `prepare()` initializes coefficients, `reset()` clears state, `setCutoffFrequency()` updates the target cutoff, and `process()` recalculates coefficients when the target changes.

`EQProcessor`: `prepare()` initializes filters, `reset()` clears state, band setters update atomic target gains, and `process()` applies coefficient updates per block.

`MasterGainProcessor`: `AudioEngine::setMasterGain()` resolves the master DSP chain's `MasterGain` slot and calls `setGainLinear()`.

## Files Modified

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/modals/RjSetupModal.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/PlayerAudioFXPanel.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/addon.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.h`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.h`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`

## Validation Results

Native addon rebuild:

`npm run build:native` completed successfully and produced `melodymeet_addon.node`.

Frontend type check:

`npx tsc --noEmit` completed without errors.

Desktop app:

The desktop app was launched with `npm run dev:desktop` for manual validation.

Manual audible validation still requires local listening through the active audio hardware:

- RJ microphone gain should now increase/decrease volume.
- RJ microphone EQ should now change tone.
- Existing `highPassFilter` SDK calls should now update the mic/deck HPF processor when sent.
- Master Gain should now change the complete mix level.
- Master Meter should now follow the processed master signal and return to zero when native meter snapshots are silent.

## Remaining Work

No architecture work is required for the repaired paths above.

The RJ mic UI does not currently expose a dedicated HPF control in the audited component. The existing SDK/native `highPassFilter` path is now connected, but an audible RJ HPF knob cannot be validated from that panel until an existing UI surface sends that field.
