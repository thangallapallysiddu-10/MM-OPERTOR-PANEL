#pragma once

#include <cstdint>

namespace melodymeet {

/// Immutable snapshot of the engine's statistics at a given point in time.
/// Designed for safe consumption by UI or logging threads.
struct StatisticsSnapshot final {
    // Basic format
    double sampleRate{0.0};
    int bufferSize{0};

    // Performance metrics
    uint64_t callbackCount{0};
    double averageCallbackDurationMs{0.0};
    double peakCallbackDurationMs{0.0};
    double callbackLoadPercentage{0.0};
    uint64_t xruns{0};

    // Engine state
    int activeAudioSources{0};
    bool isPlaying{false};
    bool isRecording{false};
    bool isBroadcasting{false};
    
    // Time tracking
    double uptimeSeconds{0.0};
};

} // namespace melodymeet
