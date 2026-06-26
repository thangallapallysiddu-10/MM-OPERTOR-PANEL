// PlaybackExample - MelodyMeet Audio Engine verification application
//
// Usage:
//   1. Place audio files (song.mp3, song.wav, etc.) in the working directory.
//   2. Run PlaybackExample.exe
//   3. Watch console output for pass/fail on each test.
//
// Tests:
//   Test 1 - Basic playback loop (load → play → stop, repeated)
//   Test 2 - Transport spam (500x play/pause without crash)
//   Test 3 - Seek stress (rapid seeking while playing)
//   Test 4 - Invalid file rejection (no segfault)
//   Test 5 - Interactive playback (manual verification)

#include <engine/AudioEngine.h>

#include <chrono>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>

using namespace std::chrono_literals;

static bool fileExists(const std::string& path)
{
    std::ifstream f(path);
    return f.good();
}

static void printResult(const std::string& testName, bool passed)
{
    std::cout << "  [" << (passed ? "PASS" : "FAIL") << "] " << testName << "\n";
}

// ─────────────────────────────────────────────────────────────
// Test 1: Basic Playback Loop
// ─────────────────────────────────────────────────────────────
static void runTest1(melodymeet::AudioEngine& engine, const std::string& file)
{
    std::cout << "\n=== Test 1: Basic Playback Loop ===\n";

    auto& deck = engine.getDeckA();

    for (int i = 0; i < 3; ++i)
    {
        std::cout << "  Iteration " << (i + 1) << "/3\n";

        if (!deck.load(file))
        {
            printResult("Load", false);
            return;
        }

        deck.play();
        std::this_thread::sleep_for(2s);
        deck.stop();
    }

    printResult("Basic Playback Loop (3 iterations)", true);
}

// ─────────────────────────────────────────────────────────────
// Test 2: Transport Spam
// ─────────────────────────────────────────────────────────────
static void runTest2(melodymeet::AudioEngine& engine, const std::string& file)
{
    std::cout << "\n=== Test 2: Transport Spam ===\n";

    auto& deck = engine.getDeckA();

    if (!deck.load(file))
    {
        printResult("Load", false);
        return;
    }

    for (int i = 0; i < 500; ++i)
    {
        deck.play();
        deck.pause();
    }

    deck.stop();
    printResult("500x play/pause without crash", true);
}

// ─────────────────────────────────────────────────────────────
// Test 3: Seek Stress
// ─────────────────────────────────────────────────────────────
static void runTest3(melodymeet::AudioEngine& engine, const std::string& file)
{
    std::cout << "\n=== Test 3: Seek Stress ===\n";

    auto& deck = engine.getDeckA();

    if (!deck.load(file))
    {
        printResult("Load", false);
        return;
    }

    deck.play();
    deck.seek(10.0);
    deck.seek(40.0);
    deck.seek(20.0);
    deck.seek(60.0);
    deck.pause();
    deck.play();
    std::this_thread::sleep_for(2s);
    deck.stop();

    printResult("Rapid seek without crash", true);
}

// ─────────────────────────────────────────────────────────────
// Test 4: Invalid File
// ─────────────────────────────────────────────────────────────
static void runTest4(melodymeet::AudioEngine& engine)
{
    std::cout << "\n=== Test 4: Invalid File ===\n";

    auto& deck = engine.getDeckA();

    bool rejected = !deck.load("nonexistent_file_abc.mp3");
    printResult("Invalid file properly rejected", rejected);

    // Also verify the deck is not in a broken state after rejection
    bool notPlaying = !deck.isPlaying();
    printResult("Deck stable after rejection", notPlaying);
}

