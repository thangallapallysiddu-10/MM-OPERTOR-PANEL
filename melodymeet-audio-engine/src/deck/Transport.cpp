#include "Transport.h"

#include <algorithm>
#include <iostream>

namespace melodymeet {

bool Transport::play(PlaybackState& state) noexcept {
    const double dur = durationSeconds_.load(std::memory_order_relaxed);
    if (dur <= 0.0) {
        // This fires when play() is called before load() completes or when
        // the decoder failed. It is noexcept so we use cout, not throw.
        std::cout << "[TRANSPORT] play() blocked: duration=0 — file not loaded or decoder failed"
                  << std::endl;
        return false;
    }
    if (state.getState() == PlaybackState::State::Playing) {
        return true;
    }
    if (hasEnded()) {
        currentPositionSeconds_.store(0.0, std::memory_order_relaxed);
    }
    state.setState(PlaybackState::State::Playing);
    return true;
}

bool Transport::pause(PlaybackState& state) noexcept {
    if (state.getState() != PlaybackState::State::Playing) {
        return false;
    }
    state.setState(PlaybackState::State::Paused);
    return true;
}

void Transport::stop(PlaybackState& state) noexcept {
    if (state.getState() == PlaybackState::State::Stopped) {
        return;
    }
    state.setState(PlaybackState::State::Stopped);
    currentPositionSeconds_.store(0.0, std::memory_order_relaxed);
}

bool Transport::seek(double seconds, PlaybackState& state) noexcept {
    const double dur = durationSeconds_.load(std::memory_order_relaxed);
    if (dur <= 0.0) {
        return false;
    }
    double target = std::clamp(seconds, 0.0, dur);
    currentPositionSeconds_.store(target, std::memory_order_relaxed);

    if (hasEnded() && state.getState() == PlaybackState::State::Playing) {
        state.setState(PlaybackState::State::Stopped);
    }
    return true;
}

void Transport::endOfFile(PlaybackState& state) noexcept {
    if (state.getState() != PlaybackState::State::Stopped) {
        state.setState(PlaybackState::State::Stopped);
    }
}

void Transport::setDuration(double seconds) noexcept {
    durationSeconds_.store(std::max(0.0, seconds), std::memory_order_relaxed);
}

void Transport::reset() noexcept {
    currentPositionSeconds_.store(0.0, std::memory_order_relaxed);
    durationSeconds_.store(0.0, std::memory_order_relaxed);
}

double Transport::getCurrentPosition() const noexcept {
    return currentPositionSeconds_.load(std::memory_order_relaxed);
}

double Transport::getDuration() const noexcept {
    return durationSeconds_.load(std::memory_order_relaxed);
}

bool Transport::isPlaying(const PlaybackState& state) const noexcept {
    return state.getState() == PlaybackState::State::Playing && !hasEnded();
}

bool Transport::hasEnded() const noexcept {
    const double pos = currentPositionSeconds_.load(std::memory_order_relaxed);
    const double dur = durationSeconds_.load(std::memory_order_relaxed);
    return dur > 0.0 && pos >= dur;
}

void Transport::advancePosition(double deltaSeconds) noexcept {
    const double dur = durationSeconds_.load(std::memory_order_relaxed);
    double expected = currentPositionSeconds_.load(std::memory_order_relaxed);
    
    // Attempt to atomically update the position. 
    // If a concurrent seek() modifies currentPositionSeconds_ in the meantime,
    // expected will not match, the CAS will fail, and we intentionally break 
    // to let the user's seek command win over this block's advancement.
    while (true) {
        double desired = std::min(expected + deltaSeconds, dur);
        if (currentPositionSeconds_.compare_exchange_weak(expected, desired, std::memory_order_relaxed)) {
            break;
        } else {
            // A seek occurred (expected was updated by CAS failure).
            // We discard the delta and honor the seek.
            break;
        }
    }
}

} // namespace melodymeet
