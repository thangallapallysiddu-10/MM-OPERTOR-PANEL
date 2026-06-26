# MelodyMeet Native Audio Engine Audit

## Executive Summary
The native audio engine is organized around the right core idea: the engine owns the realtime graph, the mixer and DSP chains are kept mostly allocation-free during processing, and the Electron layer is supposed to stay at the edge. That part is broadly sound.

The main problems are not raw signal-path design, but lifecycle and synchronization discipline. Several control-path operations still spin-wait on audio-thread activity, the engine clock and some snapshot state are not safely published across threads, and the Electron bridge still relies on polling plus version-diffing instead of a cleaner event flow. There are also a few concrete correctness bugs, including an incorrect microphone device lookup, cue-point logic that is wired but not actually used, and incomplete meter propagation through the IPC layer.

The engine is usable, but it still reads like a system that was built to be low-latency first and then wrapped for desktop delivery later. The cleanup work should focus on making the ownership model explicit, removing the last brittle wait-loops, and tightening the bridge contract so the Electron side cannot silently drift away from the native engine.

Implementation note:

- Phase 1 compilation fixes were applied after this audit draft in the desktop renderer layer. The frontend TypeScript check now passes, which unblocks the next roadmap phase without changing the native engine itself.

## Architecture Review
The high-level architecture is sensible for a desktop-only product:

`React UI -> Electron IPC -> Native Audio Engine -> Mixer / Playback / DSP / Output`

Inside the engine, `AudioEngine` is the main composition root. It owns audio session state, device management, clocking, callback wiring, the mixer, output stage, recorder, broadcast pipeline, microphone input, and both deck players. That is a good shape for desktop-only ownership, and it keeps most of the native graph in one place.

The weak spot is the boundary around the engine. The Electron layer does not talk to a push-based native event surface directly; instead `AudioService` polls the addon every 50 ms and diff-checks state and version counters. That works, but it creates redundant bookkeeping and makes the IPC contract harder to reason about than it needs to be.

There is also some contract drift between layers:

- `AudioBridge` is a second wrapper around `AudioEngine` on top of the N-API addon.
- `AudioService` repeats caching, polling, and diff logic instead of relying on a stronger native event model.
- Some methods no-op when the engine is uninitialized, while others throw, so lifecycle errors are not handled consistently.
- The meter snapshot path is incomplete: the IPC surface exposes deck and mic meters, but the bridge currently only populates master meters.

In short, the core engine architecture is fine, but the boundary layers have accumulated too much policy and too many partial fallbacks.

## Engine Flow
The current flow is roughly:

1. `EngineHost` creates `AudioEngine`.
2. `AudioEngine::initialize()` brings up the session, device manager, clock, buffer pool, output stage, mixer, recorder, broadcast pipeline, deck players, microphone source, input manager, engine statistics, and audio callback.
3. The audio callback drives the realtime block processing path.
4. Deck playback flows through `DeckPlayer -> PlaybackController -> Transport -> AudioDecoder / AudioFileManager`.
5. Mixer output feeds the output stage, which in turn feeds meters, recording, and broadcast.
6. Input capture flows through `InputManager -> MicrophoneSource -> mixer / output DSP path`.

That flow is coherent, but a few pieces deserve attention:

- `DeckPlayer` owns both file management and transport control, which makes it a combined playback orchestrator rather than a thin deck abstraction.
- `PlaybackController` owns transport timing logic, but cue-point behavior is not actually used in the end-of-file path.
- `AudioDecoder` is synchronous and decodes the full file into memory, which is acceptable on the control thread, but makes large-file memory usage a deliberate tradeoff.
- `Recorder` and `BroadcastPipeline` both depend on the output path and lifecycle ordering being correct, and both use control-thread synchronization patterns that can stall shutdown or reconfiguration.

The dataflow itself is not broken, but the control surface around it is more fragile than the signal path.

## Thread Safety
The engine uses atomics in many of the right places, especially for state that is read from the UI side while being updated by audio-thread code. Examples include deck playback state, transport position, crossfade and gain values, processor enable flags, meter values, and broadcast statistics.

The main thread-safety risks are these:

