# Podcast V2 Audio Implementation Trace

Audit date: 2026-06-20  
Scope: current frontend implementation in `Melody_meet/OPERATOR_PANEL` plus backend routes/services referenced by that frontend.  
Rule applied: source audit only. No source code was modified.

## Status Legend

- `REAL`: implemented end to end for the audited behavior with actual browser/native/backend/audio execution.
- `PARTIAL`: some execution exists, but the feature does not complete the full expected audio path.
- `MOCK`: behavior is simulated, random, hardcoded, or locally faked.
- `UI ONLY`: controls or screens exist, but no audio/backend engine behavior is wired.
- `MISSING`: no current implementation found for the feature.

## Primary Source Inventory

### Podcast Screens And Containers

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`

### Podcast Audio Components

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RecentRecordingsList.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx`

### Podcast Audio Hooks

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastBootstrap.ts`

### Frontend Services Used By Podcast

- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`

### Shared Audio Engine Present But Not Wired To Podcast V2

- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/AudioEngineManager.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/DeckEngine.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/MicEngine.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/MicrophoneManager.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/core/Crossfader.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/playback/PlaybackController.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/AudioGraph.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/DSPChain.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/ParameterManager.ts`

No imports from `src/services/audioEngine` were found in `src/features/podcast`.

### Empty Audio/Streaming Services

- `Melody_meet/OPERATOR_PANEL/src/hooks/useAudioEngine.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/webrtcService.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/encoder.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/streaming/websocket.ts`

### Backend Sources Referenced By The Frontend

- `melodymeet-backend/services/operator/routes/podcast.routes.js`
- `melodymeet-backend/services/operator/controllers/podcast.controller.js`
- `melodymeet-backend/services/operator/services/podcast.service.js`
- `melodymeet-backend/services/operator/services/podcast.guest.service.js`
- `melodymeet-backend/services/operator/services/audio.service.js`
- `melodymeet-backend/services/operator/sockets/podcast.socket.js`
- `melodymeet-backend/services/operator/models/podcast.model.js`
- `melodymeet-backend/services/operator/models/podcast.recording.model.js`
- `melodymeet-backend/services/operator/models/podcast.live.model.js`
- `melodymeet-backend/services/operator/models/podcast.guest.model.js`
- `melodymeet-backend/services/operator/models/podcast.mic.model.js`

## Backend APIs And Socket Events Used By Audio Features

### REST APIs Used In Current Podcast Audio Paths

Defined in `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts` under `PodcastApi`.

- `PodcastApi.uploadRecording(formData)` -> used by `useRecording.ts`
- `PodcastApi.deleteRecording(id)` -> used by `useRecording.ts`
- `PodcastApi.startLiveSession(payload)` -> used by `useLiveStream.ts`
- `PodcastApi.stopLiveSession(payload)` -> used by `useLiveStream.ts`
- `PodcastApi.updateLiveViewers(roomId, viewerCount)` -> used by `useLiveStream.ts`
- `PodcastApi.generateGuestLinks(payload)` -> used by `useLiveStream.ts`
- `PodcastApi.updateMic(micId, payload)` -> used by Zustand podcast actions, not by the deck controls

### REST APIs Defined But Not Used By Current Podcast Audio UI

Defined in `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`.

- Podcast episode/media: `getAll`, `create`, `upload`, `uploadCoverArt`, `updateStatus`, `delete`
- Recording library/editing: `getRecordings`, `trimRecording`, `adjustVolume`
- Live sessions and guest slots: `getLiveSessions`, `getGuestSlots`, `joinGuestSlot`, `leaveGuestSlot`, `kickGuestSlot`, `muteGuestSlot`, `setGuestSlotVolume`
- Mic inventory: `getMics`, `createMic`, `deleteMic`
- Legacy live guest methods: `getGuests`, `joinLiveSession`, `respondToGuest`, `removeGuest`

### Socket Events Used In Current Podcast Audio Paths

Frontend source: `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts` and `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`.  
Backend source: `melodymeet-backend/services/operator/sockets/podcast.socket.js`.

- Host lifecycle/chat/listeners: `host_join`, `room_snapshot`, `chat_history`, `chat_message`, `chat_error`, `viewer_count`, `live_ended`
- Guest slot events: `slot_updated`, `guest_joined`, `guest_left`, `guest_mic_toggle`, `guest_speaking`
- WebRTC signaling: `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate`

## Feature Traces

### 1. Host Microphone

Current Status: `PARTIAL`

Execution Flow:

User Action -> clicks microphone test/start live/record controls  
UI Component -> `PodcastUpload.tsx`, `LiveSetupModal.tsx`, `Podcastsession.tsx`  
Hook -> `useLiveStream.testMicrophone`, `useLiveStream.startLiveStream`, `useRecording.startRecording`  
Service -> `PodcastApi.startLiveSession` for live metadata, `PodcastApi.uploadRecording` for recording upload  
State Management -> Zustand podcast state through `useAppStore`  
Backend API -> live session start/recording upload only; no mic device API for live audio  
Audio Layer -> browser `navigator.mediaDevices.getUserMedia({ audio: true })`; browser `MediaRecorder` for recording; host stream tracks added to peer connections in `usePeerConnections.ts`  
Final Output -> host mic is available as a local `MediaStream`, can be recorded by `MediaRecorder`, and can be attached to host WebRTC peer connections after guest offers arrive.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- `useLiveStream.testMicrophone` requests web microphone permission with `navigator.mediaDevices.getUserMedia({ audio: true })`.
- `useLiveStream.startLiveStream` obtains a microphone stream on web if one is not already present.
- `useRecording.startRecording` obtains another microphone stream and starts a browser `MediaRecorder`.
- `usePeerConnections` receives the host stream from `PodcastUpload.tsx` and adds its tracks to each guest peer connection.

Missing Behaviour:

- The host mic is not routed through the visible `PodcastAudioDeck` fader, gain, mute, solo, EQ, compressor, limiter, or master controls.
- The host mic is not connected to the shared `audioEngine`.
- There is no program-output mix path combining host mic, remote guests, and playback.

Dependencies:

- Components: `PodcastUpload`, `LiveSetupModal`, `PodcastSession`
- Hooks: `useLiveStream`, `useRecording`, `usePeerConnections`
- Services: `PodcastApi`
- Backend: live session and recording upload routes
- Audio Classes: browser `MediaStream`, `MediaRecorder`, `RTCPeerConnection`

### 2. Guest Microphones

Current Status: `MISSING`

Execution Flow:

User Action -> guest clicks mic/mute controls in guest room  
UI Component -> `GuestRoom.tsx`  
Hook -> none  
Service -> none  
State Management -> local React state only  
Backend API -> none  
Audio Layer -> none  
Final Output -> no guest microphone capture or transmission occurs in the current guest frontend.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx`
- `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`

