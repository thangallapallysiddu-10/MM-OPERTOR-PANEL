# RJ Audio Signal Flow Validation

Validation date: 2026-06-26

Scope: native RJ engine signal flow only, with supporting bridge/frontend references where they prove ownership or routing. Podcast was inspected only to confirm recorder ownership and was not modified.

## Intended Flow Summary

The required RJ broadcast path is:

1. Playlist acts only as a media library.
2. A selected deck loads media and owns playback.
3. Each deck renders through its own independent chain: Gain -> High Pass Filter -> Low Pass Filter -> Equalizer -> optional Delay -> Limiter.
4. Each microphone captures independently and renders through its own independent chain: Gain -> High Pass Filter -> Equalizer -> Compressor -> Limiter.
5. Mixer clears a master/program buffer, requests processed audio from every source, and sums each source exactly once.
6. Master bus applies Master Gain -> Master Compressor -> Master Limiter.
7. Master meter, hardware output, broadcast output, and recorder all receive the same final processed master buffer.

## Actual Engine Signal Flow

### Audio Callback Entry

Files:

- `melodymeet-audio-engine/src/audio/AudioCallback.cpp`
- `melodymeet-audio-engine/src/engine/SessionManager.cpp`
- `melodymeet-audio-engine/src/engine/RJSession.cpp`

Actual callback path:

```text
JUCE audio device output callback
-> AudioCallback::audioDeviceIOCallbackWithContext()
-> clear hardware output buffer
-> SessionManager::process()
-> RJSession::process()
-> Mixer::process(output hardware buffer)
-> OutputStage::process(output hardware buffer)
-> copy OutputStage processed buffer back to hardware output buffer
-> BroadcastPipeline::process(output hardware buffer)
```

`AudioCallback` explicitly ignores `inputChannelData` and `numInputChannels`; microphone capture is handled by a separate `InputManager` callback registered with `DeviceManager`.

### Playlist

Files:

- `melodymeet-backend/services/operator/services/rj.service.js`
- `melodymeet-backend/services/operator/services/rj.playlist.js`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/modals/PlaylistModal.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/modals/RjSetupModal.tsx`

The native engine has no playlist processor. Native playback is loaded directly through:

```text
AudioBridge::loadDeck(deckId, path)
-> RJSession
-> PlaybackManager::getDeckA()/getDeckB()
-> DeckPlayer::load(path)
```

Backend playlist code stores, orders, times, and resolves playlist items. It does not run native DSP. The frontend playlist modal manages playlist state and offers load/play actions, but the native audio processing starts only after a deck load/play command.

Conclusion: playlist does not own native audio processing.

### Deck Processing

Files:

- `melodymeet-audio-engine/src/engine/RJSession.cpp`
- `melodymeet-audio-engine/src/engine/PlaybackManager.cpp`
- `melodymeet-audio-engine/src/deck/DeckPlayer.cpp`
- `melodymeet-audio-engine/src/audio/dsp/ChannelDSPChain.h`
- `melodymeet-audio-engine/src/audio/dsp/ChannelDSPChain.cpp`

Actual deck path:

```text
Mixer calls DeckPlayer::process()
-> DeckPlayer clears its output scratch
-> DeckPlayer decodes loaded AudioFile into scratch
-> DeckPlayer copies decoded audio to source output
-> DeckPlayer advances transport
-> DeckPlayer runs its owned ChannelDSPChain
-> Mixer receives processed deck buffer
```

`PlaybackManager` constructs two separate `DeckPlayer` instances:

```text
deckA_ = std::make_shared<DeckPlayer>(bufferPool)
deckB_ = std::make_shared<DeckPlayer>(bufferPool)
```

Each `DeckPlayer` constructs its own `ChannelDSPChain` with these processors:

```text
Gain
HighPassFilter
LowPassFilter
Equalizer
Delay
Limiter
```

The chain slot enum also includes `NoiseGate` and `Compressor`, but those slots are not populated by `DeckPlayer`. The deck order therefore matches the intended deck DSP chain.

Conclusion: Deck A and Deck B playback/DSP ownership is isolated by separate `DeckPlayer` instances and separate DSP processor instances.

### Microphone Processing

Files:

- `melodymeet-audio-engine/src/audio/input/InputManager.cpp`
- `melodymeet-audio-engine/src/engine/SessionManager.cpp`
- `melodymeet-audio-engine/src/engine/MicrophoneManager.cpp`
- `melodymeet-audio-engine/src/audio/input/MicrophoneSource.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`

Actual microphone capture path:

```text
InputManager audio device input callback
-> SessionManager::pushAudioInput(inputChannels, numInputChannels, numSamples)
-> for every microphone in active output session:
      mic->pushAudio(the same inputChannels)
