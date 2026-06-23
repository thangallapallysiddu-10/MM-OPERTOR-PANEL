# JUCE Engine Architecture

## Purpose

This document defines the internal architecture of the MelodyMeet Audio Engine V2.

The engine is responsible for all real-time audio processing for:

* RJ Studio V2
* Future Podcast Studio
* Future Live Station

The engine is the single source of truth for audio state.

---

# High Level Architecture

Frontend
↓
Engine Bridge
↓
JUCE Audio Engine
↓
Audio Device / Broadcast Output

---

# Engine Modules

The engine consists of the following modules:

EngineHost

AudioBusManager

DeckModule

MicModule

CallInModule

MusicMixer

ProgramMixer

MonitoringModule

RecordingModule

BroadcastOutputModule

WaveformModule

MeteringModule

EventBus

StateSnapshotModule

---

# EngineHost

Purpose:

Owns and manages the entire engine lifecycle.

Responsibilities:

* Engine startup
* Engine shutdown
* Audio device initialization
* Sample rate management
* Buffer size management
* Module initialization
* Error recovery

Dependencies:

* All engine modules

---

# AudioBusManager

Purpose:

Central audio routing layer.

Supported Buses:

Mic Bus

Guest Bus

Caller Bus

Music Bus

Master Bus

Monitor Bus

Responsibilities:

* Audio routing
* Bus gain control
* Bus isolation
* Signal distribution

---

# DeckModule

Purpose:

Manage Deck A and Deck B playback.

Supported Decks:

Deck A

Deck B

Responsibilities:

* Load Track
* Play
* Pause
* Stop
* Seek
* Cue
* Loop
* Pitch
* Sync
* Track Position
* Track Duration

Supported Formats:

* MP3
* WAV
* AAC

Output:

Music Bus

---

# WaveformModule

Purpose:

Generate waveform data.

Responsibilities:

* Audio decoding analysis
* Peak extraction
* RMS extraction
* Waveform generation

Output:

Frontend waveform data

---

# MicModule

Purpose:

Manage microphone channels.

Channels:

RJ

Guest 1

Guest 2

Guest 3

Call-In

Responsibilities:

* Input selection
* Gain
* High EQ
* Mid EQ
* Low EQ
* Mute
* Volume
* Metering

Output:

Mic Bus

---

# CallInModule

Purpose:

Receive remote guest audio.

Responsibilities:

* Remote audio ingestion
* Buffering
* Jitter handling
* Audio normalization

Output:

Caller Bus

---

# MusicMixer

Purpose:

Mix Deck A and Deck B.

Responsibilities:

* Deck routing
* Crossfader processing
* Music bus metering

Inputs:

Deck A

Deck B

Output:

Music Bus

---

# ProgramMixer

Purpose:

Create final broadcast mix.

Inputs:

Mic Bus

Guest Bus

Caller Bus

Music Bus

Responsibilities:

* Final mixing
* Master gain
* Master metering

Output:

Master Bus

---

# MonitoringModule

Purpose:

Provide private RJ monitoring.

Supported Sources:

RJ

Guest 1

Guest 2

Guest 3

Call-In

Deck A

Deck B

Program

Responsibilities:

* PFL
* Solo
* Headphone routing
* Monitor gain

Output:

Monitor Bus

Rule:

Monitor Bus must never enter Master Bus.

---

# DynamicsModule

Purpose:

Protect and control output dynamics.

Components:

Compressor

Limiter

Responsibilities:

* Threshold control
* Ratio control
* Attack control
* Release control
* Output protection

Input:

Master Bus

Output:

Protected Master Bus

---

# MeteringModule

Purpose:

Generate audio level information.

Responsibilities:

* Channel meters
* Deck meters
* Master meters
* Peak values
* RMS values

Output:

VU_METER_UPDATE events

---

# RecordingModule

Purpose:

Record live sessions.

Source:

Master Bus

Responsibilities:

* Start recording
* Pause recording
* Resume recording
* Stop recording
* WAV export

Future:

* MP3 export

---

# BroadcastOutputModule

Purpose:

Provide final program audio.

Source:

Master Bus

Responsibilities:

* Program output generation
* Stream handoff
* Output metering

Supported Outputs:

PCM Stream

Future:

WebRTC

RTMP

HLS

---

# EventBus

Purpose:

Provide engine event communication.

Responsibilities:

* Publish events
* Subscribe events
* Event dispatch

Supported Events:

TRACK_LOADED

TRACK_STARTED

TRACK_PAUSED

TRACK_STOPPED

TRACK_ENDED

CHANNEL_MUTED

CHANNEL_UNMUTED

CHANNEL_VOLUME_CHANGED

CROSSFADER_CHANGED

VU_METER_UPDATE

RECORDING_STARTED

RECORDING_PAUSED

RECORDING_STOPPED

ENGINE_READY

ENGINE_ERROR

---

# StateSnapshotModule

Purpose:

Provide engine state snapshots.

Responsibilities:

* Export state
* Import state
* Session restoration

Managed State:

Deck State

Mic State

Crossfader State

Recording State

Monitoring State

---

# Audio Routing Diagram

Deck A
↓
MusicMixer

Deck B
↓
MusicMixer

MusicMixer
↓
Music Bus

RJ Mic
↓
Mic Bus

Guest Mics
↓
Mic Bus

Call-In
↓
Caller Bus

Mic Bus
Music Bus
Caller Bus
↓
ProgramMixer
↓
Master Bus
↓
DynamicsModule
↓
Protected Master Bus

Protected Master Bus
├── BroadcastOutputModule
├── RecordingModule
└── MeteringModule

Monitor Sources
↓
MonitoringModule
↓
Monitor Bus

---

# Design Principles

The engine must:

* Be real-time safe
* Avoid audio thread allocations
* Avoid audio thread locks
* Support future scaling
* Remain platform independent
* Keep audio processing isolated from UI logic

Frontend controls audio.

Backend stores metadata.

JUCE processes audio.

---

# Phase 1 Modules

Required for RJ Studio V2:

EngineHost

AudioBusManager

DeckModule

MicModule

MusicMixer

ProgramMixer

MonitoringModule

MeteringModule

EventBus

BroadcastOutputModule

---

# Phase 2 Modules

WaveformModule

DynamicsModule

RecordingModule

---

# Phase 3 Modules

Advanced Sync

Advanced DSP

Podcast Reuse

Live Station Reuse

---

# Final Architecture Rule

Anything that touches live audio samples belongs inside JUCE.

Anything that stores data belongs in Node.js.

Anything that displays controls belongs in the Frontend.
