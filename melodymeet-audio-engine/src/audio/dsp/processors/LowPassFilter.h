#pragma once

#include "../IDspProcessor.h"

#include <juce_dsp/juce_dsp.h>

#include <array>
#include <atomic>

namespace melodymeet {

/// Production-quality Low Pass Filter processor.
///
/// Attenuates frequencies above a configurable cutoff frequency
/// using a second-order (12 dB/oct) Butterworth IIR filter implemented
/// via JUCE's juce::dsp::IIR::Filter.
///
/// Supports smooth parameter updates by recalculating coefficients
/// at the start of each process() block when the cutoff has changed.
/// The IIR filter state is preserved across coefficient updates to
/// ensure seamless, click-free transitions.
///
/// Thread safety:
///   setCutoffFrequency/setBypass are called from the control thread.
///   process() reads targets via atomics and applies filter coefficients locally.
///   No locks or allocations occur during process().
///
/// Future-ready: the Slope enum is defined for future multi-pole support
/// but the current implementation uses 12 dB/oct (second-order Butterworth).
class LowPassFilter final : public IDspProcessor {
public:
    /// Filter slope options. Currently only Slope12 is implemented.
    /// Additional slopes can be added by cascading filter stages.
    enum class Slope {
        Slope12,    ///< 12 dB/octave (second-order Butterworth)
        Slope24     ///< 24 dB/octave (reserved for future use)
    };

    static constexpr int kMaxChannels = 8;
    static constexpr float kMinCutoffHz = 20.0f;
    static constexpr float kMaxCutoffHz = 20000.0f;
    static constexpr float kDefaultCutoffHz = 20000.0f;

    LowPassFilter() = default;
    ~LowPassFilter() override = default;

    LowPassFilter(const LowPassFilter&) = delete;
    LowPassFilter& operator=(const LowPassFilter&) = delete;
    LowPassFilter(LowPassFilter&&) = delete;
    LowPassFilter& operator=(LowPassFilter&&) = delete;

    // --- IDspProcessor interface ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // --- Filter parameters ---

    /// Sets the cutoff frequency in Hz. Clamped to [20, 20000].
    void setCutoffFrequency(float frequencyHz) noexcept;

    /// Returns the current target cutoff frequency in Hz.
    float getCutoffFrequency() const noexcept;

    /// Sets the filter slope. Currently only Slope12 is active.
    void setSlope(Slope slope) noexcept;

    /// Returns the current slope setting.
    Slope getSlope() const noexcept;

    // --- Bypass ---

    /// When bypassed, audio passes through unmodified.
    void setBypass(bool bypassed) noexcept;
    bool isBypassed() const noexcept;

private:
    /// Recalculates filter coefficients from the current cutoff and sample rate.
    void updateCoefficients() noexcept;

    std::atomic<float> targetCutoffHz_{kDefaultCutoffHz};
    std::atomic<bool> bypassed_{false};
    std::atomic<int> targetSlope_{static_cast<int>(Slope::Slope12)};

    float currentCutoffHz_{kDefaultCutoffHz};
    double sampleRate_{44100.0};
    int channelCount_{0};
    bool prepared_{false};

    /// Per-channel IIR filter instances. Pre-allocated for kMaxChannels.
    std::array<juce::dsp::IIR::Filter<float>, kMaxChannels> filters_;

    /// Shared coefficients pointer used by all channel filters.
    juce::dsp::IIR::Coefficients<float>::Ptr coefficients_;
};

} // namespace melodymeet