// ─────────────────────────────────────────────────────────────
// Test 5: Interactive Playback
// ─────────────────────────────────────────────────────────────
static void runTest5(melodymeet::AudioEngine& engine, const std::string& file)
{
    std::cout << "\n=== Test 5: Interactive Playback ===\n";
    std::cout << "  Loading: " << file << "\n";

    auto& deck = engine.getDeckA();

    if (!deck.load(file))
    {
        std::cout << "  Could not load file. Skipping interactive test.\n";
        return;
    }

    std::cout << "  Duration: " << deck.getDuration() << " seconds\n";
    std::cout << "  Commands: [p]lay  [a]use  [s]top  [q]uit\n";
    std::cout << "            [1-9] seek to 10%-90% of track\n\n";

    bool running = true;
    while (running)
    {
        std::cout << "  > ";
        std::string input;
        std::getline(std::cin, input);

        if (input.empty())
            continue;

        switch (input[0])
        {
            case 'p': deck.play();  std::cout << "  Playing.\n"; break;
            case 'a': deck.pause(); std::cout << "  Paused.\n";  break;
            case 's': deck.stop();  std::cout << "  Stopped.\n"; break;
            case 'q': running = false; break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
            {
                double pct = (input[0] - '0') * 0.1;
                double pos = deck.getDuration() * pct;
                deck.seek(pos);
                std::cout << "  Seeked to " << pos << "s (" << (int)(pct * 100) << "%)\n";
                break;
            }
            default:
                std::cout << "  Unknown command.\n";
                break;
        }
    }

    deck.stop();
}

// ─────────────────────────────────────────────────────────────
// Test 6: Microphone Input Pipeline
// ─────────────────────────────────────────────────────────────
static void runTest6(melodymeet::AudioEngine& engine)
{
    std::cout << "\n=== Test 6: Microphone Input Pipeline ===\n";

    auto& inputMgr = engine.getInputManager();
    auto& mic = engine.getMicrophone();

    // Enumerate available input devices
    auto devices = inputMgr.getAvailableInputDevices();
    std::cout << "  Input devices found: " << devices.size() << "\n";
    for (const auto& d : devices)
        std::cout << "    - " << d << "\n";

    if (devices.empty())
    {
        std::cout << "  No input devices available. Skipping microphone test.\n";
        printResult("Microphone pipeline (no device)", true);
        return;
    }

    // Enable the MicrophoneSource so it starts accepting audio
    mic.setEnabled(true);
    printResult("MicrophoneSource enabled", mic.isEnabled());

    // Start capture (routes input device -> MicrophoneSource FIFO -> Mixer)
    auto micPtr = std::shared_ptr<melodymeet::MicrophoneSource>(&mic, [](auto*){});
    bool captureStarted = inputMgr.startCapture(micPtr);
    printResult("Capture started", captureStarted);

    if (captureStarted)
    {
        // Let the capture run for 1 second to verify stability
        std::cout << "  Capturing for 1 second...\n";
        std::this_thread::sleep_for(1s);

        printResult("Capture running without crash", true);

        // Test gain and mute controls
        mic.setGain(0.5f);
        printResult("Gain set to 0.5", mic.getGain() == 0.5f);

        mic.setMuted(true);
        printResult("Mute enabled", mic.isMuted());

        mic.setMuted(false);
        mic.setGain(1.0f);

        // Stop capture
        inputMgr.stopCapture();
        printResult("Capture stopped", !inputMgr.isCapturing());
    }

    mic.setEnabled(false);
    printResult("MicrophoneSource disabled", !mic.isEnabled());
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
int main(int argc, char* argv[])
{
    std::cout << "╔══════════════════════════════════════════════╗\n";
    std::cout << "║  MelodyMeet Audio Engine - Playback Example  ║\n";
    std::cout << "╚══════════════════════════════════════════════╝\n\n";

    // Determine audio file to use
    std::string audioFile = "song.mp3";
    if (argc > 1)
        audioFile = argv[1];

    std::cout << "Audio file: " << audioFile << "\n";

    if (!fileExists(audioFile))
        std::cout << "WARNING: '" << audioFile << "' not found. Tests requiring audio will be skipped.\n";

    // Initialize engine
    std::cout << "\nInitializing engine...\n";
    melodymeet::AudioEngine engine;

    if (!engine.initialize())
    {
        std::cerr << "FATAL: Failed to initialize audio engine.\n";
        return -1;
    }

    std::cout << "Engine initialized successfully.\n";

    // Run automated tests
    runTest4(engine);

    if (fileExists(audioFile))
    {
        runTest1(engine, audioFile);
        runTest2(engine, audioFile);
        runTest3(engine, audioFile);
        runTest5(engine, audioFile);
    }
    else
    {
        std::cout << "\nSkipping Tests 1-3, 5 (no audio file).\n";
        std::cout << "Re-run with: PlaybackExample.exe <path-to-audio-file>\n";
    }

    // Microphone test (always runs)
    runTest6(engine);

    // Shutdown
    std::cout << "\nShutting down engine...\n";
    engine.shutdown();
    std::cout << "Engine shut down gracefully.\n";

    return 0;
}