```

Actual microphone render path:

```text
Mixer calls MicrophoneSource::process()
-> MicrophoneSource reads from its FIFO
-> applies MicrophoneSource scalar gain while copying FIFO to output
-> runs its owned ChannelDSPChain
-> updates per-mic meter
-> Mixer receives processed mic buffer
```

`MicrophoneManager::initialize(5)` creates five separate `MicrophoneSource` objects for RJ. Each object has its own FIFO, meter, state, and DSP chain.

Actual microphone DSP processors are:

```text
Gain
NoiseGate
HighPassFilter
Compressor
Equalizer
Limiter
```

Because `ChannelDSPChain::Slot` order is fixed, the actual microphone DSP order is:

```text
Gain
NoiseGate
HighPassFilter
Compressor
Equalizer
Limiter
```

This differs from the intended order:

```text
Gain
HighPassFilter
Equalizer
Compressor
Limiter
```

There is also a duplicated gain responsibility: `MicrophoneSource::process()` applies `gain_` directly before the DSP chain, and the chain also owns a `GainProcessor`.

Microphone control APIs currently target only the primary microphone:

```text
AudioEngine::enableMicrophone()
AudioEngine::disableMicrophone()
AudioEngine::setMicrophoneGain()
AudioEngine::muteMicrophone()
AudioEngine::setEQ("Mic", ...)
```

Conclusion: each `MicrophoneSource` owns an independent DSP chain, but RJ microphone capture/control is not independently routed per microphone. The same capture block is pushed into every microphone, while public controls affect only the primary microphone.

### Mixer

Files:

- `melodymeet-audio-engine/src/audio/mixer/Mixer.cpp`
- `melodymeet-audio-engine/src/audio/mixer/MixerChannel.cpp`
- `melodymeet-audio-engine/src/engine/RJSession.cpp`

`RJSession` registers these sources with the mixer:

```text
Deck A
Deck B
RJ microphones
```

Actual mixer path:

```text
Mixer::process()
-> clear program buffer
-> for each registered channel:
      skip disabled/muted/non-solo/inactive sources
      clear scratch buffer
      source->process(scratch)
      apply MixerChannel gain
      sum scratch into program buffer
-> apply Mixer::masterGain_ to program buffer
-> copy program buffer to caller output
```

The mixer does not compress or limit audio. However, it does apply gain at two levels:

- per-channel `MixerChannel` gain, including deck gain/crossfade effective gain
- `Mixer::masterGain_` after summing

Conclusion: the mixer mostly mixes, but it violates the single-responsibility rule because master gain is implemented in `Mixer::process()` instead of exclusively in `OutputStage`/`MasterDSPChain`.

### Master Bus and Output Stage

Files:

- `melodymeet-audio-engine/src/audio/output/OutputStage.cpp`
- `melodymeet-audio-engine/src/audio/output/OutputStage.h`
- `melodymeet-audio-engine/src/audio/dsp/MasterDSPChain.h`
- `melodymeet-audio-engine/src/audio/dsp/MasterDSPChain.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`

Actual master bus path:

```text
OutputStage::process(mixer output)
-> copy mixer output into OutputStage::processedBuffer_
-> MasterDSPChain::process(processedBuffer_)
      MasterGainProcessor
      CompressorProcessor
      LimiterProcessor
-> zero unused tail
-> MeterEngine::process(processedBuffer_)
```

Master compressor and limiter are controlled through `AudioEngine::setCompressor()` and `AudioEngine::setLimiter()`, which resolve processors from `session->getOutputStage().getMasterDSPChain()`.

Problem: `AudioEngine::setMasterGain()` does not control `MasterGainProcessor`. It delegates to:

```text
sessionManager_.getActiveSession()->getMixer().setMasterGain(gain)
```

So the engine contains a proper master gain processor, but the exposed master gain control currently changes mixer state instead.

Conclusion: master compressor and limiter process the final mix only. Master gain affects the complete mixed signal, but it is architecturally placed in the mixer, not in the master bus processor where it belongs.

### Master Metering

Files:

- `melodymeet-audio-engine/src/audio/output/OutputStage.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp`

Actual meter path:

```text
OutputStage::process()
-> MasterDSPChain processes final buffer
-> MeterEngine::process(processedChannelsConst_)
-> AudioBridge::getMeterSnapshot()
      reads session->getOutputStage().getMeterEngine()
