#pragma once

#include "../IDspProcessor.h"

#include <juce_dsp/juce_dsp.h>
#include <juce_audio_basics/juce_audio_basics.h>

#include <atomic>

namespace melodymeet {

/// Master Limiter Processor.
///
/// Wraps juce::dsp::Limiter<float> to provide brickwall limiting
/// on the master bus. Guarantees no output clipping.
class LimiterProcessor final : public IDspProcessor {
public:
    LimiterProcessor();
    ~LimiterProcessor() override = default;

    LimiterProcessor(const LimiterProcessor&) = delete;
    LimiterProcessor& operator=(const LimiterProcessor&) = delete;
    LimiterProcessor(LimiterProcessor&&) = delete;
    LimiterProcessor& operator=(LimiterProcessor&&) = delete;

    // IDspProcessor Interface
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // Control API

    /// Sets the absolute ceiling (threshold) in dB.
    void setCeiling(float ceilingDb) noexcept;
    float getCeiling() const noexcept;

    /// Sets the release time in milliseconds.
    void setRelease(float releaseMs) noexcept;
    float getRelease() const noexcept;

    /// Bypasses the limiter.
    /// WARNING: Bypassing may result in output clipping!
    void setBypass(bool bypass) noexcept;
    bool isBypassed() const noexcept;

private:
    juce::dsp::Limiter<float> limiter_;

    // Thread-safe parameters
    std::atomic<float> ceilingDb_{0.0f};
    std::atomic<float> releaseMs_{10.0f};
    std::atomic<bool> bypass_{false};

    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};

    // Internal buffer structure for juce::dsp AudioBlock compatibility
    juce::AudioBuffer<float> blockWrapper_;
};

} // namespace melodymeet
