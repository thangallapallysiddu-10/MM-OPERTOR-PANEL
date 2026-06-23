# Podcast V2 Component Inventory

## Purpose

Read-only inventory of every component involved in the current Podcast V2 frontend implementation.

Scope:

- `Melody_meet/OPERATOR_PANEL/src/features/podcast/**`
- Public guest pages: `GuestJoinPage.tsx`, `GuestRoom.tsx`
- Shared components, contexts, hooks, services, and store slices used by Podcast V2
- Route wiring in `App.tsx` and dashboard entry in `Dashboard.tsx`

Rules applied:

- Current source only; no assumed future behavior
- No source code modifications
- No improvement recommendations

## Classification Legend

| Status | Meaning |
|---|---|
| REAL | Implemented behavior actively wired to browser APIs, backend, or sockets |
| PARTIAL | Some real behavior; incomplete, local-only, or not fully connected |
| MOCK | Simulated, hardcoded, random, timeout, or placeholder behavior |
| UI ONLY | Visual/control surface with no functional backend or audio wiring |
| DEAD | Present in source but not imported or mounted by the current app |

---

## Entry Points & Routing

| Entry | File | Parent | Status |
|---|---|---|---|
| Podcast Studio (host) | `src/features/podcast/PodcastUpload.tsx` | `App.tsx` → lazy `PodcastUpload` when screen is `'Podcast'` | PARTIAL |
| Guest slot join | `src/pages/GuestJoinPage.tsx` | `App.tsx` route `/podcast/guest/:slotId/:roomId` | MOCK |
| Guest room | `src/pages/GuestRoom.tsx` | Rendered by `GuestJoinPage` after local join | MOCK |
| Dashboard navigation | `src/pages/Dashboard.tsx` | Quick action navigates to `'Podcast'` screen | REAL |

---

## Component Catalog

### 1. PodcastUpload

| Field | Value |
|---|---|
| **Component Name** | `PodcastUpload` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx` |
| **Purpose** | Root Podcast Studio screen; orchestrates layout, live/recording hooks, modals, and child panels |
| **Parent Component** | `App.tsx` (authenticated main content area) |
| **Child Components** | `StatsBar`, `SignalBars`, `PodcastAudioDeck`, `RemoteGuestsPanel`, `PodcastSession`, `PodcastLiveChat`, `PodcastPlaylistModal`, `EpisodeNotes`, `PlayerAudioFXPanel`, `EpisodeManager`, `LiveSetupModal`, `NotificationsModal`, `SettingsModal`, `PodcastProfileModal` |
| **Hooks Used** | `useAuth`, `useRecording`, `useLiveStream`, `usePodcastSocket`, `usePeerConnections` |
| **Services Used** | `useAppStore` (Zustand), `AuthContext` |
| **State Management Used** | Local React state (theme, playlist, notifications, settings, modals, simulated `liveStats`); Zustand `podcast` slice and `profileDarkMode` |
| **Backend APIs Used** | Indirect via hooks: live start/stop, recording upload, guest links, viewer updates, socket chat |
| **Audio Functionality** | Mounts `usePeerConnections` with host `mediaStream`; destructures `peerApplyVolume`, `peerApplyMute`, `closePeer` but does not pass them to child UI |
| **Current Implementation Status** | PARTIAL |

---

### 2. StatsBar

| Field | Value |
|---|---|
| **Component Name** | `StatsBar` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx` (inline) |
| **Purpose** | Header bar showing listeners, bitrate, storage, connection status when live |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `SignalBars` |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Receives `stats` and `isLive` from parent local state |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | MOCK (stats updated via `Math.random` interval in parent) |

---

### 3. SignalBars (header)

