#include "MasterGainProcessor.h"

#include <juce_core/juce_core.h>

#include <algorithm>
#include <cstring>

namespace melodymeet {

namespace {
    // The absolute minimum gain stored in targetGain_.
    // 1e-6f ≈ -120 dBFS — completely inaudible but non-zero, which means the
    // Linear SmoothedValue can always ramp back up from this value.
    // Without this floor, a caller sending gain=0.0 would silently brick the
    // smoother: even a Linear smoother that reaches exactly 0.0 would need an
    // explicit setCurrentAndTargetValue() call to restart, which can't happen
    // safely from the control thread while the audio thread is inside process().
    constexpr float kGainFloor = 1.0e-6f;   // -120 dBFS

    constexpr float kMinGainDb = -100.0f;
    constexpr float kMaxGainDb =   24.0f;

    // 50 ms ramp gives click-free transitions even for full-scale 0 → 1 jumps
    // at broadcast quality. 20 ms was too short for dramatic fader throws.
    constexpr double kRampSeconds = 0.05;
} // namespace

// -----------------------------------------------------------------------------
MasterGainProcessor::MasterGainProcessor() {
    smoothedGain_.setCurrentAndTargetValue(1.0f);
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    (void)maxBlockSize;

    sampleRate_   = sampleRate;
    channelCount_ = channelCount;
    prepared_     = (sampleRate_ > 0.0 && channelCount_ > 0);

    if (prepared_) {
        smoothedGain_.reset(sampleRate_, kRampSeconds);
        // Snap to the current target immediately on (re-)prepare so there is
        // no ramp artefact when the engine restarts or changes sample rate.
        smoothedGain_.setCurrentAndTargetValue(targetGain_.load(std::memory_order_relaxed));
    }
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    const bool bypassed    = bypass_.load(std::memory_order_relaxed);
    const float newTarget  = bypassed ? 1.0f : targetGain_.load(std::memory_order_relaxed);

    // Only call setTargetValue when the target actually changed.
    // Calling it unconditionally every block resets the ramp on every callback,
    // turning a smooth 50 ms fade into a series of restarted micro-ramps that
    // produce zipper noise during continuous slider movement.
    if (newTarget != smoothedGain_.getTargetValue()) {
        smoothedGain_.setTargetValue(newTarget);
    }

    const int channelsToProcess = std::min(channelCount, channelCount_);

    if (smoothedGain_.isSmoothing()) {
        // Per-sample path: advance the smoother and apply to every channel.
        for (int s = 0; s < numSamples; ++s) {
            const float gain = smoothedGain_.getNextValue();
            for (int ch = 0; ch < channelsToProcess; ++ch) {
                if (channels[ch])
                    channels[ch][s] *= gain;
            }
        }
    } else {
        // Gain is stable — apply as a block multiply for efficiency.
        const float gain = smoothedGain_.getCurrentValue();

        if (gain == 1.0f)
            return; // Unity gain — nothing to do.

        if (gain <= kGainFloor) {
            // Effectively silent. Zero the buffer explicitly rather than
            // multiplying by a subnormal, which prevents CPU spikes from
            // denormal arithmetic and ensures a clean output buffer.
            for (int ch = 0; ch < channelsToProcess; ++ch) {
                if (float* data = channels[ch])
                    std::memset(data, 0, static_cast<std::size_t>(numSamples) * sizeof(float));
            }
            return;
        }

        for (int ch = 0; ch < channelsToProcess; ++ch) {
            if (float* data = channels[ch])
                juce::FloatVectorOperations::multiply(data, gain, numSamples);
        }
    }
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::reset() noexcept {
    // Snap both current and target to the stored target without an audible
    // ramp. Called when the engine restarts playback or flushes DSP state.
    smoothedGain_.setCurrentAndTargetValue(targetGain_.load(std::memory_order_relaxed));
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::release() noexcept {
    prepared_ = false;
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::setGainLinear(float gainLinear) noexcept {
    // Clamp to [kGainFloor, 4.0]. Never store 0.0:
    //   - Below kGainFloor is inaudible (-120 dBFS).
    //   - Storing exactly 0.0 would require a setCurrentAndTargetValue()
    //     rescue call after any subsequent increase, which cannot be done
    //     safely from the audio thread.
    const float safe = std::clamp(gainLinear, kGainFloor, 4.0f);
    targetGain_.store(safe, std::memory_order_relaxed);
}

float MasterGainProcessor::getGainLinear() const noexcept {
    return targetGain_.load(std::memory_order_relaxed);
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::setGainDecibels(float gainDb) noexcept {
    const float clamped = std::clamp(gainDb, kMinGainDb, kMaxGainDb);
    setGainLinear(juce::Decibels::decibelsToGain(clamped, kMinGainDb));
}

float MasterGainProcessor::getGainDecibels() const noexcept {
    return juce::Decibels::gainToDecibels(getGainLinear(), kMinGainDb);
}

// -----------------------------------------------------------------------------
void MasterGainProcessor::setBypass(bool bypass) noexcept {
    bypass_.store(bypass, std::memory_order_relaxed);
}

bool MasterGainProcessor::isBypassed() const noexcept {
    return bypass_.load(std::memory_order_relaxed);
}

} // namespace melodymeet
