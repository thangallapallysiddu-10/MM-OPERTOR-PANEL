#include "RMSMeter.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

void RMSMeter::prepare(int channelCount) {
    channelCount_ = channelCount > 0 ? channelCount : 0;
    
    if (channelCount_ > 0) {
        rmsLevels_ = std::make_unique<std::atomic<float>[]>(channelCount_);
        reset();
    } else {
        rmsLevels_.reset();
    }
}

void RMSMeter::process(const float* const* inputChannels, int channelCount, int numSamples) noexcept {
    if (!rmsLevels_ || channelCount <= 0 || numSamples <= 0 || inputChannels == nullptr)
        return;

    const int channelsToProcess = std::min(channelCount, channelCount_);

    for (int c = 0; c < channelsToProcess; ++c) {
        const float* channelData = inputChannels[c];
        if (!channelData) continue;

        float sumOfSquares = 0.0f;
        
        for (int i = 0; i < numSamples; ++i) {
            const float sample = channelData[i];
            sumOfSquares += sample * sample;
        }

        const float meanSquare = sumOfSquares / static_cast<float>(numSamples);
        const float rms = std::sqrt(meanSquare);

        rmsLevels_[c].store(rms, std::memory_order_relaxed);
    }
}

void RMSMeter::reset() noexcept {
    for (int c = 0; c < channelCount_; ++c) {
        rmsLevels_[c].store(0.0f, std::memory_order_relaxed);
    }
}

float RMSMeter::getRMS(int channel) const noexcept {
    if (channel >= 0 && channel < channelCount_ && rmsLevels_) {
        return rmsLevels_[channel].load(std::memory_order_relaxed);
    }
    return 0.0f;
}

} // namespace melodymeet
