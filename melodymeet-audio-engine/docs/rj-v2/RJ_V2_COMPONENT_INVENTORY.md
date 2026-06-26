# RJ V2 Component Inventory

## Purpose

This document inventories all components used by RJ Studio V2.

The goal is to classify components into:

* Audio Components
* Backend Components
* Frontend Components
* Shared Components

This inventory serves as the foundation for Audio Engine V2 integration planning.

---

# Component Classification

## Audio Components

These components directly participate in audio playback, audio processing, monitoring, recording, or mixing.

| Component           | Purpose                     | Status |
| ------------------- | --------------------------- | ------ |
| DualPlayer          | Deck A / Deck B playback    | Audio  |
| PlayerAudioFXPanel  | Deck FX controls            | Audio  |
| Mic Channel Strip   | Mic processing controls     | Audio  |
| Waveform Viewer     | Track visualization         | Audio  |
| Crossfader          | Deck blending               | Audio  |
| Compressor Panel    | Master compression controls | Audio  |
| Limiter Panel       | Output protection controls  | Audio  |
| Master Meter        | Output metering             | Audio  |
| Recording Controls  | Recording workflow          | Audio  |
| Monitoring Controls | Monitoring workflow         | Audio  |

---

## Backend Components

These components depend on APIs, sockets, persistence, or server state.

| Component           | Purpose                       | Status  |
| ------------------- | ----------------------------- | ------- |
| Live Chat           | Audience interaction          | Backend |
| Notifications       | Alerts and events             | Backend |
| Listener Analytics  | Audience metrics              | Backend |
| Song Requests       | Audience requests             | Backend |
| User Presence       | Live state tracking           | Backend |
| Session Persistence | State restoration             | Backend |
| RJ Sync             | Multi-session synchronization | Backend |

---

## Frontend Components

These components provide presentation and workflow only.

| Component             | Purpose               | Status   |
| --------------------- | --------------------- | -------- |
| Profile Modal         | RJ profile management | Frontend |
| Settings Modal        | User settings         | Frontend |
| Theme Controls        | Appearance            | Frontend |
| Layout Containers     | UI structure          | Frontend |
| Navigation Components | Navigation            | Frontend |

---

## Shared Components

These components interact with both backend and audio systems.

| Component          | Purpose                 | Status |
| ------------------ | ----------------------- | ------ |
| Playlist           | Audio source management | Shared |
| Go Live Controls   | Broadcast state         | Shared |
| Deck Controls      | Audio + Backend Sync    | Shared |
| Recording Workflow | Audio + Storage         | Shared |

---

# Hooks Inventory

To be completed from source code audit.

Expected Hooks:

* useRjSync
* useRjSessionPersistence
* usePlaylistPlayer
* useAudioEffects
* usePlayer
* usePlaylist
* useChat

---

# Service Inventory

To be completed from source code audit.

Expected Services:

* RjApi
* rjBackend
* socketService
* chatSocket
* audioEngineManager

---

# Final Notes

This document must be updated whenever new RJ Studio components are introduced.

The inventory serves as the reference point for future engine migration planning.
