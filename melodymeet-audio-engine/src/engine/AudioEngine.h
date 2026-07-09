#pragma once

#include "../audio/AudioCallback.h"
#include "../core/AudioClock.h"
#include "../core/BufferPool.h"
#include "../device/DeviceManager.h"
#include "../core/statistics/EngineStatistics.h"
#include "../audio/input/InputManager.h"
#include "SessionManager.h"

#include <memory>
#include <map>
#include <string>

namespace melodymeet
{

class AudioEngine
{
public:
    AudioEngine();
    ~AudioEngine() = default;

    AudioEngine(const AudioEngine&) = delete;
    AudioEngine& operator=(const AudioEngine&) = delete;

    bool initialize();
    void shutdown();

    bool isInitialized() const;
    AudioClock& getAudioClock();
    const AudioClock& getAudioClock() const;

    EngineStatistics& getStatistics();
    const EngineStatistics& getStatistics() const;

    InputManager& getInputManager();
    const InputManager& getInputManager() const;

    SessionManager& getSessionManager();
    const SessionManager& getSessionManager() const;

    void setActiveSession(SessionManager::SessionType type);
    void setOutputSession(SessionManager::SessionType type);

    // --- Deck Transport Control ---
    bool seek(const std::string& deckId, double seconds);
    void setCue(const std::string& deckId, double seconds);
    bool jumpToCue(const std::string& deckId);
    void setLoop(const std::string& deckId, bool loop);
    void setLoopRange(const std::string& deckId, double startSeconds, double endSeconds);
    void setPitch(const std::string& deckId, float percent);

    // --- Mixer Control Forwarding (delegates to active session's Mixer) ---
    void setCrossfade(float value);
    void setDeckGain(const std::string& deckId, float gain);
    void setMasterGain(float gain);
    void setDeckMute(const std::string& deckId, bool muted);
    void setDeckSolo(const std::string& deckId, bool soloed);
    void resetMixer();

    // --- Microphone API ---
    std::vector<std::string> getAvailableInputDevices() const;
    bool enableMicrophone(const std::string& deviceName);
    void disableMicrophone();
    void setMicrophoneGain(float gain);
    void muteMicrophone(bool muted);
    bool enableMicrophone(int micIndex, const std::string& deviceName);
    void disableMicrophone(int micIndex);
    void setMicrophoneGain(int micIndex, float gain);
    void muteMicrophone(int micIndex, bool muted);

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
        int bitrate = 128;
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

    /// Updates dynamic statistics (called periodically by the host/UI or internally).
    void updateDynamicStatistics() noexcept;

    // --- DSP Control API ---
    struct EQSettings {
        float low = 50.0f;
        float mid = 50.0f;
        float high = 50.0f;
        bool hasHighPassFilter = false;
        float highPassFilter = 0.0f;
    };

    struct CompressorSettings {
        bool enabled = true;
        float threshold = -18.0f;
        float ratio = 3.0f;
        float attack = 10.0f;
        float release = 120.0f;
        float makeup = 2.0f;
    };

    struct LimiterSettings {
        bool enabled = true;
        float threshold = -1.0f;
        float release = 80.0f;
    };

    struct ChannelDSPSnapshot {
        EQSettings eq;
        bool bypass = false;
    };

    struct MasterDSPSnapshot {
        CompressorSettings compressor;
        LimiterSettings limiter;
    };

    struct DSPSnapshot {
        uint64_t version;
        std::map<std::string, ChannelDSPSnapshot> channels;
        MasterDSPSnapshot master;
    };

    void setEQ(const std::string& channelId, const EQSettings& settings);
    EQSettings getEQ(const std::string& channelId) const;

    void setCompressor(const CompressorSettings& settings);
    CompressorSettings getCompressor() const;
    void setMicrophoneCompressor(int micIndex, const CompressorSettings& settings);

    void setLimiter(const LimiterSettings& settings);
    LimiterSettings getLimiter() const;
    void setMicrophoneLimiter(int micIndex, const LimiterSettings& settings);

    int getHardwareInputChannels() const noexcept {
        return lastInputChannelsReceived_.load(std::memory_order_relaxed);
    }

    void resetDSP();
    DSPSnapshot getDSPSnapshot() const;

private:
    DeviceManager deviceManager_;
    AudioClock audioClock_;
    BufferPool bufferPool_;
    SessionManager sessionManager_;
    InputManager inputManager_;
    EngineStatistics engineStatistics_;
    AudioCallback audioCallback_;
    
    std::atomic<uint64_t> dspVersion_{0};
    std::atomic<int> lastInputChannelsReceived_{0};
    bool initialized_ = false;
};

} // namespace melodymeet
