# MelodyMeet Engine State 
# MelodyMeet Audio Engine State Model

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines the complete runtime state model of the MelodyMeet Audio Engine.

The State Manager maintains the authoritative runtime state for every engine module.

The engine is the only source of truth for audio state.

Frontend state is visualization only.

Backend state is persistence only.

---

# 2. Design Principles

The state system follows these principles:

- Single Source of Truth
- Immutable Snapshots
- Thread Safe
- Serializable
- Platform Independent
- Event Driven

State is never modified directly by external systems.

Only engine modules may update state.

---

# 3. Root Engine State

The engine maintains one root state object.

EngineState

Contains:

- DeviceState
- DeckState
- PlaylistState
- MicState
- MixerState
- MonitoringState
- RecordingState
- BroadcastState
- SessionState
- SystemState

---

# 4. Device State

Represents the current audio hardware.

Fields

Input Device

Output Device

Sample Rate

Buffer Size

Input Channels

Output Channels

Device Status

Supported Sample Rates

Supported Buffer Sizes

Generated Events

DEVICE_CHANGED

BUFFER_SIZE_CHANGED

SAMPLE_RATE_CHANGED

---

# 5. Deck State

Applies only to RJ Studio.

Each deck maintains its own independent state.

Fields

Deck ID

Track Loaded

Track Name

Track Duration

Current Position

Playback State

Cue Position

Loop Enabled

Loop Start

Loop End

Pitch

Playback Speed

Volume

EQ

Sync Enabled

Generated Events

TRACK_LOADED

TRACK_STARTED

TRACK_PAUSED

TRACK_STOPPED

TRACK_POSITION_CHANGED

---

# 6. Playlist State

Fields

Playlist ID

Track List

Current Track

Shuffle Enabled

Repeat Enabled

Queue

Playback Order

Loaded Deck

Playlist playback never bypasses DeckManager.

---

# 7. Microphone State

Each microphone channel has its own state.

Fields

Channel ID

Channel Name

Enabled

Muted

Solo

Gain

Volume

High EQ

Mid EQ

Low EQ

Meter Level

Peak Level

Input Device

Signal Present

Supports

RJ Mic

Host Mic

Guest 1

Guest 2

Guest 3

Call-In

---

# 8. Mixer State

Represents the Program Mixer.

Fields

Music Bus Level

Mic Bus Level

Aux Bus Level

Program Bus Level

Master Volume

Crossfader Position

Active Routes

Generated Events

MASTER_VOLUME_CHANGED

CROSSFADER_CHANGED

ROUTING_CHANGED

---

# 9. Monitoring State

Fields

Monitoring Enabled

Current Source

Headphone Volume

Solo Channel

Cue Deck

Program Monitor Enabled

Monitor Device

Monitoring never affects Program Output.

---

# 10. Recording State

Fields

Recording Active

Paused

Recording Duration

Output File

Sample Rate

Bit Depth

Current Size

Recording Format

Start Time

Stop Time

Generated Events

RECORDING_STARTED

RECORDING_PAUSED

RECORDING_RESUMED

RECORDING_STOPPED

---

# 11. Broadcast State

Fields

Broadcast Active

Connection Status

Program Output Ready

Current Encoder

Bitrate

Latency

Listener Count

Generated Events

BROADCAST_STARTED

BROADCAST_STOPPED

BROADCAST_CONNECTION_LOST

---

# 12. Session State

Represents the current studio session.

Fields

Studio Type

RJ

Podcast

Session ID

Operator

Loaded Resources

Session Duration

Last Save Time

Modified

Session state excludes live audio buffers.

---

# 13. System State

Represents engine health.

Fields

Engine Initialized

Engine Ready

CPU Usage

Memory Usage

Audio Callback Time

XRuns

Warnings

Errors

Engine Version

Build Version

---

# 14. State Ownership

State Object              Owner Module

DeviceState               DeviceManager

DeckState                 DeckManager

PlaylistState             PlaylistManager

MicState                  MicManager

MixerState                ProgramMixer

MonitoringState           MonitoringManager

RecordingState            RecordingManager

BroadcastState            BroadcastOutputManager

SessionState              SessionManager

SystemState               EngineHost

Only the owning module may modify its state.

---

# 15. State Updates

State updates occur only after successful command execution.

Flow

Command

↓

Validation

↓

Module Update

↓

State Update

↓

Event Emission

↓

Frontend Refresh

The frontend must never update engine state directly.

---

# 16. State Snapshots

The engine shall support immutable snapshots.

Snapshots are used for:

- Frontend synchronization
- Diagnostics
- Session persistence
- Crash recovery

Snapshots are read-only.

---

# 17. State Persistence

Only selected state is persisted.

Persist

- Deck configuration
- Playlist
- Mixer settings
- EQ
- Monitoring preferences
- Session metadata

Do Not Persist

- Audio buffers
- Live playback position
- Temporary meter values
- Callback memory
- Thread state

---

# 18. Recovery

After restart the engine restores:

Devices

↓

Session

↓

Mixer

↓

Playlist

↓

Monitoring

↓

Ready

Playback is never resumed automatically.

Recording is never resumed automatically.

---

# 19. Thread Safety

State modifications occur on the owning thread.

Read access is provided through immutable snapshots.

Audio Thread never waits for state locks.

---

# 20. Summary

The MelodyMeet Audio Engine maintains a centralized runtime state managed by the State Manager.

Each module owns its own state while exposing read-only snapshots to external consumers.

This architecture guarantees consistency, thread safety, reliable synchronization, and predictable behavior across RJ Studio, Podcast Studio, and future MelodyMeet applications.