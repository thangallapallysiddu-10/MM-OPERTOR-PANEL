# Desktop Integration Master Plan

## 1. Executive Summary
MelodyMeet is now a desktop-only product, and the architecture needs to reflect that everywhere: React must be presentation only, the Unified Audio SDK must be the only frontend audio entrypoint, Electron IPC must be a thin transport, `AudioService` must be the runtime bridge, and the native addon plus native engine must own all audio truth.

The two audits point to the same root issue from different angles. The frontend still contains browser audio, Expo/mobile, and local playback logic; the native side is broadly well-shaped but still has control-thread spin waits, incomplete bridge mappings, and some racy state publication. The integration problem is not one bug. It is an ownership problem.

The system should be normalized around one rule:

`React UI -> Unified Audio SDK -> Electron IPC -> AudioService -> Native Node Addon -> MelodyMeet Audio Engine`

Anything that mixes browser audio, React timing, or duplicate transport logic into the UI layer should be removed or moved behind the SDK. Anything that makes the native bridge silently fall back, poll awkwardly, or expose partial snapshots should be corrected before fresh integration.

## 2. Current Architecture
The current state is split across two partially overlapping stacks.

Frontend audit findings:

- React still owns browser playback in multiple places.
- Hooks perform playback, crossfade timing, recording, WebRTC, and microphone logic.
- The repo still contains Expo/mobile/web scaffolding.
- The current desktop SDK path is inconsistent because some components use `window.audio`, some still reference `window.audioEngine`, and some paths still bypass the SDK entirely.

Native engine audit findings:

- The native engine is the proper audio authority and already owns mixer, transport, DSP, recording, broadcast, microphones, and output.
- The Electron bridge is functional, but it is not yet a clean contract.
- `AudioService` polls the addon every 50 ms instead of being driven by a native event model.
- Some engine state is not safely published across threads, and there are control-thread spin waits during deck, DSP, mixer, and recorder lifecycle changes.

Cross-audit pattern:

- Frontend duplication mirrors native duplication.
- Browser audio logic exists where native commands should exist.
- Desktop bridge methods exist, but SDK and renderer contracts are not fully aligned.
- The engine is the single source of truth in principle, but not yet in practice for the renderer.

## 3. Target Architecture
The target stack is:

`React UI -> Unified Audio SDK -> Electron IPC -> AudioService -> Native Node Addon -> MelodyMeet Audio Engine`

Ownership boundaries:

- React: layout, forms, routing, view state, interaction intent, display of snapshots.
- Unified Audio SDK: one typed desktop audio API for the renderer.
- Electron IPC: transport only, no audio policy.
- AudioService: runtime orchestration, polling or event fanout, local caching if needed, app lifecycle glue.
- Native Node Addon: thin binding layer and serialization boundary.
- MelodyMeet Audio Engine: all audio, timing, DSP, transport, metering, recording, broadcast, and device authority.

Hard rules:

- React must not create audio graphs, manage recording streams, or sequence transport.
- No browser audio APIs in production desktop paths.
- No parallel playback stacks.
- No silent fallback from desktop SDK to web adapters in a packaged desktop build.
- Native engine state is authoritative even when the UI is disconnected or stale.

## 4. Ownership Matrix
There must be exactly one owner for each subsystem.

| Subsystem | ONLY Owner | Notes |
|---|---|---|
| Playback | MelodyMeet Audio Engine | Deck playback, play/pause/stop/seek, end-of-track behavior. |
| Transport | MelodyMeet Audio Engine | Position, looping, cue points, state transitions. |
| Decoder | MelodyMeet Audio Engine | File decode, load, sample delivery. |
| Mixer | MelodyMeet Audio Engine | Channel routing, gain, solo, mute, crossfade. |
| Crossfade | MelodyMeet Audio Engine | Ramp timing and curve should live natively. |
| EQ | MelodyMeet Audio Engine | Deck and mic EQ processing. |
| DSP | MelodyMeet Audio Engine | Channel and master DSP chains. |
| Compressor | MelodyMeet Audio Engine | Master or channel compressor state and processing. |
| Limiter | MelodyMeet Audio Engine | Master limiting and protection. |
| Recording | MelodyMeet Audio Engine | Capture, state, file output, timing. |
| Broadcast | MelodyMeet Audio Engine | Stream state, stats, send path. |
| Microphones | MelodyMeet Audio Engine | Device selection, capture, gain, mute, metering. |
| Metering | MelodyMeet Audio Engine | Peak, RMS, load, session stats. |
| Clock | MelodyMeet Audio Engine | Audio clock and timeline truth. |
| Session State | MelodyMeet Audio Engine | Engine initialization, running, shutdown. |
| UI State | React UI | Pure presentation state only. |
| Navigation | React UI | Route and screen selection only. |
| Forms | React UI | User input, validation, and intent capture. |
| Settings | Unified Audio SDK, backed by Engine | UI edits settings; engine stores and applies them. |
| Device Lists | MelodyMeet Audio Engine | Source of truth for available devices. |
| Track Metadata | MelodyMeet Audio Engine | No HTMLAudioElement probing in UI. |
| Event History | AudioService | Delivery and fanout of engine events to windows. |
| Native Bridge Contract | Native Node Addon | Serialization and API mapping only. |

