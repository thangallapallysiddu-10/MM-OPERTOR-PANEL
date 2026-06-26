#pragma once

#include "PlaybackState.h"
#include <atomic>

namespace melodymeet {

/// Refactored Transport class that handles pure playback state and position math.
/// Contains no audio processing or decoding logic.
class Transport {
public:
    Transport() = default;
    ~Transport() = default;

    bool play(PlaybackState& state) noexcept;
    bool pause(PlaybackState& state) noexcept;
    void stop(PlaybackState& state) noexcept;
    bool seek(double seconds, PlaybackState& state) noexcept;
    void endOfFile(PlaybackState& state) noexcept;

    void setDuration(double seconds) noexcept;
    void reset() noexcept;

    double getCurrentPosition() const noexcept;
    double getDuration() const noexcept;
    bool isPlaying(const PlaybackState& state) const noexcept;
    bool hasEnded() const noexcept;

    /// Advances the internal position by the given number of seconds.
    void advancePosition(double deltaSeconds) noexcept;

private:
    std::atomic<double> currentPositionSeconds_{0.0};
    std::atomic<double> durationSeconds_{0.0};
};

} // namespace melodymeet
