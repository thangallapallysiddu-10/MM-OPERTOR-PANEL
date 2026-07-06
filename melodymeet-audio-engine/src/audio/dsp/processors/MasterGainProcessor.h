#pragma once

#include "../IDspProcessor.h"

#include <juce_audio_basics/juce_audio_basics.h>

#include <atomic>

namespace melodymeet {

/// Master gain processor for controlling the final output level.
/// Uses a smoothed value to prevent zipper noise when adjusting gain.
class MasterGainProcessor final : public IDspProcessor {
public:
    MasterGainProcessor();
    ~MasterGainProcessor() override = default;

    MasterGainProcessor(const MasterGainProcessor&) = delete;
    MasterGainProcessor& operator=(const MasterGainProcessor&) = delete;
    MasterGainProcessor(MasterGainProcessor&&) = delete;
    MasterGainProcessor& operator=(MasterGainProcessor&&) = delete;

    // IDspProcessor Interface
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // Control API
    
    /// Sets the target gain linearly (0.0 to 1.0+).
    void setGainLinear(float gainLinear) noexcept;
    float getGainLinear() const noexcept;

    /// Sets the target gain in decibels.
    void setGainDecibels(float gainDb) noexcept;
    float getGainDecibels() const noexcept;

    /// Bypasses the gain processor (audio passes through unchanged).
    void setBypass(bool bypass) noexcept;
    bool isBypassed() const noexcept;

private:
    std::atomic<float> targetGain_{1.0f};
    std::atomic<bool> bypass_{false};

    // Linear smoothing is used intentionally.
    // Multiplicative smoothing cannot recover once its internal value reaches
    // zero (0 × ratio = 0 forever). Linear interpolation handles 0 ↔ 1
    // transitions correctly and is appropriate here because the dB-to-linear
    // conversion is applied before this smoother, providing the correct
    // perceptual curve without requiring a multiplicative type.
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> smoothedGain_{1.0f};

    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};
};

} // namespace melodymeet
