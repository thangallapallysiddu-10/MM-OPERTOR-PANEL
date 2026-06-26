#include "NoiseGateProcessor.h"

namespace melodymeet {

NoiseGateProcessor::NoiseGateProcessor() {
    gate_.setThreshold(thresholdDb_.load());
    gate_.setAttack(attackMs_.load());
    gate_.setRelease(releaseMs_.load());
    // juce::dsp::NoiseGate does not natively support Hold time.
    // The hold parameter is stored but does not affect the JUCE NoiseGate.
}

void NoiseGateProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    channelCount_ = channelCount;

    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = maxBlockSize;
    spec.numChannels = channelCount;

    gate_.prepare(spec);

    blockWrapper_.setSize(channelCount, maxBlockSize, false, false, true);

    prepared_ = true;
}

void NoiseGateProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || bypass_.load(std::memory_order_relaxed))
        return;

    int activeChannels = std::min(channelCount, channelCount_);
    if (activeChannels <= 0 || numSamples <= 0)
        return;

    blockWrapper_.setDataToReferTo(channels, activeChannels, numSamples);
    juce::dsp::AudioBlock<float> block(blockWrapper_);
    juce::dsp::ProcessContextReplacing<float> context(block);

    gate_.process(context);
}

void NoiseGateProcessor::reset() noexcept {
    if (prepared_) {
        gate_.reset();
    }
}

void NoiseGateProcessor::release() noexcept {
    prepared_ = false;
    blockWrapper_.setSize(0, 0, false, false, false);
}

void NoiseGateProcessor::setThreshold(float thresholdDb) noexcept {
    thresholdDb_.store(thresholdDb, std::memory_order_relaxed);
    gate_.setThreshold(thresholdDb);
}

float NoiseGateProcessor::getThreshold() const noexcept {
    return thresholdDb_.load(std::memory_order_relaxed);
}

void NoiseGateProcessor::setAttack(float attackMs) noexcept {
    attackMs_.store(attackMs, std::memory_order_relaxed);
    gate_.setAttack(attackMs);
}

float NoiseGateProcessor::getAttack() const noexcept {
    return attackMs_.load(std::memory_order_relaxed);
}

void NoiseGateProcessor::setHold(float holdMs) noexcept {
    holdMs_.store(holdMs, std::memory_order_relaxed);
    // JUCE NoiseGate doesn't support hold
}

float NoiseGateProcessor::getHold() const noexcept {
    return holdMs_.load(std::memory_order_relaxed);
}

void NoiseGateProcessor::setRelease(float releaseMs) noexcept {
    releaseMs_.store(releaseMs, std::memory_order_relaxed);
    gate_.setRelease(releaseMs);
}

float NoiseGateProcessor::getRelease() const noexcept {
    return releaseMs_.load(std::memory_order_relaxed);
}

void NoiseGateProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool NoiseGateProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