| Field | Value |
|---|---|
| **Component Name** | `SignalBars` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/PodcastUpload.tsx` (inline) |
| **Purpose** | Visual signal-strength bars in header stats row |
| **Parent Component** | `StatsBar` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props only (`isLive`, fixed `bars={4}`) |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 4. PodcastAudioDeck

| Field | Value |
|---|---|
| **Component Name** | `PodcastAudioDeck` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | Six-channel mic mixer UI (host + guest slots) with gain, EQ, fader, mute, solo, VU meters, guest invite links |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `ChannelStrip`, `Knob`, `Fader`, `VuBars`, `ScaleCol`, `MicSvg`, `LinkSvg` |
| **Hooks Used** | `useState`, `useEffect`, `useCallback`, `useRef` |
| **Services Used** | None (no Zustand, no API) |
| **State Management Used** | Local React state for channels and view filter; default channels from `makeDefaultChannels` |
| **Backend APIs Used** | None |
| **Audio Functionality** | Simulated VU meters via random interval; controls update local state only; builds guest URLs via `buildGuestLink` |
| **Current Implementation Status** | MOCK |

Note: `PodcastUpload` renders `<PodcastAudioDeck />` without passing `roomLink`; default is `window.location.href`.

---

### 5. ChannelStrip

| Field | Value |
|---|---|
| **Component Name** | `ChannelStrip` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | Single mixer channel strip with status badge, knobs, fader, mute/solo, link popup |
| **Parent Component** | `PodcastAudioDeck` |
| **Child Components** | `Knob`, `Fader`, `VuBars`, `ScaleCol`, `MicSvg`, `LinkSvg` |
| **Hooks Used** | `useState`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Local popup state; channel data from parent |
| **Backend APIs Used** | None |
| **Audio Functionality** | Local gain/EQ/fader/mute/solo; clipboard copy of guest link |
| **Current Implementation Status** | MOCK |

---

### 6. Knob (audio deck)

| Field | Value |
|---|---|
| **Component Name** | `Knob` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | Draggable rotary control for gain/EQ values |
| **Parent Component** | `ChannelStrip` |
| **Child Components** | None |
| **Hooks Used** | `useRef`, `useEffect`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Props + mouse drag |
| **Backend APIs Used** | None |
| **Audio Functionality** | Updates numeric local state only |
| **Current Implementation Status** | UI ONLY |

---

### 7. Fader

| Field | Value |
|---|---|
| **Component Name** | `Fader` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | Vertical fader for channel level |
| **Parent Component** | `ChannelStrip` |
| **Child Components** | None |
| **Hooks Used** | `useRef`, `useEffect`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Props + mouse drag |
| **Backend APIs Used** | None |
| **Audio Functionality** | Updates local fader value only |
| **Current Implementation Status** | UI ONLY |

---

### 8. VuBars

| Field | Value |
|---|---|
| **Component Name** | `VuBars` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | Stereo VU meter bar display per channel |
| **Parent Component** | `ChannelStrip` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props (`level`) |
| **Backend APIs Used** | None |
| **Audio Functionality** | Displays values from parent random meter loop |
| **Current Implementation Status** | MOCK |

---

### 9. ScaleCol

| Field | Value |
|---|---|
| **Component Name** | `ScaleCol` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastAudioDeck.tsx` |
| **Purpose** | dB scale labels beside VU meters |
| **Parent Component** | `ChannelStrip` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | None |
| **Backend APIs Used** | None |
| **Audio Functionality** | Visual scale only |
| **Current Implementation Status** | UI ONLY |

---

### 10. RemoteGuestsPanel

| Field | Value |
|---|---|
| **Component Name** | `RemoteGuestsPanel` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx` |
| **Purpose** | Remote guest seat list with invite link generation, copy, disconnect, cancel |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `StatusIndicatorDot`, `SignalBars`, `ActionButton` |
| **Hooks Used** | `useState`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Local React state (`seats`, `copiedSeatId`); initializes from `DEFAULT_SEATS` hardcoded data |
| **Backend APIs Used** | None |
| **Audio Functionality** | None (connection/signal UI is simulated) |
| **Current Implementation Status** | MOCK |

Note: Parent passes `onGenerateLink`, `onDisconnect`, `onCancelInvite` as `console.log` only.

---

### 11. StatusIndicatorDot

| Field | Value |
|---|---|
| **Component Name** | `StatusIndicatorDot` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx` |
| **Purpose** | Colored dot for guest connection status |
| **Parent Component** | `RemoteGuestsPanel` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 12. SignalBars (remote guests)

| Field | Value |
|---|---|
| **Component Name** | `SignalBars` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx` |
| **Purpose** | Signal strength bars for connected guests |
| **Parent Component** | `RemoteGuestsPanel` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props (`strength`) |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 13. ActionButton

| Field | Value |
|---|---|
| **Component Name** | `ActionButton` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RemoteGuestsPanel.tsx` |
| **Purpose** | Styled action button (Generate Link, Copy Link, Disconnect, Cancel Invite, Add Guest) |
| **Parent Component** | `RemoteGuestsPanel` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 14. PodcastSession

| Field | Value |
|---|---|
| **Component Name** | `PodcastSession` (default export; file `Podcastsession.tsx`) |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx` |
| **Purpose** | Recording session panel: timer, chapters, segments, start/pause/stop/save, live viewer stat |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `StatCard`, `Waveform` |
| **Hooks Used** | `useRecording`, `useLiveStream` (separate hook instances from parent; share Zustand state) |
| **Services Used** | Zustand via hooks |
| **State Management Used** | Local chapters/segments/elapsed/pause/status; Zustand for recording and live flags |
| **Backend APIs Used** | Via `useRecording`: `POST /api/podcasts/recordings/upload`; via `useLiveStream`: live session APIs |
| **Audio Functionality** | Starts/stops mic recording through hook; pause calls `stopRecording`, resume calls `startRecording` |
| **Current Implementation Status** | PARTIAL |

Note: `PodcastUpload` does not pass `onSaveRecording`; save builds local metadata only inside component.

---

### 15. StatCard

| Field | Value |
|---|---|
| **Component Name** | `StatCard` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx` |
| **Purpose** | Metric card for session stats row |
| **Parent Component** | `PodcastSession` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 16. Waveform (session)

