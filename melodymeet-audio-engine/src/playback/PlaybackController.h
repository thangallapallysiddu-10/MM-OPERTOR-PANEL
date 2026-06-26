#pragma once

#include "../deck/Transport.h"
#include "../deck/PlaybackState.h"

#include <atomic>

namespace melodymeet {

/// High-level controller for playback logic.
/// Composes the low-level Transport state and exposes a unified API.
/// Does not handle decoding or DSP.
class PlaybackController {
public:
    PlaybackController() = default;
    ~PlaybackController() = default;

    PlaybackController(const PlaybackController&) = delete;
    PlaybackController& operator=(const PlaybackController&) = delete;

    bool play() noexcept;
    bool pause() noexcept;
    void stop() noexcept;
    bool seek(double seconds) noexcept;
    
    // Cue / loop / pitch transport controls
    void setLoop(bool loop) noexcept;
    bool isLooping() const noexcept;

    void setLoopRange(double startSeconds, double endSeconds) noexcept;
    double getLoopStart() const noexcept;
    double getLoopEnd() const noexcept;
    
    void setCue(double seconds) noexcept;
    double getCue() const noexcept;
    bool jumpToCue() noexcept;

    void setPlaybackRate(double rate) noexcept;
    double getPlaybackRate() const noexcept;

    // Track metadata linkage
    void setTrackDuration(double seconds) noexcept;

    // State getters
    PlaybackState::State getState() const noexcept;
    double getCurrentPosition() const noexcept;
    double getDuration() const noexcept;
    bool isPlaying() const noexcept;
    bool hasEnded() const noexcept;

    /// Advances the internal playback position based on the number of samples processed.
    void advancePosition(int numSamples, double sampleRate) noexcept;

    void reset() noexcept;

private:
    Transport transport_;
    PlaybackState state_;
    
    std::atomic<bool> looping_{false};
    std::atomic<double> cuePointSeconds_{0.0};
    std::atomic<double> loopStartSeconds_{0.0};
    std::atomic<double> loopEndSeconds_{0.0};
    std::atomic<double> playbackRate_{1.0};
};

} // namespace melodymeet
