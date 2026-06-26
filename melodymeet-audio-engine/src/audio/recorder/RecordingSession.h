#pragma once

#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>

#include <atomic>
#include <memory>

namespace melodymeet {

/// Manages a single active recording session to disk.
/// Handles background file writing, state, and sample counting without blocking the audio thread.
class RecordingSession final {
public:
    enum class State {
        Stopped,
        Recording,
        Paused
    };

    RecordingSession(const juce::File& outputFile, double sampleRate, int channelCount, juce::TimeSliceThread& backgroundThread);
    ~RecordingSession();

    RecordingSession(const RecordingSession&) = delete;
    RecordingSession& operator=(const RecordingSession&) = delete;
    RecordingSession(RecordingSession&&) = delete;
    RecordingSession& operator=(RecordingSession&&) = delete;

    /// Starts writing the WAV file and enables audio consumption.
    bool start();

    /// Pauses the recording.
    void pause() noexcept;

    /// Resumes the recording.
    void resume() noexcept;

    /// Flushes the remaining buffers to disk and finalizes the file.
    void stop() noexcept;

    /// Real-time safe audio push to the background writer queue.
    void process(const float* const* inputChannels, int numSamples) noexcept;

    State getState() const noexcept;
    std::int64_t getSampleCount() const noexcept;
    double getDurationSeconds() const noexcept;
    const juce::File& getFile() const noexcept;
    float getPeakLevel() const noexcept;

private:
    juce::File outputFile_;
    double sampleRate_{0.0};
    int channelCount_{0};
    juce::TimeSliceThread& backgroundThread_;

    std::atomic<State> state_{State::Stopped};
    std::atomic<std::int64_t> sampleCount_{0};
    std::atomic<float> peakLevel_{0.0f};

    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> threadedWriter_;
};

} // namespace melodymeet