| Field | Value |
|---|---|
| **Component Name** | `Waveform` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/Podcastsession.tsx` |
| **Purpose** | Animated bar waveform beside recording status |
| **Parent Component** | `PodcastSession` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props (`active`) |
| **Backend APIs Used** | None |
| **Audio Functionality** | CSS animation only; not driven by audio samples |
| **Current Implementation Status** | MOCK |

---

### 17. PodcastLiveChat

| Field | Value |
|---|---|
| **Component Name** | `PodcastLiveChat` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastLiveChat.tsx` |
| **Purpose** | Podcast adapter over RJ `LiveChat`; maps socket messages and handles local ban/pin/reply/emoji/sticker state |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `LiveChat` (RJ), `StickerModal` (RJ) |
| **Hooks Used** | `useState`, `useRef` |
| **Services Used** | None directly; send/clear delegated to parent from `usePodcastSocket` |
| **State Management Used** | Local ban list, pin, reply, emoji picker, sticker modal state |
| **Backend APIs Used** | None directly; parent sends via socket when live |
| **Audio Functionality** | None |
| **Current Implementation Status** | PARTIAL |

---

### 18. LiveChat (shared RJ)

| Field | Value |
|---|---|
| **Component Name** | `LiveChat` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/rj/components/LiveChat.tsx` |
| **Purpose** | Full chat UI (messages, emoji, ban, pin, stickers) |
| **Parent Component** | `PodcastLiveChat` |
| **Child Components** | Internal chat sub-UI (message list, input, emoji grid) |
| **Hooks Used** | Varies within RJ component |
| **Services Used** | None in podcast path |
| **State Management Used** | Controlled via `PodcastLiveChat` props |
| **Backend APIs Used** | None in podcast path |
| **Audio Functionality** | None |
| **Current Implementation Status** | PARTIAL (real UI; podcast ban/pin/reply not backend-backed) |

---

### 19. StickerModal (shared RJ)

| Field | Value |
|---|---|
| **Component Name** | `StickerModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/rj/components/modals/StickerModal.tsx` |
| **Purpose** | Sticker picker modal for chat |
| **Parent Component** | `PodcastLiveChat` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Visibility from parent |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY (in podcast context) |

---

### 20. PodcastPlaylistModal

| Field | Value |
|---|---|
| **Component Name** | `PodcastPlaylistModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PodcastPlaylistModal.tsx` |
| **Purpose** | Playlist panel: local file upload, URL metadata, search, play/stop, clear |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | None (inline JSX; helper functions `extractYouTubeId`, `fetchYouTubeMetadata`, `platformBadge`) |
| **Hooks Used** | `useState`, `useMemo`, `useRef`, `useEffect` |
| **Services Used** | `expo-document-picker`; browser `fetch` for YouTube API (placeholder key) |
| **State Management Used** | Local playback/search/upload state; playlist data from parent |
| **Backend APIs Used** | None |
| **Audio Functionality** | Web: `HTMLAudioElement` via ref for local/direct URI playback; YouTube metadata placeholder when API key unset |
| **Current Implementation Status** | PARTIAL |

---

### 21. EpisodeNotes

| Field | Value |
|---|---|
| **Component Name** | `EpisodeNotes` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeNotes.tsx` |
| **Purpose** | Run-of-show notes list with status cycle, reorder, add/delete |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `NoteItem`, `CheckIcon`, `PlayIcon`, `DotIcon`, `StatusIcon` |
| **Hooks Used** | `useState`, `useRef` |
| **Services Used** | None |
| **State Management Used** | Local React state with seeded `initialNotes` |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 22. NoteItem

| Field | Value |
|---|---|
| **Component Name** | `NoteItem` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeNotes.tsx` |
| **Purpose** | Single note row with status toggle, reorder, delete |
| **Parent Component** | `EpisodeNotes` |
| **Child Components** | `StatusIcon` |
| **Hooks Used** | `useState` (hover) |
| **Services Used** | None |
| **State Management Used** | Props + callbacks |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 23. EpisodeManager

| Field | Value |
|---|---|
| **Component Name** | `EpisodeManager` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/EpisodeManager.tsx` |
| **Purpose** | Modal for episode upload form, publish/draft, recordings list, trim flow, schedule picker |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `RecentRecordingsList`, `TrimModal`, inline date-picker UI |
| **Hooks Used** | `useState`, `useEffect` |
| **Services Used** | `expo-document-picker`, `expo-image-picker` |
| **State Management Used** | Local form/trim/upload state; receives `recordings`/`podcasts` from parent Zustand |
| **Backend APIs Used** | None directly; publish/draft call parent callbacks → `addPodcastEpisode` (Zustand only) |
| **Audio Functionality** | File picker for audio; trim save uses `setTimeout` simulation |
| **Current Implementation Status** | UI ONLY |