```

This means the master meter reads the final processed master buffer, not deck buffers, mic buffers, scratch buffers, or the intermediate mixer program buffer.

When playback is stopped and enabled microphones have no FIFO data, decks/mics output silence, the mixer clears the program buffer, and `OutputStage` processes/meter reads silence. The master meter should return to zero immediately, subject only to whatever smoothing/decay behavior `MeterEngine`, `RMSMeter`, or `PeakMeter` applies internally.

Conclusion: master metering is attached to the final processed master buffer.

### Hardware Output

Files:

- `melodymeet-audio-engine/src/engine/RJSession.cpp`

Actual hardware output path:

```text
Mixer writes to outputChannelData
OutputStage copies/processes outputChannelData into processedBuffer_
RJSession copies OutputStage::getProcessedBuffer() back to outputChannelData
JUCE device emits outputChannelData
```

Conclusion: hardware output receives the final processed master buffer.

### Broadcast Output

Files:

- `melodymeet-audio-engine/src/engine/RJSession.cpp`
- `melodymeet-audio-engine/src/audio/broadcast/BroadcastPipeline.cpp`
- `melodymeet-audio-engine/src/audio/broadcast/BroadcastPipeline.h`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`

Actual broadcast path:

```text
RJSession copies final OutputStage processed buffer to outputChannelData
-> BroadcastPipeline::process(outputChannelData)
-> each registered BroadcastConsumer receives the same buffer
```

This buffer is the post-master-DSP hardware output buffer.

However, `AudioEngine::startBroadcast()` currently returns `true` without registering a `BroadcastConsumer`, and `stopBroadcast()` is effectively a placeholder. Therefore the audio-thread routing is correct for registered consumers, but RJ broadcast session lifecycle is not fully implemented.

Conclusion: broadcast consumers, if registered, receive the final processed master buffer. The public RJ broadcast start/stop path does not currently connect a real consumer.

### Recorder

Files:

- `melodymeet-audio-engine/src/audio/recorder/Recorder.cpp`
- `melodymeet-audio-engine/src/engine/PodcastSession.h`
- `melodymeet-audio-engine/src/engine/PodcastSession.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`

The native recorder exists under `PodcastSession`, not `RJSession`. `RJSession` has no `Recorder` member and does not call recorder processing from the RJ final master buffer.

`AudioEngine::startRecording()` checks `activeSession->supportsRecording()` and then only starts a `PodcastSession` recorder:

```text
if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
    return pod->getRecorder().startRecording(outputFile);
}
```

Conclusion: RJ recorder does not receive the final processed master buffer because RJ native recording is not present. This is a direct mismatch with the intended RJ flow.

## Validation Checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| 1. Playlist owns no audio processing. | Pass for native engine | Native load/play path goes through `AudioBridge::loadDeck()` -> `DeckPlayer::load()`. Playlist services are data/session timing only. |
| 2. Deck DSP is isolated per deck. | Pass | `PlaybackManager` owns separate `DeckPlayer` instances; each `DeckPlayer` owns its own `ChannelDSPChain` and processors. |
| 3. Microphone DSP is isolated per microphone. | Partial | Five `MicrophoneSource` objects have independent DSP chains, but the same captured input is pushed into every mic and controls expose only the primary mic. |
| 4. Mixer only mixes. | Fail | `Mixer::process()` applies `masterGain_` after summing. |
| 5. Master Gain controls the complete mix. | Partial | It affects the complete mix, but via `Mixer::masterGain_`, not `MasterGainProcessor` in the master bus. |
| 6. Master Compressor and Master Limiter process final mix only. | Pass | Compressor and limiter are in `OutputStage` `MasterDSPChain`, after mixer output. |
| 7. Master Meter reads final processed master buffer. | Pass | `OutputStage` meters `processedChannelsConst_` after master DSP. |
| 8. Hardware output receives same final processed master buffer. | Pass | `RJSession` copies `OutputStage::getProcessedBuffer()` back to `outputChannelData`. |
| 9. Recorder receives same final processed master buffer. | Fail | RJ has no recorder. Recorder belongs to `PodcastSession`. |
| 10. Broadcast receives same final processed master buffer. | Partial | `BroadcastPipeline::process()` is called with the final hardware buffer, but RJ `startBroadcast()` does not register a real consumer. |

## Architectural Violations

