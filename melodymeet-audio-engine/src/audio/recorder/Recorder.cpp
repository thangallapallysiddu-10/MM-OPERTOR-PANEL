#include "Recorder.h"
#include <thread>

namespace melodymeet {

Recorder::Recorder() : backgroundThread_("MelodyMeet_RecordingThread") {
    // Start the background disk-writing thread
    backgroundThread_.startThread();
}

Recorder::~Recorder() {
    stopRecording();
    // Safely stop the background thread with a 2-second timeout
    backgroundThread_.stopThread(2000);
}

void Recorder::prepare(double sampleRate, int /*maxBlockSize*/, int channelCount) {
    // Cannot alter configuration while a recording session is active.
    if (isRecording()) return;

    sampleRate_ = sampleRate;
    channelCount_ = channelCount > 0 ? channelCount : 0;
    prepared_ = (sampleRate_ > 0.0 && channelCount_ > 0);
}

void Recorder::process(const float* const* inputChannels, int channelCount, int numSamples) noexcept {
    // Safety check: ensure we receive enough channels to feed the ThreadedWriter,
    // which was instantiated with channelCount_ channels.
    if (numSamples <= 0 || inputChannels == nullptr || channelCount < channelCount_) 
        return;

    // Enter processing critical section using a wait-free flag.
    processing_.store(true, std::memory_order_seq_cst);

    if (auto* session = activeSessionPtr_.load(std::memory_order_seq_cst)) {
        session->process(inputChannels, numSamples);
    }

    processing_.store(false, std::memory_order_seq_cst);
}

bool Recorder::startRecording(const juce::File& outputFile) {
    if (isRecording() || !prepared_) 
        return false;

    auto newSession = std::make_unique<RecordingSession>(outputFile, sampleRate_, channelCount_, backgroundThread_);
    
    if (!newSession->start()) {
        return false;
    }

    currentSession_ = std::move(newSession);
    
    // Atomically make the session visible to the audio thread.
    activeSessionPtr_.store(currentSession_.get(), std::memory_order_release);
    version_.fetch_add(1, std::memory_order_relaxed);
    return true;
}

void Recorder::pauseRecording() noexcept {
    if (currentSession_) {
        currentSession_->pause();
        version_.fetch_add(1, std::memory_order_relaxed);
    }
}

void Recorder::resumeRecording() noexcept {
    if (currentSession_) {
        currentSession_->resume();
        version_.fetch_add(1, std::memory_order_relaxed);
    }
}

void Recorder::stopRecording() noexcept {
    // 1. Unhook from the audio thread safely.
    activeSessionPtr_.store(nullptr, std::memory_order_release);

    // 2. Spin-wait until the audio thread finishes its current block.
    // This guarantees the audio thread will not access the session while we delete it.
    while (processing_.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }

    // 3. Now safely stop and destroy the session (which flushes to disk).
    if (currentSession_) {
        currentSession_->stop();
        currentSession_.reset();
        version_.fetch_add(1, std::memory_order_relaxed);
    }
}

bool Recorder::isRecording() const noexcept {
    return currentSession_ != nullptr;
}

RecordingSession* Recorder::getActiveSession() const noexcept {
    return currentSession_.get();
}

} // namespace melodymeet
