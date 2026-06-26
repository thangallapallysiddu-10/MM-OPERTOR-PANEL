#pragma once

#include "../IDspProcessor.h"
#include <juce_dsp/juce_dsp.h>
#include <atomic>

namespace melodymeet {

/// Broadcast-oriented Delay Processor.
///
/// Provides Wet, Dry, Feedback, and Delay Time parameters.
class DelayProcessor final : public IDspProcessor {
public:
    DelayProcessor();
    ~DelayProcessor() override = default;

    DelayProcessor(const DelayProcessor&) = delete;
    DelayProcessor& operator=(const DelayProcessor&) = delete;

    // IDspProcessor Interface
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // Control API
    void setDelayTime(float timeMs) noexcept;
    float getDelayTime() const noexcept;

    void setFeedback(float feedback) noexcept;
    float getFeedback() const noexcept;

    void setWetLevel(float wetLevel) noexcept;
    float getWetLevel() const noexcept;

    void setDryLevel(float dryLevel) noexcept;
    float getDryLevel() const noexcept;

    void setBypass(bool bypass) noexcept;
    bool isBypassed() const noexcept;

private:
    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear> delayLine_;

    std::atomic<float> delayTimeMs_{250.0f};
    std::atomic<float> feedback_{0.3f};
    std::atomic<float> wetLevel_{0.5f};
    std::atomic<float> dryLevel_{1.0f};
    std::atomic<bool> bypass_{false};

    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};

    juce::AudioBuffer<float> blockWrapper_;
    juce::AudioBuffer<float> delayBuffer_;
};

} // namespace melodymeet