Ownership notes:

- If a subsystem influences sound, timing, or hardware, the engine owns it.
- If a subsystem is about drawing controls or collecting user intent, React owns it.
- If a subsystem is about moving data across process boundaries, IPC / AudioService owns it.
- If a subsystem is about method shape and marshalling, the addon owns it.

## 5. Integration Gap Report
Current -> Required:

| Current | Required |
|---|---|
| React playback hooks | Native playback via Unified Audio SDK |
| `new Audio()` / `HTMLAudioElement` preview paths | Native deck/preview or metadata APIs |
| `AudioContext` / Web Audio graphs | Native DSP and mixer ownership |
| `MediaRecorder` / `navigator.mediaDevices` | Native recording and microphone APIs |
| WebRTC audio processing hooks | Native broadcast or control-plane only |
| `AudioEngineManager` | Unified Audio SDK |
| `DeckEngine` | Unified Audio SDK deck APIs |
| `PlaybackController` in React | Native transport and SDK snapshots |
| `MicEngine` / `MicrophoneManager` in React | Native microphone APIs |
| `DSPChain` in React | Native DSP APIs |
| `AudioGraph` in React | Native mixer / output graph |
| Browser mixer math | Native mixer |
| Browser crossfader timing | Native crossfade timing |
| Browser playback timing | Native transport timing |
| Browser decoding | Native decoder |
| `window.audioEngine` | `window.audio` / Unified Audio SDK |
| Expo / web / mobile runtime branches | Desktop-only renderer bundle |
| Polling ad hoc audio logic in hooks | Native snapshots and events only |

Frontend-specific gaps from the audit:

- `usePlaylistPlayer.ts`, `LocalFilesUploader.tsx`, `PodcastPlaylistModal.tsx`, `localFileUpload.ts`, `usePeerConnections.ts`, `useLiveStream.ts`, and `useRecording.ts` still contain browser audio behavior or audio logic that should not live in React.
- `usePlayer.ts`, `usePlaylist.ts`, `useAudioEffects.ts`, `useStream.ts`, and `DualPlayer.tsx` still mix UI with transport, crossfade, or timing behavior.
- Desktop bridge contract drift exists between preload, SDK adapter, and renderer expectations.

Native-specific gaps from the audit:

- Meter snapshots are incomplete through the bridge.
- `AudioClock` is not safely published for cross-thread reads.
- `Recorder`, `Mixer`, `DeckPlayer`, and `DSPChain` still use control-thread spin waits.
- `InputManager` reports the wrong selected input device.

## 6. SDK Contract
The Unified Audio SDK must be the one renderer-facing public surface for audio.

### Required Public API

```text
initialize()
shutdown()

loadDeck()
unloadDeck()
play()
pause()
stop()
seek()

setDeckGain()
setMasterGain()
setCrossfade()

setEQ()
getEQ()
setCompressor()
getCompressor()
setLimiter()
getLimiter()

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
getEngineInfo()
getEngineHealthSnapshot()
getMixerSnapshot()
getMicrophoneSnapshot()
getMeterSnapshot()
getVersions()

getAvailableInputDevices()
muteDeck()
soloDeck()
resetMixer()
resetDSP()

on()
off()
```

### Mapping Verification
This is the required mapping chain:

`React -> Unified Audio SDK -> Electron IPC -> AudioService -> Native Node Addon -> AudioBridge -> AudioEngine`

Observed mapping status:

| API | Mapping Status | Notes |
|---|---|---|
| `initialize()` | Present | Exists through preload, service, addon, bridge, engine. |
| `shutdown()` | Present | Exists through preload, service, addon, bridge, engine. |
| `loadDeck()` | Present | Maps cleanly. |
| `unloadDeck()` | Present | Maps cleanly. |
| `play()` | Present | Maps cleanly. |
| `pause()` | Present | Maps cleanly. |
| `stop()` | Present | Maps cleanly. |
| `seek()` | Present | Maps cleanly. |
| `setDeckGain()` | Present | Maps cleanly. |
| `setMasterGain()` | Present | Present in bridge and preload. |
| `setCrossfade()` | Present | Present in bridge and preload. |
| `setEQ()` | Present | Present in bridge and preload. |
| `getEQ()` | Present | Present in bridge and preload. |
| `setCompressor()` | Present | Present in bridge and preload. |
| `getCompressor()` | Present | Present in bridge and preload. |
| `setLimiter()` | Present | Present in bridge and preload. |
| `getLimiter()` | Present | Present in bridge and preload. |
| `enableMicrophone()` | Present | Maps cleanly. |
| `disableMicrophone()` | Present | Maps cleanly. |
| `setMicrophoneGain()` | Present in bridge/preload, missing from frontend types in some places | Contract drift, not engine missing. |
| `muteMicrophone()` | Present | Maps cleanly. |
| `startRecording()` | Present | Maps cleanly. |
| `pauseRecording()` | Present | Bridge exists, needs explicit SDK type alignment. |
| `resumeRecording()` | Present | Bridge exists, needs explicit SDK type alignment. |
| `stopRecording()` | Present | Maps cleanly. |
| `startBroadcast()` | Present | Maps cleanly. |
| `stopBroadcast()` | Present | Maps cleanly. |
| `getPlaybackSnapshot()` | Present | Maps cleanly. |
| `getDSPSnapshot()` | Present | Maps cleanly. |
| `getRecordingSnapshot()` | Present | Maps cleanly. |
| `getBroadcastSnapshot()` | Present | Maps cleanly. |
| `getEngineInfo()` | Present | Preload exposes `getEngineInfo`; SDK should not call a stale `engineInfo`. |
| `getEngineHealthSnapshot()` | Present | Through addon/service. |
| `getMixerSnapshot()` | Present | Present, but frontend contract must align. |
| `getMicrophoneSnapshot()` | Present | Present, but meters/device reporting must be validated. |
| `getMeterSnapshot()` | Present | Incomplete on native bridge: deck and mic meters are zeroed. |
| `getVersions()` | Present | Present, but bridge implementation is hacky and should be normalized. |
| `getAvailableInputDevices()` | Present | Maps cleanly. |
| `muteDeck()` | Present | Maps cleanly. |
| `soloDeck()` | Present | Present in bridge/preload. |
| `resetMixer()` | Present | Present in bridge/preload. |
| `resetDSP()` | Present | Present in bridge/preload. |
| `on()` / `off()` | Present | Event subscription exists via AudioService event fanout. |

### Missing or Inconsistent Mappings
- `window.audioEngine` is stale; the live bridge is `window.audio`.
- `getEngineInfo()` is the exposed preload name, while some SDK code still expects `engineInfo()`.
- `version()` and `isInitialized()` exist in addon/bridge semantics, but the frontend SDK contract is not consistently aligned to them.
- Meter payloads are not complete enough for deck and microphone UI ownership.
- The frontend types and desktop adapter do not fully describe the native public surface.

## 7. Cleanup Roadmap

### Phase 1: Compilation Fixes
- Repair frontend TypeScript errors.
- Remove or fix stale `window.audioEngine` references.
- Fix missing imports and undefined symbols in the desktop renderer.
- Ensure the app starts cleanly in Electron without web/mobile branches.

### Phase 2: SDK Contract Fixes
- Make the Unified Audio SDK desktop-only.
- Remove fallback to web adapters in packaged desktop builds.
- Align SDK method names with preload, AudioService, addon, bridge, and engine.
- Make missing bridge methods fail loudly and consistently.

### Phase 3: Frontend Cleanup
- Remove browser audio code, WebRTC audio processing, MediaRecorder, AudioContext, and `new Audio()` playback paths.
- Move playback, timing, crossfade, and playlist completion logic to engine-driven snapshots and commands.
- Keep React as UI, not audio control logic.

### Phase 4: Engine Cleanup
- Fix control-thread spin waits.
- Make clock, recording, and snapshot state publication safe.
- Fix microphone device lookup and meter completeness.
- Normalize initialization and shutdown behavior.

### Phase 5: Fresh Integration
- Rewire the renderer to the Unified Audio SDK only.
- Validate every public command and snapshot path.
- Remove stale bridge assumptions and dead fallback code.

### Phase 6: System Validation
- Test initialize/shutdown cycles repeatedly.
- Verify load/play/pause/stop/seek.
- Verify mixer, EQ, compressor, limiter, mic, record, and broadcast commands.
- Verify event fanout and meter refresh.
- Verify no browser audio code remains in the active desktop path.