---

### 24. RecentRecordingsList

| Field | Value |
|---|---|
| **Component Name** | `RecentRecordingsList` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RecentRecordingsList.tsx` |
| **Purpose** | Scrollable list of recordings with Use/Trim/Delete actions |
| **Parent Component** | `EpisodeManager` |
| **Child Components** | `RecordingItem` |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 25. RecordingItem

| Field | Value |
|---|---|
| **Component Name** | `RecordingItem` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/RecentRecordingsList.tsx` |
| **Purpose** | Single recording row with action buttons |
| **Parent Component** | `RecentRecordingsList` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 26. TrimModal

| Field | Value |
|---|---|
| **Component Name** | `TrimModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/TrimModal.tsx` |
| **Purpose** | Audio trim editor UI: waveform bars, range sliders, simple/advanced tabs, preview/save |
| **Parent Component** | `EpisodeManager` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | `@react-native-community/slider` |
| **State Management Used** | Fully controlled by `EpisodeManager` parent state |
| **Backend APIs Used** | None (`EpisodeManager.saveTrim` simulates with `setTimeout`) |
| **Audio Functionality** | UI only; no real audio preview engine |
| **Current Implementation Status** | UI ONLY |

---

### 27. PlayerAudioFXPanel

| Field | Value |
|---|---|
| **Component Name** | `PlayerAudioFXPanel` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx` |
| **Purpose** | Master output panel: compressor, limiter, master volume, stereo VU meters, local ON AIR toggle |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | `Knob`, `HVUMeter`, `VUScale` |
| **Hooks Used** | `useState`, `useEffect`, `useRef`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Local compressor/limiter/master/VU/`isLive` state |
| **Backend APIs Used** | None |
| **Audio Functionality** | Random VU animation when local `isLive` toggled; optional callbacks exist but parent does not supply them |
| **Current Implementation Status** | MOCK |

Note: Separate file exists at `src/features/rj/components/PlayerAudioFXPanel.tsx` (duplicate name, RJ feature).

---

### 28. Knob (FX panel)

| Field | Value |
|---|---|
| **Component Name** | `Knob` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx` |
| **Purpose** | Rotary control for compressor/limiter/master parameters |
| **Parent Component** | `PlayerAudioFXPanel` |
| **Child Components** | None |
| **Hooks Used** | `useRef`, `useEffect`, `useCallback` |
| **Services Used** | None |
| **State Management Used** | Props |
| **Backend APIs Used** | None |
| **Audio Functionality** | Local numeric state only |
| **Current Implementation Status** | UI ONLY |

---

### 29. HVUMeter

| Field | Value |
|---|---|
| **Component Name** | `HVUMeter` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx` |
| **Purpose** | Horizontal stereo VU meter bars |
| **Parent Component** | `PlayerAudioFXPanel` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props (`level`) |
| **Backend APIs Used** | None |
| **Audio Functionality** | Displays simulated levels |
| **Current Implementation Status** | MOCK |

---

### 30. VUScale

| Field | Value |
|---|---|
| **Component Name** | `VUScale` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/sections/PlayerAudioFXPanel.tsx` |
| **Purpose** | dB scale under master VU meters |
| **Parent Component** | `PlayerAudioFXPanel` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | None |
| **Backend APIs Used** | None |
| **Audio Functionality** | Visual only |
| **Current Implementation Status** | UI ONLY |

---

### 31. LiveSetupModal

| Field | Value |
|---|---|
| **Component Name** | `LiveSetupModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/modals/LiveSetupModal.tsx` |
| **Purpose** | Go-live wizard: mic test, internet test, title/description, start live |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Controlled props from `useLiveStream` via parent |
| **Backend APIs Used** | Indirect via parent `onStartLive` → `PodcastApi.startLiveSession` |
| **Audio Functionality** | Triggers `testMicrophone` (getUserMedia on web) |
| **Current Implementation Status** | PARTIAL |

---

### 32. PodcastProfileModal

| Field | Value |
|---|---|
| **Component Name** | `PodcastProfileModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/features/podcast/modals/PodcastProfileModal.tsx` |
| **Purpose** | Header profile popover showing operator name, email, avatar initial |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Props from `useAuth` via parent |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 33. NotificationsModal (shared)

| Field | Value |
|---|---|
| **Component Name** | `NotificationsModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/components/modals/NotificationsModal.tsx` |
| **Purpose** | Header notifications list with mark read/clear |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | None |
| **State Management Used** | Hardcoded local notification list in `PodcastUpload` |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 34. SettingsModal (shared)

