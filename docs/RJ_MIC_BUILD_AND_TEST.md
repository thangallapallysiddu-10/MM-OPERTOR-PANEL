# RJ Microphone Fix - Build and Test Guide

## Quick Start

### 1. Build the Fixed Engine

```bash
cd c:\PROJECTS\MM-OPERTOR-PANEL\Melodymeet-frontend\OPERATOR_PANEL
npm run build:native
```

### 2. Launch Application

```bash
npm run electron:dev
```

### 3. Check Console Logs

Look for initialization:
```
[RJ INIT] Registered Deck A (id=1) Deck B (id=2)
[RJ INIT] Registered Mic 0 (sourceId=3)
[RJ INIT] Registered Mic 1 (sourceId=4)
[RJ INIT] Registered Mic 2 (sourceId=5)
[RJ INIT] Registered Mic 3 (sourceId=6)
[RJ INIT] Registered Mic 4 (sourceId=7)
```

✅ If you see this, mixer registration succeeded.

---

## Verification Tests

### Test 1: Basic Microphone Enable (2 minutes)

**Setup:**
- Connect 1 USB microphone
- Set as Windows default input

**Steps:**
1. Enable Mic 1 in UI
2. Speak into microphone
3. Check console for logs:

```
[MIC INPUT] channels=1 samples=512 peak=0.42
[MIC PUSH] micId=0 enabled=true inputCh=0 peak=0.42
[MIC PROCESS] preDspPeak=0.42 postDspPeak=0.42 gain=1.0
```

**Expected Results:**
- ✅ Console shows non-zero peak values
- ✅ Mic 1 meter moves in UI
- ✅ Audio is heard in output

**If Failed:**
- Check Windows Sound Settings (microphone enabled?)
- Check Windows Privacy Settings (app has mic permission?)
- Verify microphone is not muted in Windows

---

### Test 2: Gain Control (1 minute)

**Steps:**
1. Set Mic 1 gain to 100%
2. Speak into microphone
3. Note audio level
4. Set Mic 1 gain to 50%
5. Speak at same volume
6. Check console:

```
[MIC PROCESS] gain=0.5000 preDspPeak=0.42 postDspPeak=0.21
```

**Expected Results:**
- ✅ `postDspPeak` ≈ `preDspPeak * 0.5`
- ✅ Audio level reduces by half
- ✅ Meter shows reduced level

**If Failed:**
- Check if gain command reaches engine
- Verify `GainProcessor` is in DSP chain

---

### Test 3: Mute Control (1 minute)

**Steps:**
1. Enable Mic 1 mute
2. Speak into microphone
3. Check console:

```
[MIC PROCESS] muted=1 preDspPeak=0.0 postDspPeak=0.0
```

4. Disable mute
5. Speak into microphone
6. Check console:

```
[MIC PROCESS] muted=0 preDspPeak=0.42 postDspPeak=0.42
```

**Expected Results:**
- ✅ Mute ON → peak values = 0, no audio
- ✅ Mute OFF → peak values > 0, audio returns
- ✅ Meter reflects mute state

**If Failed:**
- Check if mute command reaches engine
- Verify `MicrophoneSource::setMuted()` is called

---

### Test 4: Multiple Microphones (5 minutes) ⚠️ Requires multi-channel interface

**Setup:**
- Audio interface with 2+ inputs (e.g., Focusrite Scarlett 2i2)
- Connect microphones to Input 1 and Input 2
- Set interface as Windows default input

**Steps:**
1. Enable Mic 1 in UI
2. Speak into Input 1 microphone
3. Check console:

```
[MIC INPUT] channels=2 samples=512 peak=0.42
[MIC PUSH] micId=0 enabled=true inputCh=0 peak=0.42
[MIC PUSH] micId=1 enabled=true inputCh=1 peak=0.0
```

4. Enable Mic 2 in UI
5. Speak into Input 2 microphone
6. Check console:

```
[MIC PUSH] micId=0 enabled=true inputCh=0 peak=0.0
[MIC PUSH] micId=1 enabled=true inputCh=1 peak=0.38
```

7. Speak into BOTH microphones simultaneously
8. Check console:

```
[MIC PUSH] micId=0 enabled=true inputCh=0 peak=0.42
[MIC PUSH] micId=1 enabled=true inputCh=1 peak=0.38
```

