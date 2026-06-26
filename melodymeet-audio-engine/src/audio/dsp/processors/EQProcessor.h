#pragma once

#include "../IDspProcessor.h"

#include <juce_dsp/juce_dsp.h>

#include <array>
#include <atomic>

namespace melodymeet {

/// Production-quality 3-Band Equalizer processor.
///
/// Implements a Low Shelf, Mid Peak, and High Shelf filter in series.
/// Supports smooth parameter updates by recalculating coefficients
/// at the start of each process() block when parameters change.
/// The IIR filter state is preserved across coefficient updates to
/// ensure seamless, click-free transitions.
///
/// Thread safety:
///   setBand*()/setBypass are called from the control thread.
///   process() reads targets via atomics and applies filter coefficients locally.
///   No locks or allocations occur during process().
class EQProcessor final : public IDspProcessor {
public:
    enum Band {
        LowShelf = 0,
        MidPeak,
        HighShelf,

        NumBands
    };

    static constexpr int kMaxChannels = 8;
    static constexpr float kMinFrequencyHz = 20.0f;
    static constexpr float kMaxFrequencyHz = 20000.0f;
    static constexpr float kMinQ = 0.1f;
    static constexpr float kMaxQ = 10.0f;
    static constexpr float kMinGainDb = -24.0f;
    static constexpr float kMaxGainDb = 24.0f;

    EQProcessor();
    ~EQProcessor() override = default;

    EQProcessor(const EQProcessor&) = delete;
    EQProcessor& operator=(const EQProcessor&) = delete;
    EQProcessor(EQProcessor&&) = delete;
    EQProcessor& operator=(EQProcessor&&) = delete;

    // --- IDspProcessor interface ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* channels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    // --- Filter parameters ---

    void setBandFrequency(Band band, float frequencyHz) noexcept;
    float getBandFrequency(Band band) const noexcept;

    void setBandQ(Band band, float q) noexcept;
    float getBandQ(Band band) const noexcept;

    void setBandGainDb(Band band, float gainDb) noexcept;
    float getBandGainDb(Band band) const noexcept;

    // --- Bypass ---

    void setBypass(bool bypassed) noexcept;
    bool isBypassed() const noexcept;

private:
    void updateCoefficients(Band band) noexcept;

    struct BandParams {
        std::atomic<float> frequencyHz{1000.0f};
        std::atomic<float> q{0.707f};
        std::atomic<float> gainDb{0.0f};
    };

    std::array<BandParams, NumBands> params_;

    std::array<float, NumBands> currentFreqs_;
    std::array<float, NumBands> currentQs_;
    std::array<float, NumBands> currentGainsDb_;

    std::atomic<bool> bypassed_{false};

    double sampleRate_{44100.0};
    int channelCount_{0};
    bool prepared_{false};

    /// Per-channel IIR filter instances for each band.
    std::array<std::array<juce::dsp::IIR::Filter<float>, NumBands>, kMaxChannels> filters_;

    /// Shared coefficients pointer used by all channel filters for each band.
    std::array<juce::dsp::IIR::Coefficients<float>::Ptr, NumBands> coefficients_;
};

} // namespace melodymeet
