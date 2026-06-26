#pragma once

namespace melodymeet {

/// Abstract interface for real-time digital signal processors.
/// Any future effect (EQ, Compressor, etc.) must implement this interface
/// to be registered within the DSPChain.
class IDspProcessor {
public:
    virtual ~IDspProcessor() = default;

    /// Prepares the processor for playback, allowing it to allocate resources.
    virtual void prepare(double sampleRate, int maxBlockSize, int channelCount) = 0;

    /// Processes audio data in-place. Must be strictly real-time safe.
    virtual void process(float* const* channels, int channelCount, int numSamples) noexcept = 0;

    /// Resets internal processing state (e.g., delay lines, envelopes) to silence.
    virtual void reset() noexcept = 0;

    /// Releases any heavy resources allocated during prepare().
    virtual void release() noexcept = 0;
};

} // namespace melodymeet