| Field | Value |
|---|---|
| **Component Name** | `SettingsModal` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/components/modals/SettingsModal.tsx` |
| **Purpose** | Theme, notifications toggle, stream quality, help |
| **Parent Component** | `PodcastUpload` |
| **Child Components** | None |
| **Hooks Used** | None |
| **Services Used** | `useAppStore.setProfileDarkMode` via parent handler |
| **State Management Used** | Local settings state in parent |
| **Backend APIs Used** | None |
| **Audio Functionality** | None |
| **Current Implementation Status** | UI ONLY |

---

### 35. GuestJoinPage

| Field | Value |
|---|---|
| **Component Name** | `GuestJoinPage` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/pages/GuestJoinPage.tsx` |
| **Purpose** | Public guest name entry before entering room |
| **Parent Component** | `App.tsx` (unauthenticated guest route) |
| **Child Components** | `GuestRoom` (after local join) |
| **Hooks Used** | `useState` |
| **Services Used** | None |
| **State Management Used** | Local join state |
| **Backend APIs Used** | None (`setTimeout` simulates join) |
| **Audio Functionality** | None |
| **Current Implementation Status** | MOCK |

---

### 36. GuestRoom

| Field | Value |
|---|---|
| **Component Name** | `GuestRoom` |
| **File Path** | `Melody_meet/OPERATOR_PANEL/src/pages/GuestRoom.tsx` |
| **Purpose** | Guest room UI: mic/mute toggles, connection quality, chat, leave/reconnect |
| **Parent Component** | `GuestJoinPage` |
| **Child Components** | None (`renderMessage` inline) |
| **Hooks Used** | `useState`, `useEffect`, `useRef` |
| **Services Used** | None |
| **State Management Used** | Local mic, mute, chat, connection, session timer state |
| **Backend APIs Used** | None |
| **Audio Functionality** | Mic/mute toggle local state only; no `getUserMedia` or WebRTC |
| **Current Implementation Status** | MOCK |

---

## Hooks Inventory

| Hook | File | Mounted By | Status | Backend / Audio |
|---|---|---|---|---|
| `useRecording` | `hooks/useRecording.ts` | `PodcastUpload`, `PodcastSession` | PARTIAL | `POST /api/podcasts/recordings/upload`, `DELETE /api/podcasts/recordings/:id`; web `MediaRecorder`, native Expo `Audio.Recording` |
| `useLiveStream` | `hooks/useLiveStream.ts` | `PodcastUpload`, `PodcastSession` | PARTIAL | `POST /api/podcasts/live/start`, `POST /api/podcasts/live/stop`, `PUT /api/podcasts/live/viewers`, `POST /api/podcasts/guest-slots/links/generate`; web `getUserMedia` |
| `usePodcastSocket` | `hooks/usePodcastSocket.ts` | `PodcastUpload` | PARTIAL | Socket.IO `/podcast`: host join, chat, viewers, slot updates, WebRTC signal relay |
| `usePeerConnections` | `hooks/usePeerConnections.ts` | `PodcastUpload` | PARTIAL | WebRTC host-side; `AudioContext` + `GainNode`; socket signaling; web only |
| `usePodcastBootstrap` | `hooks/usePodcastBootstrap.ts` | None | DEAD | Would call `GET /api/podcasts`, `/mics`, `/recordings` |

---

## Utilities & Types

| Item | File | Used By | Status |
|---|---|---|---|
| `extractRoomId` | `utils/podcastMappers.ts` | `usePodcastSocket`, `usePeerConnections` | PARTIAL (parses `?roomId=` only) |
| `mapEpisodeFromApi` | `utils/podcastMappers.ts` | `usePodcastBootstrap` only | DEAD (hook unmounted) |
| `mapRecordingFromApi` | `utils/podcastMappers.ts` | `usePodcastBootstrap` only | DEAD (hook unmounted) |
| `Podcast`, `Recording`, `Mic`, `TrimRange`, `MusicTrack` | `types/index.ts` | EpisodeManager, hooks, lists | REAL (type definitions) |

---

## Global Providers & Contexts

| Provider / Context | File | Used by Podcast V2? | Role |
|---|---|---|---|
| `AuthProvider` / `useAuth` | `src/context/AuthContext.tsx` | Yes (`PodcastUpload`) | User identity, logout |
| `OperatorProvider` | `src/context/OperatorContext.tsx` | No direct import in podcast feature | App-level wrapper only |
| Zustand `useAppStore` | `src/store/useAppStore.ts` | Yes | `podcast` slice: episodes, recordings, mics, guest slots, live/recording state, trim ranges |
| `AuthProvider` wraps entire app | `App.tsx` | Yes | Session for host studio |

---

## Shared Components (cross-feature)

| Component | Path | Used In Podcast V2 By |
|---|---|---|
| `LiveChat` | `features/rj/components/LiveChat.tsx` | `PodcastLiveChat` |
| `StickerModal` | `features/rj/components/modals/StickerModal.tsx` | `PodcastLiveChat` |
| `NotificationsModal` | `components/modals/NotificationsModal.tsx` | `PodcastUpload` |
| `SettingsModal` | `components/modals/SettingsModal.tsx` | `PodcastUpload` |
| `Sidebar` | `components/layout/Sidebar.tsx` | App shell when host navigates to Podcast |
| `SessionTimer` | `components/SessionTimer.tsx` | App shell |