**Expected Results:**
- ✅ Mic 1 shows peak only when speaking into Input 1
- ✅ Mic 2 shows peak only when speaking into Input 2
- ✅ No cross-talk (speaking into Input 1 doesn't affect Mic 2)
- ✅ Both mics can be active simultaneously
- ✅ Each mic's audio is independent

**If Failed:**
- Verify interface provides multi-channel input to Windows
- Check Windows Sound Settings → Input Device Properties → Channels
- Confirm `[MIC INPUT] channels=2` (not `channels=1`)

---

### Test 5: Solo Control (2 minutes) ⚠️ Needs UI wiring

**Steps:**
1. Load track into Deck A, press play
2. Enable Mic 1
3. Verify both Deck A and Mic 1 are heard
4. Enable Solo on Mic 1
5. Check console:

```
[MIXER OUTPUT PEAK] 0.42 soloActive=1
```

**Expected Results:**
- ✅ Only Mic 1 is heard
- ✅ Deck A is muted (not stopped, just inaudible)
- ✅ Disable solo → Deck A returns

**If Failed:**
- Check if solo command reaches engine
- Verify `Mixer::setSolo()` is wired to UI

---

### Test 6: EQ Control (3 minutes) ⚠️ Needs UI wiring

**Steps:**
1. Enable Mic 1
2. Set all EQ bands to 0dB (flat)
3. Speak into microphone, note tone
4. Set HIGH EQ to +6dB
5. Speak into microphone
6. Expected: Brighter, more treble
7. Set HIGH EQ back to 0dB
8. Set LOW EQ to +6dB
9. Speak into microphone
10. Expected: Deeper, more bass

**Expected Results:**
- ✅ HIGH boost → brighter tone
- ✅ MID boost → vocal presence
- ✅ LOW boost → deeper bass
- ✅ Changes are audible in real-time

**If Failed:**
- Check if EQ commands reach engine
- Verify `EQProcessor` is processing (not bypassed)
- Check `EQProcessor::setBandGainDb()` is called

---

## Diagnostic Log Reference

### Initialization (on startup)
```
[RJ INIT] Registered Deck A (id=1) Deck B (id=2)
[RJ INIT] Registered Mic 0 (sourceId=3)
[RJ INIT] Registered Mic 1 (sourceId=4)
[RJ INIT] Registered Mic 2 (sourceId=5)
[RJ INIT] Registered Mic 3 (sourceId=6)
[RJ INIT] Registered Mic 4 (sourceId=7)
```

### Active Signal Path (every ~2 seconds when mic active)
```
[MIC INPUT] channels=1 samples=512 peak=0.42
[MIC ROUTING] totalMics=5 enabledMics=1 inputChannels=1
[MIC PUSH] micId=0 enabled=true inputCh=0 peak=0.42
[MIC FIFO] available=512 toWrite=512 freeSpace=2048
[MIC PROCESS] ready=512 toRead=512 muted=0 preDspPeak=0.42 postDspPeak=0.45 gain=1.0
[MIXER OUTPUT PEAK] 0.450000 soloActive=0 deckAId=1 deckBId=2
[RJ SESSION] afterMixerPeak=0.450000
[RJ SESSION] hardwareBufferPeak=0.450000
```

### Silence (when no mic active)
```
[MIC INPUT] channels=1 samples=512 peak=0.0
[MIC ROUTING] totalMics=5 enabledMics=0 inputChannels=1
```

---

## Troubleshooting

### Problem: No logs appear

**Cause:** Engine not built or not loaded

**Solution:**
```bash
cd c:\PROJECTS\MM-OPERTOR-PANEL\Melodymeet-frontend\OPERATOR_PANEL
npm run build:native -- --clean
npm run electron:dev
```

---

### Problem: `[MIC INPUT] peak=0.0` always

**Possible Causes:**
1. Microphone muted in Windows
2. Wrong input device selected
3. Microphone not plugged in
4. Windows Privacy: microphone access denied

**Solution:**
1. Open Windows Sound Settings
2. Input tab → Select correct device
3. Test microphone → speak, verify meter moves
4. Windows Privacy → Microphone → Allow apps
5. Restart application

---

### Problem: `[MIC PROCESS]` shows `preDspPeak=0.42` but `postDspPeak=0.0`

**Cause:** DSP chain blocking audio

**Possible Issues:**
1. Gain set to 0
2. EQ extreme cut
3. Compressor over-compressing
4. Limiter threshold too low

**Solution:**
1. Reset all DSP to defaults:
   - Gain = 100%
   - EQ = 0dB all bands
   - Compressor = bypassed or ratio=1
   - Limiter = bypassed or threshold=0dB

---

### Problem: `[MIC PUSH] micId=1` shows `inputCh=0` instead of `inputCh=1`

**Cause:** Windows only providing 1 input channel

**Solution:**
- Verify audio interface is in multi-channel mode
- Check Windows Sound Settings → Input Device Properties
- Interface must report 2+ channels to Windows
- Some interfaces need driver settings changed

---

### Problem: Meter moves but no audio heard

**Possible Causes:**
1. Master volume = 0
2. Output device muted
3. Wrong output device selected
4. Headphones not plugged in

**Solution:**
1. Check master volume slider
2. Check Windows Sound Settings → Output tab
3. Verify correct output device selected
4. Check physical connections

---

### Problem: Audio delays or stutters

**Cause:** Buffer size too small or system overload

**Solution:**
1. Increase buffer size in audio settings
2. Close other applications
3. Check CPU usage
4. Reduce sample rate (96kHz → 48kHz)

---

## Performance Benchmarks

### Expected CPU Usage
- Idle (no mics): <1%
- 1 mic active: <2%
- 5 mics active: <5%
- 5 mics + 2 decks + effects: <15%

### Expected Latency
- Buffer 128 samples @ 48kHz: ~2.7ms
- Buffer 256 samples @ 48kHz: ~5.3ms
- Buffer 512 samples @ 48kHz: ~10.7ms

### Expected Memory
- Engine base: ~50MB
- Per microphone: ~5MB
- Total (5 mics): ~75MB

---

## Success Checklist

After applying fix and testing:

- [ ] Engine builds without errors
- [ ] Application launches successfully
- [ ] Console shows `[RJ INIT]` logs
- [ ] Mic 1 enable → meter moves
- [ ] Mic 1 enable → audio heard
- [ ] Gain control affects volume
- [ ] Mute control silences audio
- [ ] Multi-channel routing works (if interface available)
- [ ] No cross-talk between mics
- [ ] EQ controls affect tone (if wired)
- [ ] Solo control works (if wired)
- [ ] All 5 mics can operate independently

---

## Recommended Audio Interfaces

For full 5-mic RJ setup:

### Budget ($100-$200)
- Behringer U-PHORIA UMC404HD (4 inputs)
- PreSonus AudioBox 44VSL (4 inputs)

### Mid-Range ($200-$400)
- Focusrite Scarlett 18i8 (8 inputs)
- MOTU M4 (4 inputs)

### Professional ($400+)
- Universal Audio Apollo Twin X (2 inputs + expandable)
- RME Babyface Pro FS (4 inputs)
- PreSonus Studio 1824c (8 inputs)

**Requirements:**
- At least 5 simultaneous input channels
- ASIO or WDM driver for Windows
- Low-latency performance (<10ms round-trip)

---

## Next Steps After Verification

1. **UI Integration**
   - Wire EQ controls → engine commands
   - Wire solo control → engine commands
   - Wire compressor controls → engine commands
   - Wire limiter controls → engine commands

2. **Polish**
   - Remove per-mic "Go Live" buttons
   - Add input channel selector
   - Add compressor gain reduction meter
   - Add visual feedback for solo state

3. **Documentation**
   - User guide for audio interface setup
   - Troubleshooting guide
   - Video tutorial for RJ broadcasters

4. **Testing**
   - Real-world broadcast test
   - Multi-hour stability test
   - CPU/memory profiling
   - Latency measurement

---

## Contact & Support

If issues persist:

1. Collect full console log from startup to issue
2. Note exact steps to reproduce
3. Include audio interface model and driver version
4. Include Windows version
5. Attach screenshot of Windows Sound Settings
6. Report through standard support channels

**The core microphone system is now functional. Remaining work is UI wiring and polish.**
