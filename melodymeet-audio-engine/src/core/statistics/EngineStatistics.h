#pragma once

#include "StatisticsSnapshot.h"

#include <atomic>
#include <cstdint>

namespace melodymeet {

/// Lock-free subsystem for gathering performance metrics and state data
/// from the audio engine. Designed to be completely real-time safe.
class EngineStatistics final {
public:
    EngineStatistics();
    ~EngineStatistics() = default;

    EngineStatistics(const EngineStatistics&) = delete;
    EngineStatistics& operator=(const EngineStatistics&) = delete;

    // --- Audio Thread API ---

    /// Reports the completion of an audio callback.
    /// @param durationMs The elapsed time of the callback in milliseconds.
    void reportCallback(double durationMs) noexcept;

    /// Reports a buffer underrun/xrun event.
    void reportXRun() noexcept;

    // --- Control Thread API (Push Model) ---

    void setFormat(double sampleRate, int bufferSize) noexcept;
    void setActiveAudioSources(int count) noexcept;
    void setPlaybackState(bool isPlaying) noexcept;
    void setRecordingState(bool isRecording) noexcept;
    void setBroadcastingState(bool isBroadcasting) noexcept;
    
    /// Starts or resets the engine uptime tracker.
    void startUptimeTimer() noexcept;

    /// Resets all accumulated statistics (peaks, averages, counters).
    void resetStatistics() noexcept;

    // --- UI / General API ---

    /// Returns a completely thread-safe snapshot of the current engine metrics.
    StatisticsSnapshot getSnapshot() const noexcept;

private:
    // Format
    std::atomic<double> sampleRate_{0.0};
    std::atomic<int> bufferSize_{0};

    // Performance
    std::atomic<uint64_t> callbackCount_{0};
    std::atomic<double> averageCallbackDurationMs_{0.0};
    std::atomic<double> peakCallbackDurationMs_{0.0};
    std::atomic<uint64_t> xruns_{0};

    // State
    std::atomic<int> activeAudioSources_{0};
    std::atomic<bool> isPlaying_{false};
    std::atomic<bool> isRecording_{false};
    std::atomic<bool> isBroadcasting_{false};

    // Time tracking (stored as milliseconds since epoch or arbitrary start)
    std::atomic<int64_t> startTimeMs_{0};
};

} // namespace melodymeet
