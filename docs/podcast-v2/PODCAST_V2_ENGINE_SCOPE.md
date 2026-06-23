# Podcast V2 Audio Engine Responsibility Scope

Audit date: 2026-06-20  
Scope: current Podcast V2 frontend implementation, current operator backend podcast APIs/sockets, and current shared frontend audio-engine code.  
Rules applied: audit only, current implementation only, no source-code modification, no implementation design.

## Basis For Boundary Decisions

This document assigns final responsibility boundaries from current source evidence:

- Podcast Studio UI exists in `Melody_meet/OPERATOR_PANEL/src/features/podcast`.
- Current real audio primitives are browser/native local primitives in `useLiveStream.ts`, `useRecording.ts`, `usePeerConnections.ts`, and `PodcastPlaylistModal.tsx`.
- Current backend responsibilities are REST APIs, authentication, validation, storage, database models, notifications, live sessions, guest slots, recording files, episode metadata, and socket collaboration.
- A shared Web Audio engine exists under `Melody_meet/OPERATOR_PANEL/src/services/audioEngine`, but no `src/features/podcast` file imports it.
- Empty streaming/audio service files exist at `src/hooks/useAudioEngine.ts`, `src/services/streaming/webrtcService.ts`, `src/services/streaming/encoder.ts`, and `src/services/streaming/websocket.ts`.

