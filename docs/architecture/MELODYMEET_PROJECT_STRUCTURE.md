# MelodyMeet Project Structure 
# MelodyMeet Implementation Roadmap 
# MelodyMeet Audio Engine Architecture

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Overview

The MelodyMeet Audio Engine is a modular, real-time broadcast audio engine built using JUCE and modern C++.

The engine is designed as a shared audio core powering multiple MelodyMeet applications including:

- RJ Studio
- Podcast Studio
- Future Broadcast Studios

The engine is responsible for all real-time audio processing.

Frontend applications act only as control surfaces.

The Node.js backend provides application services, persistence, APIs, collaboration, and distribution.

---

# 2. High-Level Architecture

                    React Native / Electron
                           │
                           │ Commands
                           ▼
                  Engine Command Bridge
                           │
                           ▼
                 MelodyMeet Audio Engine
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
 Audio Devices        Audio Processing     Engine Events
      │                    │                    │
      ▼                    ▼                    ▼
 Input / Output      Program Mix        Frontend Updates
                           │
                           ▼
                    Broadcast Output

---

# 3. Layered Architecture

Layer 1
Presentation Layer

- RJ Studio
- Podcast Studio
- Future Studios

Responsibilities

- UI
- Controls
- Visualization

No audio processing.

---

Layer 2

Communication Layer

Responsibilities

- Receive Commands
- Validate Commands
- Dispatch Commands
- Emit Events

No DSP.

---

Layer 3

Engine Core

Responsibilities

- Module lifecycle
- Routing
- Synchronization
- State management

Coordinates every subsystem.

---

Layer 4

Audio Modules

Contains all processing modules.

---

Layer 5

Platform Layer

Responsibilities

- Audio hardware
- Device drivers
- Operating system integration

Implemented through JUCE.

---

# 4. Core Modules

The engine consists of the following primary modules.

---

EngineHost

Purpose

Owns engine lifecycle.

Responsibilities

- Initialize engine
- Shutdown engine
- Audio device initialization
- Module initialization
- Error recovery

---

CommandManager

Purpose

Entry point for every external command.

Responsibilities

- Validate commands
- Dispatch commands
- Maintain ordering

---

EventManager

Purpose

Publish engine events.

Responsibilities

- State changes
- Meter updates
- Recording events
- Playback events
- Error events

---

StateManager

Purpose

Single source of truth.

Stores:

- Playback state
- Recording state
- Mic state
- Device state

---

# 5. Audio Modules

## DeviceManager

Responsibilities

- Enumerate devices
- Input selection
- Output selection
- Sample rate
- Buffer size

---

## DeckManager

Supports

- Deck A
- Deck B

Responsibilities

- Load
- Play
- Pause
- Stop
- Seek
- Cue
- Loop
- Pitch
- Sync

RJ only.

---

## PlaylistManager

Responsibilities

- Queue
- Load into deck
- Auto advance

No playback logic.

Playback belongs to DeckManager.

---

## MicManager

Supports

- RJ Mic
- Guest 1
- Guest 2
- Guest 3
- Call-In
- Podcast Host
- Podcast Guests

Responsibilities

- Enable
- Disable
- Gain
- EQ
- Mute
- Solo
- Meter

---

## ProgramMixer

Receives

- Music Bus
- Mic Bus
- Guest Bus
- Caller Bus

Produces

Program Bus

---

## MonitoringManager

Produces

Private Monitor Bus

Supports

- Cue
- Solo
- Headphones
- Program monitor

---

## RecordingManager

Responsibilities

- Start
- Pause
- Resume
- Stop
- File writing
- Session recording

---

## DynamicsManager

Contains

- Compressor
- Limiter

Master processing only.

---

## MeterManager

Produces

- Channel meters
- Deck meters
- Master meters
- Recording meters

---

## BroadcastOutputManager

Produces

Final Program Output.

No streaming logic.

Provides audio to the backend transport layer.

---

# 6. Audio Bus Architecture

Input Devices
        │
        ▼
Mic Bus

Deck A
        │
Deck B
        ▼
Music Bus

Guest Inputs
        ▼
Guest Bus

Remote Callers
        ▼
Caller Bus

        │
        ▼
Program Mixer
        │
        ▼
Master Bus
        │
        ├────────► Recording
        │
        ├────────► Monitoring
        │
        └────────► Broadcast Output

---

# 7. Thread Model

Audio Thread

Responsibilities

- Audio callback
- Mixing
- DSP
- Metering

Rules

- No allocation
- No locks
- No file IO
- No network IO

---

Worker Threads

Responsibilities

- File loading
- Waveform generation
- Recording writes
- Background analysis

---

UI Thread

Responsibilities

- Commands
- Event handling

Never processes audio.

---

# 8. Data Flow

Frontend
    │
Command
    ▼
CommandManager
    ▼
Target Module
    ▼
ProgramMixer
    ▼
Master Bus
    ▼
Output

---

# 9. Scalability

The architecture supports:

- Additional studios
- More channels
- Additional DSP modules
- Future cloud integration
- Plugin architecture

without redesigning the engine core.

---

# 10. Architectural Principles

- Single Source of Truth
- Modular Design
- Real-Time Safe
- Separation of Concerns
- Deterministic Audio Processing
- Platform Abstraction
- Frontend Independence
- Backend Independence
- Extensibility
- Production Reliability

---

# 11. Summary

The MelodyMeet Audio Engine is a shared JUCE-based audio core designed to support all MelodyMeet production environments.

Every real-time audio operation originates inside the engine.

The frontend controls the engine.

The backend coordinates the application.

The engine remains the sole authority for audio state and processing.