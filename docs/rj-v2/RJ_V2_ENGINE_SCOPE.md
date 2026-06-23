# RJ V2 Audio Engine Scope

## Purpose

This document defines the responsibilities and capabilities of Audio Engine V2.

The Audio Engine is responsible for all real-time audio processing required by RJ Studio V2.

This document defines WHAT the engine must do.

It does not define HOW the engine will be implemented.

---

# Engine Responsibilities

The Audio Engine is responsible for:

* Microphone Processing
* Deck Playback
* Audio Mixing
* Monitoring
* Recording
* Audio Routing
* Signal Processing
* Event Generation

The Audio Engine is NOT responsible for:

* Chat
* Notifications
* Gifts
* Stickers
* Analytics
* Authentication
* User Management
* Playlist Storage
* Admin Features

---

# 1. Mic Engine

Purpose:

Manage all microphone channels used during live broadcasting.

Supported Channels:

* RJ Mic
* Guest Mic 1
* Guest Mic 2
* Guest Mic 3
* Call-In Mic

Total Channels:

5

Capabilities:

* Input Selection
* Gain Control
* High EQ
* Mid EQ
* Low EQ
* Mute
* Solo
* Volume Fader
* Real-Time Metering

---

# 2. Deck Engine

Purpose:

Manage music playback.

Supported Decks:

* Deck A
* Deck B

Capabilities:

* Load Track
* Play
* Pause
* Stop
* Seek
* Cue
* Loop
* Pitch
* Sync
* Waveform Generation
* Track Position Tracking
* Track Duration Tracking

Supported Formats:

* MP3
* WAV
* AAC

---

# 3. Playlist Routing

Purpose:

Allow playlist tracks to be routed into decks.

Rules:

Playlist audio must never play directly.

All playlist playback must pass through:

* Deck A
* Deck B

---

# 4. Crossfader Engine

Purpose:

Blend playback between Deck A and Deck B.

Capabilities:

* Smooth Crossfade
* Equal Power Crossfade
* Real-Time Updates

---

# 5. Master Engine

Purpose:

Create final program mix.

Inputs:

* Mic Channels
* Guest Channels
* Call-In Channel
* Deck A
* Deck B

Output:

* Program Mix

Capabilities:

* Audio Mixing
* Master Volume
* Metering

---

# 6. Compressor

Purpose:

Control dynamic range of program output.

Capabilities:

* Threshold
* Ratio
* Attack
* Release
* Makeup Gain

---

# 7. Limiter

Purpose:

Prevent clipping and overload.

Capabilities:

* Threshold
* Release
* Enable / Disable

---

# 8. Monitoring Engine

Purpose:

Provide private listening for RJ.

Monitoring Sources:

* RJ Mic
* Guest Mic 1
* Guest Mic 2
* Guest Mic 3
* Call-In Mic
* Deck A
* Deck B
* Program Output

Rule:

Monitoring audio must never be broadcast to listeners.

---

# 9. Recording Engine

Purpose:

Record live sessions.

Capabilities:

* Start Recording
* Pause Recording
* Resume Recording
* Stop Recording

Recording Source:

Program Mix

Output Format:

* WAV

Future Support:

* MP3 Export

---

# 10. Audio Routing

Required Routing Paths:

Mic Channels
↓
Master Engine

Guest Channels
↓
Master Engine

Call-In Channel
↓
Master Engine

Deck A
↓
Master Engine

Deck B
↓
Master Engine

Master Engine
↓
Program Output

Master Engine
↓
Recording Engine

Master Engine
↓
Monitoring Engine

---

# 11. Engine Events

The engine must emit events for frontend synchronization.

Required Events:

* CHANNEL_MUTED

* CHANNEL_UNMUTED

* CHANNEL_SOLO

* CHANNEL_VOLUME_CHANGED

* TRACK_LOADED

* TRACK_STARTED

* TRACK_PAUSED

* TRACK_STOPPED

* TRACK_ENDED

* DECK_POSITION_CHANGED

* CROSSFADER_CHANGED

* RECORDING_STARTED

* RECORDING_PAUSED

* RECORDING_STOPPED

* VU_METER_UPDATE

* MASTER_VOLUME_CHANGED

---

# Success Criteria

Audio Engine V2 is considered complete when:

* All RJ Studio V2 controls are functional
* Real-time audio processing is stable
* Monitoring works correctly
* Recording works correctly
* Deck playback works correctly
* Mic processing works correctly
* Crossfader works correctly
* Compressor works correctly
* Limiter works correctly
* Frontend synchronization works correctly

without relying on mocked or simulated behavior.