Source anchors:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/**`
- `melodymeet-backend/services/operator/routes/podcast.routes.js`
- `melodymeet-backend/services/operator/controllers/podcast.controller.js`
- `melodymeet-backend/services/operator/services/podcast.service.js`
- `melodymeet-backend/services/operator/services/podcast.guest.service.js`
- `melodymeet-backend/services/operator/services/audio.service.js`
- `melodymeet-backend/services/operator/sockets/podcast.socket.js`

## Section 1 - JUCE Audio Engine

Boundary rule from current implementation: any responsibility that must produce, transform, route, meter, monitor, record, or export real-time audio belongs outside React UI and outside Node persistence APIs. The current source shows these responsibilities either implemented with browser audio primitives, simulated in UI, or missing. For the future MelodyMeet Audio Engine, these are JUCE-owned because they require deterministic low-latency audio execution.

### Audio Device Management

- Responsibility: Own physical audio input/output devices, device selection, stream lifecycle, buffer processing, and low-latency I/O.
- Why it belongs in JUCE: Current host mic capture is browser `getUserMedia` in `useLiveStream.ts` and `useRecording.ts`; guest and headphone device management are absent. Device I/O is real-time audio infrastructure, not UI or database work.
- Related frontend components: `LiveSetupModal`, `PodcastSession`, `PodcastAudioDeck`, `PlayerAudioFXPanel`.
- Related backend services: none for device I/O; backend only stores session/mic metadata through podcast routes.

### Host Mic

- Responsibility: Capture host microphone audio and expose it to routing, monitoring, recording, and program output.
- Why it belongs in JUCE: Current host mic is captured separately by `useLiveStream.ts` and `useRecording.ts`, and host tracks are added to WebRTC peers in `usePeerConnections.ts`. The audio signal itself needs low-latency capture and routing.
- Related frontend components: `LiveSetupModal`, `PodcastSession`, `PodcastAudioDeck`.
- Related backend services: `PodcastApi.startLiveSession`, `PodcastApi.uploadRecording`, podcast live/recording routes for metadata and saved files.

### Guest Mics

- Responsibility: Receive and manage guest microphone signals as audio sources.
- Why it belongs in JUCE: Current `GuestRoom.tsx` has local mic UI only; no guest audio capture/transmission is implemented. Once present, guest mic audio is a real-time audio source needing routing, gain, mute, monitoring, and recording.
- Related frontend components: `GuestJoinPage`, `GuestRoom`, `RemoteGuestsPanel`, `PodcastAudioDeck`.
- Related backend services: public guest slot join/leave routes, guest slot controls, podcast socket namespace.

### Remote Guest Audio

- Responsibility: Decode/receive remote guest audio, keep it in sync, route it to the mix, and expose health/metering events.
- Why it belongs in JUCE: Current host-side receive path in `usePeerConnections.ts` uses `RTCPeerConnection`, `AudioContext`, `GainNode`, and destination output. That is signal handling and low-latency monitoring, while backend socket only relays signaling.
- Related frontend components: `PodcastUpload`, `PodcastAudioDeck`, `RemoteGuestsPanel`.
- Related backend services: `/podcast` socket events `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`, guest slot routes.

### Audio Routing

- Responsibility: Connect host mic, guest mics, playback, monitor, recording, effects, and program output into an audio graph.
- Why it belongs in JUCE: Current routing is fragmented: remote audio connects directly to `AudioContext.destination`, playlist audio uses independent `new Audio`, and deck controls are local state. Routing must execute in the real-time signal graph.
- Related frontend components: `PodcastAudioDeck`, `PodcastPlaylistModal`, `PodcastSession`, `PlayerAudioFXPanel`.
- Related backend services: backend can persist mic/guest state, but not execute low-latency routing.

### Program Mixer

- Responsibility: Sum and control all live program sources.
- Why it belongs in JUCE: Current `PodcastAudioDeck.tsx` renders six channels but does not touch audio. Summing and source control are real-time audio operations.
- Related frontend components: `PodcastAudioDeck`.
- Related backend services: mic metadata routes and guest volume/mute routes can store/sync state only.

### Master Mixer

- Responsibility: Final mix gain, final processing input/output, master output metering, and program bus handoff.
- Why it belongs in JUCE: `PlayerAudioFXPanel.tsx` stores master volume locally; no current master audio bus exists in Podcast V2. The shared Web Audio `AudioEngineManager.ts` has `masterMixer` and `masterOutputGain` for RJ paths, showing this category is audio-engine work.
- Related frontend components: `PlayerAudioFXPanel`.
- Related backend services: none for real-time master signal; backend may store session/export metadata.

### Gain

- Responsibility: Apply per-source gain/fader changes to actual audio.
- Why it belongs in JUCE: Current `PodcastAudioDeck.tsx` changes local `gain` and `fader` state only. `usePeerConnections.applyVolume` can set a Web Audio `GainNode`, but it is not connected to the deck. Applying gain is audio graph processing.
- Related frontend components: `PodcastAudioDeck`.
- Related backend services: `PodcastApi.setGuestSlotVolume`, mic update routes for state synchronization only.

### Mute

- Responsibility: Apply source mute state to actual audio with predictable routing behavior.
- Why it belongs in JUCE: Current deck mute is local UI. `usePeerConnections.applyMute` can set a Web Audio gain node but is not wired to the UI. Actual mute must occur in the audio graph.
- Related frontend components: `PodcastAudioDeck`, `GuestRoom`.
- Related backend services: `PodcastApi.muteGuestSlot`, guest mic toggle socket events for collaboration/state.

### Solo

- Responsibility: Isolate selected source or sources for monitoring/program behavior as defined by studio state.
- Why it belongs in JUCE: Current solo is local state in `PodcastAudioDeck.tsx`; no audio node reads it. Solo affects real-time routing and monitoring.
- Related frontend components: `PodcastAudioDeck`.
- Related backend services: none currently implemented for solo.

### EQ

- Responsibility: Execute per-channel filtering/equalization.
- Why it belongs in JUCE: Current high/mid/low controls are local UI in `PodcastAudioDeck.tsx`. Shared `DSPChain.ts` exists for Web Audio/RJ, confirming EQ-like processing belongs in an audio processing layer, not React.
- Related frontend components: `PodcastAudioDeck`.
- Related backend services: none for real-time EQ.

### Compressor

- Responsibility: Execute dynamic range compression on channel or master audio.
- Why it belongs in JUCE: Current `PlayerAudioFXPanel.tsx` stores compressor settings locally and has optional callbacks that `PodcastUpload.tsx` does not pass. Compression is continuous DSP.
- Related frontend components: `PlayerAudioFXPanel`.
- Related backend services: none for real-time compression.

### Limiter

- Responsibility: Execute final peak limiting or channel limiting.
- Why it belongs in JUCE: Current limiter controls are local state only in `PlayerAudioFXPanel.tsx`. Limiting is final-stage real-time DSP.
- Related frontend components: `PlayerAudioFXPanel`.
- Related backend services: none for real-time limiting.

### Metering

- Responsibility: Produce signal-derived meter values for channels, master, monitor, and recording.
- Why it belongs in JUCE: Current meters in `PodcastAudioDeck.tsx`, `PlayerAudioFXPanel.tsx`, and non-web `useRecording.ts` use `Math.random`. Real meter values must come from actual audio buffers.
- Related frontend components: `PodcastAudioDeck`, `PlayerAudioFXPanel`, `PodcastSession`.
- Related backend services: analytics APIs may store aggregate values, but not generate low-latency signal meters.

### Monitoring

- Responsibility: Produce low-latency monitor audio from selected sources and mixes.
- Why it belongs in JUCE: Current monitoring is only remote WebRTC audio to `AudioContext.destination`; no monitor bus exists. Monitoring is live audio output.
- Related frontend components: `PodcastAudioDeck`, `PlayerAudioFXPanel`, `PodcastSession`.
- Related backend services: none for live monitor signal.

### Recording

- Responsibility: Record actual selected audio source or program mix with timeline-accurate start/stop/pause state.
- Why it belongs in JUCE: Current `useRecording.ts` records local mic only with browser/native primitives. Mixed show recording requires the engine signal path, not React UI or database routes.
- Related frontend components: `PodcastSession`, `RecentRecordingsList`, `EpisodeManager`.
- Related backend services: recording upload/storage routes, recording models, `PodcastApi.uploadRecording`.

### Playback

- Responsibility: Decode/play imported/local program audio as an engine source and expose transport state.
- Why it belongs in JUCE: Current playlist playback in `PodcastPlaylistModal.tsx` uses independent browser `Audio` elements, separate from mixer/recording. Playback as part of the show must be an audio-engine source.
- Related frontend components: `PodcastPlaylistModal`, `PodcastAudioDeck`.
- Related backend services: uploads/downloads/storage APIs for files; not live playback DSP.

### Timeline Position

- Responsibility: Maintain sample/time-accurate playhead and recording timeline position for audio operations.
- Why it belongs in JUCE: Current timeline-like state is local UI in `PodcastSession`, `EpisodeManager`, and `TrimModal`; no audio timeline exists. Audio position must align with playback/recording buffers.
- Related frontend components: `PodcastSession`, `EpisodeManager`, `TrimModal`.
- Related backend services: backend can store persisted markers/export metadata.

### Waveform Generation

- Responsibility: Derive waveform data from actual audio files/recorded buffers.
- Why it belongs in JUCE: Current waveforms are animated or random in `PodcastSession` and `EpisodeManager`. Waveform data is derived from audio samples; rendering remains frontend-owned.
- Related frontend components: `PodcastSession`, `EpisodeManager`, `TrimModal`.
- Related backend services: backend may store cached waveform metadata/files if present; current podcast backend stores recordings and episodes.

### Audio Import

- Responsibility: Decode imported audio into engine-readable playback/timeline sources.
- Why it belongs in JUCE: Current import uses `DocumentPicker` in React and stores file URIs/metadata. Decoding, validation for playback, and engine source creation are audio responsibilities.
- Related frontend components: `PodcastPlaylistModal`, `EpisodeManager`.
- Related backend services: upload and storage routes for persisted media.

### Audio Export

- Responsibility: Render or provide the final mixed audio output from engine state/audio sources.
- Why it belongs in JUCE: Current frontend has no export/mixdown. Exporting the processed program/timeline output requires applying routing, DSP, levels, and edits to audio.
- Related frontend components: `EpisodeManager`, `PodcastSession`.
- Related backend services: storage, download, episode metadata, export metadata.

### Program Output

- Responsibility: Produce the final live program signal for broadcast/recording/export.
- Why it belongs in JUCE: Current implementation has no program output bus; live session APIs create metadata only. The final signal is audio-engine output.
- Related frontend components: `PodcastAudioDeck`, `PlayerAudioFXPanel`, `PodcastSession`.
- Related backend services: live session routes, analytics/session metadata, storage for resulting recordings.

### Audio Events

- Responsibility: Emit engine-originated events such as transport state, audio clock, meter updates, device changes, source availability, underruns, and recording state.
- Why it belongs in JUCE: Current source already has audio-engine event classes for Web Audio (`EventEmitter.ts`, `EngineEvents.ts`) and frontend socket events for collaboration. Audio-originated events must come from the component executing audio.
- Related frontend components: all Podcast Studio controls/displays.
- Related backend services: socket service may relay collaboration/session events, but audio-originated events are engine-owned at source.

## Section 2 - Node.js Backend

Boundary rule from current implementation: backend owns authentication, validated APIs, database persistence, file uploads/storage, session records, guest-slot metadata, notifications, chat/collaboration sockets, and durable metadata. It does not execute real-time low-latency audio in current source.

### Authentication

- Responsibility: Validate operator identity and protect authenticated podcast routes.
- Why it belongs in backend: `podcast.routes.js` applies `authenticate` before operator routes. Auth services exist under `melodymeet-backend/services/operator/auth`.
- Source Files: `melodymeet-backend/services/operator/routes/podcast.routes.js`, backend auth middleware/services.

### Profiles

- Responsibility: Store and serve operator/host identity data.
- Why it belongs in backend: Profile APIs and services exist in operator/RJ backend routes and services; Podcast frontend profile modal is UI around operator identity.
- Source Files: `melodymeet-backend/services/operator/routes/rj.routes.js`, `melodymeet-backend/services/operator/services/operator.profile.service.js`, `Melody_meet/OPERATOR_PANEL/src/features/podcast/modals/PodcastProfileModal.tsx`.

### Episode Metadata

- Responsibility: Store title, description, genre, season/episode number, status, cover art paths, file URLs, and schedule data.
- Why it belongs in backend: `PodcastApi` exposes `getAll`, `create`, `upload`, `uploadCoverArt`, `updateStatus`, and delete; backend podcast routes/controllers/services implement episode CRUD/upload.
- Source Files: `operatorApi.ts`, `podcast.routes.js`, `podcast.controller.js`, `podcast.service.js`, `podcast.model.js`.

### Storage

- Responsibility: Persist uploaded audio, cover art, and generated recording files.
- Why it belongs in backend: Backend `audio.service.js` supplies upload handling; podcast controllers store `storageKey` and `fileUrl` on episode/recording models.
- Source Files: `podcast.controller.js`, `podcast.service.js`, `audio.service.js`, podcast models.

### Uploads

- Responsibility: Accept multipart podcast episodes, recordings, and cover art.
- Why it belongs in backend: `podcast.routes.js` defines `podcastUpload`, `recordingUpload`, and `coverUpload`; `operatorApi.ts` sends multipart requests.
- Source Files: `podcast.routes.js`, `podcast.controller.js`, `operatorApi.ts`.

### Downloads

- Responsibility: Serve stored file URLs for frontend retrieval.
- Why it belongs in backend: `operatorApi.ts` has `getFileUrl` using server root, and backend services record `/uploads/...` paths for stored files.
- Source Files: `operatorApi.ts`, `podcast.service.js`, `audio.service.js`.

### Recording Storage

- Responsibility: Store recording records and associated uploaded files.
- Why it belongs in backend: `PodcastApi.uploadRecording`, `getRecordings`, `deleteRecording`, backend recording routes/controllers/services/models exist.
- Source Files: `operatorApi.ts`, `podcast.routes.js`, `podcast.controller.js`, `podcast.service.js`, `podcast.recording.model.js`.

### Session Management

- Responsibility: Store live session metadata, room IDs, viewer counts, guest links, guest slots, and live start/stop records.
- Why it belongs in backend: `PodcastApi.startLiveSession`, `stopLiveSession`, `updateLiveViewers`, `generateGuestLinks`, `getGuestSlots`; backend live/guest routes and services implement these.
- Source Files: `operatorApi.ts`, `podcast.routes.js`, `podcast.controller.js`, `podcast.service.js`, `podcast.guest.service.js`, `podcast.live.model.js`, `podcast.guest.model.js`.

### Notifications

- Responsibility: Store and update notification records.
- Why it belongs in backend: Podcast routes expose notification CRUD/read operations, and `podcast.notification.model.js` exists.
- Source Files: `podcast.routes.js`, `podcast.controller.js`, `podcast.service.js`, `podcast.notification.model.js`.

### Chat

- Responsibility: Relay and persist/carry chat messages and room chat history where implemented by socket.
- Why it belongs in backend: `podcast.socket.js` handles `host_chat_message`, chat history, room snapshot, and chat broadcasts; frontend `usePodcastSocket.ts` consumes these events.
- Source Files: `podcast.socket.js`, `socketService.ts`, `usePodcastSocket.ts`.

### Analytics

- Responsibility: Store/serve durable or aggregate analytics such as live viewer counts and session stats.
- Why it belongs in backend: `PodcastApi.updateLiveViewers` and live session backend services update viewer state. Current frontend random live stats are local simulation, not durable analytics.
- Source Files: `operatorApi.ts`, `useLiveStream.ts`, `podcast.routes.js`, `podcast.service.js`.

### APIs

- Responsibility: Provide validated REST endpoints for podcast entities, recordings, live sessions, guest slots, notifications, and mics.
- Why it belongs in backend: `podcast.routes.js` declares these endpoints and uses validation/auth middleware.
- Source Files: `podcast.routes.js`, `podcast.controller.js`, `operatorApi.ts`.

### Database

- Responsibility: Persist podcasts, recordings, live sessions, guests, mics, and notifications.
- Why it belongs in backend: backend model files exist for those entities.
- Source Files: `podcast.model.js`, `podcast.recording.model.js`, `podcast.live.model.js`, `podcast.guest.model.js`, `podcast.mic.model.js`, `podcast.notification.model.js`.

### Collaboration

- Responsibility: Relay cross-client room events, guest-slot changes, chat, viewer counts, and WebRTC signaling.
- Why it belongs in backend: `podcast.socket.js` defines `/podcast` namespace behavior; `socketService.ts` wraps host/guest/socket event methods.
- Source Files: `podcast.socket.js`, `socketService.ts`, `usePodcastSocket.ts`, `usePeerConnections.ts`.

### Export Metadata

- Responsibility: Persist exported episode/recording metadata, file URLs, status, and schedule/publish state.
- Why it belongs in backend: Podcast episode and recording models/routes store metadata and file locations. Current frontend has no active export path, but durable export metadata is backend data ownership.
- Source Files: `podcast.model.js`, `podcast.recording.model.js`, `podcast.routes.js`, `podcast.service.js`.

### File Management

- Responsibility: Upload cleanup, deletion, stored file references, and server file path management.
- Why it belongs in backend: `podcast.controller.js` logs upload cleanup failures; `podcast.service.js` deletes uploaded files through `deleteUploadedFile` and uses `uploadDir`.
- Source Files: `podcast.controller.js`, `podcast.service.js`, `audio.service.js`.

## Section 3 - React Frontend

Boundary rule from current implementation: React owns visual controls, screens, forms, modal state, user gestures, display state, optimistic/local UI state, and synchronization with APIs/sockets. It should not own low-latency audio processing or durable persistence.

### UI

- Responsibility: Render Podcast Studio screens, panels, modals, cards, controls, and lists.
- Why it belongs in frontend: Podcast UI is implemented in React Native/React components under `src/features/podcast` and `src/pages`.
- Source Files: `PodcastUpload.tsx`, podcast sections/modals, `GuestJoinPage.tsx`, `GuestRoom.tsx`.

### Buttons

- Responsibility: Capture user actions such as start/stop live, record, play, mute, solo, save, publish, join, leave.
- Why it belongs in frontend: User input is implemented as `TouchableOpacity`/button handlers in current components.
- Source Files: `PodcastUpload.tsx`, `Podcastsession.tsx`, `PodcastAudioDeck.tsx`, `PodcastPlaylistModal.tsx`, `GuestRoom.tsx`.

### Sliders

- Responsibility: Present and edit numeric control values.
- Why it belongs in frontend: Current faders, trim controls, and FX values are UI state in React components.
- Source Files: `PodcastAudioDeck.tsx`, `TrimModal.tsx`, `PlayerAudioFXPanel.tsx`.

### Knobs

- Responsibility: Present and edit gain/EQ/FX values.
- Why it belongs in frontend: Current knobs are visible controls in `PodcastAudioDeck.tsx`.
- Source Files: `PodcastAudioDeck.tsx`.

### Timers

- Responsibility: Display elapsed/recording/live time from local state or synchronized engine/session state.
- Why it belongs in frontend: Current recording elapsed UI is in `PodcastSession` and `useRecording`.
- Source Files: `Podcastsession.tsx`, `useRecording.ts`, `useLiveStream.ts`.

### Waveform Rendering

- Responsibility: Draw waveform data received from audio source/engine/backend.
- Why it belongs in frontend: Current `PodcastSession`, `EpisodeManager`, and `TrimModal` render waveform visuals. Generation is not frontend-owned when derived from audio samples.
- Source Files: `Podcastsession.tsx`, `EpisodeManager.tsx`, `TrimModal.tsx`.

### Meter Display

- Responsibility: Display channel/master meters from engine-provided values.
- Why it belongs in frontend: Current meter visuals are rendered in `PodcastAudioDeck.tsx` and `PlayerAudioFXPanel.tsx`; actual meter calculation is not UI ownership.
- Source Files: `PodcastAudioDeck.tsx`, `PlayerAudioFXPanel.tsx`.

### Episode Panels

- Responsibility: Present episode metadata forms, recording selection, trim modal, save/publish actions, and local validation/display.
- Why it belongs in frontend: `EpisodeManager.tsx`, `RecentRecordingsList.tsx`, and `TrimModal.tsx` implement these panels.
- Source Files: `EpisodeManager.tsx`, `RecentRecordingsList.tsx`, `TrimModal.tsx`.

### Recording Controls

- Responsibility: Present start/pause/resume/stop/save controls and send user intent to engine/backend.
- Why it belongs in frontend: `PodcastSession` owns the visible controls and currently calls `useRecording`.
- Source Files: `Podcastsession.tsx`, `useRecording.ts`.

### Monitoring Controls

- Responsibility: Present monitor/mute/solo/master controls and reflect state.
- Why it belongs in frontend: `PodcastAudioDeck.tsx` and `PlayerAudioFXPanel.tsx` render these controls. Actual audio monitoring is engine-owned.
- Source Files: `PodcastAudioDeck.tsx`, `PlayerAudioFXPanel.tsx`.

### Settings

- Responsibility: Present and update operator-visible settings UI.
- Why it belongs in frontend: `PodcastUpload.tsx` renders settings/profile modals.
- Source Files: `PodcastUpload.tsx`, shared `SettingsModal`, `PodcastProfileModal.tsx`.

### Chat

- Responsibility: Render chat UI, input, optimistic messages, and socket state.
- Why it belongs in frontend: `PodcastLiveChat` and `usePodcastSocket.ts` handle visible chat and frontend socket events; backend relays/persists/collaborates.
- Source Files: `PodcastLiveChat.tsx`, `usePodcastSocket.ts`, `socketService.ts`.

### Notifications

- Responsibility: Render notifications and local read/display state.
- Why it belongs in frontend: `PodcastUpload.tsx` renders `NotificationsModal`; Zustand contains notification state.
- Source Files: `PodcastUpload.tsx`, `useAppStore.ts`, shared notifications modal.

### State Synchronization

- Responsibility: Synchronize UI state with backend APIs, socket events, and engine events.
- Why it belongs in frontend: Current hooks (`useLiveStream`, `usePodcastSocket`, `usePeerConnections`, `useRecording`) mediate between components, store, browser APIs, sockets, and REST.
- Source Files: podcast hooks, `socketService.ts`, `operatorApi.ts`, `useAppStore.ts`.

## Engine Module Analysis

The following module boundaries are required by the current implementation surface. These are ownership modules only; this section does not define implementation internals.

### EngineHost

- Purpose: Top-level owner for the audio engine lifecycle.
- Responsibilities: Engine start/stop, session attachment, audio callback lifecycle, device graph ownership, global state snapshot emission.
- Dependencies: audio device layer, event bus, state snapshot module.
- Inputs: frontend session commands, backend/session identifiers, device configuration.
- Outputs: engine status events, state snapshots, audio availability.

### AudioBusManager

- Purpose: Own audio buses used by Podcast Studio.
- Responsibilities: Source buses, monitor bus, recording bus, program bus, master bus.
- Dependencies: EngineHost, MicModule, DeckModule, ProgramMixer, MonitoringModule.
- Inputs: source audio streams and routing commands.
- Outputs: routed buses for monitoring, recording, broadcast, and export.

### DeckModule

- Purpose: Own playback sources for imported/local audio.
- Responsibilities: Load/decode/play/pause/stop/seek playback sources as engine audio.
- Dependencies: AudioBusManager, event bus, file/source handles from frontend/backend.
- Inputs: selected track/file URI, transport commands, timeline position commands.
- Outputs: playback audio source, transport events.

### MicModule

- Purpose: Own microphone sources.
- Responsibilities: Host mic source, guest mic sources after transport/receive, mic enable/disable, input levels.
- Dependencies: audio device management, remote guest audio transport/receive path, AudioBusManager, MeteringModule.
- Inputs: device/source selection, mic state commands, guest audio streams.
- Outputs: mic audio buses, mic events, input meter values.

### ProgramMixer

- Purpose: Own the program mix.
- Responsibilities: Sum active studio sources and apply per-source controls that define the live mix.
- Dependencies: AudioBusManager, MicModule, DeckModule, MasterMixer.
- Inputs: source buses, gain/mute/solo/routing state.
- Outputs: program mix bus.

### MasterMixer

- Purpose: Own final master processing and level.
- Responsibilities: Master gain, master processing state, final meter tap, handoff to output modules.
- Dependencies: ProgramMixer, MeteringModule, DSP/effects modules.
- Inputs: program mix bus, master controls.
- Outputs: master/program output signal, master meters.

### MonitoringModule

- Purpose: Own monitor/headphone audio.
- Responsibilities: Monitor source selection, solo monitoring, output routing for monitoring.
- Dependencies: AudioBusManager, ProgramMixer, audio device output.
- Inputs: monitor control state, solo state, source buses.
- Outputs: monitor audio output, monitor status events.

### RecordingModule

- Purpose: Own recording of selected audio bus.
- Responsibilities: Start/stop/pause/resume state, capture of program or selected source, recording file/event output.
- Dependencies: AudioBusManager, ProgramMixer, StateSnapshotModule, backend upload/storage handoff.
- Inputs: recording commands, selected record bus, metadata from frontend/backend.
- Outputs: recorded audio file/data, recording state events, duration.

### BroadcastOutputModule

- Purpose: Own final live/broadcast audio handoff from engine.
- Responsibilities: Expose program output for live distribution where required by the surrounding system.
- Dependencies: MasterMixer, ProgramMixer, session state.
- Inputs: master/program signal, live session state.
- Outputs: program output stream/signal.

### WaveformModule

- Purpose: Produce waveform data from audio sources.
- Responsibilities: Generate waveform data for recordings/imported files/timeline sources.
- Dependencies: DeckModule, RecordingModule, file/audio buffers.
- Inputs: audio file/buffer/source.
- Outputs: waveform data for frontend rendering.

### MeteringModule

- Purpose: Produce real signal-derived meters.
- Responsibilities: Channel meters, mic meters, master meters, recording meters, clipping/peak events.
- Dependencies: AudioBusManager, MicModule, ProgramMixer, MasterMixer.
- Inputs: audio bus taps.
- Outputs: meter values/events for frontend display and optional analytics.

### EventBus

- Purpose: Carry engine-originated events to frontend/backend adapters.
- Responsibilities: Transport events, meter events, device events, source events, recording events, error/status events.
- Dependencies: all engine modules.
- Inputs: module events.
- Outputs: normalized event stream for frontend synchronization.

### StateSnapshotModule

- Purpose: Provide coherent engine state snapshots.
- Responsibilities: Current routing, sources, meters, transport, timeline, recording, and output status.
- Dependencies: EngineHost, EventBus, module state providers.
- Inputs: module state.
- Outputs: frontend state snapshots and backend-relevant state metadata.

### EffectsModule

- Purpose: Own EQ, compressor, limiter, and channel/master DSP state.
- Responsibilities: Apply signal processing represented by current Podcast Studio controls.
- Dependencies: ProgramMixer, MasterMixer, MicModule, DeckModule.
- Inputs: control values from frontend state.
- Outputs: processed channel/master audio.

### TimelineModule

- Purpose: Own sample/time position for playback, recording, markers, and edit state.
- Responsibilities: Timeline clock, source positions, marker positions, edit boundaries.
- Dependencies: DeckModule, RecordingModule, WaveformModule, StateSnapshotModule.
- Inputs: transport commands, marker/edit UI state.
- Outputs: timeline position events and state.

### AudioImportExportModule

- Purpose: Own audio import decoding and export rendering boundaries.
- Responsibilities: Convert selected/imported media into engine sources and produce exported audio output from engine state.
- Dependencies: DeckModule, WaveformModule, RecordingModule, ProgramMixer, backend storage handoff.
- Inputs: imported file handles/URIs, export commands, engine mix/timeline state.
- Outputs: engine source handles, exported audio data/file.

## Ownership Matrix

| Feature | Frontend | Backend | JUCE |
| --- | --- | --- | --- |
| UI layout | Owner | None | None |
| Buttons | Owner for user intent | None | Executes audio command only when audio-related |
| Sliders/knobs | Owner for display/input | Optional state persistence | Owner for audio effect of value |
| Host mic | Control/display | Session/recording metadata | Owner for audio capture and routing |
| Guest mics | Join/mute UI | Guest slot records, sockets, auth boundary | Owner for guest audio source handling |
| Remote guest audio | Status/display | Signaling relay and guest metadata | Owner for audio receive/routing/mix |
| Audio routing | Display/control intent | Optional persisted state | Owner |
| Program mixer | Display/control intent | Optional persisted state | Owner |
| Master mixer | Display/control intent | Optional persisted state | Owner |
| Gain | UI control | Optional guest volume state | Owner for signal gain |
| Mute | UI control | Guest slot mute state/collaboration | Owner for signal mute |
| Solo | UI control | None currently | Owner for monitor/routing behavior |
| EQ | UI control | None currently | Owner |
| Compressor | UI control | None currently | Owner |
| Limiter | UI control | None currently | Owner |
| Metering | Display | Optional analytics storage | Owner for signal-derived values |
| Monitoring | UI controls/display | None currently | Owner for monitor audio |
| Headphone output | UI controls/display | None currently | Owner for output routing |
| Recording controls | Owner for user intent/display | Recording file storage and metadata | Owner for audio capture of selected bus |
| Recording storage | Display/list | Owner | Produces audio file/data |
| Playback controls | Owner for user intent/display | Stores/serves files | Owner for audio playback source |
| Timeline position | Display and user edits | Persisted metadata if stored | Owner for audio-clock position |
| Waveform rendering | Owner | Optional cached metadata/storage | Owner for generation from audio |
| Audio import | File picker/UI | Upload/storage metadata | Decode/source ownership |
| Audio export | UI command/display | Store/export metadata/downloads | Render mixed audio |
| Program output | Display/control | Session metadata/distribution coordination | Owner for final audio signal |
| Chat | UI input/display | Owner for relay/history | None |
| Notifications | UI display | Owner for persistence | None |
| Live session metadata | UI display/control | Owner | Audio signal only |
| Authentication | Token use/UI state | Owner | None |
| Profiles | UI display/edit | Owner | None |
| Episode metadata | UI forms | Owner | None except audio-derived duration/waveform/export data |
| Analytics | Display | Owner for durable/session analytics | Source for audio metrics |
| State synchronization | Owner for view state | Owner for persisted/collab state | Owner for audio state/events |

## Shared Modules

Shared modules are modules whose responsibility appears reusable across Podcast Studio and existing RJ audio surfaces, based on current shared Web Audio code and RJ imports.

- `EngineHost`: shared engine lifecycle.
- `AudioBusManager`: shared routing/bus ownership.
- `DeckModule`: shared playback/deck source ownership; current Web Audio `DeckEngine` is used by RJ.
- `MicModule`: shared microphone ownership; current Web Audio `MicEngine`/`MicrophoneManager` are used by RJ paths.
- `MasterMixer`: shared master bus concept; current `AudioEngineManager.ts` has `masterMixer` and `masterOutputGain`.
- `EffectsModule`: shared DSP ownership; current `DSPChain.ts` and `ParameterManager.ts` exist.
- `MeteringModule`: shared signal-derived meter ownership.
- `EventBus`: shared engine event ownership; current `EventEmitter.ts`/`EngineEvents.ts` exist.
- `StateSnapshotModule`: shared sync boundary for frontend state.
- `AudioImportExportModule`: shared file decode/export boundary where audio data is involved.

## Podcast-Only Modules

Podcast-only modules are modules tied to current Podcast Studio concepts rather than generic deck/RJ playback.

- `GuestMicModule`: guest slot mic sources mapped to MIC 2-MIC 5 in current Podcast Studio UI.
- `RemoteGuestAudioModule`: remote guest audio receive/routing ownership tied to podcast socket/WebRTC guest flow.
- `ProgramMixer`: podcast show mix across host, guests, and imported playback.
- `MonitoringModule`: podcast monitor/solo/headphone ownership for host show production.
- `RecordingModule`: podcast program recording ownership tied to `PodcastSession`.
- `BroadcastOutputModule`: podcast live program output ownership tied to live session state.
- `TimelineModule`: podcast episode/session timeline ownership tied to markers, trim, and episode editing panels.
- `WaveformModule`: podcast waveform generation for recordings/imported files displayed by episode tools.

## Future Reusable Modules

Future reusable modules are modules whose boundaries are not podcast-specific in the current source evidence, even though Podcast V2 needs them.

- `Audio Device Management`
- `AudioBusManager`
- `DeckModule`
- `MicModule`
- `MasterMixer`
- `EffectsModule`
- `MeteringModule`
- `RecordingModule`
- `WaveformModule`
- `AudioImportExportModule`
- `EventBus`
- `StateSnapshotModule`

## Overall Engine Scope Summary

The current Podcast V2 implementation establishes three clear ownership boundaries:

1. React owns screens, controls, local display state, API/socket synchronization, and user intent.
2. Node.js owns authenticated APIs, database-backed metadata, uploads/storage, notifications, chat/collaboration sockets, live session records, guest slot records, and file management.
3. The future JUCE Audio Engine owns all real-time audio responsibilities: device I/O, host and guest audio sources, remote audio handling, routing, program/master mixing, gain, mute, solo, EQ, compression, limiting, metering, monitoring, recording of the actual mix, playback as an engine source, waveform generation from audio, timeline audio position, audio export, program output, and audio-originated events.

Current source shows many of these JUCE-owned responsibilities as either browser-local primitives, disconnected shared Web Audio modules, UI-only controls, random simulations, or missing Podcast Studio paths. The boundary is therefore not that React or Node should execute those audio operations; the boundary is that React displays and commands them, Node persists and coordinates them, and JUCE executes the audio.
