#pragma once

#include <atomic>

namespace melodymeet
{

class PlaybackState
{
public:
    enum class State
    {
        Stopped,
        Loading,
        Playing,
        Paused,
        Ended
    };

    PlaybackState() = default;

    void setState(State state) noexcept;
    State getState() const noexcept;

    bool isStopped() const noexcept;
    bool isLoading() const noexcept;
    bool isPlaying() const noexcept;
    bool isPaused() const noexcept;
    bool hasEnded() const noexcept;

private:
    std::atomic<State> state_{State::Stopped};
};

} // namespace melodymeet
