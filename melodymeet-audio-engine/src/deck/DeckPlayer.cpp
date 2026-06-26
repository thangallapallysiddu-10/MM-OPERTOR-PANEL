#include "DeckPlayer.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <iostream>

#include "../audio/dsp/processors/GainProcessor.h"
#include "../audio/dsp/processors/HighPassFilter.h"
#include "../audio/dsp/processors/LowPassFilter.h"
#include "../audio/dsp/processors/EQProcessor.h"
#include "../audio/dsp/processors/DelayProcessor.h"
#include "../audio/dsp/processors/LimiterProcessor.h"

namespace melodymeet {

namespace
{
} // namespace

DeckPlayer::DeckPlayer(BufferPool& bufferPool)
    : bufferPool_(bufferPool)
{
    auto gain = std::make_shared<GainProcessor>();
    gain->setGain(1.0f);

    auto highPass = std::make_shared<HighPassFilter>();
    highPass->setBypass(true);

    auto lowPass = std::make_shared<LowPassFilter>();
    lowPass->setBypass(true);

    auto eq = std::make_shared<EQProcessor>();
    eq->setBandGainDb(EQProcessor::LowShelf, 0.0f);
    eq->setBandGainDb(EQProcessor::MidPeak, 0.0f);
    eq->setBandGainDb(EQProcessor::HighShelf, 0.0f);

    auto delay = std::make_shared<DelayProcessor>();
    delay->setBypass(true);
    delay->setDelayTime(0.0f);
    delay->setFeedback(0.0f);
    delay->setWetLevel(0.0f);
    delay->setDryLevel(1.0f);

    auto limiter = std::make_shared<LimiterProcessor>();
    limiter->setBypass(true);
    limiter->setCeiling(0.0f);

    dspChain_.setProcessor(ChannelDSPChain::Slot::Gain, gain);
    dspChain_.setProcessor(ChannelDSPChain::Slot::HighPassFilter, highPass);
    dspChain_.setProcessor(ChannelDSPChain::Slot::LowPassFilter, lowPass);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Equalizer, eq);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Delay, delay);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Limiter, limiter);
}

DeckPlayer::~DeckPlayer() {
    release();
}

bool DeckPlayer::load(const std::string& path) {
    std::cout << "[ENGINE TRACE] DeckPlayer::load path=" << path << std::endl;
    loadFailed_.store(false, std::memory_order_release);
    auto newFile = fileManager_.loadFile(path);
    if (!newFile) {
        std::cout << "[ENGINE TRACE] DeckPlayer::load failed in AudioFileManager for path=" << path << std::endl;
        loadFailed_.store(true, std::memory_order_release);
        return false;
    }

    // Stop playback first, so the audio thread will exit early on the next block
    controller_.stop();
    
    // Spin wait to ensure audio thread isn't in the middle of processing
    while (processing_.load(std::memory_order_acquire)) {}

    controller_.reset();
    controller_.setTrackDuration(newFile->getMetadata().durationSeconds);
    
    audioFile_ = std::move(newFile);
    rawAudioFile_.store(audioFile_.get(), std::memory_order_release);
    std::cout << "[ENGINE TRACE] DeckPlayer::load completed duration=" << controller_.getDuration() << std::endl;
    
    return true;
}

bool DeckPlayer::play() noexcept { return controller_.play(); }
bool DeckPlayer::pause() noexcept { return controller_.pause(); }
void DeckPlayer::stop() noexcept { controller_.stop(); }
bool DeckPlayer::seek(double seconds) noexcept { return controller_.seek(seconds); }
void DeckPlayer::setLoop(bool loop) noexcept { controller_.setLoop(loop); }
bool DeckPlayer::isLooping() const noexcept { return controller_.isLooping(); }
void DeckPlayer::setLoopRange(double startSeconds, double endSeconds) noexcept { controller_.setLoopRange(startSeconds, endSeconds); }
void DeckPlayer::setCue(double seconds) noexcept { controller_.setCue(seconds); }
double DeckPlayer::getCue() const noexcept { return controller_.getCue(); }
bool DeckPlayer::jumpToCue() noexcept { return controller_.jumpToCue(); }
void DeckPlayer::setPitch(float percent) noexcept {
    pitchPercent_.store(percent, std::memory_order_relaxed);
    const double rate = std::clamp(1.0 + (static_cast<double>(percent) / 100.0), 0.5, 1.5);
    controller_.setPlaybackRate(rate);
}
float DeckPlayer::getPitch() const noexcept { return pitchPercent_.load(std::memory_order_relaxed); }

