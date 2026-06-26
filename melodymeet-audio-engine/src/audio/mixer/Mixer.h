#pragma once

#include "MixerChannel.h"
#include "../AudioSource.h"

#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace melodymeet
{

/// Production-ready mixer subsystem for managing multiple audio sources.
///
/// The Mixer owns a fixed-capacity set of MixerChannels, each wrapping a
/// shared AudioSource. It provides the control-surface API for source
/// registration, gain staging, mute, solo, and enable/disable.
///
/// The Mixer itself implements AudioSource so it can participate in the
/// engine's audio graph as a composable processing node.
///
/// Design decisions:
///   - Fixed-size std::array avoids heap allocation on the audio thread.
///   - Sources are held via std::shared_ptr<AudioSource> for safe lifetime management.
///   - Channel IDs are monotonically increasing and never reused within a session.
///   - Solo logic uses exclusive-OR semantics: when any channel is soloed,
///     only soloed channels contribute to the mix.
///   - Program and scratch buffers are pre-allocated in prepare() so that
///     process() performs zero allocations and zero locking.
///
/// Supports mono and stereo sources.
///
/// Thread safety:
///   All mutating control methods are intended for the control thread.
///   The audio thread calls process() only.
///   No locks, no allocations, no file IO, no network IO on the audio thread.
class Mixer final : public AudioSource
{
public:
    using SourceId = MixerChannel::ChannelId;

    static constexpr SourceId invalidSourceId = MixerChannel::invalidChannelId;
    static constexpr std::size_t maxSources = 32;

    Mixer() = default;
    ~Mixer() override;

    Mixer(const Mixer&) = delete;
    Mixer& operator=(const Mixer&) = delete;
    Mixer(Mixer&&) = delete;
    Mixer& operator=(Mixer&&) = delete;

    // --- Source Registration ---

    /// Registers an audio source and returns its unique SourceId.
    /// Returns invalidSourceId if the mixer is at capacity or source is null.
    SourceId registerSource(std::shared_ptr<AudioSource> source) noexcept;

    /// Removes a previously registered source by its ID.
    /// Returns true if the source was found and removed.
    bool unregisterSource(SourceId sourceId) noexcept;

    /// Removes all registered sources.
    void clearSources() noexcept;

    /// Returns the number of currently registered sources.
    std::size_t getSourceCount() const noexcept;

    /// Returns true if a source with the given ID exists.
    bool hasSource(SourceId sourceId) const noexcept;

    // --- Channel Control ---

    /// Sets the gain for a source. Gain is clamped to [0.0, 4.0].
    /// Returns true if the source was found.
    bool setGain(SourceId sourceId, float gain) noexcept;

    /// Returns the gain for a source, or 0.0f if not found.
    float getGain(SourceId sourceId) const noexcept;

    /// Sets the mute state for a source.
    /// Returns true if the source was found.
    bool setMute(SourceId sourceId, bool muted) noexcept;

    /// Returns true if the source is muted.
    bool isMuted(SourceId sourceId) const noexcept;

    /// Sets the solo state for a source.
    /// Returns true if the source was found.
    bool setSolo(SourceId sourceId, bool soloed) noexcept;

    /// Returns true if the source is soloed.
    bool isSoloed(SourceId sourceId) const noexcept;

    /// Enables a source.
    /// Returns true if the source was found.
    bool enableSource(SourceId sourceId) noexcept;

    /// Disables a source.
    /// Returns true if the source was found.
    bool disableSource(SourceId sourceId) noexcept;

    /// Returns true if the source is enabled.
    bool isSourceEnabled(SourceId sourceId) const noexcept;

    // --- Read-only Channel Access ---

    /// Returns a const pointer to the MixerChannel for the given source ID.
    /// Returns nullptr if the source is not found.
    const MixerChannel* getChannel(SourceId sourceId) const noexcept;

    /// Returns true if any registered source is currently soloed.
    bool hasSoloedSource() const noexcept;

    // --- Deck-Aware Mixer Control API (Frozen) ---

    /// Assigns the SourceIds for Deck A and Deck B so the Mixer can apply
    /// crossfade mathematics internally.
    void setDeckSourceIds(SourceId deckAId, SourceId deckBId) noexcept;

    /// Sets the crossfade position (0.0 = full Deck A, 100.0 = full Deck B).
    /// Internally applies constant-power (cos/sin) curve.
    void setCrossfade(float value) noexcept;

    /// Sets the base gain for a named deck ("A" or "B"). Clamped to [0.0, 4.0].
    void setDeckGain(const std::string& deckId, float gain) noexcept;

    /// Sets the master output gain. Clamped to [0.0, 4.0].
    void setMasterGain(float gain) noexcept;

    /// Mutes/unmutes a named deck.
    void muteDeck(const std::string& deckId, bool muted) noexcept;

    /// Solos/unsolos a named deck.
    void soloDeck(const std::string& deckId, bool soloed) noexcept;

    /// Resets all mixer state to defaults.
    void resetMixer() noexcept;

    /// Snapshot of the current mixer state for UI consumption.
    struct MixerSnapshot {
        float deckAGain;
        float deckBGain;
        float masterGain;
        float crossfade;
        bool deckAMuted;
        bool deckBMuted;
        bool deckASolo;
        bool deckBSolo;
        bool soloActive;
    };

    /// Returns a snapshot of the current mixer state.
    MixerSnapshot getMixerSnapshot() const noexcept;

    /// Returns the current configuration version of the mixer.
    uint64_t getVersion() const noexcept { return version_.load(std::memory_order_relaxed); }

    // --- AudioSource Interface ---

    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void release() noexcept override;
    void process(float* const* outputChannels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;

    bool isActive() const noexcept override;
    double getSampleRate() const noexcept override;
    int getChannelCount() const noexcept override;

    // --- Program Output ---

    /// Returns a non-owning pointer to the internal program buffer channel array.
    const float* const* getProgramBuffer() const noexcept;

    /// Returns the number of channels in the program buffer.
    int getProgramChannelCount() const noexcept;

    /// Returns a pointer to the internal program buffer for a single channel.
    const float* getOutputChannelData(int channel) const noexcept;

    /// Returns the maximum block size set during prepare().
    int getOutputBufferSize() const noexcept;

private:
    MixerChannel* findChannel(SourceId sourceId) noexcept;
    const MixerChannel* findChannel(SourceId sourceId) const noexcept;

    /// Resolves a deck name to its SourceId. Returns invalidSourceId on mismatch.
    SourceId resolveDeckId(const std::string& deckId) const noexcept;

    /// Recalculates effective gains for both decks based on base gain × crossfade.
    void updateEffectiveGains() noexcept;

    /// Clears the program buffer to silence for the given number of samples.
    void clearProgramBuffer(int numSamples) noexcept;

    /// Copies the internal program buffer into the caller-provided output buffers.
    void copyProgramBufferTo(float* const* outputChannels, int channelCount, int numSamples) const noexcept;

    std::array<MixerChannel, maxSources> channels_ = {};

    // Pre-allocated buffers — sized during prepare(), never resized on the audio thread.
    std::vector<float> programBuffer_;
    std::vector<float> scratchBuffer_;
    std::vector<float*> programChannels_;
    std::vector<float*> scratchChannels_;

    double sampleRate_ = 0.0;
    int maxBlockSize_ = 0;
    int channelCount_ = 0;
    std::size_t sourceCount_ = 0;
    SourceId nextSourceId_ = 1;
    bool prepared_ = false;

    // --- Crossfade & Gain State (owned by Mixer) ---
    SourceId deckASourceId_ = invalidSourceId;
    SourceId deckBSourceId_ = invalidSourceId;
    std::atomic<float> crossfade_{50.0f};       // 0 = full A, 100 = full B
    std::atomic<float> deckABaseGain_{1.0f};
    std::atomic<float> deckBBaseGain_{1.0f};
    std::atomic<float> masterGain_{1.0f};
    
    std::atomic<uint64_t> version_{0};
};

} // namespace melodymeet
