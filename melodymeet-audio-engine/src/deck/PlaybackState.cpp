#include "PlaybackState.h"

namespace melodymeet
{

void PlaybackState::setState(State state) noexcept
{
    state_.store(state, std::memory_order_release);
}

PlaybackState::State PlaybackState::getState() const noexcept
{
    return state_.load(std::memory_order_acquire);
}

bool PlaybackState::isStopped() const noexcept
{
    return getState() == State::Stopped;
}

bool PlaybackState::isLoading() const noexcept
{
    return getState() == State::Loading;
}

bool PlaybackState::isPlaying() const noexcept
{
    return getState() == State::Playing;
}

bool PlaybackState::isPaused() const noexcept
{
    return getState() == State::Paused;
}

bool PlaybackState::hasEnded() const noexcept
{
    return getState() == State::Ended;
}

} // namespace melodymeet
