#include "PeakMeter.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

void PeakMeter::prepare(int channelCount) {
    channelCount_ = channelCount > 0 ? channelCount : 0;
    
    if (channelCount_ > 0) {
        peaks_ = std::make_unique<std::atomic<float>[]>(channelCount_);
        clips_ = std::make_unique<std::atomic<bool>[]>(channelCount_);
        reset();
    } else {
        peaks_.reset();
        clips_.reset();
    }
}

void PeakMeter::process(const float* const* inputChannels, int channelCount, int numSamples) noexcept {
    if (!peaks_ || !clips_ || channelCount <= 0 || numSamples <= 0 || inputChannels == nullptr)
        return;

    const int channelsToProcess = std::min(channelCount, channelCount_);

    for (int c = 0; c < channelsToProcess; ++c) {
        const float* channelData = inputChannels[c];
        if (!channelData) continue;

        float currentPeak = 0.0f;
        bool hasClipped = clips_[c].load(std::memory_order_relaxed);

        for (int i = 0; i < numSamples; ++i) {
            const float absSample = std::abs(channelData[i]);
            
            if (absSample > currentPeak) {
                currentPeak = absSample;
            }
            if (absSample >= 1.0f) {
                hasClipped = true;
            }
        }

        peaks_[c].store(currentPeak, std::memory_order_relaxed);
        
        if (hasClipped) {
            clips_[c].store(true, std::memory_order_relaxed);
        }
    }
}

void PeakMeter::reset() noexcept {
    for (int c = 0; c < channelCount_; ++c) {
        peaks_[c].store(0.0f, std::memory_order_relaxed);
        clips_[c].store(false, std::memory_order_relaxed);
    }
}

float PeakMeter::getPeak(int channel) const noexcept {
    if (channel >= 0 && channel < channelCount_ && peaks_) {
        return peaks_[channel].load(std::memory_order_relaxed);
    }
    return 0.0f;
}

bool PeakMeter::hasClipped(int channel) const noexcept {
    if (channel >= 0 && channel < channelCount_ && clips_) {
        return clips_[channel].load(std::memory_order_relaxed);
    }
    return false;
}

void PeakMeter::clearClip(int channel) noexcept {
    if (channel >= 0 && channel < channelCount_ && clips_) {
        clips_[channel].store(false, std::memory_order_relaxed);
    }
}

} // namespace melodymeet
