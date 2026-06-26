# Frontend Audit

## Executive Summary

The current frontend is not yet desktop-only. The active source tree is `Melodymeet-frontend/OPERATOR_PANEL`, and it still carries a React Native / Expo / React Native Web renderer, Expo scripts, Android assets, web-only guest flows, browser audio APIs, and a `WebAdapter` fallback inside the Unified Audio SDK.

The intended architecture is:

```text
React UI
->
Unified Audio SDK
->
Electron IPC
->
Native Audio Engine
```

Several files still bypass that path by creating `HTMLAudioElement` instances, using `MediaRecorder`, calling `navigator.mediaDevices`, creating `AudioContext` / `GainNode` graphs, or managing WebRTC audio in React hooks. There are also current build-breaking issues: `src/hooks/useStream.ts` has syntax errors, `src/features/podcast/hooks/useLiveStream.ts` uses `audio` without importing it, and `src/features/rj/components/LocalFilesUploader.tsx` references undefined `isWeb` and `Audio`.

Verification performed:

```text
npm exec tsc -- --noEmit
```

Result:

```text
src/hooks/useStream.ts(80,37): error TS1005: ',' expected.
src/hooks/useStream.ts(140,1): error TS1128: Declaration or statement expected.
```

Implementation note:

- Phase 1 compilation fixes were applied after this audit draft. The current desktop frontend TypeScript check now passes with `npm exec tsc -- --noEmit` in `Melodymeet-frontend/OPERATOR_PANEL`.

## Architecture Violations

### Browser Audio Engines Still In React

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/usePlaylistPlayer.ts`
  - Creates a dedicated playlist audio engine with `new Audio(uri)`.
  - Owns play, pause, stop, seek, position, unload, mute, and `ended` timing in React.
  - Violates desktop-only native playback ownership even if described as local preview.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/LocalFilesUploader.tsx`
  - Creates a local `HTMLAudioElement` player with `new Audio(uri)`.
  - Implements play, pause, stop, unload, mute, and ended callbacks outside the Unified Audio SDK.
  - Calls `onPlayTrack` and updates `localPlayback`, so this is not just metadata probing.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - Stores `audioRef: HTMLAudioElement`.
  - Uses `new Audio(src)` in multiple play/resume paths.
  - Implements its own playback cleanup, `onended`, `onerror`, pause/resume state, and local play state.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/modals/PlaylistModal.tsx`
  - Uses `new Audio()` to read uploaded-file metadata.
  - This is browser metadata probing and should move behind a desktop-safe metadata API or native SDK helper.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/utils/localFileUpload.ts`
  - Uses `new window.Audio()` / `HTMLAudioElement` for duration probing.
  - This is not playback, but it is still browser-specific audio code in frontend utilities.

### WebRTC / Web Audio Processing In Hooks

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
  - Manages `RTCPeerConnection`, `AudioContext`, `GainNode`, `HTMLAudioElement`, `document.createElement('audio')`, `createMediaStreamSource`, per-guest gain, mute, stats, and teardown.
  - This is a complete browser audio processing graph in a React hook.
  - The comments explicitly mark it as web-only, which conflicts with the desktop-only requirement.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
  - Uses `navigator.mediaDevices.getUserMedia({ audio: true })` for microphone testing and live-start setup.
  - Tracks `mediaStream` and `audioContext` in React state.
  - Uses browser clipboard, `window.confirm`, `window.location`, and web URL generation for guest flows.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
  - Imports `Audio` from `expo-av`.
  - Keeps `mediaStream`, `mediaRecorder`, `audioChunksRef`, and `mobileRecording` state.
  - Uses `navigator.mediaDevices.getUserMedia`, `window.MediaRecorder`, `Blob`, and `File`.
  - Contains mobile Expo recording fallback via `Audio.Recording`.