- `AudioClock` is plain mutable state with no atomic publication. If anything reads it while the audio callback is advancing it, that is a race.
- `Recorder::isRecording()` and `Recorder::getActiveSession()` are not safely synchronized for cross-thread reads.
- `InputManager::getCurrentInputDevice()` appears to return a best-effort device rather than the actual selected device, so it is both a correctness issue and a state coherence issue.
- `DSPChain` uses a raw-pointer swap model with control-thread spin-waits before deletion. That is essentially a hand-rolled RCU pattern, but it is easy to misuse and difficult to prove safe under all shutdown sequences.
- `DeckPlayer::load()` and `DeckPlayer::reset()` spin-wait on `processing_`, which means a control-thread call can block waiting for the audio path to finish a block.
- `Mixer::unregisterSource()` and `Mixer::clearSources()` also wait for processing to drain before releasing sources.

Those wait loops are the biggest thread-safety smell in the engine. They are trying to protect realtime ownership, but they do so by parking the control thread in a busy wait. That is not a great long-term shape for a desktop app with a UI thread and a realtime audio thread.

## Realtime Safety
The core processing code is reasonably disciplined. The mixer, DSP processors, meters, and most transport state updates avoid obvious dynamic allocation in the audio path. That is the good news.

The remaining realtime risks are mostly indirect:

- `DSPChain` publishes new processor chains by allocating a fresh vector and then waiting for the old chain to go idle before deletion. The allocation is control-thread only, which is fine, but the handoff model is still delicate.
- `Recorder` depends on `RecordingSession` and a background writer, which is appropriate, but its stop path still spins until processing completes.
- `AudioDecoder` fully decodes into memory up front. That keeps the audio thread simple, but it shifts latency and memory pressure into load time.
- `EngineStatistics::reportCallback()` and the meter update helpers use atomic loops. That is acceptable if the work stays tiny, but it should remain trivial and predictable.
- Logging through `std::cout` is sprinkled through the engine and device code. Even if most logging is on control paths, it is still worth treating as a desktop integration liability rather than a realtime tool.

The engine is mostly realtime-aware, but the control-thread spin waits and heavy load-time decode strategy mean it is not yet a clean realtime story end to end.

## IPC Review
The Electron integration is functional but uneven.

`AudioBridge` exposes a broad native surface through the addon, and `AudioService` wraps that for the renderer. That part is straightforward. The issues are in consistency and completeness:

- `AudioService` polls the addon every 50 ms and emits diffs, instead of consuming native push events directly.
- The addon and bridge expose version and snapshot APIs, but the service still keeps its own cache and poll loop.
- `AudioBridge::getVersions()` contains a hacky broadcast-version retrieval path instead of a clean version source for each subsystem.
- `AudioBridge::getMeterSnapshot()` currently leaves deck and microphone meter fields at zero, so the exposed API is broader than the implemented data.
- Several bridge methods return silently when the engine is not initialized, while others throw. That makes IPC failure handling inconsistent for the renderer.
- The renderer contract is also easy to drift: the preload exposes `window.audio`, while some frontend code paths have expected a different name.

This is not a broken IPC stack, but it is still more brittle than it should be for a desktop-only app where the native engine is the real source of truth.

## Initialization Review
Initialization is broadly staged in the right order:

1. Create the session and device objects.
2. Prepare buffer and DSP subsystems.
3. Prepare decks, microphone, recorder, and broadcast pieces.
4. Register callbacks with the device manager.
5. Mark the engine ready.

That is sensible, but there are some caveats:

- `AudioBridge::initialize()` throws if called twice, while some higher-level callers use a softer guard pattern.
- `AudioService` swallows addon load failures into internal state, which can leave the app in a weakly initialized condition unless the renderer checks for it explicitly.
- Partial failure handling in `AudioEngine::initialize()` should be treated carefully. The overall setup order is good, but the cleanup guarantees across all exceptional paths deserve scrutiny.
- `EngineHost` adds another lifecycle wrapper around the engine, which is fine for a standalone executable but unnecessary complexity for the desktop product path if it stays around long-term.

The main initialization risk is not the order itself, but the number of layers that each maintain their own notion of whether the engine is ready.

## Shutdown Review
Shutdown order is mostly sensible and follows the reverse of initialization:

1. Stop broadcast.
2. Stop recording.
3. Stop microphone capture.
4. Remove the audio callback.
5. Shut down the mixer, output, decks, microphone, and buffers.
6. Shut down device and session objects.

That said, the shutdown path still has edge risks:

- `Recorder::stopRecording()` spin-waits for processing to drain.
- `DeckPlayer` and `DSPChain` also rely on control-thread waiting before releasing shared state.
- `AudioService.shutdown()` can be called both from explicit IPC and from app shutdown hooks, so double shutdown needs to remain benign.
- `AudioBridge::~AudioBridge()` performs shutdown under lock and swallows exceptions, which is pragmatic but makes destructor behavior less transparent.

