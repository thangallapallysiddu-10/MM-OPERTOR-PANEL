#pragma once

#include "BroadcastConsumer.h"

#include <atomic>
#include <string>
#include <chrono>

namespace melodymeet {

/// BroadcastSession is a concrete BroadcastConsumer that tracks broadcast
/// state and statistics. It receives the final mixed PCM audio from the
/// BroadcastPipeline and counts bytes/samples for metrics.
///
/// In a future sprint, this class can be extended to encode and push
/// the audio data to an Icecast/RTMP server via libshout or similar.
/// For now, it acts as a metering/stats consumer that the bridge can poll.
class BroadcastSession final : public BroadcastConsumer {
public:
    struct Config {
        std::string server;
        std::string streamKey;
        int bitrate = 128;
        int sampleRate = 48000;
        int channels = 2;
    };

    struct Snapshot {
        bool broadcasting;
        std::string server;
        int bitrate;
        int sampleRate;
        bool reconnecting;
        int64_t bytesSent;
        double uptime;  // seconds
    };

    explicit BroadcastSession(const Config& config);
    ~BroadcastSession() override = default;

    // --- BroadcastConsumer interface ---
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(const float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // --- Session control ---
    void start();
    void stop();

    // --- Accessors (thread-safe via atomics) ---
    bool isBroadcasting() const noexcept { return broadcasting_.load(std::memory_order_relaxed); }
    Snapshot getSnapshot() const noexcept;
    const Config& getConfig() const noexcept { return config_; }
    uint64_t getVersion() const noexcept { return version_.load(std::memory_order_relaxed); }

private:
    Config config_;

    std::atomic<bool> broadcasting_{false};
    std::atomic<int64_t> bytesSent_{0};
    std::atomic<int64_t> samplesSent_{0};

    double engineSampleRate_{0.0};
    int engineChannels_{0};

    std::chrono::steady_clock::time_point startTime_;
    
    std::atomic<uint64_t> version_{0};
};

} // namespace melodymeet
