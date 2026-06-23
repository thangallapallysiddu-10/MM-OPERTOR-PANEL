# MelodyMeet Audio Routing 
# MelodyMeet Audio Routing

Version: 1.0

Status: Architecture Freeze

Owner: MelodyMeet Engineering

---

# 1. Purpose

This document defines the complete audio signal flow inside the MelodyMeet Audio Engine.

The routing architecture is shared by:

- RJ Studio
- Podcast Studio
- Future Broadcast Studios

All audio routing originates inside the JUCE Audio Engine.

Neither the frontend nor backend performs audio routing.

---

# 2. Design Principles

The routing system shall be:

- Modular
- Deterministic
- Low Latency
- Real-Time Safe
- Expandable
- Sample Accurate

Every audio signal travels through predefined buses.

No module may directly connect to another module.

All routing occurs through the Audio Bus System.

---

# 3. Engine Audio Buses

The engine defines the following buses.

INPUT BUS

Receives

- Microphones
- Audio Interfaces
- Virtual Inputs
- Remote Audio

---

MUSIC BUS

Receives

- Deck A
- Deck B
- Future Samplers

---

MIC BUS

Receives

- RJ Mic
- Host Mic
- Guest 1
- Guest 2
- Guest 3
- Call-In

---

AUX BUS

Receives

- Future Sound Effects
- Future Jingles
- Future Advertisements

---

PROGRAM BUS

Receives

- Music Bus
- Mic Bus
- Aux Bus

Produces

Final Broadcast Mix

---

MONITOR BUS

Private listening bus.

Never reaches listeners.

---

RECORD BUS

Captures

Program Bus

Used only by RecordingManager.

---

OUTPUT BUS

Receives

Program Bus

Routes to

- Speakers
- Encoder
- Broadcast Output

---

# 4. RJ Studio Routing

Deck A
      │
      ▼
Deck DSP
      │
      ▼
Music Bus

Deck B
      │
      ▼
Deck DSP
      │
      ▼
Music Bus

RJ Mic
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 1
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 2
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 3
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Call-In
      │
      ▼
Caller DSP
      │
      ▼
Mic Bus

Music Bus
        │
Mic Bus │
Aux Bus │
        ▼
Program Mixer
        │
        ▼
Master DSP
        │
        ├────────► Record Bus
        │
        ├────────► Monitor Bus
        │
        └────────► Output Bus

---

# 5. Podcast Studio Routing

Host Mic
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 1
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 2
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Guest Mic 3
      │
      ▼
Mic DSP
      │
      ▼
Mic Bus

Remote Guest
      │
      ▼
Network Input
      │
      ▼
Mic Bus

Imported Audio
      │
      ▼
Music Bus

Music Bus
        │
Mic Bus │
        ▼
Program Mixer
        │
        ▼
Master DSP
        │
        ├────────► Recording
        │
        ├────────► Monitoring
        │
        └────────► Output

---

# 6. Program Mixer

The Program Mixer combines:

- Music Bus
- Mic Bus
- Aux Bus

Responsibilities

- Gain staging
- Bus summing
- Channel routing
- Peak prevention

The Program Mixer produces the Program Bus.

---

# 7. Master Processing

The Program Bus passes through:

Master EQ
      │
      ▼
Compressor
      │
      ▼
Limiter
      │
      ▼
Master Gain
      │
      ▼
Output Bus

No audio bypasses the Master DSP chain.

---

# 8. Monitoring

Monitoring is isolated from Program Output.

Sources include:

- Deck A
- Deck B
- Program Mix
- Individual Mic
- Individual Guest
- Call-In
- Imported Audio

Monitoring shall never affect recording or broadcast.

---

# 9. Recording

Recording receives audio only from:

Record Bus

The Record Bus is fed from:

Program Bus

Recording is independent of:

- Monitor Volume
- Headphone Routing
- UI State

Recording captures the final production mix.

---

# 10. Broadcast Output

BroadcastOutputManager receives audio from:

Output Bus

The engine provides:

- Raw PCM
- Future encoded output

The backend is responsible only for transport and distribution.

The backend never modifies audio samples.

---

# 11. Metering

Meters tap audio after processing without modifying the signal.

Available meters:

- Input Meter
- Mic Meter
- Music Meter
- Program Meter
- Record Meter
- Output Meter

Meters are read-only.

---

# 12. Channel Processing Order

Each input channel follows:

Input Device
      │
      ▼
Input Gain
      │
      ▼
High EQ
      │
      ▼
Mid EQ
      │
      ▼
Low EQ
      │
      ▼
Mute
      │
      ▼
Channel Fader
      │
      ▼
Meter Tap
      │
      ▼
Bus Output

---

# 13. Deck Processing Order

Track Decoder
      │
      ▼
Transport
      │
      ▼
Cue
      │
      ▼
Loop
      │
      ▼
Pitch
      │
      ▼
Deck EQ
      │
      ▼
Deck Gain
      │
      ▼
Crossfader
      │
      ▼
Music Bus

---

# 14. Master Processing Order

Program Bus
      │
      ▼
Master EQ
      │
      ▼
Compressor
      │
      ▼
Limiter
      │
      ▼
Master Volume
      │
      ▼
Output Bus

---

# 15. Routing Rules

- Audio always flows forward.
- Circular routing is prohibited.
- Monitoring is isolated.
- Recording always captures the Program Bus.
- Every source routes through an Audio Bus.
- No module writes directly to hardware outputs.
- The Output Bus is the only hardware output source.
- Every route must be deterministic.

---

# 16. Future Expansion

The routing architecture supports future additions without redesign.

Examples:

- Additional deck channels
- Additional microphones
- Sound effect players
- Advertisement players
- AI audio processors
- Remote production
- Multi-room monitoring

New modules connect through buses rather than direct module-to-module wiring.

---

# 17. Summary

The MelodyMeet Audio Engine uses a centralized Audio Bus Architecture.

Every audio source enters through a defined input path, passes through dedicated processing modules, is mixed into the Program Bus, processed by the Master DSP chain, and distributed to Recording, Monitoring, and Broadcast Output.

This architecture ensures predictable routing, professional broadcast behavior, low-latency processing, and future scalability while keeping the engine modular and maintainable.