#pragma once

#include "IDspProcessor.h"

#include <atomic>
#include <memory>
#include <mutex>
#include <vector>

namespace melodymeet {

/// Manages a sequential chain of IDspProcessor instances.
/// Guarantees completely real-time safe execution on the audio thread
/// while allowing dynamic insertion, removal, and toggling of processors
/// from the control thread using an RCU (Read-Copy-Update) strategy.
class DSPChain final {
public:
    DSPChain();
    ~DSPChain();

    DSPChain(const DSPChain&) = delete;
    DSPChain& operator=(const DSPChain&) = delete;
    DSPChain(DSPChain&&) = delete;
    DSPChain& operator=(DSPChain&&) = delete;

    // --- Audio Thread API ---

    /// Processes audio in-place through the entire active chain sequentially.
    void process(float* const* channels, int channelCount, int numSamples) noexcept;

    /// Copies input to output, then processes the output in-place through the chain.
    void process(const float* const* inputChannels, float* const* outputChannels, int channelCount, int numSamples) noexcept;

    // --- Control Thread API ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount);
    void release() noexcept;
    void reset() noexcept;

    /// Appends a processor to the end of the chain.
    bool addProcessor(std::shared_ptr<IDspProcessor> processor);

    /// Removes a specific processor from the chain.
    bool removeProcessor(const std::shared_ptr<IDspProcessor>& processor);

    /// Enables or disables a specific processor without removing it from the routing.
    bool setProcessorEnabled(const std::shared_ptr<IDspProcessor>& processor, bool enabled);

    /// Checks if a processor is currently enabled in the chain.
    bool isProcessorEnabled(const std::shared_ptr<IDspProcessor>& processor) const;

private:
    struct DSPNode {
        std::shared_ptr<IDspProcessor> processor;
        bool enabled{true};
    };

    // Lock-free RCU state for the audio thread.
    std::atomic<std::vector<DSPNode>*> activeChain_{nullptr};
    mutable std::atomic<bool> processing_{false};

    // Mutex protects control thread mutations to the chain.
    mutable std::mutex controlMutex_;

    double sampleRate_{0.0};
    int maxBlockSize_{0};
    int channelCount_{0};
    bool prepared_{false};
};

} // namespace melodymeet
