#include "RecordingSession.h"

namespace melodymeet {

RecordingSession::RecordingSession(const juce::File& outputFile, double sampleRate, int channelCount, juce::TimeSliceThread& backgroundThread)
    : outputFile_(outputFile), sampleRate_(sampleRate), channelCount_(channelCount), backgroundThread_(backgroundThread) 
{
}

RecordingSession::~RecordingSession() {
    stop();
}

bool RecordingSession::start() {
    if (state_.load(std::memory_order_acquire) != State::Stopped) 
        return false;

    juce::WavAudioFormat wavFormat;
    
    // JUCE takes ownership of the FileOutputStream if creation is successful.
    auto* outputStream = new juce::FileOutputStream(outputFile_);
    if (outputStream->failedToOpen()) {
        delete outputStream;
        return false;
    }

    std::unique_ptr<juce::AudioFormatWriter> writer(
        wavFormat.createWriterFor(outputStream, sampleRate_, static_cast<unsigned int>(channelCount_), 24, {}, 0)
    );

    if (!writer) {
        return false;
    }

    // Wrap the writer in a ThreadedWriter. Takes ownership of the writer.
    // 32768 samples is approx 680ms at 48kHz, more than enough for background thread safety.
    threadedWriter_ = std::make_unique<juce::AudioFormatWriter::ThreadedWriter>(
        writer.release(), backgroundThread_, 32768
    );

    sampleCount_.store(0, std::memory_order_relaxed);
    state_.store(State::Recording, std::memory_order_release);
    return true;
}

void RecordingSession::pause() noexcept {
    State expected = State::Recording;
    state_.compare_exchange_strong(expected, State::Paused, std::memory_order_release, std::memory_order_relaxed);
}

void RecordingSession::resume() noexcept {
    State expected = State::Paused;
    state_.compare_exchange_strong(expected, State::Recording, std::memory_order_release, std::memory_order_relaxed);
}

void RecordingSession::stop() noexcept {
    state_.store(State::Stopped, std::memory_order_release);
    // Destructor of ThreadedWriter synchronously flushes any remaining buffers to disk.
    // Note: this is safe because the Recorder class spin-waits for the audio thread 
    // to exit process() before calling stop() or destroying the session.
    threadedWriter_.reset();
}

void RecordingSession::process(const float* const* inputChannels, int numSamples) noexcept {
    if (state_.load(std::memory_order_acquire) == State::Recording && threadedWriter_) {
        threadedWriter_->write(inputChannels, numSamples);
        sampleCount_.fetch_add(numSamples, std::memory_order_relaxed);

        float blockPeak = 0.0f;
        for (int ch = 0; ch < channelCount_; ++ch) {
            if (const float* chData = inputChannels[ch]) {
                for (int i = 0; i < numSamples; ++i) {
                    float val = std::abs(chData[i]);
                    if (val > blockPeak) blockPeak = val;
                }
            }
        }
        peakLevel_.store(blockPeak, std::memory_order_relaxed);
    }
}

RecordingSession::State RecordingSession::getState() const noexcept {
    return state_.load(std::memory_order_acquire);
}

std::int64_t RecordingSession::getSampleCount() const noexcept {
    return sampleCount_.load(std::memory_order_relaxed);
}

double RecordingSession::getDurationSeconds() const noexcept {
    if (sampleRate_ > 0.0) {
        return static_cast<double>(getSampleCount()) / sampleRate_;
    }
    return 0.0;
}

float RecordingSession::getPeakLevel() const noexcept {
    return peakLevel_.load(std::memory_order_relaxed);
}

const juce::File& RecordingSession::getFile() const noexcept {
    return outputFile_;
}

} // namespace melodymeet
