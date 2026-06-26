#pragma once

#include "../AudioSource.h"
#include "../dsp/ChannelDSPChain.h"
#include "../metering/MeterEngine.h"

#include <juce_core/juce_core.h>

#include <atomic>
#include <vector>

namespace melodymeet {

/// MicrophoneSource integrates captured live audio into the engine.
/// It implements AudioSource so it can be routed directly into the Mixer,
/// indistinguishable from a DeckPlayer.
///
/// Uses a lock-free FIFO (juce::AbstractFifo) to safely cross the thread
/// boundary between the input capture callback and the engine's audio callback.
///
/// Thread safety:
///   pushAudio()  — called from the input device callback thread
///   process()    — called from the engine output callback thread
///   Control API  — called from the control/UI thread
///   All paths use atomics only. Zero locks, zero allocations.
class MicrophoneSource final : public AudioSource {
public:
    MicrophoneSource();
    ~MicrophoneSource() override;

    MicrophoneSource(const MicrophoneSource&) = delete;
    MicrophoneSource& operator=(const MicrophoneSource&) = delete;

    // --- AudioSource Implementation (Engine Audio Thread) ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* outputChannels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;

    bool isActive() const noexcept override;
    double getSampleRate() const noexcept override;
    int getChannelCount() const noexcept override;

    // --- Input Thread API ---

    /// Pushes captured audio from the input device callback into the internal FIFO.
    /// Completely lock-free and real-time safe.
    /// If the FIFO is full, samples are silently dropped (overflow).
    void pushAudio(const float* const* inputChannels, int numInputChannels, int numSamples) noexcept;

    // --- Control API ---

    void setEnabled(bool enabled) noexcept;
    bool isEnabled() const noexcept;

    void setMuted(bool muted) noexcept;
    bool isMuted() const noexcept;

    void setGain(float gainLinear) noexcept;
    float getGain() const noexcept;

    uint64_t getVersion() const noexcept { return version_.load(std::memory_order_relaxed); }

    // --- DSP API ---
    ChannelDSPChain& getChannelDSPChain() noexcept;
    const ChannelDSPChain& getChannelDSPChain() const noexcept;

    MeterEngine& getMeterEngine() noexcept;
    const MeterEngine& getMeterEngine() const noexcept;

    /// Sets the FIFO buffer duration in seconds. Must be called before prepare().
    /// Defaults to 0.1 (100ms).
    void setBufferDuration(double seconds) noexcept;

private:
    std::atomic<bool> enabled_{false};
    std::atomic<bool> muted_{false};
    std::atomic<float> gain_{1.0f};

    double sampleRate_{0.0};
    int channelCount_{2};
    int maxBlockSize_{0};
    bool prepared_{false};

    double bufferDurationSeconds_{0.1};

    // Lock-free FIFO for crossing the thread boundary.
    // Stores interleaved samples: [ch0_s0, ch1_s0, ch0_s1, ch1_s1, ...]
    juce::AbstractFifo fifo_{1024};
    std::vector<float> fifoBuffer_;
    int numFifoChannels_{2};

    ChannelDSPChain dspChain_;
    MeterEngine meterEngine_;
    
    std::atomic<uint64_t> version_{0};
};

} // namespace melodymeet
