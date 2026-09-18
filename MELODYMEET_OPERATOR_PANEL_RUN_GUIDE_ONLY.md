# MelodyMeet Operator Panel
## Run Guide — Frontend + Electron + Native Audio Engine

> **Scope:** This guide covers only the MelodyMeet Operator Panel, Electron integration, Native N-API addon, and MelodyMeet C++/JUCE Audio Engine.
>

---

# 1. Architecture

```text
Operator Panel Frontend
          │
          ▼
       Electron
          │
          ▼
   Native N-API Addon
          │
          ▼
      AudioBridge
          │
          ▼
 MelodyMeet C++ Audio Engine
          │
          ▼
    Audio Hardware
```

---

# 2. Main Components

```text
Operator Panel
│
├── Frontend
│
├── Electron
│   ├── main.js
│   ├── preload.js
│   └── AudioService
│
├── Native Addon
│   └── melodymeet_addon.node
│
└── melodymeet-audio-engine
    ├── AudioEngine
    ├── SessionManager
    ├── RJSession
    ├── PodcastSession
    ├── PlaybackManager
    ├── DeckPlayer
    ├── Mixer
    ├── DSP
    ├── Recorder
    ├── MeterEngine
    └── DeviceManager
```

---

# 3. Prerequisites

Make sure the following are installed:

- Git
- Node.js
- npm
- CMake
- C++ build tools
- JUCE dependencies required by the audio engine

Use the versions and configuration already defined by the project.

---

# 4. Get the Projects

Make sure both projects are available locally:

```text
melodymeet-audio-engine
MM-OPERTOR-PANEL
```

The Operator Panel contains the Electron/frontend application.

The Audio Engine contains the native C++/JUCE engine.

---

# 5. Install Operator Panel Dependencies

Open the Operator Panel:

```bash
cd <path-to-operator-panel>
```

Install dependencies:

```bash
npm install
```

Check available scripts:

```bash
npm run
```

---

# 6. Build the Native Audio Engine

Open the Audio Engine project:

```bash
cd <path-to-melodymeet-audio-engine>
```

Build using the project's existing CMake configuration.

Example:

```bash
cmake --build build --config Release
```

If the repository already has a configured build command or preset, use that instead.

---

# 7. Build the Native Electron Addon

Go back to the Operator Panel:

```bash
cd <path-to-operator-panel>
```

Run:

```bash
npm run build:native
```

This builds the Node/N-API native addon.

The important output is:

```text
melodymeet_addon.node
```

Before starting Electron, confirm that the addon was successfully generated.

---

# 8. Run the Frontend

From the Operator Panel directory:

```bash
npm run web
```

This starts the frontend/web development environment.

Confirm that the Operator Panel UI loads correctly.

---

# 9. Run Electron

From the Operator Panel directory:

```bash
npm run dev:desktop
```

If the project uses another Electron script, check:

```bash
npm run
```

and use the configured desktop command.

---

# 10. Correct Startup Order

Use this order:

```text
1. Open MelodyMeet Audio Engine
             ↓
2. Build C++/JUCE Audio Engine
             ↓
3. Open Operator Panel
             ↓
4. npm install
             ↓
5. Build Native Addon
             ↓
6. npm run build:native
             ↓
7. Start Frontend
             ↓
8. Start Electron
             ↓
9. Test Audio Engine
```

---

# 11. Verify Native Addon

When Electron starts, verify that:

```text
melodymeet_addon.node
```

is loaded successfully.

The Electron application should be able to initialize the native Audio Engine.

If the addon cannot be found:

1. Stop Electron.
2. Run the native addon build again.
3. Check the generated `.node` file.
4. Start Electron again.

---

# 12. Verify Audio Engine

Check:

```text
[ ] Native addon loaded
[ ] AudioEngine initialized
[ ] Audio device initialized
[ ] Output device detected
```

---

# 13. Verify RJ Studio

Open RJ Studio.

Test:

### Deck A

```text
Load Track
   ↓
Play
   ↓
Pause
   ↓
Stop
```

### Deck B

```text
Load Track
   ↓
Play
   ↓
Pause
   ↓
Stop
```

### Microphone

```text
Enable Mic
   ↓
Check Meter
   ↓
Adjust Gain
   ↓
Mute / Unmute
```

