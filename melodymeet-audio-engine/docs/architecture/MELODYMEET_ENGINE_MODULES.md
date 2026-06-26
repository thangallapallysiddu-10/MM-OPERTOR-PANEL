# MelodyMeet Engine Modules 
# MelodyMeet Audio Engine Modules

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines every module of the MelodyMeet Audio Engine.

Each module has a single responsibility.

Modules communicate through well-defined interfaces and shared audio buses.

No module may directly manipulate another module's internal state.

The engine follows a modular architecture to ensure:

- Maintainability
- Testability
- Scalability
- Real-time safety
- Separation of concerns

---

# 2. Module Hierarchy

EngineHost
│
├── DeviceManager
├── CommandManager
├── EventManager
├── StateManager
│
├── DeckManager
│   ├── Deck A
│   └── Deck B
│
├── PlaylistManager
│
├── MicManager
│   ├── RJ Mic
│   ├── Guest Mic 1
│   ├── Guest Mic 2
│   ├── Guest Mic 3
│   └── Call-In
│
├── ProgramMixer
│
├── MonitoringManager
│
├── DynamicsManager
│
├── MeterManager
│
├── RecordingManager
│
├── BroadcastOutputManager
│
└── SessionManager

---

# 3. EngineHost

Purpose

Owns the complete engine lifecycle.

Responsibilities

- Initialize engine
- Shutdown engine
- Module creation
- Module destruction
- Dependency injection
- Engine health monitoring

Dependencies

- All engine modules

Inputs

- Startup request
- Shutdown request

Outputs

- Engine lifecycle events

Thread

Main Thread

---

# 4. DeviceManager

Purpose

Owns all audio hardware.

Responsibilities

- Detect audio devices
- Select input devices
- Select output devices
- Sample rate management
- Buffer size management
- Device hot swap

Dependencies

JUCE AudioDeviceManager

Inputs

Device commands

Outputs

Audio device streams

Thread

Main Thread

---

# 5. CommandManager

Purpose

Single entry point for all commands.

Responsibilities

- Receive commands
- Validate commands
- Queue commands
- Dispatch commands

Dependencies

None

Inputs

Frontend

Backend

Outputs

Target module commands

Thread

Main Thread

---

# 6. EventManager

Purpose

Publish engine events.

Responsibilities

- Collect events
- Broadcast events
- Maintain ordering
- Support multiple subscribers

Dependencies

All modules

Outputs

Frontend

Backend

Logger

Thread

Worker Thread

---

# 7. StateManager

Purpose

Central engine state.

Responsibilities

Maintain:

- Deck State
- Mic State
- Mixer State
- Device State
- Recording State

Dependencies

All modules

Outputs

Snapshot state

Thread

Main Thread

---

# 8. DeckManager

Purpose

Controls Deck A and Deck B.

Responsibilities

- Load
- Decode
- Play
- Pause
- Stop
- Seek
- Cue
- Loop
- Pitch
- Sync

Dependencies

JUCE AudioTransportSource

Outputs

Music Bus

Thread

Audio Thread

---

# 9. PlaylistManager

Purpose

Manage playlist metadata.

Responsibilities

- Queue
- Remove
- Shuffle
- Route track to deck

Important

Does NOT play audio.

Playback belongs to DeckManager.

Thread

Main Thread

---

# 10. MicManager

Purpose

Manage all microphone channels.

Supports

- RJ Mic
- Host Mic
- Guest 1
- Guest 2
- Guest 3
- Call-In

Responsibilities

- Enable
- Disable
- Gain
- EQ
- Mute
- Solo
- Meter
- Input device selection

Outputs

Mic Bus

Thread

Audio Thread

---

# 11. ProgramMixer

Purpose

Create the final program mix.

Inputs

Music Bus

Mic Bus

Aux Bus

Responsibilities

- Bus summing
- Gain staging
- Routing

Outputs

Program Bus

Thread

Audio Thread

---

# 12. MonitoringManager

Purpose

Private monitoring.

Responsibilities

- Cue
- PFL
- Solo
- Program monitor
- Headphone output

Outputs

Monitor Bus

Thread

Audio Thread

---

# 13. DynamicsManager

Purpose

Master dynamics processing.

Contains

- Compressor
- Limiter

Responsibilities

Protect final output.

Outputs

Master Bus

Thread

Audio Thread

---

# 14. MeterManager

Purpose

Real-time metering.

Provides

- Input meters
- Mic meters
- Deck meters
- Program meter
- Master meter
- Recording meter

Responsibilities

Read-only analysis.

Never modifies audio.

Thread

Audio Thread

---

# 15. RecordingManager

Purpose

Record final program output.

Responsibilities

- Start
- Pause
- Resume
- Stop
- File writing
- Session management

Inputs

Record Bus

Outputs

Audio files

Thread

Worker Thread

---

# 16. BroadcastOutputManager

Purpose

Provide final audio for broadcasting.

Responsibilities

- Receive Program Bus
- Prepare output stream
- Provide PCM to backend

Important

Does NOT perform streaming.

Thread

Audio Thread

---

# 17. SessionManager

Purpose

Persist engine state.

Responsibilities

- Save session
- Restore session
- Reset state

Thread

Worker Thread

---

# 18. Module Dependencies

EngineHost
│
├── DeviceManager
├── CommandManager
├── EventManager
├── StateManager
│
├── DeckManager
│     │
│     ▼
│  ProgramMixer
│
├── MicManager
│     │
│     ▼
│  ProgramMixer
│
├── ProgramMixer
│     │
│     ▼
│ DynamicsManager
│     │
│     ▼
│ Master Bus
│
├── MeterManager
├── RecordingManager
├── MonitoringManager
└── BroadcastOutputManager

---

# 19. Ownership Rules

Every module owns its own resources.

No module accesses another module's private data.

Communication occurs through:

- Commands
- Events
- Audio Buses

Only EngineHost creates and destroys modules.

---

# 20. Module Lifecycle

Engine Start

↓

Create DeviceManager

↓

Create CommandManager

↓

Create EventManager

↓

Create StateManager

↓

Create Audio Modules

↓

Initialize Audio Hardware

↓

Engine Ready

Shutdown follows the reverse order.

---

# 21. Future Modules

Reserved for future versions.

- AIProcessingManager
- NoiseSuppressionManager
- SamplerManager
- AdvertisementManager
- PluginManager
- CloudRenderManager

These modules must integrate without modifying existing core modules.

---

# 22. Summary

The MelodyMeet Audio Engine is composed of independent modules with clearly defined responsibilities.

The architecture separates device management, playback, microphone processing, mixing, monitoring, recording, broadcasting, and state management into dedicated modules.

This modular design supports both RJ Studio and Podcast Studio while remaining extensible for future production requirements.