## 8. Integration Checklist
- [ ] React only owns presentation, forms, and navigation.
- [ ] Unified Audio SDK is the only renderer audio API.
- [ ] No `window.audioEngine` references remain.
- [ ] No browser audio playback remains in feature hooks or components.
- [ ] No `AudioContext`, `HTMLAudioElement`, `new Audio()`, `MediaRecorder`, or `navigator.mediaDevices` remain in desktop audio paths.
- [ ] `AudioService` is the only Electron-side audio orchestrator.
- [ ] Native addon methods match SDK methods exactly.
- [ ] `AudioBridge` returns complete meter and snapshot data.
- [ ] Audio engine owns playback, transport, decoder, mixer, DSP, recording, broadcast, microphones, clock, and session state.
- [ ] Crossfade and timing are engine-owned.
- [ ] Initialization is idempotent or explicitly guarded.
- [ ] Shutdown is safe across repeated calls.
- [ ] Frontend build is desktop-only.
- [ ] Electron startup is clean without fallback audio behavior.
- [ ] TypeScript passes.
- [ ] Desktop smoke tests pass end to end.

## 9. Technical Debt
The combined audits show a few recurring debt themes:

- Duplicate ownership between React hooks and native engine logic.
- Bridge contract drift between preload, SDK, AudioService, addon, and engine.
- Poll-based event flow where a stronger event model is preferred.
- Busy-wait synchronization in native control paths.
- Stale mobile/web scaffolding inside a desktop product.
- Placeholder or partial data surfaces, especially meters and reconnecting state.
- Debug/test code that still sits in runtime paths.

This debt is not random. It is the residue of a product that started with browser and hybrid assumptions and is now being pulled into a desktop-native architecture.

## 10. Risks
Primary risks:

- UI and native bridge drift can keep the app appearing functional while silently using the wrong code path.
- The frontend may continue to own playback or recording timing if stale hooks are not removed.
- Native control-thread spin waits can cause stalls during load, reset, or shutdown.
- Incomplete meter or device snapshots can make desktop state look healthy when it is not.
- Silent adapter fallbacks can mask broken preload or addon wiring.
- Expo/web/mobile assets may continue to leak into production build assumptions.

Secondary risks:

- User-facing behavior may differ across renderer windows because `AudioService` currently fans out via polling and diffing.
- Debug panels can keep old bridge names alive and confuse future cleanup.
- The native engine can be correct while the SDK contract is still wrong, which makes integration regressions easy to miss.

## 11. Success Criteria
The desktop integration is ready when all of the following are true:

- The renderer uses only the Unified Audio SDK.
- The SDK maps cleanly through Electron IPC, `AudioService`, addon, bridge, and engine.
- React no longer contains browser audio, WebRTC audio processing, or transport ownership.
- The native engine is the only source of truth for playback, mixer, DSP, mic, recording, broadcast, transport, and metering.
- Meter, snapshot, and event data are complete and consistent.
- Initialization and shutdown are repeatable and deterministic.
- No stale web/mobile/Expo architecture remains in the active desktop product path.
- TypeScript and desktop runtime validation both pass.

## 12. Final Readiness Assessment
Current readiness: **not ready for fresh desktop integration yet**.

Why:

- The frontend still contains substantial browser-side audio and timing logic.
- The SDK contract is not yet cleanly aligned across all layers.
- The native bridge has incomplete snapshot data and some lifecycle inconsistency.
- The native engine still has a few control-thread safety problems that should be cleaned before the UI is fully reattached.

What is already solid:

- The native engine architecture is the right long-term foundation.
- The mixer, playback, recorder, broadcast, and DSP domains are already centralized in the engine.
- The desktop bridge exists and is close to being the correct seam.

Bottom line:

The project is architecturally close, but not yet clean enough to treat the desktop stack as a single owned system. The next step is to remove frontend audio ownership, align the SDK contract, and then re-integrate against the engine with a tighter desktop-only boundary.

Implementation note:

- Phase 1 is complete. The desktop renderer TypeScript check now passes after fixing the initial compilation blockers in the frontend build path.

Phase 2 progress:

- Unified Audio SDK contract alignment is in place for the desktop renderer and Electron bridge.
- The desktop TypeScript build still passes after the contract updates.
- Remaining work in later phases is native cleanup and integration, not SDK name drift.

Phase 3A progress:

- React audio ownership removal is underway on the desktop renderer.
- Browser audio APIs have been removed from the active desktop source tree.
- The desktop TypeScript build passes after the React-side cleanup pass.
- Remaining cleanup is limited to later phase work around sequencing and deeper engine-event reconciliation.
