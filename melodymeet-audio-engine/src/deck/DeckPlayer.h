#pragma once

#include "../audio/AudioSource.h"
#include "../playback/PlaybackController.h"
#include "../playback/AudioFileManager.h"
#include "../playback/AudioFile.h"
#include "../core/BufferPool.h"
#include "../audio/dsp/ChannelDSPChain.h"
#include "../audio/metering/MeterEngine.h"

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

namespace melodymeet {

/// Final integration of the Deck.
/// Wires PlaybackController to the AudioDecoder (via AudioFile).
/// Acts as an IAudioSource for the Mixer.
///
/// File loading is performed on a private background thread so that the
/// Node.js / Electron main thread is never blocked by disk I/O or MP3
/// decoding (which can take 200–500 ms for long tracks).
///
/// The public API surface is unchanged: load() returns immediately.
/// The audio thread continues to see the previous file (or silence) until
/// the new file is fully decoded, at which point the atomic pointer swap
/// makes it available without any lock on the audio path.
class DeckPlayer final : public AudioSource {
public:
    explicit DeckPlayer(BufferPool& bufferPool);
    ~DeckPlayer() override;

    DeckPlayer(const DeckPlayer&) = delete;
    DeckPlayer& operator=(const DeckPlayer&) = delete;

    /// Enqueues an async file load and returns immediately.
    /// The deck transitions to isLoaded()==true once decoding completes.
    /// Returns false only if the path is empty or another load is already
    /// in progress (the caller should wait or unload first).
    bool load(const std::string& path);

    /// Returns true if a background load is currently running.
    bool isLoading() const noexcept;

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
    MeterEngine& getMeterEngine() noexcept;
    const MeterEngine& getMeterEngine() const noexcept;

private:
    /// Runs on the loader thread: decodes the file and atomically installs it.
    void loaderThreadFunc(std::string path);

    /// Joins any in-flight loader thread. Safe to call from any non-audio thread.
    void joinLoaderThread() noexcept;

    BufferPool& bufferPool_;
    PlaybackController controller_;
    AudioFileManager fileManager_;

    // Owning handle for the loaded file. Only written from the loader thread
    // (after the audio thread has been fenced out of the old pointer).
    std::shared_ptr<AudioFile> audioFile_;

    // Lock-free pointer read by the audio thread every block.
    std::atomic<AudioFile*> rawAudioFile_{nullptr};

    // Set to true while the audio callback is between the rawAudioFile_ load
    // and the end of the decode block, preventing a concurrent release().
    std::atomic<bool> processing_{false};

    std::atomic<bool> loadFailed_{false};

    // Loader thread state. The mutex only guards loaderThread_ join/replace,
    // never held on the audio path.
    std::mutex loaderMutex_;
    std::thread loaderThread_;
    std::atomic<bool> loadInProgress_{false};

    double systemSampleRate_{0.0};
    int maxBlockSize_{0};
    int systemChannelCount_{0};

    ChannelDSPChain dspChain_;
    MeterEngine meterEngine_;

    std::atomic<float> pitchPercent_{0.0f};
};

} // namespace melodymeet
