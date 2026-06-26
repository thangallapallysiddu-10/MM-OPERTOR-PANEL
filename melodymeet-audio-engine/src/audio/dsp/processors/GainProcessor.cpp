#include "GainProcessor.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

// =============================================================================
// IDspProcessor Interface
// =============================================================================

void GainProcessor::prepare(double sampleRate, int /*maxBlockSize*/, int /*channelCount*/) {
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 44100.0;
    currentGain_ = targetGain_.load(std::memory_order_relaxed);
    updateSmoothingCoefficient();
    prepared_ = true;
}

void GainProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    // Bypass: pass audio through completely unmodified.
    if (bypassed_.load(std::memory_order_relaxed))
        return;

    const float target = targetGain_.load(std::memory_order_relaxed);
    const float coeff = smoothingCoefficient_;

    for (int s = 0; s < numSamples; ++s) {
        // Advance the one-pole smoother towards the target gain.
        // When the difference is negligible, snap to avoid denormals.
        if (std::abs(currentGain_ - target) > kSmoothingThreshold) {
            currentGain_ += coeff * (target - currentGain_);
        } else {
            currentGain_ = target;
        }

        // Apply the smoothed gain to every channel for this sample.
        const float gain = currentGain_;

        for (int c = 0; c < channelCount; ++c) {
            if (channels[c] != nullptr) {
                channels[c][s] *= gain;
            }
        }
    }
}

void GainProcessor::reset() noexcept {
    currentGain_ = targetGain_.load(std::memory_order_relaxed);
}

void GainProcessor::release() noexcept {
    prepared_ = false;
}

// =============================================================================
// Gain Control
// =============================================================================

void GainProcessor::setGain(float linearGain) noexcept {
    targetGain_.store(std::max(0.0f, linearGain), std::memory_order_relaxed);
}

float GainProcessor::getGain() const noexcept {
    return targetGain_.load(std::memory_order_relaxed);
}

void GainProcessor::setGainDb(float gainDb) noexcept {
    setGain(dbToLinear(gainDb));
}

float GainProcessor::getGainDb() const noexcept {
    return linearToDb(getGain());
}

// =============================================================================
// Bypass
// =============================================================================

void GainProcessor::setBypass(bool bypassed) noexcept {
    bypassed_.store(bypassed, std::memory_order_relaxed);
}

bool GainProcessor::isBypassed() const noexcept {
    return bypassed_.load(std::memory_order_relaxed);
}

// =============================================================================
// Utility
// =============================================================================

float GainProcessor::dbToLinear(float db) noexcept {
    if (db <= kMinGainDb)
        return 0.0f;

    return std::pow(10.0f, db / 20.0f);
}

float GainProcessor::linearToDb(float linear) noexcept {
    if (linear <= 0.0f)
        return kMinGainDb;

    return 20.0f * std::log10(linear);
}

// =============================================================================
// Private
// =============================================================================

void GainProcessor::updateSmoothingCoefficient() noexcept {
    // One-pole IIR coefficient: coeff = 1 - exp(-1 / (tau * sampleRate))
    // where tau = smoothingTimeMs / 1000.
    // This gives ~63% convergence per time constant, reaching >99% in ~5*tau.
    const double tau = static_cast<double>(kSmoothingTimeMs) / 1000.0;
    smoothingCoefficient_ = static_cast<float>(1.0 - std::exp(-1.0 / (tau * sampleRate_)));
}

} // namespace melodymeet