### Crossfader / Mixer / Timing Logic In UI

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/usePlayer.ts`
  - Routes deck operations through `audio`, which is good.
  - Still owns crossfade animation timing with `setInterval`, calculates crossfade steps, and pushes repeated `audio.setCrossfade` calls through React state.
  - Recommended direction: UI sends target crossfade intent; native engine owns ramp duration/curve/timing.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/components/DualPlayer.tsx`
  - Maintains local pulse/progress animation timers.
  - `handlePlay` forces crossfader values to `0` or `100`.
  - `handleCrossfaderTouch` derives crossfade percentage from UI event layout.
  - UI mapping from drag position to value is acceptable, but playback/crossfade behavior should not be duplicated here.

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/rj/hooks/usePlaylist.ts`
  - Owns playlist session timing with refs, `Date.now()`, and intervals.
  - Calls `PlaylistPlayerAPI` rather than the Unified Audio SDK.
  - Implements track completion sequencing from browser audio `onEnded`.

- `Melodymeet-frontend/OPERATOR_PANEL/src/hooks/useAudioEffects.ts`
  - Performs audio-side effects from a generic React hook: `audio.setEQ`, `audio.setDeckGain`, debounce timers, and backend persistence.
  - It uses the SDK, but it mixes UI state, backend sync, and engine commands in one hook.

- `Melodymeet-frontend/OPERATOR_PANEL/src/hooks/useStream.ts`
  - Intended to listen to native broadcast stats, but also contains simulated bitrate/quality math.
  - Currently syntactically broken.

## Desktop-only Cleanup

The project still includes web/mobile/runtime surfaces that should be removed or isolated for desktop-only operation.

- `Melodymeet-frontend/OPERATOR_PANEL/package.json`
  - Scripts still target Expo/web/mobile:
    - `android`: `expo run:android`
    - `ios`: `expo run:ios`
    - `dev`: `expo start --web`
    - `build:desktop`: `expo export -p web && electron-builder --dir`
  - Dependencies still include Expo, React Native Web, Android/mobile libraries, and browser polyfills:
    - `expo`, `expo-av`, `expo-document-picker`, `expo-file-system`, `expo-image-picker`, `expo-router`, `expo-sharing`, `expo-local-authentication`
    - `react-native`, `react-native-web`, `react-native-webview`, `react-native-ytdl`
    - `crypto-browserify`, `stream-http`, `https-browserify`, `path-browserify`, `vm-browserify`, `url`, `process`

- `Melodymeet-frontend/OPERATOR_PANEL/app.json`
  - Expo app config with `ios`, `android`, and `web`.

- `Melodymeet-frontend/OPERATOR_PANEL/metro.config.js`
  - Expo Metro / NativeWind config.

- `Melodymeet-frontend/OPERATOR_PANEL/index.js`
  - Uses `registerRootComponent` from Expo.

- `Melodymeet-frontend/OPERATOR_PANEL/android/**`
  - Full Android project remains in the desktop-only frontend.

- `Melodymeet-frontend/OPERATOR_PANEL/src/App.tsx`
  - Branches on `Platform.OS === 'web'`, `isMobile`, guest room URL paths, legacy `roomId`, and direct DOM manipulation.
  - Contains an `Audio Engine Test` panel that calls `window.audioEngine`, not the Unified Audio SDK.

- `Melodymeet-frontend/OPERATOR_PANEL/src/config/environment.ts`
  - Chooses API URL based on `Platform.OS === 'android'`.

- `Melodymeet-frontend/OPERATOR_PANEL/src/utils/platform.ts`
  - `isDesktop()` is implemented as `typeof window !== 'undefined' && !!window.audio`.
  - In desktop-only architecture this should be a stable runtime invariant or explicit Electron capability check, not a web fallback switch.

## Legacy Audio Dependencies

- `expo-av`
  - Declared in `package.json`.
  - Imported in `src/features/podcast/hooks/useRecording.ts`.

- Browser media capture / recording:
  - `src/features/podcast/hooks/useRecording.ts`
    - `navigator.mediaDevices.getUserMedia`
    - `window.MediaRecorder`
    - `Blob`
    - `File`
  - `src/features/podcast/hooks/useLiveStream.ts`
    - `navigator.mediaDevices.getUserMedia`
    - `MediaStream` state

- Browser playback / metadata:
  - `src/features/rj/hooks/usePlaylistPlayer.ts`
  - `src/features/rj/components/LocalFilesUploader.tsx`
  - `src/features/rj/components/modals/PlaylistModal.tsx`
  - `src/features/rj/utils/localFileUpload.ts`
  - `src/features/podcast/sections/PodcastPlaylistModal.tsx`

- Web Audio / WebRTC:
  - `src/features/podcast/hooks/usePeerConnections.ts`
    - `RTCPeerConnection`
    - `RTCSessionDescription`
    - `RTCIceCandidate`
    - `AudioContext`
    - `GainNode`
    - `HTMLAudioElement`
    - `createMediaStreamSource`
    - `getStats`

- Legacy engine names:
  - No active `src/services/audioEngine/**` files are present in the current tree.
  - Stale references remain only in generated inventory files:
    - `Melodymeet-frontend/OPERATOR_PANEL/tree.txt`
    - `Melodymeet-frontend/OPERATOR_PANEL/clean_tree.txt`
  - These mention `AudioEngineManager`, `DeckEngine`, `PlaybackController`, `MicEngine`, `MicrophoneManager`, `DSPChain`, `AudioGraph`, and `Crossfader`, but the actual source files are gone from the active frontend.

## Broken Components

- `src/hooks/useStream.ts`
  - Syntax errors at lines 80 and 140.
  - The simulated network fluctuation interval appears outside a `useEffect` body.
  - The file prevents TypeScript from checking the rest of the frontend.

- `src/features/podcast/hooks/useLiveStream.ts`
  - Calls `audio.on`, `audio.off`, `audio.startBroadcast`, and `audio.stopBroadcast` but does not import `audio`.
  - Keeps `audioContext` state but never constructs an `AudioContext`; only attempts to close it.

- `src/features/rj/components/LocalFilesUploader.tsx`
  - References `isWeb` without defining or importing it.
  - Calls `Audio.setAudioModeAsync` without importing `Audio`.
  - Uses HTML audio playback directly.

- `src/App.tsx`
  - Calls `window.audioEngine`, but the preload exposes `window.audio`.
  - This panel is therefore stale or non-functional in the current Electron bridge.

- `src/services/audio/adapters/DesktopAdapter.ts`
  - `version()` calls `window.audio.version`, but preload does not expose `version`.
  - `isInitialized()` calls `window.audio.isInitialized`, but preload does not expose `isInitialized`.
  - `engineInfo()` calls `window.audio.engineInfo`, but preload exposes `getEngineInfo`.
  - These SDK methods silently resolve `undefined` due to `call()`, producing misleading state.

- `src/services/audio/types.ts` vs `src/services/audio/adapters/DesktopAdapter.ts`
  - `IAudioAdapter` declares `setMasterGain`, but `DesktopAdapter` implements it.
  - `IAudioAdapter` does not declare `setMicrophoneGain`, `soloDeck`, `resetMixer`, `pauseRecording`, or `resumeRecording`, even though preload exposes several of them.
  - The bridge and SDK contracts are not a clean 1:1 desktop contract.

## Dead Code

- `src/services/audio/adapters/WebAdapter.ts`
  - Desktop-only project should not select backend REST/audio polling fallback.
  - It includes MediaDevices enumeration and polling-based fake event delivery.

- `src/services/streaming/webrtcService.ts`
  - Browser/WebRTC streaming service remains in `src/services/streaming`.
  - Should be removed unless guest audio is redefined as a desktop-native IPC/native-engine feature.

- `src/services/streaming/encoder.ts`
  - Browser/web streaming encoder path remains.

- `src/services/streaming/websocket.ts`
  - Web streaming transport remains; keep only if it is backend control-plane, not audio-plane.

- `src/pages/GuestJoinPage.tsx` and `src/pages/GuestRoom.tsx`
  - Guest web room flow is still shipped inside the operator panel.
  - Desktop-only operator should not host browser guest-room pages in the same renderer.

- `src/features/podcast/hooks/usePeerConnections.ts`
  - Entire hook is web-only and no-op outside `Platform.OS === 'web'`.

- `src/features/podcast/hooks/useRecording.ts`
  - Web and mobile recording branches are dead for desktop-only.

- `src/features/podcast/hooks/useLiveStream.ts`
  - Web `getUserMedia`, web alerts, web room-link generation, and guest browser setup are stale for desktop-only.

- `android/**`, `app.json`, `metro.config.js`, `nativewind-env.d.ts`
  - Mobile/Expo scaffolding is dead once renderer moves to desktop-only React/Electron.

## Bugs

- The frontend does not type-check because `src/hooks/useStream.ts` has syntax errors.

- `src/features/podcast/hooks/useLiveStream.ts` references `audio` without importing it.

- `src/features/rj/components/LocalFilesUploader.tsx` references undefined `isWeb` and `Audio`.

- `src/App.tsx` uses `window.audioEngine`, while Electron preload exposes `window.audio`.

- `src/services/audio/AudioSDK.ts` falls back to `WebAdapter` when `window.audio` is absent. In a packaged desktop app, a preload failure would silently route audio commands to backend REST instead of failing loudly.

- `src/services/audio/adapters/DesktopAdapter.ts` silently returns `undefined` when a bridge method is missing. This hides preload/SDK contract drift.

- `src/services/audio/adapters/DesktopAdapter.ts` lifecycle methods do not match preload method names for `version`, `isInitialized`, and `engineInfo`.

- `src/features/rj/hooks/useMicSystem.ts` maps engine meter payloads by `payloadMics[m.id]`, but UI mic IDs such as `mic1` / `mic2` may not match native engine microphone identifiers. This can leave meters stuck at zero or update the wrong channel.

- `src/features/rj/hooks/usePlayer.ts` drives crossfade animation with React timers. React scheduling and native audio scheduling can diverge, causing audible or state-level mismatch.

- `src/features/podcast/hooks/useRecording.ts` desktop recording upload creates a `file://` FormData file object from a native output path. In Electron/React Native Web compatibility layers this may not upload reliably without a desktop file-read bridge.

- `src/features/podcast/hooks/usePeerConnections.ts` creates an `HTMLAudioElement` and also routes remote streams through Web Audio gain nodes. This can double-monitor guest audio depending on browser output behavior.

- `src/features/podcast/hooks/usePeerConnections.ts` mutates guest slot state from peer `connectionState` directly. Disconnect/failed can mark a slot empty even if backend state is still authoritative.

- `src/features/rj/components/DualPlayer.tsx` derives progress from UI timers rather than engine snapshots. Displayed progress can drift from native playback position.

## Electron Integration Issues

- Preload exposes `window.audio`, but App debug UI expects `window.audioEngine`.

- Preload exposes `getEngineInfo`; SDK expects `engineInfo`.

- Preload does not expose `version` or `isInitialized`; SDK expects both.

- Main process starts the audio engine on `app.whenReady()` and also exposes `audio:initialize`. Calling initialize from UI can double-call or produce confusing lifecycle behavior.

- Some IPC handlers guard with `if (!audioService.initialized) return;` and return `undefined` instead of structured errors. Renderer callers swallow many errors, so failed commands are easy to miss.

- `AudioService` polls the native engine every 50 ms and emits `meters:update` continuously to all windows. This may be correct for metering, but the React side needs careful subscription boundaries to avoid store churn.

- Production build uses `expo export -p web`, while Electron loads `dist/index.html`. That keeps the renderer fundamentally web-export based instead of a desktop-focused React bundle.

## Files To Remove

Remove after replacement paths are in place:

- `Melodymeet-frontend/OPERATOR_PANEL/src/services/audio/adapters/WebAdapter.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/usePeerConnections.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/services/streaming/webrtcService.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/services/streaming/encoder.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/android/**`
- `Melodymeet-frontend/OPERATOR_PANEL/app.json`
- `Melodymeet-frontend/OPERATOR_PANEL/metro.config.js`
- `Melodymeet-frontend/OPERATOR_PANEL/nativewind-env.d.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/tree.txt`
- `Melodymeet-frontend/OPERATOR_PANEL/clean_tree.txt`

Remove or move out of the desktop operator app if guest browser support is no longer in scope:

- `Melodymeet-frontend/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/pages/GuestRoom.tsx`

Remove mobile/web branches from:

- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/useRecording.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/features/podcast/hooks/useLiveStream.ts`
- `Melodymeet-frontend/OPERATOR_PANEL/src/App.tsx`
- `Melodymeet-frontend/OPERATOR_PANEL/src/config/environment.ts`

## Files To Refactor

- `src/services/audio/AudioSDK.ts`
  - Remove platform detection fallback.
  - Always require `DesktopAdapter`.
  - Fail loudly if `window.audio` is absent.

- `src/services/audio/adapters/DesktopAdapter.ts`
  - Align method names with preload.
  - Stop silently resolving missing bridge methods.
  - Return structured errors for missing IPC capabilities.

- `src/services/audio/types.ts`
  - Make the SDK contract exactly match the desktop IPC bridge.
  - Decide whether `pauseRecording`, `resumeRecording`, `setMicrophoneGain`, `soloDeck`, and `resetMixer` are part of the public SDK.

- `electron/preload.js`
  - Match SDK names or deliberately expose a versioned bridge contract.
  - Add missing lifecycle methods or remove stale SDK methods.

- `electron/main.js`
  - Normalize IPC return values.
  - Avoid silent `undefined` returns on uninitialized engine commands.

- `src/features/rj/hooks/usePlayer.ts`
  - Keep UI intent and store state only.
  - Move crossfade ramps and transport sequencing into native engine / SDK commands.

- `src/features/rj/hooks/usePlaylist.ts`
  - Replace `PlaylistPlayerAPI` browser audio dependency with Unified Audio SDK playlist/deck commands or a native playlist lane.
  - Move timing and completion detection to engine events.

- `src/features/rj/hooks/usePlaylistPlayer.ts`
  - Remove or replace with a native preview/monitor SDK route.

- `src/features/rj/components/LocalFilesUploader.tsx`
  - Remove `new Audio` playback.
  - Fix undefined `isWeb` / `Audio` if kept temporarily.
  - Use native metadata and preview APIs.

- `src/features/rj/utils/localFileUpload.ts`
  - Replace HTML audio duration probing with native metadata extraction or backend/native helper.

- `src/features/rj/components/modals/PlaylistModal.tsx`
  - Replace `new Audio()` metadata probing.

- `src/features/podcast/hooks/useRecording.ts`
  - Keep only native SDK recording path.
  - Remove Expo/web/mobile branches.

- `src/features/podcast/hooks/useLiveStream.ts`
  - Import `audio` if retained.
  - Remove browser capture and WebRTC setup.
  - Treat live/broadcast as native engine commands plus backend control-plane.

- `src/features/podcast/sections/PodcastPlaylistModal.tsx`
  - Remove `HTMLAudioElement` preview.
  - Use SDK preview/monitor lane or remove preview playback.

- `src/hooks/useAudioEffects.ts`
  - Split backend persistence from engine command dispatch.
  - Prefer a feature-specific controller/service over a generic UI hook doing audio work.

- `src/hooks/useStream.ts`
  - Fix syntax.
  - Remove simulated stream stats.
  - Bind only to native broadcast stats.

- `src/App.tsx`
  - Remove web/mobile branching and guest routing.
  - Remove stale `window.audioEngine` debug panel or route it through Unified Audio SDK.

## Recommended Cleanup Order

1. Fix build blockers first.
   - Repair or remove `src/hooks/useStream.ts`.
   - Add/fix the missing `audio` import in `useLiveStream.ts` if the file remains.
   - Fix or remove `LocalFilesUploader.tsx` undefined `isWeb` / `Audio` references.

2. Lock the desktop audio contract.
   - Make `AudioSDK.ts` desktop-only.
   - Remove `WebAdapter`.
   - Align `DesktopAdapter`, `types.ts`, `preload.js`, and `main.js`.
   - Make missing IPC methods throw explicit errors.

3. Remove browser audio playback paths.
   - Replace `usePlaylistPlayer.ts`.
   - Replace `LocalFilesUploader.tsx` preview.
   - Replace `PodcastPlaylistModal.tsx` preview.
   - Replace metadata probing in `PlaylistModal.tsx` and `localFileUpload.ts`.

4. Remove browser recording and capture paths.
   - Strip `MediaRecorder`, `navigator.mediaDevices`, `Blob`, `File`, and `expo-av` from podcast recording.
   - Keep recording exclusively through `audio.startRecording` / `audio.stopRecording` and native events.

5. Remove WebRTC audio processing from the operator frontend.
   - Delete or quarantine `usePeerConnections.ts`.
   - Remove `RTCPeerConnection` signaling methods from frontend paths unless they are strictly control-plane and no audio processing occurs in React.

6. Move timing/mixer behavior out of React hooks.
   - Crossfade ramps should be native-engine commands.
   - Playlist timing and track-ended events should come from native engine snapshots/events.
   - UI should display engine state, not simulate it.

7. Remove Expo/mobile/web scaffolding.
   - Remove Android project and Expo config.
   - Replace Expo web build scripts with a desktop renderer build.
   - Remove mobile-specific dependencies and browser polyfills.

8. Re-run TypeScript and a desktop smoke test.
   - `npm exec tsc -- --noEmit`
   - Start Electron.
   - Verify `window.audio` bridge presence, engine initialization, deck load/play/pause/stop, crossfade, mic device listing, recording start/stop, broadcast start/stop, and event subscriptions.
