#include "HighPassFilter.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

// =============================================================================
// IDspProcessor Interface
// =============================================================================

void HighPassFilter::prepare(double sampleRate, int /*maxBlockSize*/, int channelCount) {
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

void HighPassFilter::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    if (bypassed_.load(std::memory_order_relaxed))
        return;

    const int channelsToProcess = std::min(channelCount, channelCount_);

    // Check if the cutoff frequency has been changed from the control thread.
    // If so, recalculate coefficients once per block (not per sample) for efficiency.
    // The IIR filter state is preserved, providing smooth transitions without clicks.
    const float targetCutoff = targetCutoffHz_.load(std::memory_order_relaxed);
    if (std::abs(currentCutoffHz_ - targetCutoff) > 0.01f) {
        currentCutoffHz_ = targetCutoff;
        updateCoefficients();

        for (int c = 0; c < channelsToProcess; ++c) {
            filters_[static_cast<std::size_t>(c)].coefficients = coefficients_;
        }
    }

    // Process each channel independently through its own filter instance.
    // Each filter maintains independent state (z-1, z-2) to correctly handle
    // stereo and multi-channel audio without cross-talk.
    for (int c = 0; c < channelsToProcess; ++c) {
        float* channelData = channels[c];
        if (channelData == nullptr) continue;

        auto& filter = filters_[static_cast<std::size_t>(c)];

        for (int s = 0; s < numSamples; ++s) {
            channelData[s] = filter.processSample(channelData[s]);
        }
    }
}

void HighPassFilter::reset() noexcept {
    for (int c = 0; c < channelCount_; ++c) {
        filters_[static_cast<std::size_t>(c)].reset();
    }
    currentCutoffHz_ = targetCutoffHz_.load(std::memory_order_relaxed);
}

void HighPassFilter::release() noexcept {
    prepared_ = false;
}

// =============================================================================
// Filter Parameters
// =============================================================================

void HighPassFilter::setCutoffFrequency(float frequencyHz) noexcept {
    const float clamped = std::clamp(frequencyHz, kMinCutoffHz, kMaxCutoffHz);
    targetCutoffHz_.store(clamped, std::memory_order_relaxed);
}

float HighPassFilter::getCutoffFrequency() const noexcept {
    return targetCutoffHz_.load(std::memory_order_relaxed);
}

void HighPassFilter::setSlope(Slope slope) noexcept {
    targetSlope_.store(static_cast<int>(slope), std::memory_order_relaxed);
}

HighPassFilter::Slope HighPassFilter::getSlope() const noexcept {
    return static_cast<Slope>(targetSlope_.load(std::memory_order_relaxed));
}

// =============================================================================
// Bypass
// =============================================================================

void HighPassFilter::setBypass(bool bypassed) noexcept {
    bypassed_.store(bypassed, std::memory_order_relaxed);
}

bool HighPassFilter::isBypassed() const noexcept {
    return bypassed_.load(std::memory_order_relaxed);
}

// =============================================================================
// Private
// =============================================================================

void HighPassFilter::updateCoefficients() noexcept {
    // Clamp the cutoff to Nyquist to prevent numerical instability.
    const float nyquist = static_cast<float>(sampleRate_) * 0.5f;
    const float safeCutoff = std::min(currentCutoffHz_, nyquist * 0.99f);

    // Create second-order (12 dB/oct) Butterworth high-pass coefficients.
    // juce::dsp::IIR::Coefficients::makeHighPass returns a ref-counted object.
    // Assigning it to the existing Ptr replaces the coefficients atomically
    // from the filter's perspective (the filter reads coefficients by pointer).
    coefficients_ = juce::dsp::IIR::Coefficients<float>::makeHighPass(
        sampleRate_, static_cast<double>(safeCutoff)
    );
}

} // namespace melodymeet