Current Behaviour:

- Guest room has local controls for microphone/mute state.
- `GuestRoom.tsx` simulates connection quality and host replies.
- No `navigator.mediaDevices.getUserMedia`, `RTCPeerConnection`, `podcastSocket`, or `PodcastApi.joinGuestSlot` usage exists in the guest pages.

Missing Behaviour:

- Guest mic capture.
- Guest WebRTC publishing.
- Guest socket join/signaling.
- Guest-to-host audio transmission.

Dependencies:

- Components: `GuestJoinPage`, `GuestRoom`
- Hooks: none
- Services: none
- Backend: none currently used by guest UI
- Audio Classes: none currently used

### 3. Remote Guest Audio

Current Status: `PARTIAL`

Execution Flow:

User Action -> external WebRTC offer arrives through socket signaling  
UI Component -> host screen mounted by `PodcastUpload.tsx`  
Hook -> `usePodcastSocket` stores pending WebRTC signal; `usePeerConnections` consumes it  
Service -> `podcastSocket.webRtcAnswer`, `podcastSocket.webRtcIceCandidate`  
State Management -> Zustand `podcast.pendingWebRtcSignal`, guest slot state updates  
Backend API -> socket namespace `/podcast`, not REST  
Audio Layer -> `RTCPeerConnection.ontrack`, `AudioContext.createMediaStreamSource`, `GainNode`, `HTMLAudioElement.srcObject`  
Final Output -> received remote stream is connected to `AudioContext.destination` and also assigned to a hidden/managed audio element.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePodcastSocket.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/socketService.ts`
- `melodymeet-backend/services/operator/sockets/podcast.socket.js`

Current Behaviour:

- The host frontend can process `webrtc_offer` and `webrtc_ice_candidate` socket messages.
- `usePeerConnections` creates one peer per slot, answers the offer, handles ICE, and connects incoming remote audio to a per-slot gain node.
- Connection stats are polled and written to guest slot state.

Missing Behaviour:

- The current guest frontend does not generate the WebRTC offer, so the built host-side receiving path has no corresponding implemented guest-side sender in this frontend.
- Remote guest audio is not connected to the visible audio deck, solo/mute controls, master output, recording mix, or export path.

Dependencies:

- Components: `PodcastUpload`
- Hooks: `usePodcastSocket`, `usePeerConnections`
- Services: `podcastSocket`
- Backend: podcast socket namespace
- Audio Classes: `RTCPeerConnection`, `AudioContext`, `MediaStreamAudioSourceNode`, `GainNode`, `HTMLAudioElement`

### 4. Microphone Routing

Current Status: `PARTIAL`

Execution Flow:

User Action -> live host starts session; remote WebRTC offer arrives  
UI Component -> `PodcastUpload.tsx`  
Hook -> `useLiveStream`, `usePeerConnections`  
Service -> socket signaling for peer connection  
State Management -> local refs in `usePeerConnections`, Zustand guest slot state  
Backend API -> socket signaling only  
Audio Layer -> host tracks added to peers; remote stream source connected to per-slot gain node and destination  
Final Output -> host stream can be sent to peers; remote guest stream can play locally through destination.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`

Current Behaviour:

- Routing exists only inside `usePeerConnections`: host stream tracks are added to each peer, and remote stream sources are connected to gain nodes and then `audioCtx.destination`.
- `PodcastAudioDeck.tsx` displays six mic channels, but those channel strips are not connected to the peer routing refs.

Missing Behaviour:

- No implemented routing matrix connects host mic, guest mics, playlist playback, monitor, recording, and program output.
- No connection between `PodcastAudioDeck` channel controls and the WebRTC audio graph.

Dependencies:

- Components: `PodcastUpload`, `PodcastAudioDeck`
- Hooks: `useLiveStream`, `usePeerConnections`
- Services: `podcastSocket`
- Backend: socket signaling
- Audio Classes: `AudioContext`, `GainNode`, `RTCPeerConnection`

### 5. Gain

Current Status: `UI ONLY`

Execution Flow:

User Action -> adjusts gain knob or fader in audio deck  
UI Component -> `PodcastAudioDeck.tsx` `ChannelStrip`  
Hook -> none  
Service -> none  
State Management -> local `channels` React state in `PodcastAudioDeck.tsx`  
Backend API -> none  
Audio Layer -> none from the visible controls  
Final Output -> displayed channel values and simulated meters change only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`

Current Behaviour:

- `PodcastAudioDeck.tsx` stores `gain` and `fader` per channel locally.
- `usePeerConnections.applyVolume(slotId, volume)` can set an internal WebRTC gain node, but `PodcastUpload.tsx` destructures it and does not pass it into `PodcastAudioDeck`.

Missing Behaviour:

- Visible gain/fader controls do not call `usePeerConnections.applyVolume`.
- Visible gain/fader controls do not call backend mic volume APIs.
- Visible gain/fader controls do not affect host mic, guest audio, playlist audio, recording, or program output.

Dependencies:

- Components: `PodcastAudioDeck`
- Hooks: unused available `usePeerConnections.applyVolume`
- Services: none from deck
- Backend: none from deck
- Audio Classes: unused available `GainNode`

### 6. Mute

Current Status: `UI ONLY`

Execution Flow:

User Action -> clicks mute on audio deck channel  
UI Component -> `PodcastAudioDeck.tsx` `ChannelStrip`  
Hook -> none  
Service -> none  
State Management -> local `channels[].muted` state  
Backend API -> none  
Audio Layer -> none from the visible control  
Final Output -> button state and simulated meter behavior change only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- Deck mute toggles local channel state.
- `usePeerConnections.applyMute(slotId, muted)` exists and sets a per-slot gain node to 0 or restored volume.
- `PodcastApi.muteGuestSlot` exists but is not used by the audio deck.

Missing Behaviour:

- Deck mute is not wired to WebRTC gain nodes.
- Deck mute is not wired to guest-slot backend mute APIs.
- Deck mute does not affect recording, program output, or monitor output.

Dependencies:

- Components: `PodcastAudioDeck`
- Hooks: unused available `usePeerConnections.applyMute`
- Services: unused available `PodcastApi.muteGuestSlot`
- Backend: unused guest slot mute route
- Audio Classes: unused available `GainNode`

### 7. Solo

Current Status: `UI ONLY`

Execution Flow:

User Action -> clicks solo on audio deck channel  
UI Component -> `PodcastAudioDeck.tsx` `ChannelStrip`  
Hook -> none  
Service -> none  
State Management -> local `channels[].soloed` state  
Backend API -> none  
Audio Layer -> none  
Final Output -> solo button state changes; no audio graph changes occur.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`

Current Behaviour:

- Solo state is stored locally on each deck channel.
- No audio node, backend route, or peer connection logic reads the solo state.

Missing Behaviour:

- No solo bus, monitor isolation, or channel suppression exists.

Dependencies:

- Components: `PodcastAudioDeck`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 8. Monitor

Current Status: `PARTIAL`

Execution Flow:

User Action -> remote guest audio arrives over WebRTC  
UI Component -> host page mounted by `PodcastUpload.tsx`; monitoring indicators in `PodcastAudioDeck.tsx` and `PlayerAudioFXPanel.tsx` are local visual state  
Hook -> `usePeerConnections`  
Service -> `podcastSocket` signaling  
State Management -> local peer refs and Zustand guest slot stats  
Backend API -> socket signaling  
Audio Layer -> remote stream source -> `GainNode` -> `AudioContext.destination`  
Final Output -> remote guest audio can play from the browser output device if a remote stream is actually received.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`

Current Behaviour:

- Actual audio monitoring exists only for remote WebRTC streams connected directly to `audioCtx.destination`.
- Deck and FX panel meters are simulated with random values.

Missing Behaviour:

- No dedicated monitor bus.
- No user-selectable monitor/headphone output.
- No monitor control wiring from deck or FX panel.
- No monitoring of host mic/playback/program output as a combined signal.

Dependencies:

- Components: `PodcastAudioDeck`, `PlayerAudioFXPanel`
- Hooks: `usePeerConnections`
- Services: `podcastSocket`
- Backend: socket signaling
- Audio Classes: `AudioContext`, `GainNode`

### 9. Headphone Output

Current Status: `MISSING`

Execution Flow:

User Action -> no current headphone-output control found  
UI Component -> none  
Hook -> none  
Service -> none  
State Management -> none  
Backend API -> none  
Audio Layer -> none  
Final Output -> browser default output only, where audio exists.

Source Files:

- No implemented Podcast V2 headphone output source found.

Current Behaviour:

- Remote WebRTC audio, when present, goes to `AudioContext.destination`.
- Playlist playback uses a browser `HTMLAudioElement`.
- No output device selection or headphone bus exists.

Missing Behaviour:

- Headphone output selection.
- Monitor/headphone routing.
- Per-user headphone mix.

Dependencies:

- Components: none
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 10. Playback

Current Status: `PARTIAL`

Execution Flow:

User Action -> selects a playlist track and clicks play/pause/stop  
UI Component -> `PodcastPlaylistModal.tsx`  
Hook -> none  
Service -> no podcast service; optional metadata fetch for YouTube URL parsing  
State Management -> local React state and `audioRef`  
Backend API -> none  
Audio Layer -> browser `new Audio(src)`  
Final Output -> direct playable URLs/local file URIs can play in the browser audio element.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/playback/PlaybackController.ts`

