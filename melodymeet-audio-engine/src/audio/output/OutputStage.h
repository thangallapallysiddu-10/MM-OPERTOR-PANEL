#pragma once

#include "../dsp/MasterDSPChain.h"
#include "../metering/MeterEngine.h"

#include <vector>

namespace melodymeet {

/// Master output processing stage.
///
/// OutputStage sits between the Mixer's Program Buffer and all downstream
/// consumers (Recorder, Broadcast, Monitor Output). It copies the mixed
/// Program Buffer into an internal processed buffer, applies the master
/// DSP chain in-place, and exposes the result for downstream consumption.
///
/// Processing order (applied by MasterDSPChain):
///   1. Master Gain
///   2. Compressor
///   3. Limiter
///   4. Auxiliary       (future)
///
/// Thread safety:
///   - prepare() and release() are called from the control thread.
///   - process(), reset(), and buffer accessors are called from the audio thread.
///   - No heap allocations, locks, file I/O, or logging during process().
///   - Internal buffer is pre-allocated during prepare().
class OutputStage final {
public:
    OutputStage();
    ~OutputStage() = default;

    OutputStage(const OutputStage&) = delete;
    OutputStage& operator=(const OutputStage&) = delete;
    OutputStage(OutputStage&&) = delete;
    OutputStage& operator=(OutputStage&&) = delete;

    // --- Lifecycle ---

    /// Pre-allocates the internal processed buffer and prepares the MasterDSPChain.
    void prepare(double sampleRate, int maxBlockSize, int channelCount);

    /// Releases all resources and resets the prepared state.
    void release() noexcept;

    /// Resets all internal DSP state without deallocating.
    void reset() noexcept;

    // --- Audio Thread API ---

    /// Copies the input buffer into the internal processed buffer,
    /// then applies the MasterDSPChain in-place.
    ///
    /// @param inputChannels  The Mixer's Program Buffer (read-only).
    /// @param channelCount   Number of channels in the input.
    /// @param numSamples     Number of samples per channel.
    void process(const float* const* inputChannels, int channelCount, int numSamples) noexcept;

    // --- Processed Buffer Access (Audio Thread) ---

    /// Returns the processed Program Buffer after master DSP has been applied.
    const float* const* getProcessedBuffer() const noexcept;

    /// Returns the number of channels in the processed buffer.
    int getProcessedChannelCount() const noexcept;

    // --- DSP Chain Access (Control Thread) ---

    /// Returns a reference to the MasterDSPChain for slot management.
    MasterDSPChain& getMasterDSPChain() noexcept;
    const MasterDSPChain& getMasterDSPChain() const noexcept;

    // --- Metering ---
    MeterEngine& getMeterEngine() noexcept { return meterEngine_; }
    const MeterEngine& getMeterEngine() const noexcept { return meterEngine_; }

private:
    MasterDSPChain masterChain_;
    MeterEngine meterEngine_;

    /// Flat interleaved storage for the processed buffer.
    std::vector<float> processedBuffer_;

    /// Per-channel pointers into processedBuffer_ (for float* const* interface).
    std::vector<float*> processedChannels_;

    /// Const-qualified pointers for the read-only accessor.
    std::vector<const float*> processedChannelsConst_;

    double sampleRate_{0.0};
    int maxBlockSize_{0};
    int channelCount_{0};
    bool prepared_{false};
};

} // namespace melodymeet
