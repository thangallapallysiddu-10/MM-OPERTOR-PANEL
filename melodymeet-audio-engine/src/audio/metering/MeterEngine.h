#pragma once

#include "PeakMeter.h"
#include "RMSMeter.h"

namespace melodymeet {

/// Master metering engine.
/// Consumes read-only audio buffers and dispatches to specific measurement modules.
class MeterEngine final {
public:
    MeterEngine() = default;
    ~MeterEngine() = default;

    MeterEngine(const MeterEngine&) = delete;
    MeterEngine& operator=(const MeterEngine&) = delete;
    MeterEngine(MeterEngine&&) = delete;
    MeterEngine& operator=(MeterEngine&&) = delete;

    /// Prepares all sub-meters with the correct channel count.
    void prepare(double sampleRate, int maxBlockSize, int channelCount);

    /// Processes a block of audio without modifying it.
    void process(const float* const* inputChannels, int channelCount, int numSamples) noexcept;

    /// Resets all meter values and clears clip flags.
    void reset() noexcept;

    const PeakMeter& getPeakMeter() const noexcept;
    PeakMeter& getPeakMeter() noexcept;

    const RMSMeter& getRMSMeter() const noexcept;
    RMSMeter& getRMSMeter() noexcept;

private:
    PeakMeter peakMeter_;
    RMSMeter rmsMeter_;
    bool prepared_{false};
};

} // namespace melodymeet