Current Behaviour:

- Local/imported audio files can be selected with `DocumentPicker` and played using `HTMLAudioElement`.
- Playback state is local to `PodcastPlaylistModal`.
- `PlaybackController.ts` exists in the shared audio engine but is not used by Podcast V2.

Missing Behaviour:

- Playlist playback is not routed to the audio deck, monitor bus, recording, or program output.
- Playback is not mixed with host or guest audio.
- YouTube, Spotify, and SoundCloud entries are metadata-oriented and are not implemented as actual stream playback unless a direct playable URL exists.

Dependencies:

- Components: `PodcastPlaylistModal`
- Hooks: none
- Services: browser `Audio`
- Backend: none
- Audio Classes: unused shared `PlaybackController`

### 11. Audio Import

Current Status: `PARTIAL`

Execution Flow:

User Action -> imports audio in playlist or episode manager  
UI Component -> `PodcastPlaylistModal.tsx`, `EpisodeManager.tsx`  
Hook -> none  
Service -> `expo-document-picker`  
State Management -> local React state; optional local episode state through parent callbacks  
Backend API -> none for current import path  
Audio Layer -> playlist can pass local URI to browser `Audio`; episode manager stores metadata only  
Final Output -> imported file can appear in local UI; playlist imports can be played if URI is browser-playable.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- Playlist modal accepts audio MIME types through `DocumentPicker.getDocumentAsync`.
- Episode manager accepts an audio file and stores file metadata in local component state.
- `PodcastApi.upload` exists but current episode manager save/publish path calls parent-local handlers rather than that API.

Missing Behaviour:

- Imported audio is not uploaded through the current playlist path.
- Imported episode audio is not processed, decoded, mixed, or routed.
- Imported audio does not become part of a timeline or program output.

Dependencies:

- Components: `PodcastPlaylistModal`, `EpisodeManager`
- Hooks: none
- Services: `expo-document-picker`; unused `PodcastApi.upload`
- Backend: none in current import path
- Audio Classes: browser `Audio` in playlist only

### 12. Local Files

Current Status: `PARTIAL`

Execution Flow:

User Action -> chooses local file  
UI Component -> `PodcastPlaylistModal.tsx` or `EpisodeManager.tsx`  
Hook -> none  
Service -> `DocumentPicker`  
State Management -> local selected track/file state  
Backend API -> none  
Audio Layer -> browser `Audio` for playlist local file playback; none in episode manager  
Final Output -> selected file appears in UI; playlist local file may play.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`

Current Behaviour:

- Local file selection is implemented.
- Playback is only implemented in `PodcastPlaylistModal`.

Missing Behaviour:

- Local files are not routed to deck channels.
- Local files are not included in recording/program output.
- Episode manager local file does not create a real audio editing timeline.

Dependencies:

- Components: `PodcastPlaylistModal`, `EpisodeManager`
- Hooks: none
- Services: `DocumentPicker`
- Backend: none
- Audio Classes: browser `Audio` in playlist only

### 13. Timeline

Current Status: `UI ONLY`

Execution Flow:

User Action -> edits episode/trim values or uses session controls  
UI Component -> `EpisodeManager.tsx`, `TrimModal.tsx`, `Podcastsession.tsx`  
Hook -> `useRecording` only for recording timer; no timeline hook  
Service -> none  
State Management -> local React state  
Backend API -> none  
Audio Layer -> none  
Final Output -> UI state updates; no real timeline engine executes.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`

Current Behaviour:

- Trim ranges, chapters, and session segments are stored in local component state.
- No decoded audio buffer, timeline renderer, non-destructive edit graph, or backend trim call is executed from the current UI.

Missing Behaviour:

- Timeline audio model.
- Playback cursor tied to actual audio data.
- Edit rendering/export path.

Dependencies:

- Components: `EpisodeManager`, `TrimModal`, `PodcastSession`
- Hooks: `useRecording` for timer only
- Services: none
- Backend: unused available `PodcastApi.trimRecording`
- Audio Classes: none

### 14. Waveform

Current Status: `MOCK`

Execution Flow:

User Action -> opens recording/session/edit UI  
UI Component -> `Podcastsession.tsx`, `EpisodeManager.tsx`, `TrimModal.tsx`  
Hook -> none for waveform data  
Service -> none  
State Management -> local arrays and CSS animation  
Backend API -> none  
Audio Layer -> none  
Final Output -> animated or random bars are displayed.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx`

Current Behaviour:

- `PodcastSession` waveform is a CSS/animated visual component.
- `EpisodeManager` creates waveform data using `Math.random`.
- `TrimModal` renders provided waveform data but does not generate it from audio.

Missing Behaviour:

- Waveform extraction from audio files or recording buffers.
- Waveform synchronization with playback and trim selection.

Dependencies:

- Components: `PodcastSession`, `EpisodeManager`, `TrimModal`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 15. Recording

Current Status: `PARTIAL`

Execution Flow:

User Action -> clicks start recording  
UI Component -> `PodcastSession.tsx`  
Hook -> `useRecording.startRecording`  
Service -> browser `MediaRecorder` or Expo AV `Audio.Recording`; upload through `PodcastApi.uploadRecording` on stop  
State Management -> Zustand podcast recording state plus local `PodcastSession` state  
Backend API -> recording upload on stop  
Audio Layer -> browser mic-only `MediaRecorder`; native Expo recording  
Final Output -> microphone recording blob/URI can be uploaded and added to local recordings state.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- Web recording captures a new local microphone stream and records chunks with `MediaRecorder`.
- Native recording uses Expo AV `Audio.RecordingOptionsPresets.HIGH_QUALITY`.
- Stop uploads a `FormData` recording and falls back to local metadata if upload fails.

Missing Behaviour:

- Recording does not capture the mixed show output.
- Recording does not include remote guest audio or playlist playback.
- Web recording blob type is `audio/webm` while generated filename uses `.mp3`.
- The recording flow has no real pause/resume continuity.

Dependencies:

- Components: `PodcastSession`
- Hooks: `useRecording`
- Services: `PodcastApi.uploadRecording`
- Backend: recording upload route
- Audio Classes: `MediaRecorder`, Expo AV `Audio.Recording`

### 16. Pause Recording

Current Status: `MISSING`

Execution Flow:

User Action -> clicks pause in `PodcastSession`  
UI Component -> `Podcastsession.tsx`  
Hook -> calls `useRecording.stopRecording`  
Service -> upload/finalize path may execute  
State Management -> local paused state and Zustand recording state  
Backend API -> upload can occur because stop is called  
Audio Layer -> current recorder is stopped, not paused  
Final Output -> current recording segment is finalized/stopped.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`

Current Behaviour:

- `handlePauseResume` checks `isRecording`; when true, it sets local paused state and calls `stopRecording()`.
- `useRecording.ts` exposes no `pauseRecording` function and does not call `MediaRecorder.pause()`.

Missing Behaviour:

- True recording pause without finalizing/uploading the recording.
- Continuity of the same recording after pause.

Dependencies:

- Components: `PodcastSession`
- Hooks: `useRecording`
- Services: `PodcastApi.uploadRecording` through stop path
- Backend: recording upload route can be hit
- Audio Classes: current `MediaRecorder` is stopped, not paused

### 17. Resume Recording

Current Status: `MISSING`

Execution Flow:

User Action -> clicks resume after local pause  
UI Component -> `Podcastsession.tsx`  
Hook -> calls `useRecording.startRecording`  
Service -> starts a new recording session  
State Management -> local paused state and Zustand recording state  
Backend API -> none until next stop  
Audio Layer -> new `MediaRecorder` or native recording starts  
Final Output -> a separate new recording starts.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`

Current Behaviour:

- Resume starts a new recording rather than resuming the previous recorder.
- No `MediaRecorder.resume()` or equivalent native resume path exists.

Missing Behaviour:

- True resume for the same recording.
- Segment stitching or continuity tracking.

Dependencies:

- Components: `PodcastSession`
- Hooks: `useRecording`
- Services: none until later upload
- Backend: none until later upload
- Audio Classes: `MediaRecorder` start path only

### 18. Stop Recording

Current Status: `PARTIAL`

Execution Flow:

User Action -> clicks stop recording  
UI Component -> `Podcastsession.tsx`  
Hook -> `useRecording.stopRecording`  
Service -> `PodcastApi.uploadRecording`  
State Management -> Zustand resets recording flags and appends recording metadata  
Backend API -> upload recording route  
Audio Layer -> web `MediaRecorder.stop()` or native `stopAndUnloadAsync()`  
Final Output -> recording metadata is added locally; upload response may supply stored URL/id.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- Stop works for the mic-only recorder path.
- The hook stops the active recording and attempts upload.

Missing Behaviour:

- Stop does not finalize a mixed program recording.
- Stop does not merge host, guest, playlist, and effects output.

Dependencies:

- Components: `PodcastSession`
- Hooks: `useRecording`
- Services: `PodcastApi.uploadRecording`
- Backend: recording upload route
- Audio Classes: `MediaRecorder`, Expo AV `Audio.Recording`

### 19. Recording Timer

Current Status: `REAL`

Execution Flow:

User Action -> starts recording  
UI Component -> `Podcastsession.tsx`  
Hook -> `useRecording`  
Service -> none  
State Management -> Zustand `recordingSeconds`; local `elapsed` in `PodcastSession`  
Backend API -> none  
Audio Layer -> none  
Final Output -> recording duration increments in UI while recording state is active.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`

Current Behaviour:

- `useRecording` increments `recordingSeconds` every second while `isRecording` is true.
- `PodcastSession` also tracks local elapsed seconds for its session UI.

Missing Behaviour:

- No missing behavior for timer display itself. It is not proof of audio capture beyond state.

Dependencies:

- Components: `PodcastSession`
- Hooks: `useRecording`
- Services: none
- Backend: none
- Audio Classes: none

