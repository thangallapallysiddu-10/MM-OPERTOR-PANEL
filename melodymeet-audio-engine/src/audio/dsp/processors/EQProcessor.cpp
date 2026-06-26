#include "EQProcessor.h"

#include <algorithm>
#include <cmath>

namespace melodymeet {

EQProcessor::EQProcessor() {
    params_[LowShelf].frequencyHz.store(100.0f, std::memory_order_relaxed);
    params_[LowShelf].q.store(0.707f, std::memory_order_relaxed);
    params_[LowShelf].gainDb.store(0.0f, std::memory_order_relaxed);

    params_[MidPeak].frequencyHz.store(1000.0f, std::memory_order_relaxed);
    params_[MidPeak].q.store(1.0f, std::memory_order_relaxed);
    params_[MidPeak].gainDb.store(0.0f, std::memory_order_relaxed);

    params_[HighShelf].frequencyHz.store(10000.0f, std::memory_order_relaxed);
    params_[HighShelf].q.store(0.707f, std::memory_order_relaxed);
    params_[HighShelf].gainDb.store(0.0f, std::memory_order_relaxed);

    for (int i = 0; i < NumBands; ++i) {
        currentFreqs_[i] = params_[i].frequencyHz.load(std::memory_order_relaxed);
        currentQs_[i] = params_[i].q.load(std::memory_order_relaxed);
        currentGainsDb_[i] = params_[i].gainDb.load(std::memory_order_relaxed);
    }
}

// =============================================================================
// IDspProcessor Interface
// =============================================================================

void EQProcessor::prepare(double sampleRate, int /*maxBlockSize*/, int channelCount) {
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 44100.0;
    channelCount_ = std::clamp(channelCount, 0, kMaxChannels);

    for (int b = 0; b < NumBands; ++b) {
        currentFreqs_[b] = params_[b].frequencyHz.load(std::memory_order_relaxed);
        currentQs_[b] = params_[b].q.load(std::memory_order_relaxed);
        currentGainsDb_[b] = params_[b].gainDb.load(std::memory_order_relaxed);

        updateCoefficients(static_cast<Band>(b));

        for (int c = 0; c < channelCount_; ++c) {
            filters_[c][b].coefficients = coefficients_[b];
            filters_[c][b].reset();
        }
    }

    prepared_ = true;
}

void EQProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    if (bypassed_.load(std::memory_order_relaxed))
        return;

    const int channelsToProcess = std::min(channelCount, channelCount_);

    // Check parameters and update coefficients if needed
    for (int b = 0; b < NumBands; ++b) {
        const float targetFreq = params_[b].frequencyHz.load(std::memory_order_relaxed);
        const float targetQ = params_[b].q.load(std::memory_order_relaxed);
        const float targetGainDb = params_[b].gainDb.load(std::memory_order_relaxed);

        if (std::abs(currentFreqs_[b] - targetFreq) > 0.1f ||
            std::abs(currentQs_[b] - targetQ) > 0.01f ||
            std::abs(currentGainsDb_[b] - targetGainDb) > 0.01f) {
            
            currentFreqs_[b] = targetFreq;
            currentQs_[b] = targetQ;
            currentGainsDb_[b] = targetGainDb;

            updateCoefficients(static_cast<Band>(b));

            for (int c = 0; c < channelsToProcess; ++c) {
                filters_[c][b].coefficients = coefficients_[b];
            }
        }
    }

    // Process audio (channel loop outer, band loop inner)
    for (int c = 0; c < channelsToProcess; ++c) {
        float* channelData = channels[c];
        if (channelData == nullptr) continue;

        for (int b = 0; b < NumBands; ++b) {
            auto& filter = filters_[c][b];
            for (int s = 0; s < numSamples; ++s) {
                channelData[s] = filter.processSample(channelData[s]);
            }
        }
    }
}

void EQProcessor::reset() noexcept {
    for (int c = 0; c < channelCount_; ++c) {
        for (int b = 0; b < NumBands; ++b) {
            filters_[c][b].reset();
        }
    }
    
    for (int b = 0; b < NumBands; ++b) {
        currentFreqs_[b] = params_[b].frequencyHz.load(std::memory_order_relaxed);
        currentQs_[b] = params_[b].q.load(std::memory_order_relaxed);
        currentGainsDb_[b] = params_[b].gainDb.load(std::memory_order_relaxed);
    }
}

void EQProcessor::release() noexcept {
    prepared_ = false;
}

// =============================================================================
// Filter Parameters
// =============================================================================

void EQProcessor::setBandFrequency(Band band, float frequencyHz) noexcept {
    if (band < 0 || band >= NumBands) return;
    const float clamped = std::clamp(frequencyHz, kMinFrequencyHz, kMaxFrequencyHz);
    params_[band].frequencyHz.store(clamped, std::memory_order_relaxed);
}

float EQProcessor::getBandFrequency(Band band) const noexcept {
    if (band < 0 || band >= NumBands) return 0.0f;
    return params_[band].frequencyHz.load(std::memory_order_relaxed);
}

void EQProcessor::setBandQ(Band band, float q) noexcept {
    if (band < 0 || band >= NumBands) return;
    const float clamped = std::clamp(q, kMinQ, kMaxQ);
    params_[band].q.store(clamped, std::memory_order_relaxed);
}

float EQProcessor::getBandQ(Band band) const noexcept {
    if (band < 0 || band >= NumBands) return 0.0f;
    return params_[band].q.load(std::memory_order_relaxed);
}

void EQProcessor::setBandGainDb(Band band, float gainDb) noexcept {
    if (band < 0 || band >= NumBands) return;
    const float clamped = std::clamp(gainDb, kMinGainDb, kMaxGainDb);
    params_[band].gainDb.store(clamped, std::memory_order_relaxed);
}

float EQProcessor::getBandGainDb(Band band) const noexcept {
    if (band < 0 || band >= NumBands) return 0.0f;
    return params_[band].gainDb.load(std::memory_order_relaxed);
}

// =============================================================================
// Bypass
// =============================================================================

void EQProcessor::setBypass(bool bypassed) noexcept {
    bypassed_.store(bypassed, std::memory_order_relaxed);
}

bool EQProcessor::isBypassed() const noexcept {
    return bypassed_.load(std::memory_order_relaxed);
}

// =============================================================================
// Private
// =============================================================================

void EQProcessor::updateCoefficients(Band band) noexcept {
    const float nyquist = static_cast<float>(sampleRate_) * 0.5f;
    const float safeCutoff = std::min(currentFreqs_[band], nyquist * 0.99f);
    
    // JUCE filter coefficients expect linear gain multiplier (amplitude ratio)
    const float gainFactor = std::pow(10.0f, currentGainsDb_[band] / 20.0f);
    
    switch (band) {
        case LowShelf:
            coefficients_[band] = juce::dsp::IIR::Coefficients<float>::makeLowShelf(
                sampleRate_, static_cast<double>(safeCutoff), static_cast<double>(currentQs_[band]), gainFactor
            );
            break;
        case MidPeak:
            coefficients_[band] = juce::dsp::IIR::Coefficients<float>::makePeakFilter(
                sampleRate_, static_cast<double>(safeCutoff), static_cast<double>(currentQs_[band]), gainFactor
            );
            break;
        case HighShelf:
            coefficients_[band] = juce::dsp::IIR::Coefficients<float>::makeHighShelf(
                sampleRate_, static_cast<double>(safeCutoff), static_cast<double>(currentQs_[band]), gainFactor
            );
            break;
        default:
            break;
    }
}

} // namespace melodymeet
