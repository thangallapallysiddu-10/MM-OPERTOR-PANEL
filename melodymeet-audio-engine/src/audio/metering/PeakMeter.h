#pragma once

#include <atomic>
#include <memory>

namespace melodymeet {

/// Analyzes audio buffers to measure absolute peak levels and detect clipping.
/// Thread-safe for reading by UI threads via atomic variables.
class PeakMeter final {
public:
    PeakMeter() = default;
    ~PeakMeter() = default;

    PeakMeter(const PeakMeter&) = delete;
    PeakMeter& operator=(const PeakMeter&) = delete;
    PeakMeter(PeakMeter&&) = delete;
    PeakMeter& operator=(PeakMeter&&) = delete;

    /// Allocates internal atomic buffers for the specified channel count.
    void prepare(int channelCount);

    /// Analyzes read-only audio data.
    void process(const float* const* inputChannels, int channelCount, int numSamples) noexcept;

    /// Resets all peak levels and clears all clip flags.
    void reset() noexcept;

    /// Returns the highest instantaneous peak observed in the most recent audio block.
    float getPeak(int channel) const noexcept;

    /// Returns true if the channel has exceeded 1.0f since the last clip clear.
    bool hasClipped(int channel) const noexcept;

    /// Acknowledges and resets the clip flag for a specific channel.
    void clearClip(int channel) noexcept;

private:
    std::unique_ptr<std::atomic<float>[]> peaks_;
    std::unique_ptr<std::atomic<bool>[]> clips_;
    int channelCount_{0};
};

} // namespace melodymeet
