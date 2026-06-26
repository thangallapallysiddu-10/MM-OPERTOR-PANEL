#include "ChannelDSPChain.h"

namespace melodymeet {

// =============================================================================
// Lifecycle
// =============================================================================

void ChannelDSPChain::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0);

    chain_.prepare(sampleRate, maxBlockSize, channelCount);
}

void ChannelDSPChain::release() noexcept {
    chain_.release();
    prepared_ = false;
}

void ChannelDSPChain::reset() noexcept {
    chain_.reset();
}

// =============================================================================
// Audio Thread API
// =============================================================================

void ChannelDSPChain::process(float* const* channels, int channelCount, int numSamples) noexcept {
    chain_.process(channels, channelCount, numSamples);
}

// =============================================================================
// Slot Management (Control Thread)
// =============================================================================

bool ChannelDSPChain::setProcessor(Slot slot, std::shared_ptr<IDspProcessor> processor) {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount || !processor)
        return false;

    // If this slot already has a processor, remove it from the chain first.
    if (slots_[index].processor) {
        chain_.removeProcessor(slots_[index].processor);
    }

    slots_[index].processor = std::move(processor);
    slots_[index].enabled = true;

    // Rebuild the underlying DSPChain in correct slot order.
    rebuildChain();
    return true;
}

bool ChannelDSPChain::removeProcessor(Slot slot) {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    if (!slots_[index].processor)
        return false;

    chain_.removeProcessor(slots_[index].processor);
    slots_[index].processor.reset();
    slots_[index].enabled = true;

    return true;
}

std::shared_ptr<IDspProcessor> ChannelDSPChain::getProcessor(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return nullptr;

    return slots_[index].processor;
}

bool ChannelDSPChain::setSlotEnabled(Slot slot, bool enabled) {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    if (!slots_[index].processor)
        return false;

    slots_[index].enabled = enabled;
    return chain_.setProcessorEnabled(slots_[index].processor, enabled);
}

bool ChannelDSPChain::isSlotEnabled(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    if (!slots_[index].processor)
        return false;

    return slots_[index].enabled;
}

bool ChannelDSPChain::hasProcessor(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    return slots_[index].processor != nullptr;
}

// =============================================================================
// Private
// =============================================================================

void ChannelDSPChain::rebuildChain() {
    // Remove all existing processors from the underlying DSPChain.
    for (int i = 0; i < kSlotCount; ++i) {
        if (slots_[i].processor) {
            chain_.removeProcessor(slots_[i].processor);
        }
    }

    // Re-add processors in strict slot order (Gain → HPF → LPF → EQ → Aux).
    // This guarantees the DSPChain's internal vector always reflects the
    // correct processing sequence regardless of the order setProcessor() was called.
    for (int i = 0; i < kSlotCount; ++i) {
        if (slots_[i].processor) {
            chain_.addProcessor(slots_[i].processor);
            chain_.setProcessorEnabled(slots_[i].processor, slots_[i].enabled);
        }
    }
}

} // namespace melodymeet
