#pragma once

#include "../AudioSource.h"

#include <atomic>
#include <cstdint>
#include <memory>

namespace melodymeet
{

/// Represents a single channel within the Mixer.
///
/// Each MixerChannel wraps a shared AudioSource and stores per-channel
/// mix parameters: enabled, gain, mute, and solo.
///
/// Thread safety:
///   Configuration methods are called from the control thread.
///   The audio thread accesses state via atomic variables.
///   Lifetime of the AudioSource is carefully managed using a hazard-pointer
///   style processing flag to ensure the source is never destroyed while
///   the audio thread is executing its process() method.
class MixerChannel final
{
public:
    using ChannelId = std::uint32_t;

    static constexpr ChannelId invalidChannelId = 0;
    static constexpr float defaultGain = 1.0f;
    static constexpr float minGain = 0.0f;
    static constexpr float maxGain = 4.0f;

    MixerChannel() = default;
    ~MixerChannel() = default;

    MixerChannel(const MixerChannel&) = delete;
    MixerChannel& operator=(const MixerChannel&) = delete;
    MixerChannel(MixerChannel&&) = delete;
    MixerChannel& operator=(MixerChannel&&) = delete;

    // --- Initialization ---

    /// Assigns a source and channel ID. Called once when registering with the Mixer.
    void assign(ChannelId id, std::shared_ptr<AudioSource> source) noexcept;

    /// Clears the channel, releasing the source and resetting all parameters.
    void clear() noexcept;

    /// Returns true if this channel has an assigned source.
    bool isAssigned() const noexcept;

    // --- Accessors ---

    ChannelId getChannelId() const noexcept;
    const std::shared_ptr<AudioSource>& getSource() const noexcept;

    // --- Real-Time Audio Thread API ---

    AudioSource* getSourcePointer() const noexcept;
    void deactivate() noexcept;
    
    void markProcessing() const noexcept;
    void unmarkProcessing() const noexcept;
    bool isProcessing() const noexcept;

    // --- Channel Parameters ---

    void setEnabled(bool enabled) noexcept;
    bool isEnabled() const noexcept;

    void setGain(float gain) noexcept;
    float getGain() const noexcept;

    void setMuted(bool muted) noexcept;
    bool isMuted() const noexcept;

    void setSoloed(bool soloed) noexcept;
    bool isSoloed() const noexcept;

    void setPFL(bool pfl) noexcept;
    bool isPFL() const noexcept;

    /// Returns true if this channel should contribute to the mix output.
    bool isContributing() const noexcept;

private:
    std::atomic<ChannelId> channelId_{invalidChannelId};
    std::shared_ptr<AudioSource> source_;
    std::atomic<AudioSource*> rawSource_{nullptr};
    std::atomic<float> gain_{defaultGain};
    std::atomic<bool> enabled_{true};
    std::atomic<bool> muted_{false};
    std::atomic<bool> soloed_{false};
    std::atomic<bool> pfl_{false};
    mutable std::atomic<bool> processing_{false};
};

/// RAII guard to mark a channel as processing on the audio thread.
class ScopedProcessingMark final
{
public:
    explicit ScopedProcessingMark(const MixerChannel& channel) noexcept
        : channel_(channel)
    {
        channel_.markProcessing();
    }

    ~ScopedProcessingMark()
    {
        channel_.unmarkProcessing();
    }

    ScopedProcessingMark(const ScopedProcessingMark&) = delete;
    ScopedProcessingMark& operator=(const ScopedProcessingMark&) = delete;
    ScopedProcessingMark(ScopedProcessingMark&&) = delete;
    ScopedProcessingMark& operator=(ScopedProcessingMark&&) = delete;

private:
    const MixerChannel& channel_;
};

} // namespace melodymeet
