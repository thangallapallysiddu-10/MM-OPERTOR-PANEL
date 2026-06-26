#pragma once

#include "../IDspProcessor.h"

#include <atomic>
#include <cmath>

namespace melodymeet {

/// Production DSP processor that adjusts audio amplitude.
///
/// Supports linear gain, decibel gain, bypass, and smooth gain transitions
/// to prevent clicks and artifacts during parameter changes.
///
/// The smoothing uses a one-pole exponential filter applied per-sample,
/// converging from the current gain towards the target gain. The smoothing
/// time is fixed at approximately 10ms (configurable via kSmoothingTimeMs).
///
/// Thread safety:
///   setGain/setGainDb/setBypass are called from the control thread.
///   process() reads the target via atomics and performs smoothing locally.
///   No locks or allocations occur during process().
class GainProcessor final : public IDspProcessor {
public:
    GainProcessor() = default;
    ~GainProcessor() override = default;

    GainProcessor(const GainProcessor&) = delete;
    GainProcessor& operator=(const GainProcessor&) = delete;
    GainProcessor(GainProcessor&&) = delete;
    GainProcessor& operator=(GainProcessor&&) = delete;

    // --- IDspProcessor interface ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // --- Gain control ---

    /// Sets the target gain as a linear multiplier (0.0 = silence, 1.0 = unity).
    void setGain(float linearGain) noexcept;

    /// Returns the current target gain as a linear multiplier.
    float getGain() const noexcept;

    /// Sets the target gain in decibels. 0 dB = unity gain.
    void setGainDb(float gainDb) noexcept;

    /// Returns the current target gain in decibels.
    float getGainDb() const noexcept;

    // --- Bypass ---

    /// When bypassed, the processor passes audio through unmodified.
    void setBypass(bool bypassed) noexcept;
    bool isBypassed() const noexcept;

    // --- Utility ---

    /// Converts decibels to a linear gain multiplier.
    static float dbToLinear(float db) noexcept;

    /// Converts a linear gain multiplier to decibels.
    static float linearToDb(float linear) noexcept;

private:
    /// Recalculates the smoothing coefficient from the sample rate.
    void updateSmoothingCoefficient() noexcept;

    static constexpr float kSmoothingTimeMs = 10.0f;
    static constexpr float kMinGainDb = -100.0f;
    static constexpr float kSmoothingThreshold = 1.0e-6f;

    std::atomic<float> targetGain_{1.0f};
    std::atomic<bool> bypassed_{false};

    float currentGain_{1.0f};
    float smoothingCoefficient_{0.0f};
    double sampleRate_{0.0};
    bool prepared_{false};
};

} // namespace melodymeet
