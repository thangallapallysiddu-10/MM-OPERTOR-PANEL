#pragma once

#include "../audio/AudioSource.h"
#include "../playback/PlaybackController.h"
#include "../playback/AudioFileManager.h"
#include "../playback/AudioFile.h"
#include "../core/BufferPool.h"
#include "../audio/dsp/ChannelDSPChain.h"

#include <memory>
#include <string>
#include <atomic>

namespace melodymeet {

/// Final integration of the Deck.
/// Wires PlaybackController to the AudioDecoder (via AudioFile).
/// Acts as an IAudioSource for the Mixer.
class DeckPlayer final : public AudioSource {
public:
    DeckPlayer(BufferPool& bufferPool);
    ~DeckPlayer() override;

    DeckPlayer(const DeckPlayer&) = delete;
    DeckPlayer& operator=(const DeckPlayer&) = delete;

    /// Loads an audio file using the FileManager.
    bool load(const std::string& path);

    // --- Transport API ---
    bool play() noexcept;
    bool pause() noexcept;
    void stop() noexcept;
    bool seek(double seconds) noexcept;
    void setLoop(bool loop) noexcept;
    bool isLooping() const noexcept;
    void setLoopRange(double startSeconds, double endSeconds) noexcept;
    void setCue(double seconds) noexcept;
    double getCue() const noexcept;
    bool jumpToCue() noexcept;
    void setPitch(float percent) noexcept;
    float getPitch() const noexcept;
    
    // --- State API ---
    bool isLoaded() const noexcept;
    PlaybackState::State getState() const noexcept;
    double getCurrentPosition() const noexcept;
    double getDuration() const noexcept;
    bool isPlaying() const noexcept;
    bool hasLoadFailed() const noexcept;

    // --- AudioSource API ---
    void prepare(double sampleRate, int maxBlockSize, int channelCount) override;
    void process(float* const* outputChannels, int channelCount, int numSamples) noexcept override;
    void reset() noexcept override;
    void release() noexcept override;
    bool isActive() const noexcept override;
    double getSampleRate() const noexcept override;
    int getChannelCount() const noexcept override;

    // --- DSP API ---
    ChannelDSPChain& getChannelDSPChain() noexcept;
    const ChannelDSPChain& getChannelDSPChain() const noexcept;

private:
    BufferPool& bufferPool_;
    PlaybackController controller_;
    AudioFileManager fileManager_;
    
    std::shared_ptr<AudioFile> audioFile_;
    std::atomic<AudioFile*> rawAudioFile_{nullptr};
    
    std::atomic<bool> processing_{false};
    std::atomic<bool> loadFailed_{false};

    double systemSampleRate_{0.0};
    int maxBlockSize_{0};
    int systemChannelCount_{0};

    ChannelDSPChain dspChain_;

    std::atomic<float> pitchPercent_{0.0f};
};

} // namespace melodymeet