1. `Mixer` owns master gain.
   - File: `melodymeet-audio-engine/src/audio/mixer/Mixer.cpp`
   - Violation: mixer performs master-bus gain after summing.
   - Impact: shared component responsibility is blurred; `MasterGainProcessor` exists but is not the control target.

2. RJ microphone capture is fanned out to every microphone.
   - File: `melodymeet-audio-engine/src/engine/SessionManager.cpp`
   - Violation: every mic receives the same `inputChannels` block.
   - Impact: multiple RJ microphones are not independently captured, even though each has an independent DSP chain.

3. RJ microphone DSP order does not match the required workflow.
   - File: `melodymeet-audio-engine/src/audio/input/MicrophoneSource.cpp`
   - Actual: Gain -> NoiseGate -> HighPassFilter -> Compressor -> Equalizer -> Limiter.
   - Intended: Gain -> HighPassFilter -> Equalizer -> Compressor -> Limiter.
   - Impact: compressor reacts before EQ rather than after EQ; noise gate is an extra stage not listed in the intended RJ flow.

4. Microphone gain responsibility is duplicated.
   - File: `melodymeet-audio-engine/src/audio/input/MicrophoneSource.cpp`
   - Violation: `MicrophoneSource` applies scalar `gain_` before running a DSP chain that also contains `GainProcessor`.
   - Impact: it is unclear whether mic gain is source capture gain or DSP gain.

5. RJ microphone controls only target the primary microphone.
   - File: `melodymeet-audio-engine/src/engine/AudioEngine.cpp`
   - Violation: `enableMicrophone`, `setMicrophoneGain`, `muteMicrophone`, and channel DSP resolution for `"Mic"` all use `getPrimaryMicrophone()`.
   - Impact: changing one microphone can be impossible independently because the public API does not address individual RJ mics.

6. RJ recorder is absent from the RJ final master path.
   - Files: `melodymeet-audio-engine/src/engine/RJSession.h`, `melodymeet-audio-engine/src/engine/AudioEngine.cpp`
   - Violation: intended RJ recorder output is not implemented in native RJ.
   - Impact: recorder cannot receive the same final processed master buffer in RJ workflow.

7. RJ broadcast lifecycle is a placeholder.
   - File: `melodymeet-audio-engine/src/engine/AudioEngine.cpp`
   - Violation: `startBroadcast()` returns true but does not register a consumer.
   - Impact: final-buffer broadcast routing exists, but public broadcast start does not create a real output path.

## Required Corrections Before Continuing Development

1. Move master gain control out of `Mixer` and into `OutputStage`/`MasterGainProcessor`.
   - `AudioEngine::setMasterGain()` should target the master chain's `MasterGainProcessor`.
   - `Mixer::process()` should stop applying `masterGain_`.
   - Mixer snapshot/state should expose only mixer-owned values or clearly separate master-bus state.

2. Define and implement per-microphone capture routing.
   - Each RJ microphone must map to a specific input device/channel/source.
   - `SessionManager::pushAudioInput()` must not blindly push identical input to every mic.
   - Public controls must address individual microphone IDs.

3. Align RJ microphone DSP order with the required chain.
   - Required chain: Gain -> HighPassFilter -> Equalizer -> Compressor -> Limiter.
   - Remove or explicitly bypass/relocate `NoiseGate` for RJ if it is not part of the intended workflow.
   - Ensure compressor runs after EQ for microphones.

4. Resolve duplicated microphone gain ownership.
   - Choose one responsibility: either source capture gain before DSP or `GainProcessor` inside the chain.
   - Prefer the DSP chain for the intended workflow's `Gain` stage so the source remains capture/FIFO only.

5. Add or route RJ recording to the final processed master buffer before claiming recorder compliance.
   - The recorder must consume the same post-`OutputStage` buffer as hardware and broadcast.
   - Do not reuse Podcast-specific session behavior without a clear RJ ownership boundary.

6. Complete RJ broadcast lifecycle.
   - `startBroadcast()` should register a real `BroadcastConsumer`.
   - `stopBroadcast()` should unregister it.
   - The consumer must continue to receive only the final processed master buffer.

7. Add targeted validation tests before further feature work.
   - Deck isolation: changing Deck A DSP must not change Deck B output.
   - Mic isolation: changing Mic 1 DSP/control must not affect Mic 2.
   - Mixer responsibility: mixer output should be a straight sum of source outputs plus channel gains only.
   - Master responsibility: master gain/compressor/limiter should process only the post-mix buffer.
   - Output parity: hardware, broadcast, and recorder should receive byte-identical final buffers for the same callback block.

