#include "BroadcastSession.h"

namespace melodymeet {

BroadcastSession::BroadcastSession(const Config& config)
    : config_(config)
{
}

void BroadcastSession::prepare(double sampleRate, int /*maxBlockSize*/, int channelCount)
{
    engineSampleRate_ = sampleRate;
    engineChannels_ = channelCount;
}

void BroadcastSession::process(const float* const* /*channels*/, int channelCount, int numSamples) noexcept
{
    if (!broadcasting_.load(std::memory_order_relaxed))
        return;

    // Calculate the number of bytes this block represents at the configured bitrate.
    // For PCM metering: numSamples * channelCount * sizeof(float)
    // For encoded bitrate estimation: (bitrate / 8) * (numSamples / sampleRate)
    const int64_t pcmBytes = static_cast<int64_t>(numSamples) * channelCount * sizeof(float);
    bytesSent_.fetch_add(pcmBytes, std::memory_order_relaxed);
    samplesSent_.fetch_add(static_cast<int64_t>(numSamples), std::memory_order_relaxed);
}

void BroadcastSession::reset() noexcept
{
    bytesSent_.store(0, std::memory_order_relaxed);
    samplesSent_.store(0, std::memory_order_relaxed);
}

void BroadcastSession::release() noexcept
{
    broadcasting_.store(false, std::memory_order_relaxed);
    reset();
    version_.fetch_add(1, std::memory_order_relaxed);
}

void BroadcastSession::start()
{
    bytesSent_.store(0, std::memory_order_relaxed);
    samplesSent_.store(0, std::memory_order_relaxed);
    startTime_ = std::chrono::steady_clock::now();
    broadcasting_.store(true, std::memory_order_release);
    version_.fetch_add(1, std::memory_order_relaxed);
}

void BroadcastSession::stop()
{
    broadcasting_.store(false, std::memory_order_release);
    version_.fetch_add(1, std::memory_order_relaxed);
}

BroadcastSession::Snapshot BroadcastSession::getSnapshot() const noexcept
{
    Snapshot snap;
    snap.broadcasting = broadcasting_.load(std::memory_order_relaxed);
    snap.server = config_.server;
    snap.bitrate = config_.bitrate;
    snap.sampleRate = static_cast<int>(engineSampleRate_ > 0.0 ? engineSampleRate_ : config_.sampleRate);
    snap.reconnecting = false; // Future: implement reconnection logic
    snap.bytesSent = bytesSent_.load(std::memory_order_relaxed);

    if (snap.broadcasting) {
        auto now = std::chrono::steady_clock::now();
        snap.uptime = std::chrono::duration<double>(now - startTime_).count();
    } else {
        snap.uptime = 0.0;
    }

    return snap;
}

} // namespace melodymeet
