# MelodyMeet Engine Decisions

## Decision 001
EngineHost owns only application lifecycle.

Status:
Accepted

Reason:
Audio responsibilities belong inside AudioEngine.

---

## Decision 002
AudioEngine owns all runtime audio systems.

Status:
Accepted

Owned Modules:
- DeviceManager
- AudioClock
- AudioSession
- AudioCallback
- DeckManager
- Mixer
- MicManager
- Recorder
- BroadcastManager

---

## Decision 003
Development is milestone-driven.

Status:
Accepted

Rules:
- No placeholder classes.
- No TODO implementations.
- Every milestone must be functional.
- Architecture documents are the source of truth.

---

## Decision 004
JUCE is the audio backend only.

Status:
Accepted

Reason:
Business logic must remain independent of JUCE wherever practical.

---

## Decision 005
Every subsystem must have a single responsibility.

Status:
Accepted

Examples:
DeviceManager → Hardware
AudioClock → Timing
DeckManager → Playback
Mixer → Mixing
Recorder → Recording
BroadcastManager → Streaming