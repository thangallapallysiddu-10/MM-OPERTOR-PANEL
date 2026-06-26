# Podcast V2 Frontend Implementation Gap Analysis

Audit date: 2026-06-20  
Scope: current Podcast Studio frontend implementation in `Melody_meet/OPERATOR_PANEL`, with backend dependencies traced only where frontend source references them.  
Rules applied: audit only, current implementation only, no future assumptions, no source-code modifications.

## Evidence Sources

Primary frontend sources:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastBootstrap.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RecentRecordingsList.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
- `Melody_meet/OPERATOR_PANEL/src/store/useAppStore.ts`

Audio engine and empty service sources:

- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/**`
- `Melody_meet/OPERATOR_PANEL/src/hooks/useAudioEngine.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/webrtcService.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/encoder.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/websocket.ts`

Backend sources referenced by frontend APIs and sockets:

- `melodymeet-backend/services/operator/routes/podcast.routes.js`
- `melodymeet-backend/services/operator/controllers/podcast.controller.js`
- `melodymeet-backend/services/operator/services/podcast.service.js`
- `melodymeet-backend/services/operator/services/podcast.guest.service.js`
- `melodymeet-backend/services/operator/services/audio.service.js`
- `melodymeet-backend/services/operator/sockets/podcast.socket.js`

## Classification Summary

| Classification | Features |
| --- | --- |
| `REAL` | Recording timer, podcast bootstrap fetches, host socket join/listener-chat plumbing |
| `PARTIAL` | Host microphone, live session management, host-side WebRTC receive path, recording, stop recording, playback, audio import/local files, remote guest host state |
| `MOCK` | Waveforms, metering, live stats, guest room replies/connection quality, remote guest seats/invites fallback, non-web mic levels |
| `UI ONLY` | Audio deck controls, gain, mute, solo, EQ, master volume, compressor, limiter, timeline, markers, trim UI, episode save/publish metadata, session save |
| `MISSING` | Guest microphone capture/transmission, program output, master mixer engine, headphone monitoring, audio export/mixdown, true pause/resume recording, full audio routing, real Podcast Studio audio engine wiring |

## 1. REAL FEATURES

### Recording Timer

- Feature Name: Recording timer
- Current Status: `REAL`
- Current Implementation: `useRecording.ts` increments `recordingSeconds` every second while `currentPodcast.isRecording` is true. `Podcastsession.tsx` also tracks local `elapsed` seconds during its recording state.
- Missing Implementation: No missing implementation for timer state itself. The timer does not prove mixed audio recording.
- Dependencies: `PodcastSession`, `useRecording`, Zustand podcast state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- Risk Level: Low
- Estimated Complexity: Low

### Podcast Bootstrap Fetches

- Feature Name: Podcast initial data fetch
- Current Status: `REAL`
- Current Implementation: `usePodcastBootstrap.ts` calls `PodcastApi.getAll()`, `PodcastApi.getMics()`, and `PodcastApi.getRecordings()` and writes mapped data into the app store.
- Missing Implementation: The hook is defined but not imported by `PodcastUpload.tsx`, so this real fetch path is not active in the current Podcast Studio container.
- Dependencies: `PodcastApi`, podcast mappers, Zustand podcast state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastBootstrap.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Medium
- Estimated Complexity: Low

### Host Socket Join And Chat/Viewer Plumbing

- Feature Name: Host socket connection for live room
- Current Status: `REAL`
- Current Implementation: `usePodcastSocket.ts` connects `podcastSocket` while live, emits `host_join`, listens for room snapshots, chat history, chat messages, viewer counts, live-ended events, guest-slot events, and WebRTC signaling events.
- Missing Implementation: This socket plumbing does not itself implement guest audio capture or full audio routing.
- Dependencies: `PodcastUpload`, `usePodcastSocket`, `podcastSocket`, Zustand podcast state, backend `/podcast` namespace.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
  - `melodymeet-backend/services/operator/sockets/podcast.socket.js`
- Risk Level: Medium
- Estimated Complexity: Medium

## 2. PARTIAL FEATURES

### Host Microphone

- Feature Name: Host microphone
- Current Status: `PARTIAL`
- Current Implementation: `useLiveStream.ts` calls `navigator.mediaDevices.getUserMedia({ audio: true })` for microphone test/start-live on web. `useRecording.ts` separately calls `getUserMedia({ audio: true })` for recording. `usePeerConnections.ts` adds host stream tracks to WebRTC peer connections.
- Missing Implementation: Host mic is not routed through `PodcastAudioDeck`, gain/fader, mute, solo, EQ, compressor, limiter, master volume, recording mix, export, or program output.
- Dependencies: `PodcastUpload`, `LiveSetupModal`, `PodcastSession`, `useLiveStream`, `useRecording`, `usePeerConnections`, browser `MediaStream`, browser `MediaRecorder`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Live Session Management

- Feature Name: Live session management
- Current Status: `PARTIAL`
- Current Implementation: `useLiveStream.ts` creates room links, starts/stops live session records through `PodcastApi.startLiveSession` and `PodcastApi.stopLiveSession`, generates guest links through `PodcastApi.generateGuestLinks`, and updates viewer counts through `PodcastApi.updateLiveViewers`.
- Missing Implementation: Live state is metadata/control-plane only. It does not create a live program audio stream or route a mixed output to backend/live listeners.
- Dependencies: `PodcastUpload`, `LiveSetupModal`, `useLiveStream`, `PodcastApi`, Zustand podcast state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Remote Guests Host State

- Feature Name: Remote guest host-side state
- Current Status: `PARTIAL`
- Current Implementation: `usePodcastSocket.ts` listens for `guest_joined`, `guest_left`, `guest_mic_toggle`, `guest_speaking`, `slot_updated`, and room snapshots, then updates guest slot state in Zustand.
- Missing Implementation: The current guest frontend does not emit real microphone/WebRTC behavior. Host guest-state updates are not connected to deck channel audio controls.
- Dependencies: `PodcastUpload`, `usePodcastSocket`, `socketService`, backend socket namespace, Zustand podcast state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
  - `Melody_meet/OPERATOR_PANEL/src/store/useAppStore.ts`
  - `melodymeet-backend/services/operator/sockets/podcast.socket.js`
- Risk Level: Critical
- Estimated Complexity: High

### Host-Side WebRTC Receive Path

- Feature Name: Remote guest audio receive on host
- Current Status: `PARTIAL`
- Current Implementation: `usePeerConnections.ts` consumes pending WebRTC offers from Zustand, creates `RTCPeerConnection`, sends answers/ICE through `podcastSocket`, handles remote tracks, creates a per-slot `GainNode`, and connects incoming guest streams to `AudioContext.destination`.
- Missing Implementation: The current guest pages do not create offers or send microphone streams. The receive path is not wired to visible deck controls, recording, monitor mix, or program output.
- Dependencies: `PodcastUpload`, `usePodcastSocket`, `usePeerConnections`, `podcastSocket`, browser `RTCPeerConnection`, `AudioContext`, `GainNode`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Recording

- Feature Name: Recording
- Current Status: `PARTIAL`
- Current Implementation: `useRecording.ts` records web microphone audio with browser `MediaRecorder` and native audio with Expo AV `Audio.Recording`, then attempts upload with `PodcastApi.uploadRecording`. `PodcastSession` starts and stops the hook.
- Missing Implementation: Recording does not capture remote guests, playlist playback, effects, deck mix, or program output. Web recording content is `audio/webm` while the generated filename uses `.mp3`.
- Dependencies: `PodcastSession`, `useRecording`, `PodcastApi.uploadRecording`, browser `MediaRecorder`, Expo AV.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Stop Recording

- Feature Name: Stop recording
- Current Status: `PARTIAL`
- Current Implementation: `PodcastSession.handleStop` calls `useRecording.stopRecording`. The hook stops `MediaRecorder` or Expo AV recording, uploads data, and appends recording metadata to state.
- Missing Implementation: Stop does not finalize a mixed show recording because only the local recording path exists.
- Dependencies: `PodcastSession`, `useRecording`, `PodcastApi.uploadRecording`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- Risk Level: High
- Estimated Complexity: Medium

### Playback

- Feature Name: Playlist playback
- Current Status: `PARTIAL`
- Current Implementation: `PodcastPlaylistModal.tsx` creates browser `Audio` objects from direct/local track sources and implements play, pause, resume, and stop in local component state.
- Missing Implementation: Playback is not routed to the audio deck, monitoring, recording, live program output, or shared audio engine. Platform links are not implemented as real stream playback unless a direct playable source exists.
- Dependencies: `PodcastPlaylistModal`, browser `HTMLAudioElement`, `DocumentPicker`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/playback/PlaybackController.ts`
- Risk Level: High
- Estimated Complexity: High

### Audio Import

- Feature Name: Audio import
- Current Status: `PARTIAL`
- Current Implementation: `PodcastPlaylistModal.tsx` and `EpisodeManager.tsx` use `expo-document-picker` to select audio files. Playlist imports can be added to local playlist state and played if the URI is browser-playable.
- Missing Implementation: Imported audio is not routed to studio mixer/program output. Episode audio import does not upload or process audio through current UI path.
- Dependencies: `PodcastPlaylistModal`, `EpisodeManager`, `DocumentPicker`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- Risk Level: High
- Estimated Complexity: Medium

### Local Files

- Feature Name: Local files
- Current Status: `PARTIAL`
- Current Implementation: Local files can be selected through `DocumentPicker`; playlist local files can be played with browser `Audio`.
- Missing Implementation: Local files are not decoded into a timeline, uploaded through the active podcast path, routed into the mixer, or included in recording/export.
- Dependencies: `PodcastPlaylistModal`, `EpisodeManager`, `DocumentPicker`, browser `Audio`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- Risk Level: Medium
- Estimated Complexity: Medium

### Session Management

- Feature Name: Podcast session management
- Current Status: `PARTIAL`
- Current Implementation: `PodcastSession` tracks local session status, elapsed time, segments, chapters, and calls `useRecording` for recording operations.
- Missing Implementation: Session controls are not integrated with live session audio state, mixed recording, marker persistence, real pause/resume, or program-output lifecycle.
- Dependencies: `PodcastSession`, `useRecording`, optional callbacks not passed by `PodcastUpload`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: High
- Estimated Complexity: High

## 3. MOCK FEATURES

### Waveforms

- Feature Name: Waveforms
- Current Status: `MOCK`
- Current Implementation: `EpisodeManager.tsx` generates waveform arrays with `Math.random()`. `PodcastSession` renders animated waveform UI. `TrimModal` displays supplied waveform data but does not generate it from audio.
- Missing Implementation: No waveform extraction from recorded/imported audio and no waveform synchronization with playback or trim positions.
- Dependencies: `EpisodeManager`, `PodcastSession`, `TrimModal`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`
- Risk Level: High
- Estimated Complexity: High

### Metering

- Feature Name: Metering
- Current Status: `MOCK`
- Current Implementation: `PodcastAudioDeck.tsx` updates VU values with `Math.random()`. `PlayerAudioFXPanel.tsx` updates left/right meter values with `Math.random()`. `useRecording.ts` simulates non-web mic levels with `Math.random()`.
- Missing Implementation: No analyser-node or backend-derived metering is connected to actual audio sources in Podcast Studio.
- Dependencies: `PodcastAudioDeck`, `PlayerAudioFXPanel`, `useRecording`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- Risk Level: High
- Estimated Complexity: Medium

### Live Stats

- Feature Name: Live broadcast statistics
- Current Status: `MOCK`
- Current Implementation: `PodcastUpload.tsx` updates host live stats such as listeners and bitrate with random values.
- Missing Implementation: No verified backend or streaming-engine metrics are used for these displayed stats in that code path.
- Dependencies: `PodcastUpload` local state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: Medium
- Estimated Complexity: Medium

### Guest Room Simulation

- Feature Name: Guest room communication simulation
- Current Status: `MOCK`
- Current Implementation: `GuestRoom.tsx` changes connection quality with random selection and generates simulated host replies after guest chat messages.
- Missing Implementation: No real socket chat, WebRTC guest audio, guest mic capture, or backend guest session execution is present in the guest room.
- Dependencies: `GuestJoinPage`, `GuestRoom`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Remote Guest Seat Defaults

- Feature Name: Remote guest panel seat data
- Current Status: `MOCK`
- Current Implementation: `RemoteGuestsPanel.tsx` uses hardcoded default seats and fallback `ROOM123` invite links when no room ID is available.
- Missing Implementation: The panel does not fetch or control real guest slot state through current backend APIs.
- Dependencies: `RemoteGuestsPanel`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx`
- Risk Level: High
- Estimated Complexity: Medium

### YouTube API Placeholder

- Feature Name: YouTube playlist metadata
- Current Status: `MOCK`
- Current Implementation: `PodcastPlaylistModal.tsx` contains `YOUR_YOUTUBE_API_KEY_HERE` and returns null for metadata when the placeholder remains.
- Missing Implementation: No active YouTube metadata API integration and no real YouTube audio playback path in Podcast Studio.
- Dependencies: `PodcastPlaylistModal`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- Risk Level: Medium
- Estimated Complexity: Medium

## 4. UI ONLY FEATURES

### Audio Deck

- Feature Name: Podcast audio deck
- Current Status: `UI ONLY`
- Current Implementation: `PodcastAudioDeck.tsx` renders six channel strips with local state for gain, EQ, fader, mute, solo, VU, status, and copyable guest links.
- Missing Implementation: The deck is not connected to `usePeerConnections.applyVolume`, `usePeerConnections.applyMute`, backend guest slot APIs, shared audio engine, recording, monitor, or program output.
- Dependencies: `PodcastAudioDeck` local React state.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Gain And Fader

- Feature Name: Gain and fader
- Current Status: `UI ONLY`
- Current Implementation: Channel `gain` and `fader` values live in `PodcastAudioDeck.tsx` state. `usePeerConnections.applyVolume` exists but is not wired to the deck; `PodcastUpload.tsx` destructures `peerApplyVolume` but does not pass it to the deck.
- Missing Implementation: Visible controls do not affect WebRTC gain nodes, backend mic volume, playback, host mic, recording, or program output.
- Dependencies: `PodcastAudioDeck`, unused `usePeerConnections.applyVolume`, unused `PodcastApi.setGuestSlotVolume`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Mute

- Feature Name: Mute
- Current Status: `UI ONLY`
- Current Implementation: `PodcastAudioDeck.tsx` toggles local `muted` state. `usePeerConnections.applyMute` exists but is not wired to the deck; `PodcastUpload.tsx` destructures `peerApplyMute` but does not pass it to the deck.
- Missing Implementation: Deck mute does not affect WebRTC gain nodes, backend guest mute state, host mic, playback, recording, or output.
- Dependencies: `PodcastAudioDeck`, unused `usePeerConnections.applyMute`, unused `PodcastApi.muteGuestSlot`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Solo

- Feature Name: Solo
- Current Status: `UI ONLY`
- Current Implementation: `PodcastAudioDeck.tsx` toggles local `soloed` state.
- Missing Implementation: No audio graph logic reads solo state; no solo monitor bus or source isolation exists.
- Dependencies: `PodcastAudioDeck`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- Risk Level: High
- Estimated Complexity: Medium

### EQ

- Feature Name: EQ
- Current Status: `UI ONLY`
- Current Implementation: `PodcastAudioDeck.tsx` stores high, mid, and low values locally for each channel.
- Missing Implementation: No filter nodes or DSP chain are connected to these values. `DSPChain.ts` exists in shared audio engine but is not imported by Podcast V2.
- Dependencies: `PodcastAudioDeck`, disconnected `DSPChain`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/DSPChain.ts`
- Risk Level: High
- Estimated Complexity: High

### Master Volume

- Feature Name: Master volume
- Current Status: `UI ONLY`
- Current Implementation: `PlayerAudioFXPanel.tsx` stores `masterVolume` locally and calls optional `onMasterVolumeChange`; `PodcastUpload.tsx` renders it without that callback.
- Missing Implementation: No master gain node or program-output volume control is connected.
- Dependencies: `PlayerAudioFXPanel`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Compressor

- Feature Name: Compressor
- Current Status: `UI ONLY`
- Current Implementation: `PlayerAudioFXPanel.tsx` stores compressor settings locally and calls optional `onCompressorChange`; `PodcastUpload.tsx` does not pass the callback.
- Missing Implementation: No compressor node or DSP compressor is connected to any podcast audio signal.
- Dependencies: `PlayerAudioFXPanel`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: High
- Estimated Complexity: High

### Limiter

- Feature Name: Limiter
- Current Status: `UI ONLY`
- Current Implementation: `PlayerAudioFXPanel.tsx` stores limiter settings locally and calls optional `onLimiterChange`; `PodcastUpload.tsx` does not pass the callback.
- Missing Implementation: No limiter node or DSP limiter is connected to any podcast audio signal.
- Dependencies: `PlayerAudioFXPanel`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: High
- Estimated Complexity: High

### Timeline And Trim UI

- Feature Name: Timeline and trim
- Current Status: `UI ONLY`
- Current Implementation: `EpisodeManager.tsx` opens `TrimModal.tsx`, which displays trim ranges, handles local slider state, and exposes callbacks.
- Missing Implementation: No decoded audio timeline, trim processing, preview audio, or `PodcastApi.trimRecording` call is executed from the current UI.
- Dependencies: `EpisodeManager`, `TrimModal`, unused `PodcastApi.trimRecording`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: High
- Estimated Complexity: High

### Markers And Chapters

- Feature Name: Episode markers and chapters
- Current Status: `UI ONLY`
- Current Implementation: `PodcastSession` appends segments and chapters to local arrays. Optional callbacks exist, but `PodcastUpload.tsx` renders `<PodcastSession />` without marker/chapter callbacks.
- Missing Implementation: Markers are not persisted, not attached to audio data, and not exported.
- Dependencies: `PodcastSession`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: Medium
- Estimated Complexity: Medium

### Episode Save And Publish Metadata

- Feature Name: Episode save/publish
- Current Status: `UI ONLY`
- Current Implementation: `EpisodeManager.tsx` creates local episode objects and calls parent callbacks. `PodcastUpload.tsx` passes callbacks that update local Zustand episode state.
- Missing Implementation: Current UI path does not call `PodcastApi.create`, `PodcastApi.upload`, `PodcastApi.uploadCoverArt`, or backend publish/status APIs.
- Dependencies: `EpisodeManager`, `PodcastUpload`, Zustand podcast state, unused `PodcastApi` episode APIs.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: High
- Estimated Complexity: Medium

### Session Save

- Feature Name: Session save recording metadata
- Current Status: `UI ONLY`
- Current Implementation: `PodcastSession.handleSave` builds a final recording object with calculated mock size and calls optional `onSaveRecording`.
- Missing Implementation: `PodcastUpload.tsx` does not pass `onSaveRecording`; no persisted save occurs from this button in the current container.
- Dependencies: `PodcastSession`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- Risk Level: Medium
- Estimated Complexity: Low

## 5. MISSING FEATURES

### Guest Microphones

- Feature Name: Guest microphones
- Current Status: `MISSING`
- Current Implementation: `GuestRoom.tsx` has local mic/mute UI state only.
- Missing Implementation: No guest `getUserMedia`, guest WebRTC peer connection, guest socket join/signaling, or audio transmission exists in current guest pages.
- Dependencies: `GuestJoinPage`, `GuestRoom`; backend socket support exists but current guest UI does not use it.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
  - `melodymeet-backend/services/operator/sockets/podcast.socket.js`
- Risk Level: Critical
- Estimated Complexity: High

### Audio Routing

- Feature Name: Audio routing
- Current Status: `MISSING`
- Current Implementation: Only isolated paths exist: host mic capture, mic-only recording, remote WebRTC monitor to destination, and playlist `Audio` playback.
- Missing Implementation: No routing matrix or graph connects host mic, guest streams, playlist playback, deck controls, monitor, recording, export, and program output.
- Dependencies: `useLiveStream`, `useRecording`, `usePeerConnections`, `PodcastAudioDeck`, `PodcastPlaylistModal`, disconnected shared audio engine.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Monitoring

- Feature Name: Studio monitoring
- Current Status: `MISSING`
- Current Implementation: Remote WebRTC audio can be connected directly to `AudioContext.destination`; deck/FX meters are mock visuals.
- Missing Implementation: No dedicated monitor bus, monitor source selection, solo monitoring, or complete studio monitor mix exists.
- Dependencies: `usePeerConnections`, `PodcastAudioDeck`, `PlayerAudioFXPanel`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Headphone Monitoring

- Feature Name: Headphone monitoring
- Current Status: `MISSING`
- Current Implementation: No headphone-output UI, hook, service, or output-device selection was found in Podcast V2.
- Missing Implementation: No headphone bus or device-targeted output path exists.
- Dependencies: none currently implemented.
- Source Files:
  - No current Podcast V2 source file implements this feature.
- Risk Level: High
- Estimated Complexity: High

### Program Output

- Feature Name: Program output
- Current Status: `MISSING`
- Current Implementation: No unified output bus exists. Audio sources execute independently.
- Missing Implementation: No final mixed audio stream for live broadcast, monitoring, recording, or export.
- Dependencies: all audio source paths and absent master output graph.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- Risk Level: Critical
- Estimated Complexity: High

### Master Mixer

- Feature Name: Master mixer
- Current Status: `MISSING`
- Current Implementation: `PlayerAudioFXPanel` displays master controls, but no master audio graph exists.
- Missing Implementation: No master bus, master gain, master processing, output metering, or source summing.
- Dependencies: `PlayerAudioFXPanel`, absent program output graph.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/AudioEngineManager.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Audio Export

- Feature Name: Audio export
- Current Status: `MISSING`
- Current Implementation: No Podcast Studio control or service produces a mixed exported audio file.
- Missing Implementation: No mixdown/export path for recordings, timeline edits, guest audio, playback, or effects.
- Dependencies: absent program output/timeline/mix engine.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- Risk Level: Critical
- Estimated Complexity: High

### Pause Recording

- Feature Name: Pause recording
- Current Status: `MISSING`
- Current Implementation: `PodcastSession.handlePauseResume` calls `stopRecording()` when currently recording.
- Missing Implementation: No `pauseRecording` hook function and no `MediaRecorder.pause()`/native pause path exists.
- Dependencies: `PodcastSession`, `useRecording`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- Risk Level: High
- Estimated Complexity: Medium

### Resume Recording

- Feature Name: Resume recording
- Current Status: `MISSING`
- Current Implementation: `PodcastSession.handlePauseResume` calls `startRecording()` when local paused state is true.
- Missing Implementation: No `resumeRecording` hook function and no continuation of the same recording session exists.
- Dependencies: `PodcastSession`, `useRecording`.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
  - `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- Risk Level: High
- Estimated Complexity: Medium

### Podcast-Specific Audio Engine Wiring

- Feature Name: Podcast audio engine integration
- Current Status: `MISSING`
- Current Implementation: Shared audio engine files exist under `src/services/audioEngine`, and RJ hooks import them. No imports from `src/features/podcast` into `src/services/audioEngine` were found.
- Missing Implementation: Podcast Studio does not use `AudioEngineManager`, `DeckEngine`, `MicEngine`, `MicrophoneManager`, `PlaybackController`, `DSPChain`, or `AudioGraph`.
- Dependencies: disconnected shared audio engine.
- Source Files:
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/AudioEngineManager.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/DeckEngine.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/MicEngine.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/MicrophoneManager.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/playback/PlaybackController.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/DSPChain.ts`
  - `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/AudioGraph.ts`
- Risk Level: Critical
- Estimated Complexity: High

## Mock Implementations

- `PodcastAudioDeck.tsx`: random VU metering and local-only mixer controls.
- `PlayerAudioFXPanel.tsx`: random VU metering and local-only master/FX state.
- `EpisodeManager.tsx`: random waveform data.
- `Podcastsession.tsx`: animated waveform UI and mock size calculation in save flow.
- `PodcastUpload.tsx`: random live stats for listeners/bitrate/storage.
- `GuestRoom.tsx`: random connection quality and simulated host replies.
- `RemoteGuestsPanel.tsx`: hardcoded default seats and fallback `ROOM123` invite behavior.
- `useRecording.ts`: random non-web mic levels and random mobile fallback size.

## Placeholder Logic

- `PodcastPlaylistModal.tsx`: `YOUR_YOUTUBE_API_KEY_HERE` placeholder prevents active YouTube metadata fetch.
- `PodcastPlaylistModal.tsx`: Spotify/SoundCloud paths parse or store metadata but do not implement real platform stream playback.
- `RemoteGuestsPanel.tsx`: fallback `ROOM123` links when no room ID is available.
- `PodcastSession.handleSave`: generated metadata object and mock size; no active parent save callback in `PodcastUpload.tsx`.

## Empty Services

All listed files have length 0 in the current filesystem:

- `Melody_meet/OPERATOR_PANEL/src/hooks/useAudioEngine.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/webrtcService.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/encoder.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/websocket.ts`

## Dead Code And Unused Current Paths

- `usePodcastBootstrap.ts` is defined and calls real bootstrap APIs, but no import/use of `usePodcastBootstrap` was found in `src/features/podcast`.
- `PodcastUpload.tsx` destructures `peerApplyVolume`, `peerApplyMute`, and `closePeer` from `usePeerConnections`, but the rendered `PodcastAudioDeck` receives no props and those functions are not wired to visible controls.
- `PodcastApi.trimRecording`, `PodcastApi.adjustVolume`, `PodcastApi.joinGuestSlot`, `PodcastApi.muteGuestSlot`, and `PodcastApi.setGuestSlotVolume` are defined in `operatorApi.ts`, but no active Podcast Studio UI path calls them.
- Shared audio engine classes are used by RJ feature files, but no `src/features/podcast` imports from `src/services/audioEngine`.
- `socketService.ts` exposes guest-side socket emitters for `guest_joined`, `guest_speaking`, `guest_mic_toggle`, and `webrtc_offer`, but `GuestRoom.tsx` does not use `socketService`.

## Missing Audio Engine Logic

- No podcast program output bus.
- No podcast master mixer graph.
- No podcast monitor/headphone bus.
- No deck-control-to-audio-node binding.
- No playlist-to-mixer routing.
- No guest-to-host frontend WebRTC sender.
- No mixed-output recorder.
- No waveform extraction pipeline.
- No timeline audio model.
- No export/mixdown renderer.
- No compressor, limiter, or EQ DSP path in Podcast Studio.

## Missing Backend Logic From Current Frontend Paths

This section identifies backend interactions missing from current frontend execution paths, not backend files that may or may not exist.

- Guest room does not call `PodcastApi.joinGuestSlot` or guest socket join/signaling methods.
- Deck mute does not call `PodcastApi.muteGuestSlot`.
- Deck volume/gain does not call `PodcastApi.setGuestSlotVolume` or `PodcastApi.updateMic`.
- Trim UI does not call `PodcastApi.trimRecording`.
- Episode manager current save/publish path does not call `PodcastApi.create`, `PodcastApi.upload`, `PodcastApi.uploadCoverArt`, or status APIs.
- Audio export has no frontend API call.
- Program output/live audio publishing has no frontend API or streaming-service path.

## Missing Frontend Logic

- Guest microphone capture in `GuestRoom`.
- Guest WebRTC offer creation in `GuestRoom`.
- Guest socket lifecycle in `GuestRoom`.
- Binding between `PodcastAudioDeck` and `usePeerConnections`.
- Binding between `PlayerAudioFXPanel` and any audio processing node.
- Binding between playlist playback and mixer/recorder.
- Binding between remote guest audio and visible channel strips.
- Binding between recording and mixed program output.
- Binding between episode trim UI and actual audio processing.
- Binding between markers and persisted audio timeline metadata.
- Active use of `usePodcastBootstrap` in the Podcast Studio container.

## Top 20 Critical Gaps

1. `CRITICAL`: Program output is missing; no unified mixed output exists.
2. `CRITICAL`: Guest microphones are missing; guest UI does not capture or transmit audio.
3. `CRITICAL`: Recording is mic-only and does not capture the show mix.
4. `CRITICAL`: Audio routing is missing between host, guests, playback, mixer, monitor, recording, and export.
5. `CRITICAL`: Podcast audio deck controls are UI-only and do not affect audio.
6. `CRITICAL`: Master mixer engine is missing.
7. `CRITICAL`: Live session management does not stream mixed program audio.
8. `CRITICAL`: Host-side WebRTC receive path has no implemented current-frontend guest sender.
9. `CRITICAL`: Remote guest audio is not connected to deck controls or recording.
10. `CRITICAL`: Shared audio engine is not wired into Podcast Studio.
11. `CRITICAL`: Audio export/mixdown is missing.
12. `HIGH`: Monitoring lacks a dedicated monitor bus or complete source mix.
13. `HIGH`: Headphone monitoring/output selection is missing.
14. `HIGH`: Pause recording stops the recording instead of pausing it.
15. `HIGH`: Resume recording starts a new recording instead of resuming the same one.
16. `HIGH`: Waveforms are mock/random/animated, not audio-derived.
17. `HIGH`: Metering is random, not signal-derived.
18. `HIGH`: EQ/compressor/limiter controls are not connected to DSP.
19. `HIGH`: Timeline/trim UI does not process audio or call trim API.
20. `HIGH`: Episode save/publish path is local metadata and does not use current episode upload/create APIs.

## Production Readiness Score

Score: 30/100

Basis:

- Real foundations exist for host mic permission, mic-only recording, live metadata, socket host join, and host-side WebRTC receive.
- Core Podcast Studio audio production requirements are incomplete or missing: guest capture, routing, mixer controls, program output, mixed recording, monitoring, export, real waveforms, and DSP.
- Several visible production controls are mock or UI-only.

## Stability Assessment

Current Stability: Low to Medium

Source-backed factors:

- Real recording depends on browser `MediaRecorder` or Expo AV and has upload fallback handling in `useRecording.ts`.
- Live socket and REST paths exist, but key guest and program-output paths are not active in the current guest/frontend UI.
- Pause/resume behavior uses stop/start semantics, which can fragment recording state.
- Mock/random state in visible studio surfaces can display values unrelated to actual audio state.

## Scalability Assessment

Current Scalability: Low

Source-backed factors:

- Audio sources are isolated rather than routed through a shared graph.
- `PodcastAudioDeck` stores channel state locally instead of binding to shared audio state or backend guest-slot state.
- Guest pages do not participate in the current socket/WebRTC implementation.
- Shared audio engine exists but is disconnected from Podcast Studio.

## Maintainability Assessment

Current Maintainability: Medium-Low

Source-backed factors:

- Podcast code is split into clear sections and hooks, which helps navigation.
- The visible studio UI and actual audio behavior are not aligned, increasing audit/debug complexity.
- Empty streaming service files and unused API methods create unclear ownership boundaries.
- Similar audio UI exists in RJ and Podcast areas, while the shared audio engine is only wired into RJ paths.

## Final Gap Analysis Summary

Podcast V2 has a substantial frontend shell for Podcast Studio and several real primitives: microphone permission, mic-only recording, live-session REST calls, host socket connection, and host-side WebRTC receive logic. The production-blocking gap is that these primitives are not assembled into a complete podcast audio engine. Guest microphone capture, program output, master mixing, audio routing, mixed recording, monitoring, export, real metering, real waveforms, and DSP-backed controls are missing or not wired to the visible UI.

Overall implementation classification: `PARTIAL`
