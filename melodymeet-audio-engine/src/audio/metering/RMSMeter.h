#pragma once

#include <atomic>
#include <memory>

namespace melodymeet {

/// Analyzes audio buffers to measure Root Mean Square (RMS) levels.
/// Thread-safe for reading by UI threads via atomic variables.
class RMSMeter final {
public:
    RMSMeter() = default;
    ~RMSMeter() = default;

    RMSMeter(const RMSMeter&) = delete;
    RMSMeter& operator=(const RMSMeter&) = delete;
    RMSMeter(RMSMeter&&) = delete;
    RMSMeter& operator=(RMSMeter&&) = delete;

    /// Allocates internal atomic buffers for the specified channel count.
    void prepare(int channelCount);

    /// Analyzes read-only audio data.
    void process(const float* const* inputChannels, int channelCount, int numSamples) noexcept;

    /// Resets all RMS levels to zero.
    void reset() noexcept;

    /// Returns the RMS level calculated over the most recent audio block.
    float getRMS(int channel) const noexcept;

private:
    std::unique_ptr<std::atomic<float>[]> rmsLevels_;
    int channelCount_{0};
};

} // namespace melodymeet