### 20. Episode Markers

Current Status: `UI ONLY`

Execution Flow:

User Action -> clicks mark segment or add chapter  
UI Component -> `Podcastsession.tsx`  
Hook -> none for marker persistence  
Service -> none  
State Management -> local `segments` and `chapters` arrays  
Backend API -> none  
Audio Layer -> none  
Final Output -> markers appear in local session UI.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`

Current Behaviour:

- Markers and chapters are appended to local arrays.
- Optional callbacks exist, but `PodcastUpload.tsx` does not pass marker/chapter handlers.

Missing Behaviour:

- Marker persistence.
- Marker attachment to actual recording/audio timeline.
- Backend save/export of markers.

Dependencies:

- Components: `PodcastSession`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 21. Master Volume

Current Status: `UI ONLY`

Execution Flow:

User Action -> adjusts master volume in `PlayerAudioFXPanel`  
UI Component -> `PlayerAudioFXPanel.tsx`  
Hook -> none  
Service -> none  
State Management -> local `masterVolume` state  
Backend API -> none  
Audio Layer -> none  
Final Output -> local UI value changes only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`

Current Behaviour:

- The panel stores master volume locally and can call an optional `onMasterVolumeChange`.
- `PodcastUpload.tsx` renders `PlayerAudioFXPanel` without that callback.

Missing Behaviour:

- No master gain node.
- No master control over deck, playback, guest audio, recording, or program output.

Dependencies:

- Components: `PlayerAudioFXPanel`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 22. EQ

Current Status: `UI ONLY`

Execution Flow:

User Action -> adjusts high/mid/low controls on a channel  
UI Component -> `PodcastAudioDeck.tsx` `ChannelStrip`  
Hook -> none  
Service -> none  
State Management -> local channel `hi`, `mid`, `low` state  
Backend API -> none  
Audio Layer -> none  
Final Output -> displayed knob values change only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/DSPChain.ts`

Current Behaviour:

- EQ values exist as local UI state.
- `DSPChain.ts` exists in the shared audio engine but is not imported by Podcast V2.

Missing Behaviour:

- No filters or DSP nodes are connected to the controls.
- No per-channel EQ affects audible audio.

Dependencies:

- Components: `PodcastAudioDeck`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: unused shared `DSPChain`

### 23. Compressor

Current Status: `UI ONLY`

Execution Flow:

User Action -> toggles/adjusts compressor in FX panel  
UI Component -> `PlayerAudioFXPanel.tsx`  
Hook -> none  
Service -> none  
State Management -> local `compressor` state  
Backend API -> none  
Audio Layer -> none  
Final Output -> local UI state changes only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`

Current Behaviour:

- Compressor controls are local.
- Optional `onCompressorChange` exists but is not passed by `PodcastUpload.tsx`.

Missing Behaviour:

- No `DynamicsCompressorNode` or DSP compressor path is wired.
- Compressor does not affect any audio signal.

Dependencies:

- Components: `PlayerAudioFXPanel`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none in podcast path

### 24. Limiter

Current Status: `UI ONLY`

Execution Flow:

User Action -> toggles/adjusts limiter in FX panel  
UI Component -> `PlayerAudioFXPanel.tsx`  
Hook -> none  
Service -> none  
State Management -> local `limiter` state  
Backend API -> none  
Audio Layer -> none  
Final Output -> local UI state changes only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`

Current Behaviour:

- Limiter controls are local.
- Optional `onLimiterChange` exists but is not passed by `PodcastUpload.tsx`.

Missing Behaviour:

- No limiter node or DSP limiter path is wired.
- Limiter does not affect any audio signal.

Dependencies:

- Components: `PlayerAudioFXPanel`
- Hooks: none
- Services: none
- Backend: none
- Audio Classes: none

### 25. Audio Effects

Current Status: `UI ONLY`

Execution Flow:

User Action -> changes deck EQ or FX panel controls  
UI Component -> `PodcastAudioDeck.tsx`, `PlayerAudioFXPanel.tsx`  
Hook -> none  
Service -> none  
State Management -> local component state  
Backend API -> none  
Audio Layer -> none  
Final Output -> control state and visual meters update only.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/DSPChain.ts`
- `Melody_meet/OPERATOR_PANEL/src/services/audioEngine/dsp/AudioGraph.ts`

Current Behaviour:

- Podcast V2 exposes effect-like controls but does not wire them to Web Audio nodes.
- Shared DSP classes exist outside the podcast feature and are not used here.

Missing Behaviour:

- No effects chain for host mic, guest mics, playback, or master output.
- No backend-rendered effects path.

Dependencies:

- Components: `PodcastAudioDeck`, `PlayerAudioFXPanel`
- Hooks: none
- Services: none currently used; shared audio engine present but disconnected
- Backend: none
- Audio Classes: none in current podcast path

### 26. Export

Current Status: `MISSING`

Execution Flow:

