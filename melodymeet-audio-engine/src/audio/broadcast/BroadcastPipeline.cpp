#include "BroadcastPipeline.h"

namespace melodymeet {

void BroadcastPipeline::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0);

    if (prepared_) {
        for (int i = 0; i < kMaxConsumers; ++i) {
            if (auto consumer = activeConsumers_[i]) {
                consumer->prepare(sampleRate_, maxBlockSize_, channelCount_);
            }
        }
    }
}

void BroadcastPipeline::reset() noexcept {
    for (int i = 0; i < kMaxConsumers; ++i) {
        if (auto consumer = activeConsumers_[i]) {
            consumer->reset();
        }
    }
}

void BroadcastPipeline::release() noexcept {
    for (int i = 0; i < kMaxConsumers; ++i) {
        if (auto consumer = activeConsumers_[i]) {
            consumer->release();
        }
    }
    prepared_ = false;
}

void BroadcastPipeline::process(const float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || channels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    // Iterate over the lock-free array and process active consumers
    for (int i = 0; i < kMaxConsumers; ++i) {
        if (BroadcastConsumer* consumer = audioThreadConsumers_[i].load(std::memory_order_acquire)) {
            consumer->process(channels, channelCount, numSamples);
        }
    }
}

bool BroadcastPipeline::registerConsumer(std::shared_ptr<BroadcastConsumer> consumer) {
    if (!consumer)
        return false;

    // Check if already registered
    for (int i = 0; i < kMaxConsumers; ++i) {
        if (activeConsumers_[i] == consumer) {
            return false; 
        }
    }

    // Find an empty slot
    for (int i = 0; i < kMaxConsumers; ++i) {
        if (!activeConsumers_[i]) {
            // Keep the shared_ptr alive to maintain ownership
            activeConsumers_[i] = consumer;

            // If the pipeline is already prepared, prepare the new consumer
            if (prepared_) {
                consumer->prepare(sampleRate_, maxBlockSize_, channelCount_);
            }

            // Expose the raw pointer to the audio thread lock-free
            audioThreadConsumers_[i].store(consumer.get(), std::memory_order_release);
            return true;
        }
    }

    // Pipeline full
    return false;
}

bool BroadcastPipeline::unregisterConsumer(std::shared_ptr<BroadcastConsumer> consumer) {
    if (!consumer)
        return false;

    for (int i = 0; i < kMaxConsumers; ++i) {
        if (activeConsumers_[i] == consumer) {
            // Unpublish from the audio thread first
            audioThreadConsumers_[i].store(nullptr, std::memory_order_release);

            // Wait/ensure no one is executing it?
            // In a strict real-time system, we would defer deletion using a garbage collector.
            // But since the audio callback runs synchronously relative to the host, 
            // the pointer removal will take effect on the next callback.
            // Resetting activeConsumers_[i] drops the refcount.
            activeConsumers_[i].reset();
            return true;
        }
    }

    return false;
}

void BroadcastPipeline::unregisterAllConsumers() {
    for (int i = 0; i < kMaxConsumers; ++i) {
        audioThreadConsumers_[i].store(nullptr, std::memory_order_release);
        activeConsumers_[i].reset();
    }
}

} // namespace melodymeet
