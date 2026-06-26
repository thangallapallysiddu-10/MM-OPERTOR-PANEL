# JUCE Engine Contract

## Purpose

This document defines the communication contract between:

* RJ V2 Frontend
* Node Backend
* JUCE Audio Engine

The JUCE Audio Engine is the single source of truth for all audio state.

Frontend and Backend must never assume audio state without confirmation from the engine.

---

# Deck IDs

Supported Decks:

```text
A
B
```

---

# Mic Channel IDs

Supported Channels:

```text
RJ
GUEST_1
GUEST_2
GUEST_3
CALL_IN
```

Total Channels:

```text
5
```

---

# Monitor Source IDs

Supported Monitor Sources:

```text
RJ
GUEST_1
GUEST_2
GUEST_3
CALL_IN

DECK_A
DECK_B

PROGRAM
```

---

# Recording States

```text
IDLE
RECORDING
PAUSED
STOPPED
```

---

# Command Protocol

All commands sent to JUCE must follow:

```json
{
  "command": "COMMAND_NAME",
  "payload": {}
}
```

---

# Deck Commands

## Load Track

```json
{
  "command": "DECK_LOAD",
  "payload": {
    "deckId": "A",
    "trackUrl": ""
  }
}
```

## Play

```json
{
  "command": "DECK_PLAY",
  "payload": {
    "deckId": "A"
  }
}
```

## Pause

```json
{
  "command": "DECK_PAUSE",
  "payload": {
    "deckId": "A"
  }
}
```

## Stop

```json
{
  "command": "DECK_STOP",
  "payload": {
    "deckId": "A"
  }
}
```

## Seek

```json
{
  "command": "DECK_SEEK",
  "payload": {
    "deckId": "A",
    "position": 120
  }
}
```

---

# Cue Commands

```json
{
  "command": "DECK_SET_CUE",
  "payload": {
    "deckId": "A",
    "position": 120
  }
}
```

```json
{
  "command": "DECK_GOTO_CUE",
  "payload": {
    "deckId": "A"
  }
}
```

---

# Loop Commands

```json
{
  "command": "DECK_LOOP_ENABLE",
  "payload": {
    "deckId": "A"
  }
}
```

```json
{
  "command": "DECK_LOOP_DISABLE",
  "payload": {
    "deckId": "A"
  }
}
```

---

# Pitch Commands

```json
{
  "command": "DECK_SET_PITCH",
  "payload": {
    "deckId": "A",
    "value": 1.05
  }
}
```

---

# Crossfader Commands

```json
{
  "command": "CROSSFADER_SET",
  "payload": {
    "value": 0.50
  }
}
```

Range:

```text
0.0 = Deck A
0.5 = Center
1.0 = Deck B
```

---

# Mic Commands

## Set Gain

```json
{
  "command": "MIC_SET_GAIN",
  "payload": {
    "channelId": "RJ",
    "value": 0.80
  }
}
```

## Mute

```json
{
  "command": "MIC_MUTE",
  "payload": {
    "channelId": "RJ"
  }
}
```

## Unmute

```json
{
  "command": "MIC_UNMUTE",
  "payload": {
    "channelId": "RJ"
  }
}
```

## Set Volume

```json
{
  "command": "MIC_SET_VOLUME",
  "payload": {
    "channelId": "RJ",
    "value": 0.80
  }
}
```

---

# Monitoring Commands

```json
{
  "command": "MONITOR_SOURCE",
  "payload": {
    "sourceId": "DECK_A"
  }
}
```

```json
{
  "command": "MONITOR_STOP"
}
```

---

# Recording Commands

## Start

```json
{
  "command": "RECORDING_START"
}
```

## Pause

```json
{
  "command": "RECORDING_PAUSE"
}
```

## Resume

```json
{
  "command": "RECORDING_RESUME"
}
```

## Stop

```json
{
  "command": "RECORDING_STOP"
}
```

---

# Event Protocol

All events sent from JUCE:

```json
{
  "event": "EVENT_NAME",
  "payload": {}
}
```

---

# Deck Events

```text
TRACK_LOADED
TRACK_STARTED
TRACK_PAUSED
TRACK_STOPPED
TRACK_ENDED
```

---

# Deck Position Events

```text
DECK_POSITION_CHANGED
```

Payload:

```json
{
  "deckId": "A",
  "position": 125,
  "duration": 240
}
```

---

# Mic Events

```text
CHANNEL_MUTED
CHANNEL_UNMUTED
CHANNEL_VOLUME_CHANGED
```

---

# Crossfader Events

```text
CROSSFADER_CHANGED
```

---

# Meter Events

```text
VU_METER_UPDATE
```

Payload:

```json
{
  "channelId": "RJ",
  "peak": -12.5,
  "rms": -18.2
}
```

---

# Recording Events

```text
RECORDING_STARTED
RECORDING_PAUSED
RECORDING_STOPPED
```

---

# Engine Events

```text
ENGINE_READY
ENGINE_ERROR
```

---

# Source Of Truth Rules

The JUCE Engine is the source of truth for:

* Deck Playback State
* Deck Position
* Mic State
* Meter Values
* Monitoring State
* Recording State
* Program Output State

Frontend must update UI only from engine events.

Backend must persist state only after engine confirmation.

---

# Phase 1 Scope

Required For Initial Release:

* Deck A
* Deck B
* Load
* Play
* Pause
* Stop
* Seek
* Cue
* Crossfader
* 5 Mic Channels
* Gain
* Mute
* Volume
* Monitoring
* Metering
* Program Output

Future phases may extend this contract.
