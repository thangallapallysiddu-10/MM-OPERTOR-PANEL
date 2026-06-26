#pragma once

namespace melodymeet {

/// Abstract interface for broadcast consumers (e.g., Icecast, RTMP, File recorders).
/// Consumers are registered with the BroadcastPipeline to receive the final
/// processed Program Bus audio data.
class BroadcastConsumer {
public:
    virtual ~BroadcastConsumer() = default;

    /// Prepares the consumer with the engine's current format.
    virtual void prepare(double sampleRate, int maxBlockSize, int channelCount) = 0;

    /// Processes audio data. The input data is READ-ONLY.
    /// This is called on the audio thread and must be completely real-time safe.
    virtual void process(const float* const* channels, int channelCount, int numSamples) noexcept = 0;

    /// Resets any internal state (e.g., encoders, network buffers).
    virtual void reset() noexcept = 0;

    /// Releases resources when the engine shuts down.
    virtual void release() noexcept = 0;
};

} // namespace melodymeet