---

## Reusable Components (within podcast feature)

| Component | Export | Reused By |
|---|---|---|
| `RecentRecordingsList` | Named export | `EpisodeManager` |
| `TrimModal` | Named export | `EpisodeManager` |
| `PodcastPlaylistTrack` | Type export from `PodcastPlaylistModal` | `PodcastUpload` |
| `GuestSeat`, `GuestStatus` | Type exports from `RemoteGuestsPanel` | Available; no external consumer |

---

## Modals

| Modal | File | Trigger | Status |
|---|---|---|---|
| `LiveSetupModal` | `modals/LiveSetupModal.tsx` | GO LIVE button | PARTIAL |
| `EpisodeManager` | `sections/EpisodeManager.tsx` | Episode Manager button | UI ONLY |
| `TrimModal` | `sections/TrimModal.tsx` | Episode Manager → Trim | UI ONLY |
| `PodcastProfileModal` | `modals/PodcastProfileModal.tsx` | Header user icon | UI ONLY |
| `NotificationsModal` | `components/modals/NotificationsModal.tsx` | Header bell | UI ONLY |
| `SettingsModal` | `components/modals/SettingsModal.tsx` | Header settings | UI ONLY |
| `StickerModal` | `features/rj/components/modals/StickerModal.tsx` | Chat sticker button | UI ONLY |

Note: `PodcastPlaylistModal` is named "Modal" but renders as an inline panel, not a React Native `Modal`.

---

## Utility Components

| Component | File | Role |
|---|---|---|
| `CheckIcon`, `PlayIcon`, `DotIcon`, `StatusIcon` | `EpisodeNotes.tsx` | Note status icons |
| `MicSvg`, `LinkSvg` | `PodcastAudioDeck.tsx` | Inline SVG icons |
| `platformBadge`, URL helpers | `PodcastPlaylistModal.tsx` | Platform label helpers |
| `buildGuestLink` | `PodcastAudioDeck.tsx`, `RemoteGuestsPanel.tsx` | Guest URL construction (duplicate logic) |
| `convertToRjMessage` | `PodcastLiveChat.tsx` | Chat message shape adapter |

---

## Dependency Tree

```
Podcast Studio
│
├── Components
│   ├── PodcastUpload (root)
│   │   ├── StatsBar → SignalBars
│   │   ├── PodcastAudioDeck → ChannelStrip → Knob, Fader, VuBars, ScaleCol
│   │   ├── RemoteGuestsPanel → StatusIndicatorDot, SignalBars, ActionButton
│   │   ├── PodcastSession → StatCard, Waveform
│   │   ├── PodcastLiveChat → LiveChat (RJ), StickerModal (RJ)
│   │   ├── PodcastPlaylistModal
│   │   ├── EpisodeNotes → NoteItem → StatusIcon (+ icons)
│   │   ├── PlayerAudioFXPanel → Knob, HVUMeter, VUScale
│   │   ├── EpisodeManager → RecentRecordingsList → RecordingItem, TrimModal
│   │   ├── LiveSetupModal
│   │   ├── NotificationsModal (shared)
│   │   ├── SettingsModal (shared)
│   │   └── PodcastProfileModal
│   │
│   ├── GuestJoinPage → GuestRoom
│   └── Dashboard (entry navigation only)
│
├── Hooks
│   ├── useRecording ──────────────┐
│   ├── useLiveStream ─────────────┤ mounted in PodcastUpload + PodcastSession
│   ├── usePodcastSocket ──────────┤ mounted in PodcastUpload
│   ├── usePeerConnections ────────┘ mounted in PodcastUpload (web only)
│   └── usePodcastBootstrap (DEAD — not mounted)
│
├── Services
│   ├── PodcastApi (operatorApi.ts)
│   ├── apiClient.ts
│   ├── podcastSocket (socketService.ts)
│   ├── podcastMappers.ts
│   ├── useAppStore (Zustand podcast slice)
│   ├── AuthContext / AuthApi
│   ├── expo-document-picker, expo-image-picker, expo-av (native recording)
│   └── emojiCategories (RJ constants, via PodcastLiveChat)
│
├── Backend APIs
│   ├── REST (via PodcastApi)
│   │   ├── GET/POST/PUT/DELETE /api/podcasts/*
│   │   ├── GET/POST/DELETE /api/podcasts/recordings/*
│   │   ├── POST /api/podcasts/live/start|stop
│   │   ├── PUT /api/podcasts/live/viewers
│   │   ├── POST /api/podcasts/guest-slots/links/generate
│   │   ├── GET/POST/PATCH/DELETE /api/podcasts/guest-slots/*
│   │   └── GET/POST/PUT/DELETE /api/podcasts/mics/*
│   │
│   └── Socket.IO /podcast (via podcastSocket)
│       ├── host_join, host_chat_message
│       ├── room_snapshot, chat_history, chat_message, viewer_count
│       ├── live_ended, slot_updated, guest_joined, guest_left
│       ├── guest_mic_toggle, guest_speaking
│       └── webrtc_offer, webrtc_answer, webrtc_ice_candidate
│
└── Audio Engine Dependencies
    ├── useRecording → getUserMedia (web), MediaRecorder, Expo Audio.Recording (native)
    ├── useLiveStream → getUserMedia host mic stream
    ├── usePeerConnections → RTCPeerConnection, AudioContext, GainNode, HTMLAudioElement (web)
    ├── PodcastPlaylistModal → HTMLAudioElement playback (web)
    ├── PodcastAudioDeck → simulated meters (no engine)
    ├── PlayerAudioFXPanel → simulated meters (no engine)
    └── NOT used by Podcast V2:
        ├── services/audioEngine/core/AudioEngineManager.ts
        ├── services/audioEngine/core/DeckEngine.ts
        ├── services/audioEngine/core/MicEngine.ts
        └── hooks/useAudioEngine.ts (empty file)
```

