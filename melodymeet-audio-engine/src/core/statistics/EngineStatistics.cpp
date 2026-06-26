#include "EngineStatistics.h"

#include <algorithm>
#include <chrono>

namespace melodymeet {

namespace {
    // Helper to perform atomic CAS for floats/doubles since std::atomic<double> 
    // fetch_max is not available in C++17 natively without CAS loop.
    void updatePeakDouble(std::atomic<double>& atomicVar, double newValue) noexcept {
        double prev = atomicVar.load(std::memory_order_relaxed);
        while (newValue > prev && !atomicVar.compare_exchange_weak(prev, newValue, std::memory_order_relaxed)) {
            // spin until we successfully update or find a larger value
        }
    }

    // Get current time in milliseconds using standard steady_clock
    int64_t getCurrentTimeMs() noexcept {
        auto now = std::chrono::steady_clock::now();
        return std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
    }
} // namespace

EngineStatistics::EngineStatistics() {
    startUptimeTimer();
}

void EngineStatistics::reportCallback(double durationMs) noexcept {
    callbackCount_.fetch_add(1, std::memory_order_relaxed);

    // Update Exponential Moving Average (EMA)
    // Alpha of 0.05 gives a smooth recent average across ~20-50 callbacks
    constexpr double alpha = 0.05;
    
    double prevAvg = averageCallbackDurationMs_.load(std::memory_order_relaxed);
    double newAvg = 0.0;
    
    do {
        if (prevAvg == 0.0) {
            newAvg = durationMs; // Initialize to first duration
        } else {
            newAvg = durationMs * alpha + prevAvg * (1.0 - alpha);
        }
    } while (!averageCallbackDurationMs_.compare_exchange_weak(prevAvg, newAvg, std::memory_order_relaxed));

    // Update Peak
    updatePeakDouble(peakCallbackDurationMs_, durationMs);
}

void EngineStatistics::reportXRun() noexcept {
    xruns_.fetch_add(1, std::memory_order_relaxed);
}

void EngineStatistics::setFormat(double sampleRate, int bufferSize) noexcept {
    sampleRate_.store(sampleRate, std::memory_order_relaxed);
    bufferSize_.store(bufferSize, std::memory_order_relaxed);
}

void EngineStatistics::setActiveAudioSources(int count) noexcept {
    activeAudioSources_.store(count, std::memory_order_relaxed);
}

void EngineStatistics::setPlaybackState(bool isPlaying) noexcept {
    isPlaying_.store(isPlaying, std::memory_order_relaxed);
}

void EngineStatistics::setRecordingState(bool isRecording) noexcept {
    isRecording_.store(isRecording, std::memory_order_relaxed);
}

void EngineStatistics::setBroadcastingState(bool isBroadcasting) noexcept {
    isBroadcasting_.store(isBroadcasting, std::memory_order_relaxed);
}

void EngineStatistics::startUptimeTimer() noexcept {
    startTimeMs_.store(getCurrentTimeMs(), std::memory_order_relaxed);
}

void EngineStatistics::resetStatistics() noexcept {
    callbackCount_.store(0, std::memory_order_relaxed);
    averageCallbackDurationMs_.store(0.0, std::memory_order_relaxed);
    peakCallbackDurationMs_.store(0.0, std::memory_order_relaxed);
    xruns_.store(0, std::memory_order_relaxed);
    startUptimeTimer();
}

StatisticsSnapshot EngineStatistics::getSnapshot() const noexcept {
    StatisticsSnapshot snapshot;

    snapshot.sampleRate = sampleRate_.load(std::memory_order_relaxed);
    snapshot.bufferSize = bufferSize_.load(std::memory_order_relaxed);
    snapshot.callbackCount = callbackCount_.load(std::memory_order_relaxed);
    snapshot.averageCallbackDurationMs = averageCallbackDurationMs_.load(std::memory_order_relaxed);
    snapshot.peakCallbackDurationMs = peakCallbackDurationMs_.load(std::memory_order_relaxed);
    snapshot.xruns = xruns_.load(std::memory_order_relaxed);
    snapshot.activeAudioSources = activeAudioSources_.load(std::memory_order_relaxed);
    snapshot.isPlaying = isPlaying_.load(std::memory_order_relaxed);
    snapshot.isRecording = isRecording_.load(std::memory_order_relaxed);
    snapshot.isBroadcasting = isBroadcasting_.load(std::memory_order_relaxed);

    // Calculate Uptime
    int64_t nowMs = getCurrentTimeMs();
    int64_t startMs = startTimeMs_.load(std::memory_order_relaxed);
    snapshot.uptimeSeconds = static_cast<double>(nowMs - startMs) / 1000.0;

    // Calculate Load Percentage
    if (snapshot.sampleRate > 0.0 && snapshot.bufferSize > 0) {
        // How many milliseconds does one buffer represent?
        double bufferDurationMs = (static_cast<double>(snapshot.bufferSize) / snapshot.sampleRate) * 1000.0;
        
        if (bufferDurationMs > 0.0) {
            snapshot.callbackLoadPercentage = (snapshot.averageCallbackDurationMs / bufferDurationMs) * 100.0;
        }
    }

    return snapshot;
}

} // namespace melodymeet
