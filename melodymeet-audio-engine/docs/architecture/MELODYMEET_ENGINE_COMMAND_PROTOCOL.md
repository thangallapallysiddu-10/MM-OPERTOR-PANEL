# MelodyMeet Engine Command Protocol 
# MelodyMeet Audio Engine Command Protocol

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines the official command protocol used to communicate with the MelodyMeet Audio Engine.

Every external interaction with the engine must occur through this protocol.

The protocol provides a stable, versioned interface between:

- React Frontend
- Node.js Backend
- JUCE Audio Engine

No module may bypass the command protocol.

---

# 2. Design Goals

The protocol must be:

- Explicit
- Versioned
- Thread-safe
- Platform independent
- Forward compatible
- Deterministic

Commands represent **intent**, not implementation.

Example:

GOOD

deck.play(deckA)

BAD

deck.internalTransport.play()

Only public commands are exposed.

---

# 3. Command Lifecycle

Every command follows the same lifecycle.

Frontend / Backend
        │
        ▼
Command Created
        │
        ▼
Validation
        │
        ▼
Queue
        │
        ▼
Command Manager
        │
        ▼
Target Module
        │
        ▼
Execution
        │
        ▼
Engine Event
        │
        ▼
Frontend Update

---

# 4. General Command Format

Every command contains:

Command ID

Unique identifier.

Example

CMD-000245

---

Timestamp

Creation time.

---

Source

Frontend

Backend

System

---

Target Module

Deck

Mic

Mixer

Recorder

Monitor

Device

Broadcast

---

Command Name

Example

deck.play

---

Payload

Command-specific parameters.

---

Version

Protocol version.

---

# 5. Deck Commands

Supported only for RJ Studio.

---

deck.load

Purpose

Load an audio track into a deck.

Parameters

- deckId
- filePath
- metadata

Result

Track loaded.

Generated Events

TRACK_LOADED

---

deck.play

Purpose

Start playback.

Parameters

- deckId

Generated Events

TRACK_STARTED

---

deck.pause

Generated Events

TRACK_PAUSED

---

deck.stop

Generated Events

TRACK_STOPPED

---

deck.seek

Parameters

- deckId
- positionSeconds

Generated Events

TRACK_POSITION_CHANGED

---

deck.setCue

Parameters

- deckId
- cuePosition

Generated Events

CUE_UPDATED

---

deck.jumpToCue

Generated Events

TRACK_POSITION_CHANGED

---

deck.enableLoop

Parameters

- deckId
- loopStart
- loopEnd

Generated Events

LOOP_ENABLED

---

deck.disableLoop

Generated Events

LOOP_DISABLED

---

deck.setPitch

Parameters

- deckId
- percentage

Generated Events

PITCH_CHANGED

---

deck.sync

Parameters

- sourceDeck
- targetDeck

Generated Events

SYNC_COMPLETED

---

# 6. Playlist Commands

playlist.load

playlist.clear

playlist.shuffle

playlist.next

playlist.previous

playlist.routeToDeck

---

# 7. Microphone Commands

mic.enable

mic.disable

mic.mute

mic.unmute

mic.setGain

mic.setVolume

mic.setEQ

mic.setInputDevice

mic.solo

mic.unsolo

mic.reset

Each command generates the corresponding microphone event.

---

# 8. Monitoring Commands

monitor.enable

monitor.disable

monitor.listenDeck

monitor.listenMic

monitor.listenProgram

monitor.stopListening

monitor.setVolume

---

# 9. Recording Commands

recording.start

recording.pause

recording.resume

recording.stop

recording.cancel

recording.export

---

# 10. Mixer Commands

mixer.setMasterVolume

mixer.setCrossfader

mixer.routeInput

mixer.routeOutput

mixer.reset

---

# 11. Dynamics Commands

compressor.enable

compressor.disable

compressor.setThreshold

compressor.setRatio

compressor.setAttack

compressor.setRelease

compressor.setMakeupGain

---

limiter.enable

limiter.disable

limiter.setThreshold

limiter.setRelease

---

# 12. Device Commands

device.refresh

device.selectInput

device.selectOutput

device.setSampleRate

device.setBufferSize

device.restart

---

# 13. Broadcast Commands

broadcast.start

broadcast.stop

broadcast.pause

broadcast.resume

broadcast.setMetadata

---

# 14. Session Commands

session.saveState

session.restoreState

session.reset

---

# 15. System Commands

engine.initialize

engine.shutdown

engine.reset

engine.getStatus

engine.getVersion

engine.ping

---

# 16. Validation Rules

Every command shall be validated before execution.

Validation includes:

- Module exists
- Parameters valid
- Current engine state
- Permissions
- Resource availability

Invalid commands shall never reach audio processing modules.

---

# 17. Command Execution Rules

Commands execute sequentially through the Command Manager.

The engine guarantees deterministic execution order.

Commands affecting real-time audio shall be forwarded safely to the audio thread without blocking it.

Long-running operations must execute on worker threads.

---

# 18. Error Handling

Command failures shall return structured errors.

Error fields:

- Error Code
- Error Message
- Module
- Failed Command
- Timestamp

Errors must never crash the engine.

---

# 19. Versioning

Protocol versioning shall follow semantic versioning.

Example:

1.0.0

Future versions must preserve backward compatibility whenever possible.

---

# 20. Summary

The Command Protocol is the only supported interface for controlling the MelodyMeet Audio Engine.

Frontend and backend applications communicate exclusively through commands.

Internal engine modules communicate through direct interfaces and events.

No external component may directly manipulate engine state.