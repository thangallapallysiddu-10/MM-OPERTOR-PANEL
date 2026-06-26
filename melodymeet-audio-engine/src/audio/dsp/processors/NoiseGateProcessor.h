#pragma once

#include "../IDspProcessor.h"
#include <juce_dsp/juce_dsp.h>
#include <atomic>

namespace melodymeet {

/// Broadcast-oriented Noise Gate Processor.
///
/// Provides threshold, attack, hold, and release parameters.
class NoiseGateProcessor final : public IDspProcessor {
public:
    NoiseGateProcessor();
    ~NoiseGateProcessor() override = default;

    NoiseGateProcessor(const NoiseGateProcessor&) = delete;
    NoiseGateProcessor& operator=(const NoiseGateProcessor&) = delete;

    // IDspProcessor Interface
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // Control API
    void setThreshold(float thresholdDb) noexcept;
    float getThreshold() const noexcept;

    void setAttack(float attackMs) noexcept;
    float getAttack() const noexcept;

    void setHold(float holdMs) noexcept;
    float getHold() const noexcept;

    void setRelease(float releaseMs) noexcept;
    float getRelease() const noexcept;

    void setBypass(bool bypass) noexcept;
    bool isBypassed() const noexcept;

private:
    juce::dsp::NoiseGate<float> gate_;

    std::atomic<float> thresholdDb_{-60.0f};
    std::atomic<float> attackMs_{1.0f};
    std::atomic<float> holdMs_{10.0f}; 
    std::atomic<float> releaseMs_{100.0f};
    std::atomic<bool> bypass_{false};

    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};

    juce::AudioBuffer<float> blockWrapper_;
};

} // namespace melodymeet
