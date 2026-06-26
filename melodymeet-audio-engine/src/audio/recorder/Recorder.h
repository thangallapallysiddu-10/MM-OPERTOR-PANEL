#pragma once

#include "RecordingSession.h"

#include <juce_core/juce_core.h>

#include <atomic>
#include <memory>

namespace melodymeet {

/// Production-ready audio recorder subsystem.
/// Manages recording sessions and background disk writing, ensuring strict real-time
/// safety during audio callback consumption.
class Recorder final {
public:
    Recorder();
    ~Recorder();

    Recorder(const Recorder&) = delete;
    Recorder& operator=(const Recorder&) = delete;
    Recorder(Recorder&&) = delete;
    Recorder& operator=(Recorder&&) = delete;

    /// Configures the recorder dimensions before recording starts.
    void prepare(double sampleRate, int maxBlockSize, int channelCount);

    /// Processes the main audio program buffer without modifying it.
    void process(const float* const* inputChannels, int channelCount, int numSamples) noexcept;

    /// Starts recording to the specified file.
    bool startRecording(const juce::File& outputFile);

    /// Pauses the current recording without flushing the file.
    void pauseRecording() noexcept;

    /// Resumes a paused recording.
    void resumeRecording() noexcept;

    /// Stops the recording, flushes to disk, and finalizes the file.
    void stopRecording() noexcept;

    /// Returns true if currently recording or paused (i.e. an active session exists).
    bool isRecording() const noexcept;

    /// Returns a pointer to the active recording session, or nullptr if stopped.
    RecordingSession* getActiveSession() const noexcept;

    /// Returns the current configuration version.
    uint64_t getVersion() const noexcept { return version_.load(std::memory_order_relaxed); }

private:
    double sampleRate_{0.0};
    int channelCount_{0};
    bool prepared_{false};

    juce::TimeSliceThread backgroundThread_;
    
    std::unique_ptr<RecordingSession> currentSession_;

    // Lock-free synchronization for the audio thread
    std::atomic<RecordingSession*> activeSessionPtr_{nullptr};
    mutable std::atomic<bool> processing_{false};
    
    std::atomic<uint64_t> version_{0};
};

} // namespace melodymeet
