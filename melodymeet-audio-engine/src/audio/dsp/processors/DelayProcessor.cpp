#include "DelayProcessor.h"

namespace melodymeet {

DelayProcessor::DelayProcessor()
    : delayLine_(192000) // Max 192000 samples (2 seconds at 96kHz)
{
}

void DelayProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    channelCount_ = channelCount;

    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = maxBlockSize;
    spec.numChannels = channelCount;

    delayLine_.prepare(spec);

    blockWrapper_.setSize(channelCount, maxBlockSize, false, false, true);
    delayBuffer_.setSize(channelCount, maxBlockSize, false, false, true);

    prepared_ = true;
}

void DelayProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || bypass_.load(std::memory_order_relaxed))
        return;

    int activeChannels = std::min(channelCount, channelCount_);
    if (activeChannels <= 0 || numSamples <= 0)
        return;

    blockWrapper_.setDataToReferTo(channels, activeChannels, numSamples);
    
    // Calculate delay samples based on current sample rate
    float delaySamples = delayTimeMs_.load(std::memory_order_relaxed) * static_cast<float>(sampleRate_ / 1000.0);
    delayLine_.setDelay(delaySamples);
    
    float fb = feedback_.load(std::memory_order_relaxed);
    float wet = wetLevel_.load(std::memory_order_relaxed);
    float dry = dryLevel_.load(std::memory_order_relaxed);

    // juce::dsp::DelayLine gives the delayed sample. We need to mix it.
    for (int ch = 0; ch < activeChannels; ++ch) {
        float* channelData = blockWrapper_.getWritePointer(ch);
        
        for (int i = 0; i < numSamples; ++i) {
            float input = channelData[i];
            float delayed = delayLine_.popSample(ch);
            
            // Push sample back with feedback
            delayLine_.pushSample(ch, input + delayed * fb);
            
            // Output is mix of dry and wet
            channelData[i] = input * dry + delayed * wet;
        }
    }
}

void DelayProcessor::reset() noexcept {
    if (prepared_) {
        delayLine_.reset();
    }
}

void DelayProcessor::release() noexcept {
    prepared_ = false;
    blockWrapper_.setSize(0, 0, false, false, false);
    delayBuffer_.setSize(0, 0, false, false, false);
}

void DelayProcessor::setDelayTime(float timeMs) noexcept {
    delayTimeMs_.store(timeMs, std::memory_order_relaxed);
}

float DelayProcessor::getDelayTime() const noexcept {
    return delayTimeMs_.load(std::memory_order_relaxed);
}

void DelayProcessor::setFeedback(float feedback) noexcept {
    feedback_.store(feedback, std::memory_order_relaxed);
}

float DelayProcessor::getFeedback() const noexcept {
    return feedback_.load(std::memory_order_relaxed);
}

void DelayProcessor::setWetLevel(float wetLevel) noexcept {
    wetLevel_.store(wetLevel, std::memory_order_relaxed);
}

float DelayProcessor::getWetLevel() const noexcept {
    return wetLevel_.load(std::memory_order_relaxed);
}

void DelayProcessor::setDryLevel(float dryLevel) noexcept {
    dryLevel_.store(dryLevel, std::memory_order_relaxed);
}

float DelayProcessor::getDryLevel() const noexcept {
    return dryLevel_.load(std::memory_order_relaxed);
}

void DelayProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool DelayProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
