#pragma once

#include "DSPChain.h"
#include "IDspProcessor.h"

#include <memory>

namespace melodymeet {

/// A reusable, per-channel DSP processing pipeline with enforced slot ordering.
///
/// ChannelDSPChain owns a DSPChain internally and manages named processor
/// slots in a fixed processing order. Each slot is optional — if a processor
/// is not assigned, that slot is simply skipped during execution.
///
/// Default processing order:
///   1. Gain
///   2. High Pass Filter
///   3. Low Pass Filter
///   4. Equalizer
///   5. Auxiliary (future processors)
///
/// When a processor is set into a slot, the internal DSPChain is rebuilt
/// to maintain the correct ordering. This rebuild happens on the control
/// thread only and is real-time safe on the audio thread via the underlying
/// DSPChain's RCU mechanism.
///
/// Thread safety:
///   set/remove/enable/disable are called from the control thread.
///   process() is called from the audio thread (delegates to DSPChain).
///   No locks or allocations occur during process().
class ChannelDSPChain final {
public:
    /// Named processing slots in execution order.
    enum class Slot {
        Gain,
        NoiseGate,
        HighPassFilter,
        LowPassFilter,
        Compressor,
        Equalizer,
        Delay,
        Limiter,
        Auxiliary,

        Count   ///< Internal: number of slots. Must remain last.
    };

    ChannelDSPChain() = default;
    ~ChannelDSPChain() = default;

    ChannelDSPChain(const ChannelDSPChain&) = delete;
    ChannelDSPChain& operator=(const ChannelDSPChain&) = delete;
    ChannelDSPChain(ChannelDSPChain&&) = delete;
    ChannelDSPChain& operator=(ChannelDSPChain&&) = delete;

    // --- Lifecycle ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount);
    void release() noexcept;
    void reset() noexcept;

    // --- Audio Thread API ---

    /// Processes audio in-place through all active slots in order.
    void process(float* const* channels, int channelCount, int numSamples) noexcept;

    // --- Slot Management (Control Thread) ---

    /// Assigns a processor to the specified slot.
    /// If the slot already has a processor, it is replaced.
    /// The internal chain is rebuilt to maintain correct ordering.
    bool setProcessor(Slot slot, std::shared_ptr<IDspProcessor> processor);

    /// Removes the processor from the specified slot.
    bool removeProcessor(Slot slot);

    /// Returns the processor currently assigned to a slot, or nullptr.
    std::shared_ptr<IDspProcessor> getProcessor(Slot slot) const noexcept;

    /// Enables or disables the processor in the specified slot.
    bool setSlotEnabled(Slot slot, bool enabled);

    /// Returns whether the processor in the specified slot is enabled.
    bool isSlotEnabled(Slot slot) const noexcept;

    /// Returns true if a processor is assigned to the specified slot.
    bool hasProcessor(Slot slot) const noexcept;

private:
    static constexpr int kSlotCount = static_cast<int>(Slot::Count);

    /// Rebuilds the underlying DSPChain from the current slot assignments
    /// in the correct processing order.
    void rebuildChain();

    struct SlotEntry {
        std::shared_ptr<IDspProcessor> processor;
        bool enabled{true};
    };

    SlotEntry slots_[kSlotCount]{};
    DSPChain chain_;

    double sampleRate_{0.0};
    int maxBlockSize_{0};
    int channelCount_{0};
    bool prepared_{false};
};

} // namespace melodymeet
