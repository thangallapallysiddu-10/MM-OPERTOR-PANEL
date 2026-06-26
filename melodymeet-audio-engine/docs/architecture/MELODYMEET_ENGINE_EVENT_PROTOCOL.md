# MelodyMeet Engine Event Protocol 
# MelodyMeet Audio Engine Event Protocol

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines the official event protocol emitted by the MelodyMeet Audio Engine.

The event protocol provides a real-time, asynchronous communication channel from the engine to external consumers.

Consumers include:

- React Frontend
- Node.js Backend
- Logging System
- Diagnostics
- Future Monitoring Tools

Events communicate engine state changes only.

External systems must never modify engine state through events.

---

# 2. Design Goals

The event protocol shall be:

- Asynchronous
- Non-blocking
- Thread-safe
- Deterministic
- Ordered
- Versioned
- Platform Independent

Events are notifications, not commands.

---

# 3. Event Lifecycle

Engine Module
      │
      ▼
State Change
      │
      ▼
Event Created
      │
      ▼
Event Manager
      │
      ▼
Subscribers
      │
      ├── Frontend
      ├── Backend
      ├── Logger
      └── Diagnostics

---

# 4. General Event Format

Every event contains:

Event ID

Unique identifier.

Example:

EVT-000451

---

Timestamp

Creation time.

---

Source Module

DeckManager

MicManager

Mixer

Recorder

Monitor

Broadcast

System

---

Event Name

Example:

TRACK_STARTED

---

Payload

Event-specific information.

---

Protocol Version

Semantic version.

---

# 5. Playback Events

TRACK_LOADED

Generated when a track finishes loading.

---

TRACK_STARTED

Generated when playback begins.

---

TRACK_PAUSED

Generated when playback pauses.

---

TRACK_STOPPED

Generated when playback stops.

---

TRACK_COMPLETED

Generated when playback reaches the end.

---

TRACK_POSITION_CHANGED

Generated periodically during playback.

Contains:

- deckId
- position
- duration

---

TRACK_UNLOADED

Generated when a deck is cleared.

---

# 6. Cue Events

CUE_SET

CUE_CLEARED

CUE_TRIGGERED

---

# 7. Loop Events

LOOP_ENABLED

LOOP_DISABLED

LOOP_STARTED

LOOP_ENDED

---

# 8. Pitch Events

PITCH_CHANGED

SYNC_COMPLETED

---

# 9. Playlist Events

PLAYLIST_LOADED

PLAYLIST_UPDATED

PLAYLIST_SHUFFLED

PLAYLIST_CLEARED

TRACK_QUEUED

TRACK_DEQUEUED

---

# 10. Microphone Events

MIC_ENABLED

MIC_DISABLED

MIC_MUTED

MIC_UNMUTED

MIC_GAIN_CHANGED

MIC_VOLUME_CHANGED

MIC_EQ_CHANGED

MIC_SOLO_ENABLED

MIC_SOLO_DISABLED

MIC_INPUT_CHANGED

---

# 11. Monitoring Events

MONITOR_ENABLED

MONITOR_DISABLED

MONITOR_SOURCE_CHANGED

MONITOR_VOLUME_CHANGED

HEADPHONE_CONNECTED

HEADPHONE_DISCONNECTED

---

# 12. Recording Events

RECORDING_STARTED

RECORDING_PAUSED

RECORDING_RESUMED

RECORDING_STOPPED

RECORDING_CANCELLED

RECORDING_EXPORTED

RECORDING_ERROR

---

# 13. Mixer Events

MASTER_VOLUME_CHANGED

CROSSFADER_CHANGED

BUS_ROUTING_CHANGED

CHANNEL_ROUTED

CHANNEL_UNROUTED

---

# 14. Dynamics Events

COMPRESSOR_ENABLED

COMPRESSOR_DISABLED

COMPRESSOR_PARAMETERS_CHANGED

LIMITER_ENABLED

LIMITER_DISABLED

LIMITER_PARAMETERS_CHANGED

---

# 15. Metering Events

Metering events are generated continuously while the engine is running.

Events include:

CHANNEL_METER

DECK_METER

MASTER_METER

PROGRAM_METER

RECORDING_METER

Each event contains:

- Current Level
- Peak Level
- RMS Level
- Channel ID

---

# 16. Device Events

DEVICE_INITIALIZED

INPUT_DEVICE_CHANGED

OUTPUT_DEVICE_CHANGED

SAMPLE_RATE_CHANGED

BUFFER_SIZE_CHANGED

DEVICE_DISCONNECTED

DEVICE_RECONNECTED

---

# 17. Broadcast Events

BROADCAST_STARTED

BROADCAST_STOPPED

BROADCAST_PAUSED

BROADCAST_RESUMED

BROADCAST_CONNECTION_LOST

BROADCAST_RECONNECTED

---

# 18. Session Events

SESSION_SAVED

SESSION_RESTORED

SESSION_RESET

---

# 19. Engine Events

ENGINE_INITIALIZED

ENGINE_READY

ENGINE_SHUTDOWN

ENGINE_RESTARTED

ENGINE_WARNING

ENGINE_ERROR

ENGINE_FATAL_ERROR

ENGINE_HEALTH_UPDATE

---

# 20. Event Frequency

Events are classified into three categories.

Immediate

Examples:

TRACK_STARTED

MIC_MUTED

RECORDING_STARTED

These must be emitted instantly.

---

Periodic

Examples:

TRACK_POSITION_CHANGED

CHANNEL_METER

MASTER_METER

These are emitted at configurable intervals.

---

System

Examples:

ENGINE_READY

DEVICE_CHANGED

These occur only when required.

---

# 21. Event Delivery Rules

Events must preserve ordering.

Events shall never block the audio thread.

Slow subscribers must not delay engine processing.

The Event Manager is responsible for fan-out to multiple consumers.

---

# 22. Error Events

Errors are reported through ENGINE_ERROR.

Payload includes:

- Error Code
- Module
- Severity
- Description
- Timestamp

Severity Levels:

INFO

WARNING

ERROR

CRITICAL

FATAL

---

# 23. Versioning

The Event Protocol follows semantic versioning.

Changes must remain backward compatible whenever possible.

---

# 24. Summary

The Event Protocol is the only supported mechanism for broadcasting engine state changes.

Commands modify engine state.

Events communicate engine state.

Together they form the complete communication contract between the MelodyMeet Frontend, Backend, and JUCE Audio Engine.