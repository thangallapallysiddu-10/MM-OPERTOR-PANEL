#include "MasterDSPChain.h"

namespace melodymeet {

// =============================================================================
// Lifecycle
// =============================================================================

void MasterDSPChain::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0);

    chain_.prepare(sampleRate, maxBlockSize, channelCount);
}

void MasterDSPChain::release() noexcept {
    chain_.release();
    prepared_ = false;
}

void MasterDSPChain::reset() noexcept {
    chain_.reset();
}

// =============================================================================
// Audio Thread API
// =============================================================================

void MasterDSPChain::process(float* const* channels, int channelCount, int numSamples) noexcept {
    chain_.process(channels, channelCount, numSamples);
}

// =============================================================================
// Slot Management (Control Thread)
// =============================================================================

bool MasterDSPChain::setProcessor(Slot slot, std::shared_ptr<IDspProcessor> processor) {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount || !processor)
        return false;

    if (slots_[index].processor) {
        chain_.removeProcessor(slots_[index].processor);
    }

    slots_[index].processor = std::move(processor);
    slots_[index].enabled = true;

    rebuildChain();
    return true;
}

bool MasterDSPChain::removeProcessor(Slot slot) {
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

std::shared_ptr<IDspProcessor> MasterDSPChain::getProcessor(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return nullptr;

    return slots_[index].processor;
}

bool MasterDSPChain::setSlotEnabled(Slot slot, bool enabled) {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    if (!slots_[index].processor)
        return false;

    slots_[index].enabled = enabled;
    return chain_.setProcessorEnabled(slots_[index].processor, enabled);
}

bool MasterDSPChain::isSlotEnabled(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    if (!slots_[index].processor)
        return false;

    return slots_[index].enabled;
}

bool MasterDSPChain::hasProcessor(Slot slot) const noexcept {
    const int index = static_cast<int>(slot);
    if (index < 0 || index >= kSlotCount)
        return false;

    return slots_[index].processor != nullptr;
}

// =============================================================================
// Private
// =============================================================================

void MasterDSPChain::rebuildChain() {
    // Remove all existing processors from the underlying DSPChain.
    for (int i = 0; i < kSlotCount; ++i) {
        if (slots_[i].processor) {
            chain_.removeProcessor(slots_[i].processor);
        }
    }

    // Re-add processors in strict slot order (MasterGain → Compressor → Limiter → Aux).
    for (int i = 0; i < kSlotCount; ++i) {
        if (slots_[i].processor) {
            chain_.addProcessor(slots_[i].processor);
            chain_.setProcessorEnabled(slots_[i].processor, slots_[i].enabled);
        }
    }
}

} // namespace melodymeet
