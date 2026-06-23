# RJ V2 Control Matrix

## Purpose

This document defines the expected behavior of every control available in RJ Studio V2.

This document acts as the bridge between:

Frontend UI
↓
Audio Engine
↓
Backend Integration

---

# 1. Mic Controls

| Control | Expected Behavior |
|----------|------------------|
| Input Selector | Assign audio source to channel |
| Gain | Adjust microphone input sensitivity |
| High EQ | Adjust high frequencies |
| Mid EQ | Adjust mid frequencies |
| Low EQ | Adjust low frequencies |
| Solo | Route selected channel only to monitoring output |
| Mute | Remove channel from live output |
| Volume Fader | Adjust channel output volume |
| VU Meter | Display real-time audio level |

---

# 2. Deck Controls

| Control | Expected Behavior |
|----------|------------------|
| Load Track | Load audio file into selected deck |
| Play | Start playback |
| Pause | Pause playback and retain position |
| Stop | Stop playback and reset position |
| Seek | Move playback position |
| Cue | Save and recall playback position |
| Pitch | Adjust playback speed |
| Sync | Match deck tempo with opposite deck |
| Loop | Repeat selected section continuously |
| Clear | Clear cue, loop and temporary deck state |
| Waveform | Display visual waveform |
| Track Position | Display current playback position |
| Track Timer | Display elapsed and remaining time |

---

# 3. Crossfader

| Control | Expected Behavior |
|----------|------------------|
| Crossfader | Blend audio between Deck A and Deck B |

---

# 4. Playlist Controls

| Control | Expected Behavior |
|----------|------------------|
| Upload Track | Add track to playlist |
| Remove Track | Delete track from playlist |
| Load To Deck A | Load selected track into Deck A |
| Load To Deck B | Load selected track into Deck B |
| Play Next | Queue track as next item |
| Hold Track | Temporarily hold track |
| Reject Track | Remove track from queue |

### Playlist Rule

Playlist must never output audio directly.

All playlist audio must route through:

- Deck A
- Deck B

---

# 5. Compressor Controls

| Control | Expected Behavior |
|----------|------------------|
| Threshold | Set compression start level |
| Ratio | Set compression intensity |
| Attack | Set compression response speed |
| Release | Set compression recovery speed |
| Makeup Gain | Compensate output gain |

---

# 6. Limiter Controls

| Control | Expected Behavior |
|----------|------------------|
| Threshold | Set maximum output level |
| Release | Set limiter recovery speed |
| Enable / Disable | Turn limiter on or off |

---

# 7. Monitoring Controls

| Control | Expected Behavior |
|----------|------------------|
| Monitor RJ Mic | Private headphone monitoring |
| Monitor Guest Mic 1 | Private headphone monitoring |
| Monitor Guest Mic 2 | Private headphone monitoring |
| Monitor Guest Mic 3 | Private headphone monitoring |
| Monitor Call-In Mic | Private headphone monitoring |
| Monitor Deck A | Preview Deck A privately |
| Monitor Deck B | Preview Deck B privately |
| Monitor Program Output | Hear final broadcast mix |

### Monitoring Rule

Monitoring audio must never be heard by listeners.

Monitoring audio is available only to the RJ.

---

# 8. Recording Controls

| Control | Expected Behavior |
|----------|------------------|
| Start Recording | Begin recording final program mix |
| Pause Recording | Pause recording |
| Resume Recording | Continue recording |
| Stop Recording | End recording session |

### Recording Source

Final Program Mix

### Output Format

- WAV

### Future Support

- MP3 Export

---

# 9. Live Broadcast Controls

| Control | Expected Behavior |
|----------|------------------|
| Go Live | Start broadcast output |
| Stop Live | End broadcast output |

---

# 10. Channel Definitions

| Channel | Purpose |
|----------|----------|
| RJ Mic | Primary host microphone |
| Guest Mic 1 | Guest participant |
| Guest Mic 2 | Guest participant |
| Guest Mic 3 | Guest participant |
| Call-In Mic | Phone/WebRTC caller |

Total Channels: 5

---

# 11. Deck Definitions

| Deck | Purpose |
|--------|---------|
| Deck A | Primary playback deck |
| Deck B | Secondary playback deck |

Total Decks: 2

---

# Out Of Scope

The following features are not part of the audio engine:

- Live Chat
- Requests
- Notifications
- Gifts
- Stickers
- Analytics
- User Profiles
- Authentication
- Admin Features

These are handled by frontend and backend services.