### Mixer

Verify:

```text
Deck A
Deck B
Mic Channels
Master Output
```

### Recording

```text
Start Recording
      ↓
Play/Speak
      ↓
Stop Recording
      ↓
Verify Recording
```

---

# 14. Verify Podcast Studio

Open Podcast Studio.

Podcast does not use Deck A/B.

Test:

```text
Initialize Podcast Session
        ↓
Enable Microphone
        ↓
Check Meter
        ↓
Start Recording
        ↓
Record Audio
        ↓
Stop Recording
```

---

# 15. Verify DSP

The native engine contains DSP components such as:

- Gain
- Noise Gate
- HPF
- LPF
- EQ
- Delay
- Compressor
- Limiter

When testing a DSP control, check the complete path:

```text
UI
 ↓
Electron / IPC
 ↓
AudioBridge
 ↓
Native Session
 ↓
DSP Chain
 ↓
Audio Output
```

---

# 16. RJ Compressor and Limiter

The native DSP implementations exist.

For RJ, the remaining integration should be verified through:

```text
RJ UI
 ↓
Electron / IPC
 ↓
AudioBridge
 ↓
RJSession
 ↓
Mic DSP Chain
 ↓
Compressor / Limiter
```

Do not create a second compressor or limiter implementation if the existing native processors can be reused.

---

# 17. Microphone Troubleshooting

If a microphone has no audio:

```text
1. Microphone enabled?
        ↓
2. Correct input device?
        ↓
3. MicrophoneSource receiving audio?
        ↓
4. FIFO receiving audio?
        ↓
5. Meter moving?
        ↓
6. DSP muting/bypassing audio?
        ↓
7. Mixer channel enabled?
        ↓
8. Master output enabled?
```

---

# 18. Deck Troubleshooting

If a deck has no sound:

```text
1. AudioEngine initialized?
        ↓
2. Deck initialized?
        ↓
3. Track loaded?
        ↓
4. Audio decoder successful?
        ↓
5. Deck playing?
        ↓
6. Mixer channel enabled?
        ↓
7. Master output enabled?
        ↓
8. Output device available?
```

---

# 19. Native Addon Troubleshooting

If Electron reports that the native addon cannot be found:

```text
Check:
melodymeet_addon.node
```

Then:

```bash
npm run build:native
```

Restart Electron after rebuilding.

---

# 20. Important Audio Rules

The real-time audio callback must remain real-time safe.

Do not add:

```text
Database calls
Network requests
Filesystem operations
Blocking operations
Heavy allocations
```

to the audio callback.

Frontend should control the engine; it should not perform the actual DSP/audio processing.

---

# 21. Quick Start

```bash
# 1. Build Audio Engine
cd <path-to-melodymeet-audio-engine>
cmake --build build --config Release

# 2. Open Operator Panel
cd <path-to-operator-panel>

# 3. Install dependencies
npm install

# 4. Build native addon
npm run build:native

# 5. Start frontend
npm run web

# 6. Start Electron
npm run dev:desktop
```

---

# 22. Final Verification Checklist

```text
[ ] Audio Engine builds
[ ] Native addon builds
[ ] melodymeet_addon.node exists
[ ] Frontend starts
[ ] Electron starts
[ ] Native addon loads
[ ] AudioEngine initializes
[ ] Audio device detected
[ ] RJ Deck A tested
[ ] RJ Deck B tested
[ ] RJ microphones tested
[ ] RJ mixer tested
[ ] RJ recording tested
[ ] Podcast microphone tested
[ ] Podcast recording tested
[ ] DSP path tested
```

---

# 23. Final System Flow

```text
                 Operator Panel
                       │
                       ▼
                    Electron
                       │
                       ▼
              Native N-API Addon
                       │
                       ▼
                   AudioBridge
                       │
                       ▼
              C++ JUCE Audio Engine
                  /                            /                       RJ Studio       Podcast Studio
                 \             /
                  \           /
                   ▼         ▼
                    Audio
                   Hardware
```

## Key Point

For any audio-related change, trace the feature from:

```text
UI → Electron → Native Addon → AudioBridge → C++ Audio Engine
```

This is the complete MelodyMeet Operator Panel run flow.