---

## Removed Components (no longer in filesystem)

These paths appear as deleted in git status and have **no current source file**:

| Former Component | Former Path | Status |
|---|---|---|
| `EpisodeHub` | `features/podcast/EpisodeHub.tsx` | REMOVED |
| `EpisodesList` | `features/podcast/sections/EpisodesList.tsx` | REMOVED |
| `MusicPlayer` | `features/podcast/sections/MusicPlayer.tsx` | REMOVED |
| `PodcastAnalytics` | `features/podcast/sections/PodcastAnalytics.tsx` | REMOVED |
| `EpisodeDetails` | `features/podcast/sections/EpisodeDetails.tsx` | REMOVED |
| `TrimModal` (old location) | `features/podcast/modals/TrimModal.tsx` | REMOVED (relocated to `sections/TrimModal.tsx`) |

---

## Unused / Dead / Duplicate / Empty

### Unused Components

| Item | Notes |
|---|---|
| `usePodcastBootstrap` | Hook file exists; zero imports in app |
| `mapEpisodeFromApi`, `mapRecordingFromApi` | Only referenced by dead bootstrap hook |
| `peerApplyVolume`, `peerApplyMute`, `closePeer` | Returned by `usePeerConnections` in `PodcastUpload` but not wired to any UI |
| `MusicTrack` type | Defined in `types/index.ts`; no podcast component imports it |
| `onSaveRecording` prop on `PodcastSession` | Never passed from `PodcastUpload` |

### Dead Components

| Item | Notes |
|---|---|
| `usePodcastBootstrap` | Not mounted |
| Removed files listed above | Deleted from tree; superseded by `EpisodeManager`, `PodcastPlaylistModal`, etc. |

### Duplicate Components

| Name | Locations | Notes |
|---|---|---|
| `PlayerAudioFXPanel` | `features/podcast/sections/PlayerAudioFXPanel.tsx`, `features/rj/components/PlayerAudioFXPanel.tsx` | Same export name; separate implementations |
| `SignalBars` | `PodcastUpload.tsx`, `RemoteGuestsPanel.tsx` | Same name; different implementations |
| `Knob` | `PodcastAudioDeck.tsx`, `PlayerAudioFXPanel.tsx` | Same pattern; separate files |
| `buildGuestLink` | `PodcastAudioDeck.tsx`, `RemoteGuestsPanel.tsx` | Duplicate URL builder logic |
| `Waveform` | `Podcastsession.tsx` | Distinct from any RJ waveform; podcast-local only |

### Empty Components

| File | Notes |
|---|---|
| None in `features/podcast/**` | All podcast feature files contain implementation |

Related empty files **outside** podcast feature (not imported by Podcast V2):

- `src/hooks/useAudioEngine.ts` (0 bytes)
- `src/services/streaming/webrtcService.ts` (0 bytes)
- `src/services/streaming/encoder.ts` (0 bytes)

### Components That Should Belong to the Audio Engine

Based on current responsibilities (audio routing, capture, processing, metering, playback):

| Component / Hook | Rationale |
|---|---|
| `PodcastAudioDeck` / `ChannelStrip` | Mixer controls and per-channel gain/EQ/fader/mute intended for audio routing |
| `PlayerAudioFXPanel` | Master bus compressor/limiter/volume/meters |
| `useRecording` | Mic capture and recording pipeline |
| `useLiveStream` | Host mic stream acquisition for live session |
| `usePeerConnections` | WebRTC guest audio receive, gain, mute |
| `PodcastPlaylistModal` | Track playback (`HTMLAudioElement`) |
| `PodcastSession` / `Waveform` | Recording session tied to capture state |
| `TrimModal` | Audio edit workflow (currently UI-only) |

