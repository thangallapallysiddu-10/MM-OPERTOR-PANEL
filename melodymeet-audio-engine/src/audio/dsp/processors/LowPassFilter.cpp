#include "LowPassFilter.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

// =============================================================================
// IDspProcessor Interface
// =============================================================================

void LowPassFilter::prepare(double sampleRate, int /*maxBlockSize*/, int channelCount) {
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 44100.0;
    channelCount_ = std::clamp(channelCount, 0, kMaxChannels);

    currentCutoffHz_ = targetCutoffHz_.load(std::memory_order_relaxed);

    // Pre-compute initial coefficients.
    updateCoefficients();

    // Prepare each per-channel filter with the initial coefficients.
    for (int c = 0; c < channelCount_; ++c) {
        filters_[static_cast<std::size_t>(c)].coefficients = coefficients_;
        filters_[static_cast<std::size_t>(c)].reset();
    }

    prepared_ = true;
}

void LowPassFilter::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    if (bypassed_.load(std::memory_order_relaxed))
        return;

    const int channelsToProcess = std::min(channelCount, channelCount_);

    // Check if the cutoff frequency has been changed from the control thread.
    // Recalculate coefficients once per block when changed. The IIR filter
    // state (z-1, z-2) is preserved across coefficient swaps, providing
    // smooth click-free transitions.
    const float targetCutoff = targetCutoffHz_.load(std::memory_order_relaxed);
    if (std::abs(currentCutoffHz_ - targetCutoff) > 0.01f) {
        currentCutoffHz_ = targetCutoff;
        updateCoefficients();

        for (int c = 0; c < channelsToProcess; ++c) {
            filters_[static_cast<std::size_t>(c)].coefficients = coefficients_;
        }
    }

    // Process each channel independently through its own filter instance.
    for (int c = 0; c < channelsToProcess; ++c) {
        float* channelData = channels[c];
        if (channelData == nullptr) continue;

        auto& filter = filters_[static_cast<std::size_t>(c)];

        for (int s = 0; s < numSamples; ++s) {
            channelData[s] = filter.processSample(channelData[s]);
        }
    }
}

void LowPassFilter::reset() noexcept {
    for (int c = 0; c < channelCount_; ++c) {
        filters_[static_cast<std::size_t>(c)].reset();
    }
    currentCutoffHz_ = targetCutoffHz_.load(std::memory_order_relaxed);
}

void LowPassFilter::release() noexcept {
    prepared_ = false;
}

// =============================================================================
// Filter Parameters
// =============================================================================

void LowPassFilter::setCutoffFrequency(float frequencyHz) noexcept {
    const float clamped = std::clamp(frequencyHz, kMinCutoffHz, kMaxCutoffHz);
    targetCutoffHz_.store(clamped, std::memory_order_relaxed);
}

float LowPassFilter::getCutoffFrequency() const noexcept {
    return targetCutoffHz_.load(std::memory_order_relaxed);
}

void LowPassFilter::setSlope(Slope slope) noexcept {
    targetSlope_.store(static_cast<int>(slope), std::memory_order_relaxed);
}

LowPassFilter::Slope LowPassFilter::getSlope() const noexcept {
    return static_cast<Slope>(targetSlope_.load(std::memory_order_relaxed));
}

// =============================================================================
// Bypass
// =============================================================================

void LowPassFilter::setBypass(bool bypassed) noexcept {
    bypassed_.store(bypassed, std::memory_order_relaxed);
}

bool LowPassFilter::isBypassed() const noexcept {
    return bypassed_.load(std::memory_order_relaxed);
}

// =============================================================================
// Private
// =============================================================================

void LowPassFilter::updateCoefficients() noexcept {
    // Clamp the cutoff to Nyquist to prevent numerical instability.
    const float nyquist = static_cast<float>(sampleRate_) * 0.5f;
    const float safeCutoff = std::min(currentCutoffHz_, nyquist * 0.99f);

    // Create second-order (12 dB/oct) Butterworth low-pass coefficients.
    coefficients_ = juce::dsp::IIR::Coefficients<float>::makeLowPass(
        sampleRate_, static_cast<double>(safeCutoff)
    );
}

} // namespace melodymeet