User Action -> no current podcast audio export control found for mixed output  
UI Component -> none for final audio export; episode save/publish stores metadata  
Hook -> none  
Service -> none for export  
State Management -> none for export  
Backend API -> none for export  
Audio Layer -> none  
Final Output -> no exported mixed audio file is produced by the current frontend.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx`
- `Melody_meet/OPERATOR_PANEL/src/services/api/operatorApi.ts`

Current Behaviour:

- `EpisodeManager` can save/publish local episode objects through parent callbacks.
- `PodcastSession.handleSave` builds local metadata and calls optional `onSaveRecording`, but `PodcastUpload.tsx` does not pass that callback.
- No export/mixdown function was found.

Missing Behaviour:

- Audio mixdown/export.
- Export format selection.
- Backend or client rendering of edited audio.

Dependencies:

- Components: `EpisodeManager`, `PodcastSession`
- Hooks: none for export
- Services: none for export
- Backend: none currently called
- Audio Classes: none

### 27. Program Output

Current Status: `MISSING`

Execution Flow:

User Action -> starts live/recording/playback/deck controls  
UI Component -> multiple podcast components  
Hook -> separate hooks for live, recording, sockets, peers  
Service -> independent `PodcastApi`, `podcastSocket`, browser audio APIs  
State Management -> mixed local state and Zustand state  
Backend API -> live metadata, recording upload, socket signaling  
Audio Layer -> separate host mic recorder, remote WebRTC monitor path, playlist `Audio` element  
Final Output -> no single program output bus exists.

Source Files:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
- `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx`

Current Behaviour:

- Host mic live stream setup, recording, remote guest receipt, and playlist playback are separate implementations.
- There is no master output graph that receives all sources.

Missing Behaviour:

- Program mix bus.
- Routing of all sources into a common output.
- Program output recording/export/live transmission.

Dependencies:

- Components: `PodcastUpload`, `PodcastAudioDeck`, `PodcastPlaylistModal`, `PlayerAudioFXPanel`, `PodcastSession`
- Hooks: `useLiveStream`, `useRecording`, `usePeerConnections`, `usePodcastSocket`
- Services: `PodcastApi`, `podcastSocket`
- Backend: live session, recording upload, socket signaling
- Audio Classes: none for a program bus

## Fake, Simulated, Placeholder, And UI-Only Audio Behaviour

### Fake Audio Behaviour

- `PodcastAudioDeck.tsx` uses local channel values for gain, EQ, fader, mute, and solo without connecting them to audio nodes.
- `PlayerAudioFXPanel.tsx` stores master volume, compressor, and limiter locally without audio processing.
- `GuestRoom.tsx` local mic/mute controls do not capture microphone audio.

### Simulated Audio

- `PodcastAudioDeck.tsx` simulates VU levels with `Math.random`.
- `PlayerAudioFXPanel.tsx` simulates meter levels with random values when its local live toggle is active.
- `PodcastUpload.tsx` simulates live listener/stat values with random updates.
- `GuestRoom.tsx` simulates connection quality and host replies.
- `useRecording.ts` simulates non-web mic levels with `Math.random`.

### Placeholder Audio

- `PodcastPlaylistModal.tsx` includes `YOUR_YOUTUBE_API_KEY_HERE`; YouTube metadata fetch returns null when this placeholder remains.
- Spotify and SoundCloud handling in `PodcastPlaylistModal.tsx` parses metadata-like information but does not implement real platform playback streams.
- `RemoteGuestsPanel.tsx` uses default seats and fallback `ROOM123` invite links.

### Mock Recording

- `PodcastSession.handleSave` computes a `mockSize` from elapsed time and bitrate math.
- Pause recording calls stop; resume starts a separate recording.
- Web recording uploads `audio/webm` content with an `.mp3` filename.

### Mock Monitoring

- Deck and FX meters are random visual indicators.
- Guest room connection quality is simulated.
- Actual monitoring exists only for remote WebRTC streams received by `usePeerConnections`, and only to `AudioContext.destination`.

### Mock Waveforms

- `EpisodeManager.tsx` generates waveform bars with `Math.random`.
- `PodcastSession` waveform is animated UI.
- `TrimModal.tsx` displays supplied waveform arrays but does not compute them from audio.

### UI Controls Without Engine Logic

- Deck gain
- Deck fader
- Deck mute
- Deck solo
- Deck high/mid/low EQ
- FX master volume
- FX compressor
- FX limiter
- Episode trim controls
- Episode markers/chapters
- Guest mic controls in `GuestRoom.tsx`
- Remote guest invite seat controls in `RemoteGuestsPanel.tsx`

## Audio Execution Architecture

The current Podcast V2 audio architecture is split into independent paths:

1. Live session metadata path:
   - `PodcastUpload.tsx` -> `useLiveStream.ts` -> `PodcastApi.startLiveSession/stopLiveSession/updateLiveViewers/generateGuestLinks`
   - This path creates live-session state and can request the host microphone, but does not create a mixed audio stream.

2. Recording path:
   - `PodcastSession.tsx` -> `useRecording.ts` -> browser `MediaRecorder` or Expo AV -> `PodcastApi.uploadRecording`
   - This path records the local microphone only.

3. Remote WebRTC receive path:
   - `usePodcastSocket.ts` -> Zustand pending signal -> `usePeerConnections.ts` -> `RTCPeerConnection` -> `AudioContext`/`GainNode` -> `AudioContext.destination`
   - This path can receive and play remote guest audio when a WebRTC offer exists.

4. Playlist playback path:
   - `PodcastPlaylistModal.tsx` -> browser `new Audio(src)`
   - This path plays direct/local audio independently from deck, recording, and program output.

5. Visual mixer/effects path:
   - `PodcastAudioDeck.tsx` and `PlayerAudioFXPanel.tsx`
   - This path changes local UI state and simulated meters only.

The shared audio engine under `src/services/audioEngine` contains playback, mic, deck, DSP, and graph classes, but it is not imported into Podcast V2.

## Audio Dependency Graph

```text
PodcastUpload.tsx
|-- useLiveStream.ts
|   |-- PodcastApi.startLiveSession
|   |-- PodcastApi.stopLiveSession
|   |-- PodcastApi.updateLiveViewers
|   |-- PodcastApi.generateGuestLinks
|   |-- navigator.mediaDevices.getUserMedia
|
|-- usePodcastSocket.ts
|   |-- podcastSocket (/podcast namespace)
|   |-- Zustand podcast socket/live/chat/guest slot state
|   |-- pending WebRTC signal state
|
|-- usePeerConnections.ts
|   |-- pending WebRTC signals from Zustand
|   |-- podcastSocket.webRtcAnswer
|   |-- podcastSocket.webRtcIceCandidate
|   |-- RTCPeerConnection
|   |-- AudioContext
|   |-- GainNode
|   |-- HTMLAudioElement
|
|-- PodcastSession.tsx
|   |-- useRecording.ts
|   |   |-- navigator.mediaDevices.getUserMedia
|   |   |-- MediaRecorder
|   |   |-- Expo AV Audio.Recording
|   |   |-- PodcastApi.uploadRecording
|   |   |-- PodcastApi.deleteRecording
|
|-- PodcastAudioDeck.tsx
|   |-- local React channel state
|   |-- random VU simulation
|
|-- PodcastPlaylistModal.tsx
|   |-- DocumentPicker
|   |-- browser Audio element
|   |-- local playlist state
|
|-- PlayerAudioFXPanel.tsx
|   |-- local master/compressor/limiter state
|   |-- random meter simulation
|
|-- EpisodeManager.tsx
|   |-- DocumentPicker
|   |-- ImagePicker
|   |-- random waveform data
|   |-- TrimModal.tsx
|
|-- RemoteGuestsPanel.tsx
    |-- local default seats and invite links
