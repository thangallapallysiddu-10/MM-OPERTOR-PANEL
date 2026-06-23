# MelodyMeet Thread Model 
# MelodyMeet Audio Engine Thread Model

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines the threading architecture of the MelodyMeet Audio Engine.

The engine is designed as a real-time, low-latency audio system.

Every module must respect thread ownership.

Violating these rules may introduce:

- Audio glitches
- Dropouts
- Increased latency
- Deadlocks
- Race conditions
- Engine instability

Thread ownership is mandatory.

---

# 2. Design Principles

The thread model follows these principles:

- Real-Time Safe
- Lock-Free Audio Processing
- Deterministic Execution
- Separation of Concerns
- No Shared Mutable State
- Command Queue Based Communication

---

# 3. Engine Threads

The engine consists of the following threads.

Main Thread

Audio Thread

Worker Thread(s)

Event Thread

Frontend/UI Thread

Backend Thread

Each thread has a dedicated responsibility.

---

# 4. Main Thread

Purpose

Owns engine lifecycle.

Responsibilities

- Engine initialization
- Module creation
- Module destruction
- Device initialization
- Engine configuration
- Session loading

Allowed Operations

✔ Memory allocation

✔ File loading

✔ Configuration

✔ Module registration

Forbidden

✘ Audio processing

✘ DSP

✘ Mixing

✘ Meter calculations

---

# 5. Audio Thread

Purpose

Perform all real-time audio processing.

Highest priority thread.

Responsibilities

- Audio callback
- Playback
- Mixing
- DSP
- Meter calculation
- Routing
- Monitoring
- Recording bus generation

Allowed Operations

✔ AudioBuffer processing

✔ DSP

✔ Bus routing

✔ Gain calculations

✔ Meter updates

✔ Sample processing

Forbidden

✘ malloc

✘ free

✘ new

✘ delete

✘ std::vector resize

✘ std::string allocation

✘ File IO

✘ Disk access

✘ Database

✘ Network

✘ Sleep

✘ Blocking mutexes

✘ Console logging

✘ JSON parsing

✘ Waiting

Audio Thread Rule

Never block.

Never allocate.

Never wait.

---

# 6. Worker Threads

Purpose

Background processing.

Responsibilities

- Waveform generation
- Audio decoding
- File loading
- Session saving
- Recording file writing
- Metadata parsing
- Audio import
- Export preparation

Allowed

✔ File IO

✔ Disk

✔ Compression

✔ Encoding

✔ Decoding

✔ Memory allocation

✔ STL containers

Forbidden

✘ Direct audio callback processing

---

# 7. Event Thread

Purpose

Distribute engine events.

Responsibilities

- Receive events
- Queue events
- Dispatch events
- Logging
- Diagnostics

Allowed

✔ Event queues

✔ Subscribers

✔ Logging

Forbidden

✘ Audio processing

---

# 8. Frontend Thread

Purpose

UI rendering.

Responsibilities

- React rendering
- Button clicks
- Knobs
- Sliders
- Waveform drawing
- Meter visualization

Frontend never processes audio.

Frontend only sends commands.

---

# 9. Backend Thread

Purpose

Application services.

Responsibilities

- APIs
- Authentication
- Database
- File uploads
- Chat
- Notifications
- Analytics
- Recording storage

Backend never performs DSP.

---

# 10. Thread Ownership

EngineHost

Main Thread

DeviceManager

Main Thread

CommandManager

Main Thread

DeckManager

Audio Thread

MicManager

Audio Thread

ProgramMixer

Audio Thread

MonitoringManager

Audio Thread

DynamicsManager

Audio Thread

MeterManager

Audio Thread

RecordingManager

Worker Thread

BroadcastOutputManager

Audio Thread

SessionManager

Worker Thread

EventManager

Event Thread

StateManager

Main Thread

---

# 11. Communication Rules

Threads never directly manipulate each other's state.

Communication occurs through:

Command Queue

↓

Module

↓

Event Queue

↓

Subscribers

No thread may directly call another thread.

---

# 12. Command Flow

Frontend

↓

Command Queue

↓

Main Thread

↓

Target Module

↓

Audio Thread

↓

Processing

↓

Event Queue

↓

Frontend

---

# 13. Data Ownership

Every module owns its own data.

Shared mutable state is prohibited.

Communication uses:

- Immutable snapshots
- Lock-free queues
- Atomic variables

---

# 14. Synchronization

Allowed

- Atomic variables
- Lock-free FIFOs
- Read-only snapshots

Avoid

- Recursive mutexes
- Long critical sections
- Blocking synchronization

The audio thread must never wait for another thread.

---

# 15. Audio Callback Rules

The audio callback must complete within the current buffer duration.

Example

48 kHz

512 samples

↓

Maximum processing time ≈ 10.7 ms

The callback should complete well below this limit.

---

# 16. Priority

Highest

Audio Thread

↓

Event Thread

↓

Worker Threads

↓

Frontend

↓

Backend

Audio always has priority.

---

# 17. Failure Recovery

If a worker thread fails:

Continue audio.

If a recording writer fails:

Continue broadcasting.

If waveform generation fails:

Playback continues.

If frontend freezes:

Audio continues.

The engine prioritizes uninterrupted audio.

---

# 18. Future Expansion

Additional worker threads may be introduced for:

- AI Processing
- Noise Suppression
- Cloud Rendering
- Background Export
- Audio Analysis

These must never interfere with the Audio Thread.

---

# 19. Summary

The MelodyMeet Audio Engine follows a strict real-time threading model.

The Audio Thread performs only deterministic, lock-free audio processing.

All expensive operations are delegated to Worker Threads.

Commands enter through the Main Thread.

Events exit through the Event Thread.

This separation guarantees reliable, low-latency performance suitable for professional broadcasting.