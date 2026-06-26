#include "MasterGainProcessor.h"

#include <juce_core/juce_core.h>

#include <algorithm>

namespace melodymeet {

namespace {
    constexpr float minGainDb = -100.0f;
    constexpr float maxGainDb = 24.0f;
} // namespace

MasterGainProcessor::MasterGainProcessor() {
    smoothedGain_.setCurrentAndTargetValue(1.0f);
}

void MasterGainProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    (void)maxBlockSize;
    
    sampleRate_ = sampleRate;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && channelCount_ > 0);

    if (prepared_) {
        // Use a 20ms ramp for smooth gain changes
        smoothedGain_.reset(sampleRate_, 0.02);
    }
}

void MasterGainProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    const bool isBypassed = bypass_.load(std::memory_order_relaxed);
    
    // Check if the target changed from the UI/Control thread
    smoothedGain_.setTargetValue(isBypassed ? 1.0f : targetGain_.load(std::memory_order_relaxed));

    const int channelsToProcess = std::min(channelCount, channelCount_);

    if (smoothedGain_.isSmoothing()) {
        // Process block sample-by-sample for smoothing
        for (int sample = 0; sample < numSamples; ++sample) {
            const float gain = smoothedGain_.getNextValue();
            for (int ch = 0; ch < channelsToProcess; ++ch) {
                if (channels[ch]) {
                    channels[ch][sample] *= gain;
                }
            }
        }
    } else {
        // Gain is stable, process block efficiently
        const float gain = smoothedGain_.getCurrentValue();
        if (gain == 1.0f) {
            return; // Unity gain, do nothing
        }
        
        for (int ch = 0; ch < channelsToProcess; ++ch) {
            if (float* channelData = channels[ch]) {
                // Using juce::FloatVectorOperations for SIMD acceleration if available
                juce::FloatVectorOperations::multiply(channelData, gain, numSamples);
            }
        }
    }
}

void MasterGainProcessor::reset() noexcept {
    smoothedGain_.setCurrentAndTargetValue(targetGain_.load(std::memory_order_relaxed));
}

void MasterGainProcessor::release() noexcept {
    prepared_ = false;
}

void MasterGainProcessor::setGainLinear(float gainLinear) noexcept {
    targetGain_.store(std::max(0.0f, gainLinear), std::memory_order_relaxed);
}

float MasterGainProcessor::getGainLinear() const noexcept {
    return targetGain_.load(std::memory_order_relaxed);
}

void MasterGainProcessor::setGainDecibels(float gainDb) noexcept {
    float clampedDb = std::clamp(gainDb, minGainDb, maxGainDb);
    setGainLinear(juce::Decibels::decibelsToGain(clampedDb, minGainDb));
}

float MasterGainProcessor::getGainDecibels() const noexcept {
    return juce::Decibels::gainToDecibels(getGainLinear(), minGainDb);
}

void MasterGainProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool MasterGainProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