So the sequence is correct, but the implementation still depends on cooperative timing from realtime code. That is the part worth tightening.

## Bugs
The clearest concrete bugs or correctness issues I found are:

- `InputManager::getCurrentInputDevice()` does not appear to return the actual selected input device. It falls back to the first available device, which can report the wrong active microphone.
- `PlaybackController` stores a cue point, but the end-of-file loop path always seeks to `0.0` instead of using the cue point when one is defined. That makes the cue-point path effectively dead.
- `AudioBridge::getMeterSnapshot()` does not populate deck or microphone meters, even though those fields exist in the API.
- `Recorder::isRecording()` can report stale or racy state because the underlying ownership is not fully synchronized for cross-thread observation.
- `AudioClock` can race with UI/control-thread reads if it is queried while the audio callback is advancing it.
- `AudioBridge` has inconsistent uninitialized behavior: some methods no-op, others throw, which can hide real lifecycle bugs from the renderer.

## Dead Code
The most obvious dead or effectively dead paths are:

- `PlaybackController` cue-point support in the looping end-of-file path.
- `BroadcastSession` reconnecting state, which is present in the snapshot shape but appears to stay false.
- The deck and microphone meter fields in the bridge snapshot, which are exposed but not actually filled.
- Some higher-level wrapper logic in `AudioService` that duplicates state diffing already implied by native version counters.

There may be more dead code hidden in the renderer-facing wrappers, but the items above are the ones that are clearly visible from the native engine and bridge layers.

## Technical Debt
The engine is carrying a few patterns that work today but are expensive to maintain:

- Raw-pointer publication with spin-wait deletion in `DSPChain` and related control paths.
- Busy-wait synchronization in `DeckPlayer`, `Mixer`, and `Recorder`.
- Layered wrappers that each maintain their own lifecycle and version semantics.
- Synchronous whole-file decode as the default playback model.
- Debug logging left in hot or frequently called control paths.
- Placeholder or incomplete state surfaces, especially around broadcast reconnecting and meter reporting.

None of these are catastrophic on their own, but together they make the system harder to extend safely.

## Files To Refactor
These are the files I would put at the top of the refactor list:

- `melodymeet-audio-engine/src/engine/AudioEngine.cpp`
- `melodymeet-audio-engine/src/engine/AudioEngine.h`
- `melodymeet-audio-engine/src/audio/dsp/DSPChain.cpp`
- `melodymeet-audio-engine/src/audio/dsp/DSPChain.h`
- `melodymeet-audio-engine/src/deck/DeckPlayer.cpp`
- `melodymeet-audio-engine/src/deck/DeckPlayer.h`
- `melodymeet-audio-engine/src/playback/PlaybackController.cpp`
- `melodymeet-audio-engine/src/playback/PlaybackController.h`
- `melodymeet-audio-engine/src/audio/recorder/Recorder.cpp`
- `melodymeet-audio-engine/src/audio/recorder/Recorder.h`
- `melodymeet-audio-engine/src/core/AudioClock.cpp`
- `melodymeet-audio-engine/src/core/AudioClock.h`
- `melodymeet-audio-engine/src/audio/input/InputManager.cpp`
- `melodymeet-audio-engine/src/audio/input/InputManager.h`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/services/AudioService.js`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.cpp`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/native/AudioBridge.h`
- `Melodymeet-frontend/OPERATOR_PANEL/electron/main.js`

## Recommended Cleanup Order
1. Fix bridge and IPC contract drift first: meter snapshot completeness, initialization behavior, and the renderer-facing API shape.
2. Remove the control-thread spin waits from `DSPChain`, `DeckPlayer`, `Mixer`, and `Recorder` or replace them with a safer handoff model.
3. Make clock and snapshot state publication explicit, especially `AudioClock` and recording state.
4. Fix the concrete correctness bugs: microphone device lookup, cue-point behavior, and incomplete meter reporting.
5. Simplify native lifecycle ownership so `AudioEngine`, `AudioBridge`, `EngineHost`, and `AudioService` do not each carry overlapping ready/shutdown logic.
6. Clean up dead or placeholder state such as reconnecting flags and any redundant wrapper code.
7. After the structural work, remove debug logging and re-check the shutdown path under repeated initialize/shutdown cycles.
