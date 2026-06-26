#include "PlaybackController.h"

#include <algorithm>

namespace melodymeet {

bool PlaybackController::play() noexcept {
    return transport_.play(state_);
}

bool PlaybackController::pause() noexcept {
    return transport_.pause(state_);
}

void PlaybackController::stop() noexcept {
    transport_.stop(state_);
}

bool PlaybackController::seek(double seconds) noexcept {
    return transport_.seek(seconds, state_);
}

void PlaybackController::setLoop(bool loop) noexcept {
    looping_.store(loop, std::memory_order_relaxed);
}

bool PlaybackController::isLooping() const noexcept {
    return looping_.load(std::memory_order_relaxed);
}

void PlaybackController::setLoopRange(double startSeconds, double endSeconds) noexcept {
    if (endSeconds < startSeconds) {
        std::swap(startSeconds, endSeconds);
    }

    loopStartSeconds_.store(std::max(0.0, startSeconds), std::memory_order_relaxed);
    loopEndSeconds_.store(std::max(loopStartSeconds_.load(std::memory_order_relaxed), endSeconds), std::memory_order_relaxed);
}

double PlaybackController::getLoopStart() const noexcept {
    return loopStartSeconds_.load(std::memory_order_relaxed);
}

double PlaybackController::getLoopEnd() const noexcept {
    return loopEndSeconds_.load(std::memory_order_relaxed);
}

void PlaybackController::setCue(double seconds) noexcept {
    cuePointSeconds_.store(seconds, std::memory_order_relaxed);
}

double PlaybackController::getCue() const noexcept {
    return cuePointSeconds_.load(std::memory_order_relaxed);
}

bool PlaybackController::jumpToCue() noexcept {
    return seek(getCue());
}

void PlaybackController::setPlaybackRate(double rate) noexcept {
    if (rate <= 0.0) {
        rate = 1.0;
    }
    playbackRate_.store(rate, std::memory_order_relaxed);
}

double PlaybackController::getPlaybackRate() const noexcept {
    return playbackRate_.load(std::memory_order_relaxed);
}

void PlaybackController::setTrackDuration(double seconds) noexcept {
    transport_.setDuration(seconds);
    if (loopEndSeconds_.load(std::memory_order_relaxed) <= 0.0) {
        loopStartSeconds_.store(0.0, std::memory_order_relaxed);
        loopEndSeconds_.store(seconds, std::memory_order_relaxed);
    }
}

PlaybackState::State PlaybackController::getState() const noexcept {
    return state_.getState();
}

double PlaybackController::getCurrentPosition() const noexcept {
    return transport_.getCurrentPosition();
}

double PlaybackController::getDuration() const noexcept {
    return transport_.getDuration();
}

bool PlaybackController::isPlaying() const noexcept {
    return transport_.isPlaying(state_);
}

bool PlaybackController::hasEnded() const noexcept {
    return transport_.hasEnded();
}

void PlaybackController::advancePosition(int numSamples, double sampleRate) noexcept {
    if (sampleRate <= 0.0) return;
    
    if (isPlaying()) {
        const double deltaSeconds = (static_cast<double>(numSamples) / sampleRate) * getPlaybackRate();
        transport_.advancePosition(deltaSeconds);
        
        if (isLooping()) {
            const double duration = transport_.getDuration();
            const double loopStart = loopStartSeconds_.load(std::memory_order_relaxed);
            const double loopEnd = loopEndSeconds_.load(std::memory_order_relaxed);
            const bool hasExplicitLoop = loopEnd > loopStart;

            if (hasExplicitLoop && transport_.getCurrentPosition() >= loopEnd) {
                transport_.seek(loopStart, state_);
                transport_.play(state_);
                return;
            }

            if (!hasExplicitLoop && transport_.hasEnded()) {
                const double cue = cuePointSeconds_.load(std::memory_order_relaxed);
                const double loopTarget = (cue > 0.0 && cue < duration) ? cue : 0.0;
                transport_.seek(loopTarget, state_);
                transport_.play(state_);
                return;
            }
        } else if (transport_.hasEnded()) {
            transport_.endOfFile(state_);
        }
    }
}

void PlaybackController::reset() noexcept {
    transport_.reset();
    state_.setState(PlaybackState::State::Stopped);
    looping_.store(false, std::memory_order_relaxed);
    cuePointSeconds_.store(0.0, std::memory_order_relaxed);
    loopStartSeconds_.store(0.0, std::memory_order_relaxed);
    loopEndSeconds_.store(0.0, std::memory_order_relaxed);
    playbackRate_.store(1.0, std::memory_order_relaxed);
}

} // namespace melodymeet
