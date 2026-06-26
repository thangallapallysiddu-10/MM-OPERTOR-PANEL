#pragma once

#include "../IDspProcessor.h"

#include <juce_dsp/juce_dsp.h>
#include <juce_audio_basics/juce_audio_basics.h>

#include <atomic>

namespace melodymeet {

/// Broadcast-oriented Master Compressor Processor.
///
/// Wraps juce::dsp::Compressor<float> to provide stereo-linked master bus compression.
/// Features smooth makeup gain adjustments and thread-safe real-time parameter updates.
class CompressorProcessor final : public IDspProcessor {
public:
    CompressorProcessor();
    ~CompressorProcessor() override = default;

    CompressorProcessor(const CompressorProcessor&) = delete;
    CompressorProcessor& operator=(const CompressorProcessor&) = delete;
    CompressorProcessor(CompressorProcessor&&) = delete;
    CompressorProcessor& operator=(CompressorProcessor&&) = delete;

    // IDspProcessor Interface
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // Control API

    /// Sets the compressor threshold in dB.
    void setThreshold(float thresholdDb) noexcept;
    float getThreshold() const noexcept;

    /// Sets the compression ratio (e.g., 4.0 for 4:1).
    void setRatio(float ratio) noexcept;
    float getRatio() const noexcept;

    /// Sets the attack time in milliseconds.
    void setAttack(float attackMs) noexcept;
    float getAttack() const noexcept;

    /// Sets the release time in milliseconds.
    void setRelease(float releaseMs) noexcept;
    float getRelease() const noexcept;

    /// Sets the makeup gain in dB. Applied post-compression with smoothing to prevent zipper noise.
    void setMakeupGain(float makeupGainDb) noexcept;
    float getMakeupGain() const noexcept;

    /// Bypasses the compressor (audio passes through unchanged).
    void setBypass(bool bypass) noexcept;
    bool isBypassed() const noexcept;

private:
    juce::dsp::Compressor<float> compressor_;

    // Thread-safe parameters
    std::atomic<float> thresholdDb_{0.0f};
    std::atomic<float> ratio_{1.0f};
    std::atomic<float> attackMs_{1.0f};
    std::atomic<float> releaseMs_{100.0f};
    std::atomic<float> makeupGainDb_{0.0f};
    std::atomic<bool> bypass_{false};

    // Smoothed value for makeup gain to prevent zipper noise
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Multiplicative> smoothedMakeupGainLinear_{1.0f};

    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};

    // Internal buffer structure for juce::dsp AudioBlock compatibility
    juce::AudioBuffer<float> blockWrapper_;
};

} // namespace melodymeet
