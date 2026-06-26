#pragma once

#include "BroadcastConsumer.h"

#include <atomic>
#include <memory>

namespace melodymeet {

/// Internal routing pipeline for broadcast consumers.
///
/// The BroadcastPipeline receives the final mixed and processed Program Bus
/// audio data and distributes it to registered BroadcastConsumers.
///
/// Thread safety:
/// - Consumer registration/unregistration happens on the control thread.
/// - process() is executed on the audio thread.
/// - To satisfy real-time constraints, a lock-free fixed-size array of
///   atomic pointers is used internally. No heap allocations or locks occur.
class BroadcastPipeline final {
public:
    BroadcastPipeline() = default;
    ~BroadcastPipeline() = default;

    BroadcastPipeline(const BroadcastPipeline&) = delete;
    BroadcastPipeline& operator=(const BroadcastPipeline&) = delete;
    BroadcastPipeline(BroadcastPipeline&&) = delete;
    BroadcastPipeline& operator=(BroadcastPipeline&&) = delete;

    // --- Lifecycle ---

    /// Prepares the pipeline and delegates to all registered consumers.
    void prepare(double sampleRate, int maxBlockSize, int channelCount);

    /// Resets the pipeline and all registered consumers.
    void reset() noexcept;

    /// Releases the pipeline resources and all registered consumers.
    void release() noexcept;

    // --- Audio Thread API ---

    /// Distributes the provided audio data to all active consumers.
    /// This is completely lock-free and allocation-free.
    /// @param channels The final processed Program Bus data (read-only).
    void process(const float* const* channels, int channelCount, int numSamples) noexcept;

    // --- Consumer Management (Control Thread) ---

    /// Registers a consumer to receive audio data.
    /// Returns true if registered successfully, false if the pipeline is full
    /// or if the consumer is already registered.
    bool registerConsumer(std::shared_ptr<BroadcastConsumer> consumer);

    /// Unregisters a consumer from the pipeline.
    /// Returns true if removed, false if it was not found.
    bool unregisterConsumer(std::shared_ptr<BroadcastConsumer> consumer);

    /// Removes all registered consumers.
    void unregisterAllConsumers();

    /// Returns the number of currently registered consumers.
    int getActiveConsumerCount() const noexcept
    {
        int count = 0;
        for (int i = 0; i < kMaxConsumers; ++i)
        {
            if (activeConsumers_[i] != nullptr)
                ++count;
        }
        return count;
    }

private:
    static constexpr int kMaxConsumers = 16;

    // We store the shared_ptrs here to maintain lifecycle ownership
    // on the control thread.
    std::shared_ptr<BroadcastConsumer> activeConsumers_[kMaxConsumers];

    // Atomic raw pointers read by the audio thread. This ensures lock-free
    // access without the overhead/contention of atomic shared_ptrs.
    std::atomic<BroadcastConsumer*> audioThreadConsumers_[kMaxConsumers]{};

    double sampleRate_{0.0};
    int maxBlockSize_{0};
    int channelCount_{0};
    bool prepared_{false};
};

} // namespace melodymeet
