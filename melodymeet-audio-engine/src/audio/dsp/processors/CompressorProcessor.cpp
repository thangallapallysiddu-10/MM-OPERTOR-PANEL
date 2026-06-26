#include "CompressorProcessor.h"

#include <algorithm>

namespace melodymeet {

namespace {
    constexpr float minMakeupDb = -24.0f;
    constexpr float maxMakeupDb = 24.0f;
} // namespace

CompressorProcessor::CompressorProcessor() {
    smoothedMakeupGainLinear_.setCurrentAndTargetValue(1.0f);
}

void CompressorProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && channelCount_ > 0);

    if (prepared_) {
        juce::dsp::ProcessSpec spec;
        spec.sampleRate = sampleRate_;
        spec.maximumBlockSize = static_cast<juce::uint32>(maxBlockSize);
        spec.numChannels = static_cast<juce::uint32>(channelCount_);

        compressor_.prepare(spec);

        // 20ms ramp for makeup gain to prevent zipper noise
        smoothedMakeupGainLinear_.reset(sampleRate_, 0.02);
    }
}

void CompressorProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    if (bypass_.load(std::memory_order_relaxed))
        return;

    // Apply thread-safe parameter updates to JUCE compressor (per-block update)
    compressor_.setThreshold(thresholdDb_.load(std::memory_order_relaxed));
    compressor_.setRatio(ratio_.load(std::memory_order_relaxed));
    compressor_.setAttack(attackMs_.load(std::memory_order_relaxed));
    compressor_.setRelease(releaseMs_.load(std::memory_order_relaxed));

    // Calculate makeup gain target
    const float targetMakeupDb = makeupGainDb_.load(std::memory_order_relaxed);
    const float targetMakeupLinear = juce::Decibels::decibelsToGain(targetMakeupDb, minMakeupDb);
    smoothedMakeupGainLinear_.setTargetValue(targetMakeupLinear);

    const int channelsToProcess = std::min(channelCount, channelCount_);

    // Wrap the raw float** into a non-owning juce::AudioBuffer, then AudioBlock
    blockWrapper_.setDataToReferTo(channels, channelsToProcess, numSamples);
    juce::dsp::AudioBlock<float> block(blockWrapper_);
    juce::dsp::ProcessContextReplacing<float> context(block);

    // Apply compression
    compressor_.process(context);

    // Apply makeup gain
    if (smoothedMakeupGainLinear_.isSmoothing()) {
        for (int sample = 0; sample < numSamples; ++sample) {
            const float gain = smoothedMakeupGainLinear_.getNextValue();
            for (int ch = 0; ch < channelsToProcess; ++ch) {
                if (channels[ch]) {
                    channels[ch][sample] *= gain;
                }
            }
        }
    } else {
        const float currentGain = smoothedMakeupGainLinear_.getCurrentValue();
        if (currentGain != 1.0f) {
            for (int ch = 0; ch < channelsToProcess; ++ch) {
                if (float* channelData = channels[ch]) {
                    juce::FloatVectorOperations::multiply(channelData, currentGain, numSamples);
                }
            }
        }
    }
}

void CompressorProcessor::reset() noexcept {
    compressor_.reset();
    
    const float targetMakeupDb = makeupGainDb_.load(std::memory_order_relaxed);
    const float targetMakeupLinear = juce::Decibels::decibelsToGain(targetMakeupDb, minMakeupDb);
    smoothedMakeupGainLinear_.setCurrentAndTargetValue(targetMakeupLinear);
}

void CompressorProcessor::release() noexcept {
    prepared_ = false;
}

void CompressorProcessor::setThreshold(float thresholdDb) noexcept {
    thresholdDb_.store(thresholdDb, std::memory_order_relaxed);
}

float CompressorProcessor::getThreshold() const noexcept {
    return thresholdDb_.load(std::memory_order_relaxed);
}

void CompressorProcessor::setRatio(float ratio) noexcept {
    ratio_.store(std::max(1.0f, ratio), std::memory_order_relaxed);
}

float CompressorProcessor::getRatio() const noexcept {
    return ratio_.load(std::memory_order_relaxed);
}

void CompressorProcessor::setAttack(float attackMs) noexcept {
    attackMs_.store(std::max(0.1f, attackMs), std::memory_order_relaxed);
}

float CompressorProcessor::getAttack() const noexcept {
    return attackMs_.load(std::memory_order_relaxed);
}

void CompressorProcessor::setRelease(float releaseMs) noexcept {
    releaseMs_.store(std::max(1.0f, releaseMs), std::memory_order_relaxed);
}

float CompressorProcessor::getRelease() const noexcept {
    return releaseMs_.load(std::memory_order_relaxed);
}

void CompressorProcessor::setMakeupGain(float makeupGainDb) noexcept {
    makeupGainDb_.store(std::clamp(makeupGainDb, minMakeupDb, maxMakeupDb), std::memory_order_relaxed);
}

float CompressorProcessor::getMakeupGain() const noexcept {
    return makeupGainDb_.load(std::memory_order_relaxed);
}

void CompressorProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool CompressorProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
