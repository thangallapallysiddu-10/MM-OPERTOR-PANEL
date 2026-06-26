#pragma once

#include <memory>
#include <string>
#include <mutex>
#include <stdexcept>
#include <vector>

// Forward declare to avoid pulling engine headers into addon.cpp
namespace melodymeet
{
    class AudioEngine;
    class Version;
    class DeckPlayer;
}

/// AudioBridge is the ONLY C++ layer allowed to talk to the MelodyMeet Audio Engine.
/// It owns exactly one AudioEngine instance, managed via RAII.
/// All public methods are thread-safe and translate C++ exceptions into std::runtime_error.
class AudioBridge
{
public:
    AudioBridge();
    ~AudioBridge();

    AudioBridge(const AudioBridge&) = delete;
    AudioBridge& operator=(const AudioBridge&) = delete;

    /// Initializes the audio engine. Throws if already initialized or on failure.
    void initialize();

    /// Shuts down the audio engine. Throws if not initialized.
    void shutdown();

    /// Returns the engine version string (e.g. "1.0.0"). Safe to call anytime.
    std::string version() const;

    /// Returns true if the engine is currently initialized.
    bool isInitialized() const;

    struct VersionsSnapshot {
        uint64_t mixer;
        uint64_t microphone;
        uint64_t recording;
        uint64_t broadcast;
        uint64_t dsp;
    };
    
    /// Returns the versions of all subsystems.
    VersionsSnapshot getVersions() const;

    struct EngineInfo {
        std::string version;
        bool initialized;
        double sampleRate;
        int bufferSize;
    };

    struct EngineHealthSnapshot {
        double cpuLoad;
        uint64_t xruns;
        double sampleRate;
        int bufferSize;
        double callbackTime;
    };

    /// Returns diagnostic information about the engine.
    EngineInfo getEngineInfo() const;
    
    /// Returns the health statistics of the engine (CPU, xruns, etc).
    EngineHealthSnapshot getEngineHealthSnapshot() const;

    struct DeckSnapshot {
        int state;
        double position;
        double duration;
        bool isLoaded;
        bool loadFailed;
    };

    struct PlaybackSnapshot {
        DeckSnapshot deckA;
        DeckSnapshot deckB;
    };

    PlaybackSnapshot getSnapshot() const;

    // --- Generic Deck API ---
    bool loadDeck(const std::string& deckId, const std::string& path);
    bool play(const std::string& deckId);
    bool pause(const std::string& deckId);
    void stop(const std::string& deckId);
    bool seek(const std::string& deckId, double seconds);
    void setCue(const std::string& deckId, double seconds);
    bool jumpToCue(const std::string& deckId);
    void setLoop(const std::string& deckId, bool loop);
    void setLoopRange(const std::string& deckId, double startSeconds, double endSeconds);
    void setPitch(const std::string& deckId, float percent);

    // --- Mixer API ---
    struct MixerSnapshot {
        uint64_t version;
        float deckAGain;
        float deckBGain;
        float masterGain;
        float crossfade;
        bool deckAMuted;
        bool deckBMuted;
        bool deckASolo;
        bool deckBSolo;
        bool soloActive;
    };

    void setCrossfade(float value);
    void setDeckGain(const std::string& deckId, float gain);
    void setMasterGain(float gain);
    void muteDeck(const std::string& deckId, bool muted);
    void soloDeck(const std::string& deckId, bool soloed);
    void resetMixer();
    MixerSnapshot getMixerSnapshot() const;

    // --- Microphone API ---
    struct MicrophoneSnapshot {
        uint64_t version;
        bool enabled;
        bool muted;
        float gain;
        std::string activeDevice;
        double sampleRate;
        int channels;
    };

    std::vector<std::string> getAvailableInputDevices() const;
    bool enableMicrophone(const std::string& deviceName);
    void disableMicrophone();
    void setMicrophoneGain(float gain);
    void muteMicrophone(bool muted);
    MicrophoneSnapshot getMicrophoneSnapshot() const;

    // --- Recording API ---
    struct RecordingSnapshot {
        uint64_t version;
        bool recording;
        bool paused;
        double duration;
        std::string outputFile;
        double sampleRate;
        int channels;
        int64_t fileSize;
        float peakLevel;
    };

    bool startRecording(const std::string& outputPath);
    void pauseRecording();
    void resumeRecording();
    void stopRecording();
    RecordingSnapshot getRecordingSnapshot() const;

    // --- Broadcast API ---
    struct BroadcastConfig {
        std::string server;
        std::string streamKey;
        int bitrate;
    };
    struct BroadcastSnapshot {
        uint64_t version;
        bool broadcasting;
        std::string server;
        int bitrate;
        int sampleRate;
        bool reconnecting;
        int64_t bytesSent;
        double uptime;
    };
    bool startBroadcast(const BroadcastConfig& config);
    void stopBroadcast();
    BroadcastSnapshot getBroadcastSnapshot() const;

    // --- DSP API ---
    struct EQSettings {
        float low;
        float mid;
        float high;
        bool hasHighPassFilter = false;
        float highPassFilter = 0.0f;
    };

    struct CompressorSettings {
        bool enabled;
        float threshold;
        float ratio;
        float attack;
        float release;
        float makeup;
    };

    struct LimiterSettings {
        bool enabled;
        float threshold;
        float release;
    };

    struct ChannelDSPSnapshot {
        EQSettings eq;
        bool bypass;
    };

    struct MasterDSPSnapshot {
        CompressorSettings compressor;
        LimiterSettings limiter;
    };

    struct DSPSnapshot {
        uint64_t version;
        std::vector<std::pair<std::string, ChannelDSPSnapshot>> channels;
        MasterDSPSnapshot master;
    };

    void setEQ(const std::string& channelId, const EQSettings& settings);
    EQSettings getEQ(const std::string& channelId) const;

    void setCompressor(const CompressorSettings& settings);
    CompressorSettings getCompressor() const;

    void setLimiter(const LimiterSettings& settings);
    LimiterSettings getLimiter() const;

    void resetDSP();
    DSPSnapshot getDSPSnapshot() const;

    // --- Metering API ---
    struct MeterSnapshot {
        float masterPeakL;
        float masterPeakR;
        float masterRmsL;
        float masterRmsR;
        
        float deckAPeakL;
        float deckAPeakR;
        
        float deckBPeakL;
        float deckBPeakR;
        
        float micPeakL;
        float micPeakR;
    };
    
    MeterSnapshot getMeterSnapshot() const;

private:
    melodymeet::DeckPlayer* getDeck(const std::string& deckId) const;

    mutable std::mutex mutex_;
    std::unique_ptr<melodymeet::AudioEngine> engine_;
    bool initialized_ = false;
};
