#include "LimiterProcessor.h"

#include <algorithm>

namespace melodymeet {

LimiterProcessor::LimiterProcessor() = default;

void LimiterProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && channelCount_ > 0);

    if (prepared_) {
        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate_;
        spec.maximumBlockSize = static_cast<juce::uint32>(maxBlockSize);
        spec.numChannels = static_cast<juce::uint32>(channelCount_);

        limiter_.prepare(spec);
    }
}

void LimiterProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    if (bypass_.load(std::memory_order_relaxed))
        return;

    // Apply thread-safe parameter updates to JUCE limiter (per-block update)
    limiter_.setThreshold(ceilingDb_.load(std::memory_order_relaxed));
    limiter_.setRelease(releaseMs_.load(std::memory_order_relaxed));

    const int channelsToProcess = std::min(channelCount, channelCount_);

    // Wrap the raw float** into a non-owning juce::AudioBuffer, then AudioBlock
    blockWrapper_.setDataToReferTo(channels, channelsToProcess, numSamples);
    juce::dsp::AudioBlock<float> block(blockWrapper_);
    juce::dsp::ProcessContextReplacing<float> context(block);

    // Apply limiting
    limiter_.process(context);
}

void LimiterProcessor::reset() noexcept {
    limiter_.reset();
}

void LimiterProcessor::release() noexcept {
    prepared_ = false;
}

void LimiterProcessor::setCeiling(float ceilingDb) noexcept {
    ceilingDb_.store(std::min(0.0f, ceilingDb), std::memory_order_relaxed);
}

float LimiterProcessor::getCeiling() const noexcept {
    return ceilingDb_.load(std::memory_order_relaxed);
}

void LimiterProcessor::setRelease(float releaseMs) noexcept {
    releaseMs_.store(std::max(1.0f, releaseMs), std::memory_order_relaxed);
}

float LimiterProcessor::getRelease() const noexcept {
    return releaseMs_.load(std::memory_order_relaxed);
}

void LimiterProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool LimiterProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