bool DeckPlayer::isLoaded() const noexcept {
    return rawAudioFile_.load(std::memory_order_acquire) != nullptr;
}

PlaybackState::State DeckPlayer::getState() const noexcept { return controller_.getState(); }
double DeckPlayer::getCurrentPosition() const noexcept { return controller_.getCurrentPosition(); }
double DeckPlayer::getDuration() const noexcept { return controller_.getDuration(); }
bool DeckPlayer::isPlaying() const noexcept { return controller_.isPlaying(); }
bool DeckPlayer::hasLoadFailed() const noexcept { return loadFailed_.load(std::memory_order_acquire); }

void DeckPlayer::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    systemSampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    systemChannelCount_ = channelCount;
    dspChain_.prepare(sampleRate, maxBlockSize, channelCount);
}

void DeckPlayer::process(float* const* outputChannels, int channelCount, int numSamples) noexcept {
    if (outputChannels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    // Clear output first (silence)
    for (int i = 0; i < channelCount; ++i) {
        if (outputChannels[i]) {
            std::memset(outputChannels[i], 0, numSamples * sizeof(float));
        }
    }

    if (!controller_.isPlaying()) {
        return;
    }

    processing_.store(true, std::memory_order_release);

    {
        auto* file = rawAudioFile_.load(std::memory_order_acquire);
        if (file && file->getDecoder()) {
            // Acquire scratch buffer from the pool
            PooledBuffer scratch = bufferPool_.acquireBuffer();
            if (scratch.isValid()) {
                
                AudioDecoder* decoder = file->getDecoder();
                const double fileSampleRate = decoder->getSampleRate();
                const double playbackRate = controller_.getPlaybackRate();
                const double sourceStep = (fileSampleRate > 0.0 && systemSampleRate_ > 0.0)
                    ? (playbackRate * fileSampleRate / systemSampleRate_)
                    : 1.0;
                const double currentSample = controller_.getCurrentPosition() * fileSampleRate;
                
                int readChannels = std::min(channelCount, decoder->getNumChannels());
                int maxScratchChannels = scratch->getNumChannels();
                readChannels = std::min(readChannels, maxScratchChannels);

                if (readChannels > 0) {
                    bool decoded = false;
                    if (std::abs(sourceStep - 1.0) < 1e-6 && std::abs(currentSample - std::round(currentSample)) < 1e-6) {
                        decoded = decoder->readSamples(scratch->getArrayOfWritePointers(), readChannels, static_cast<int64_t>(std::llround(currentSample)), numSamples);
                    } else {
                        decoded = decoder->readInterpolatedSamples(scratch->getArrayOfWritePointers(), readChannels, currentSample, sourceStep, numSamples);
                    }

                    if (decoded) {
                        // Copy decoded audio from scratch buffer to output
                        for (int c = 0; c < readChannels; ++c) {
                            const float* src = scratch->getReadPointer(c);
                            float* dst = outputChannels[c];
                            if (src && dst) {
                                std::memcpy(dst, src, numSamples * sizeof(float));
                            }
                        }
                        
                        // Advance controller position using the file's sample rate (to ensure correct time mapping)
                        controller_.advancePosition(numSamples, systemSampleRate_);
                        
                        // Apply DSP processing
                        dspChain_.process(outputChannels, channelCount, numSamples);
                    }
                }
            }
        }
    } // file shared_ptr is destroyed here, BEFORE processing is set to false

    processing_.store(false, std::memory_order_release);
}

void DeckPlayer::reset() noexcept {
    controller_.reset();
    dspChain_.reset();
    pitchPercent_.store(0.0f, std::memory_order_relaxed);
}

void DeckPlayer::release() noexcept {
    controller_.stop();
    while (processing_.load(std::memory_order_acquire)) {}
    rawAudioFile_.store(nullptr, std::memory_order_release);
    audioFile_.reset();
    controller_.reset();
    dspChain_.release();
    pitchPercent_.store(0.0f, std::memory_order_relaxed);
}

bool DeckPlayer::isActive() const noexcept {
    return isPlaying();
}

double DeckPlayer::getSampleRate() const noexcept {
    return systemSampleRate_;
}

int DeckPlayer::getChannelCount() const noexcept {
    return systemChannelCount_;
}

ChannelDSPChain& DeckPlayer::getChannelDSPChain() noexcept {
    return dspChain_;
}

const ChannelDSPChain& DeckPlayer::getChannelDSPChain() const noexcept {
    return dspChain_;
}

} // namespace melodymeet