### Components That Should Remain UI-Only

| Component | Rationale |
|---|---|
| `StatsBar`, `SignalBars` (header) | Display-only metrics |
| `EpisodeNotes`, `NoteItem` | Run-of-show notes |
| `RemoteGuestsPanel` | Guest management UI (currently local state) |
| `PodcastLiveChat` | Chat adapter; message transport is hook/socket layer |
| `LiveChat`, `StickerModal` | Presentation layer |
| `EpisodeManager`, `RecentRecordingsList`, `RecordingItem` | Forms and lists |
| `LiveSetupModal` | Wizard shell; tests delegated to hooks |
| `PodcastProfileModal`, `NotificationsModal`, `SettingsModal` | Chrome/settings |
| `GuestJoinPage`, `GuestRoom` | Public guest UX shell |
| `StatCard` | Session metric display |

---

## Component Statistics

| Category | Count |
|---|---|
| **Total Components** | **39** |
| **Audio Components** | **15** |
| **UI Components** | **24** |
| **Shared Components** | **4** (`LiveChat`, `StickerModal`, `NotificationsModal`, `SettingsModal`) |
| **Dead Components** | **1** mounted dead hook; **6** removed files no longer present |

### Total Components breakdown

- Podcast feature named React components (including inline): **33**
- Shared cross-feature components used by podcast: **4**
- Public guest page components: **2**
- **Total: 39**

### Audio Components breakdown (15)

`PodcastAudioDeck`, `ChannelStrip`, `Knob` (deck), `Fader`, `VuBars`, `PlayerAudioFXPanel`, `Knob` (FX), `HVUMeter`, `PodcastPlaylistModal`, `PodcastSession`, `Waveform`, `TrimModal`, `GuestRoom` (mic UI shell), plus audio-adjacent **`LiveSetupModal`** and **`LiveSetupModal` mic test path** — counted as: deck stack (7) + FX stack (3) + playlist (1) + session/waveform (2) + trim (1) + guest room mic UI (1) = **15**

### UI Components breakdown (24)

Remaining display, chat adapter, notes, guest panel, modals, lists, header stats, and icon utilities.

### Shared Components (4)

Listed above; used by Podcast V2 but authored outside `features/podcast`.

### Dead Components

- **1** unmounted hook (`usePodcastBootstrap`) with orphaned mapper usage
- **6** files removed from repository (former podcast components)

---

## Overall Component Architecture Summary

Podcast V2 is organized as a **single host orchestrator** (`PodcastUpload`) that lazy-loads from `App.tsx` when the operator selects the Podcast screen from `Dashboard`. The layout splits into a **left column** (mixer + remote guests + recording session) and a **right column** (chat, playlist, notes, episode manager entry), with a **full-width master FX panel** at the bottom.

**State architecture:** Host live/recording persistence flows through a Zustand `podcast` slice (`useAppStore`). `PodcastUpload`, `PodcastSession`, and hooks read/write shared store fields. Many panels (`PodcastAudioDeck`, `RemoteGuestsPanel`, `EpisodeNotes`, `PlayerAudioFXPanel`, header stats) keep **isolated local React state** and are not connected to the store or backend.

**Real backend integration** concentrates in four hooks: `useRecording` (upload/delete recordings), `useLiveStream` (live session lifecycle, guest link generation, mic capture), `usePodcastSocket` (chat, viewers, slot updates, WebRTC signal relay), and `usePeerConnections` (host-side WebRTC audio on web). **`usePodcastBootstrap` is not mounted**, so episodes/mics/recordings are not loaded from API on studio entry.

**Guest path:** `/podcast/guest/:slotId/:roomId` renders `GuestJoinPage` → `GuestRoom` without authentication. This path does **not** use `podcastSocket`, `PodcastApi.joinGuestSlot`, or WebRTC — join is simulated with `setTimeout`.

**Shared RJ reuse:** Chat reuses RJ `LiveChat` and `StickerModal` through the `PodcastLiveChat` adapter. Master FX panel duplicates the RJ `PlayerAudioFXPanel` filename but lives in a separate podcast copy.

**Audio engine boundary:** Podcast V2 implements audio through **browser APIs directly in hooks** (`getUserMedia`, `MediaRecorder`, `RTCPeerConnection`, `AudioContext`) and **HTMLAudioElement** in the playlist panel. The shared `audioEngine` service layer used by RJ is **not imported** by any podcast file. Most mixer and FX UI surfaces are **visual-only or simulated** (random VU meters, local fader state) and are not wired to `usePeerConnections` return values or Zustand guest slot state.

**Modals:** Live setup, episode management (with nested trim), profile, notifications, and settings are all modal or modal-like overlays. Episode publish/draft flows write to Zustand only; they do not call `PodcastApi.create` or `PodcastApi.upload` from the UI layer.

---

*Generated from current source audit. Inventory only.*
