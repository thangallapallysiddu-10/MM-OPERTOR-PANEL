#pragma once

#include "DSPChain.h"
#include "IDspProcessor.h"

#include <memory>

namespace melodymeet {

/// Master processing chain for the final mixed program output.
///
/// MasterDSPChain owns a DSPChain internally and manages named processor
/// slots in a fixed processing order. Each slot is optional — if a processor
/// is not assigned, that slot is simply skipped during execution.
///
/// Default processing order:
///   1. Master Gain
///   2. Compressor
///   3. Limiter
///   4. Auxiliary (future processors)
///
/// This chain sits between the Mixer's program output and the downstream
/// consumers (Recorder, Broadcast, Metering). It processes audio in-place,
/// and new slots can be added to the enum without redesigning the pipeline.
///
/// Thread safety:
///   set/remove/enable/disable are called from the control thread.
///   process() is called from the audio thread (delegates to DSPChain).
///   No locks or allocations occur during process().
class MasterDSPChain final {
public:
    /// Named processing slots in execution order.
    enum class Slot {
        MasterGain,
        Compressor,
        Limiter,
        Auxiliary,

        Count   ///< Internal: number of slots. Must remain last.
    };

    MasterDSPChain() = default;
    ~MasterDSPChain() = default;

    MasterDSPChain(const MasterDSPChain&) = delete;
    MasterDSPChain& operator=(const MasterDSPChain&) = delete;
    MasterDSPChain(MasterDSPChain&&) = delete;
    MasterDSPChain& operator=(MasterDSPChain&&) = delete;

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
