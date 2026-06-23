# RJ V2 Audio Requirements

## Project

MelodyMeet Operator Panel

Module: RJ Studio V2

Status: Requirement Freeze

---

# Scope

RJ Studio V2 is a professional radio broadcasting console.

Primary Use Cases:

* Live Radio Shows
* Music Playback
* Guest Interviews
* Call-In Shows
* Recording
* Monitoring

RJ Studio V2 is NOT intended to be a full DJ application.

---

# 1. Mic Channels

## Total Channels

1. RJ Mic
2. Guest Mic 1
3. Guest Mic 2
4. Guest Mic 3
5. Call-In Mic

Total: 5 Channels

---

## Controls Available Per Channel

### Input Selector

Assign audio input source.

### Gain

Adjust microphone input level.

### High EQ

Adjust high frequencies.

### Mid EQ

Adjust mid frequencies.

### Low EQ

Adjust low frequencies.

### Solo

Monitor selected channel privately.

### Mute

Remove channel from live output.

### Volume Fader

Adjust channel output level.

### VU Meter

Display channel audio level.

---

# 2. Deck System

## Decks

* Deck A
* Deck B

---

## Supported Formats

* MP3
* WAV
* AAC

---

## Controls

### Load Track

Load audio file into deck.

### Play

Start playback.

### Pause

Pause playback.

### Stop

Stop playback.

### Seek

Move playback position.

### Cue

Save and recall playback position.

### Pitch

Adjust playback speed.

### Sync

Match deck tempo with opposite deck.

### Loop

Repeat selected section.

### Clear

Clear deck temporary state.

### Waveform

Display visual waveform.

### Track Position

Display current playback position.

### Track Timer

Display elapsed and remaining time.

---

# 3. Crossfader

Blend audio between Deck A and Deck B.

Positions:

* Full Left
* Center
* Full Right

---

# 4. Playlist

Capabilities:

* Upload Track
* Remove Track
* Load To Deck A
* Load To Deck B
* Play Next
* Hold Track
* Reject Track

Important:

Playlist never outputs audio directly.

Audio must play through Deck A or Deck B.

---

# 5. Master Section

## Master Volume

Control final output volume.

---

## Master Meter

Display output level.

---

# 6. Compressor

Controls:

* Threshold
* Ratio
* Attack
* Release
* Makeup Gain

---

# 7. Limiter

Controls:

* Threshold
* Release
* Enable / Disable

---

# 8. Monitoring

RJ must be able to monitor:

* RJ Mic
* Guest Mics
* Call-In Mic
* Deck A
* Deck B
* Program Output

Monitoring audio must not be heard by listeners.

---

# 9. Recording

Capabilities:

* Start Recording
* Pause Recording
* Resume Recording
* Stop Recording

Recording Source:

Final Program Mix

Output Format:

* WAV

Future Support:

* MP3 Export

---

# 10. Live Broadcast

States:

* Offline
* Live

Actions:

* Go Live
* Stop Live

---

# Out Of Scope

The audio engine is NOT responsible for:

* Chat
* Requests
* Notifications
* Gifts
* Stickers
* Analytics
* Profiles
* Authentication
* Admin Features

These belong to backend and frontend systems.
