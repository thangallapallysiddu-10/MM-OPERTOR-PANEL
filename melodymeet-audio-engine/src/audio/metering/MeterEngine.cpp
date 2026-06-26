#include "MeterEngine.h"

namespace melodymeet {

void MeterEngine::prepare(double /*sampleRate*/, int /*maxBlockSize*/, int channelCount) {
    peakMeter_.prepare(channelCount);
    rmsMeter_.prepare(channelCount);
    prepared_ = (channelCount > 0);
}

void MeterEngine::process(const float* const* inputChannels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || inputChannels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    peakMeter_.process(inputChannels, channelCount, numSamples);
    rmsMeter_.process(inputChannels, channelCount, numSamples);
}

void MeterEngine::reset() noexcept {
    peakMeter_.reset();
    rmsMeter_.reset();
}

const PeakMeter& MeterEngine::getPeakMeter() const noexcept {
    return peakMeter_;
}

PeakMeter& MeterEngine::getPeakMeter() noexcept {
    return peakMeter_;
}

const RMSMeter& MeterEngine::getRMSMeter() const noexcept {
    return rmsMeter_;
}

RMSMeter& MeterEngine::getRMSMeter() noexcept {
    return rmsMeter_;
}

} // namespace melodymeet