```

Disconnected audio engine:

```text
src/services/audioEngine
|-- AudioEngineManager
|-- DeckEngine
|-- MicEngine
|-- MicrophoneManager
|-- PlaybackController
|-- Crossfader
|-- DSPChain
|-- AudioGraph
|-- ParameterManager

Current Podcast V2 imports from this tree: none found.
```

## Backend Dependencies

### Active Frontend Dependencies

- Recording upload and delete through `PodcastApi` in `useRecording.ts`.
- Live session lifecycle and viewer updates through `PodcastApi` in `useLiveStream.ts`.
- Socket namespace `/podcast` through `podcastSocket` in `usePodcastSocket.ts` and `usePeerConnections.ts`.

### Defined But Currently Unused For Audio Execution

- Guest slot REST controls in `PodcastApi`: join, leave, kick, mute, set volume.
- Mic inventory REST controls in `PodcastApi`: get/create/update/delete mic.
- Recording edit REST controls in `PodcastApi`: trim recording, adjust volume.
- Episode upload/cover/status APIs in `PodcastApi`.
- Shared audio engine classes.
- Empty streaming service files.

## Top 15 Audio Gaps

1. No program output bus exists.
2. Recording captures local microphone only, not a mixed show output.
3. Guest frontend does not capture or transmit microphone audio.
4. Host WebRTC receive path has no implemented guest-side sender in the current frontend.
5. Audio deck controls are not wired to audio nodes.
6. Audio deck mute is not wired to WebRTC or backend mute APIs.
7. Audio deck gain/fader is not wired to WebRTC or backend volume APIs.
8. Solo has no audio implementation.
9. EQ has no audio implementation.
10. Compressor has no audio implementation.
11. Limiter has no audio implementation.
12. Playlist playback is not routed to deck, recording, monitor, or program output.
13. Waveforms are mock/random/animated rather than generated from audio.
14. Pause/resume recording is not true pause/resume; pause stops and resume starts a new recording.
15. Export/mixdown is missing.

## Production Readiness Score

Score: 28/100

Basis from current implementation:

- Real browser/native recording path exists, but it is mic-only and not program-output recording.
- Host-side WebRTC receiving/monitoring logic exists, but current guest frontend does not implement capture/signaling.
- Live session and socket infrastructure exists, but audio mixing/routing is not connected to the visible studio UI.
- Playlist local playback exists, but it is isolated from the mixer and recorder.
- Most studio controls are UI-only, mock, or simulated.

## Final Audio Engine Readiness Assessment

Podcast V2 currently has isolated real audio primitives: microphone permission/capture, browser/native mic recording, browser playlist playback for direct sources, socket signaling, and a host-side WebRTC receive path. The implementation does not currently provide a connected podcast audio engine. The visible studio mixer, FX panel, waveform, markers, trim/timeline controls, guest room mic controls, and program-output concepts are not wired into a unified audio graph, recording bus, monitoring bus, or export path.

Overall classification for the current Podcast V2 frontend audio engine: `PARTIAL`.
