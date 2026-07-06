#include "DeckPlayer.h"

#include "../utilities/RtLogger.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <cstdio>
#include <iostream>   // used only on non-RT loader thread

#include "../audio/dsp/processors/GainProcessor.h"
#include "../audio/dsp/processors/HighPassFilter.h"
#include "../audio/dsp/processors/LowPassFilter.h"
#include "../audio/dsp/processors/EQProcessor.h"
#include "../audio/dsp/processors/DelayProcessor.h"
#include "../audio/dsp/processors/LimiterProcessor.h"

namespace melodymeet {

namespace
{
float peakOf(float* const* channels, int channelCount, int numSamples) noexcept
{
    float peak = 0.0f;
    if (channels == nullptr) return peak;
    for (int ch = 0; ch < channelCount; ++ch) {
        const auto* data = channels[ch];
        if (!data) continue;
        for (int s = 0; s < numSamples; ++s)
            peak = std::max(peak, std::abs(data[s]));
    }
    return peak;
}
} // namespace

// =============================================================================
// Construction / Destruction
// =============================================================================

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
    eq->setBandGainDb(EQProcessor::MidPeak,  0.0f);
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

    dspChain_.setProcessor(ChannelDSPChain::Slot::Gain,           gain);
    dspChain_.setProcessor(ChannelDSPChain::Slot::HighPassFilter,  highPass);
    dspChain_.setProcessor(ChannelDSPChain::Slot::LowPassFilter,   lowPass);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Equalizer,       eq);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Delay,           delay);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Limiter,         limiter);
}

DeckPlayer::~DeckPlayer() {
    release();
}

// =============================================================================
// Async Load
// =============================================================================

bool DeckPlayer::load(const std::string& path) {
    if (path.empty()) {
        std::cout << "[DECKPLAYER] load() rejected: empty path" << std::endl;
        return false;
    }

    // Reject if a load is already running. The caller should either wait for
    // isLoading()==false or call stop()/unload() first.
    if (loadInProgress_.load(std::memory_order_acquire)) {
        std::cout << "[DECKPLAYER] load() rejected: previous load still in progress" << std::endl;
        return false;
    }

    // Stop playback and clear the current file so the audio thread reads
    // silence while the new file is decoding. This is the only synchronous
    // step on the calling thread.
    controller_.stop();
    while (processing_.load(std::memory_order_acquire)) {}  // wait out current audio block

    rawAudioFile_.store(nullptr, std::memory_order_release);
    audioFile_.reset();
    controller_.reset();
    loadFailed_.store(false, std::memory_order_release);
    loadInProgress_.store(true, std::memory_order_release);

    std::cout << "[DECKPLAYER] load() enqueued async decode: " << path << std::endl;

    // Join any previous thread before launching a new one.
    joinLoaderThread();

    {
        std::lock_guard<std::mutex> lock(loaderMutex_);
        loaderThread_ = std::thread(&DeckPlayer::loaderThreadFunc, this, path);
    }

    return true;
}

void DeckPlayer::loaderThreadFunc(std::string path) {
    std::cout << "[DECKPLAYER LOADER] thread started: " << path << std::endl;

    auto newFile = fileManager_.loadFile(path);

    if (!newFile) {
        std::cout << "[DECKPLAYER LOADER] decode failed: " << path << std::endl;
        loadFailed_.store(true, std::memory_order_release);
        loadInProgress_.store(false, std::memory_order_release);
        return;
    }

    // The audio thread may be spinning on rawAudioFile_==nullptr (silence).
    // Setting the controller duration first means that if play() is called
    // between these two stores, Transport::play() can succeed immediately
    // once rawAudioFile_ is visible.
    controller_.setTrackDuration(newFile->getMetadata().durationSeconds);

    // Atomic publish: the audio thread will pick this up on the next block.
    audioFile_ = std::move(newFile);
    rawAudioFile_.store(audioFile_.get(), std::memory_order_release);

    std::cout << "[DECKPLAYER LOADER] decode complete: " << path
              << " duration=" << controller_.getDuration() << std::endl;

    loadInProgress_.store(false, std::memory_order_release);
}

void DeckPlayer::joinLoaderThread() noexcept {
    std::lock_guard<std::mutex> lock(loaderMutex_);
    if (loaderThread_.joinable()) {
        loaderThread_.join();
    }
}

bool DeckPlayer::isLoading() const noexcept {
    return loadInProgress_.load(std::memory_order_acquire);
}

// =============================================================================
// Transport API
// =============================================================================

bool DeckPlayer::play() noexcept {
    const bool result = controller_.play();
    std::cout << "[DECKPLAYER PLAY] result=" << result
              << " duration=" << controller_.getDuration()
              << " position=" << controller_.getCurrentPosition()
              << " loaded=" << isLoaded()
              << " loading=" << isLoading()
              << std::endl;
    return result;
}

bool DeckPlayer::pause() noexcept  { return controller_.pause(); }
void DeckPlayer::stop()  noexcept  { controller_.stop(); }
bool DeckPlayer::seek(double seconds) noexcept { return controller_.seek(seconds); }
void DeckPlayer::setLoop(bool loop) noexcept   { controller_.setLoop(loop); }
bool DeckPlayer::isLooping() const noexcept    { return controller_.isLooping(); }
void DeckPlayer::setLoopRange(double start, double end) noexcept { controller_.setLoopRange(start, end); }
void DeckPlayer::setCue(double seconds) noexcept  { controller_.setCue(seconds); }
double DeckPlayer::getCue() const noexcept        { return controller_.getCue(); }
bool DeckPlayer::jumpToCue() noexcept             { return controller_.jumpToCue(); }

void DeckPlayer::setPitch(float percent) noexcept {
    pitchPercent_.store(percent, std::memory_order_relaxed);
    const double rate = std::clamp(1.0 + (static_cast<double>(percent) / 100.0), 0.5, 1.5);
    controller_.setPlaybackRate(rate);
}
float DeckPlayer::getPitch() const noexcept { return pitchPercent_.load(std::memory_order_relaxed); }

// =============================================================================
// State API
// =============================================================================

bool DeckPlayer::isLoaded() const noexcept {
    return rawAudioFile_.load(std::memory_order_acquire) != nullptr;
}
PlaybackState::State DeckPlayer::getState() const noexcept { return controller_.getState(); }
double DeckPlayer::getCurrentPosition() const noexcept     { return controller_.getCurrentPosition(); }
double DeckPlayer::getDuration() const noexcept            { return controller_.getDuration(); }
bool DeckPlayer::isPlaying() const noexcept                { return controller_.isPlaying(); }
bool DeckPlayer::hasLoadFailed() const noexcept            { return loadFailed_.load(std::memory_order_acquire); }

// =============================================================================
// AudioSource lifecycle
// =============================================================================

void DeckPlayer::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    systemSampleRate_   = sampleRate;
    maxBlockSize_       = maxBlockSize;
    systemChannelCount_ = channelCount;
    dspChain_.prepare(sampleRate, maxBlockSize, channelCount);
    meterEngine_.prepare(sampleRate, maxBlockSize, channelCount);
}

void DeckPlayer::process(float* const* outputChannels, int channelCount, int numSamples) noexcept {
    static std::atomic<uint64_t> deckTraceCount{0};
    const auto traceId = deckTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    if (outputChannels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    // Clear output first — silence is the correct output while loading.
    for (int i = 0; i < channelCount; ++i) {
        if (outputChannels[i])
            std::memset(outputChannels[i], 0, numSamples * sizeof(float));
    }

    if (!controller_.isPlaying()) {
        meterEngine_.reset();
        return;
    }

    processing_.store(true, std::memory_order_release);

    {
        auto* file = rawAudioFile_.load(std::memory_order_acquire);
        if (file && file->getDecoder()) {
            PooledBuffer scratch = bufferPool_.acquireBuffer();
            if (scratch.isValid()) {
                AudioDecoder* decoder    = file->getDecoder();
                const double fileSR      = decoder->getSampleRate();
                const double playRate    = controller_.getPlaybackRate();
                const double sourceStep  = (fileSR > 0.0 && systemSampleRate_ > 0.0)
                                           ? (playRate * fileSR / systemSampleRate_)
                                           : 1.0;
                const double currentSample = controller_.getCurrentPosition() * fileSR;

                int readChannels    = std::min(channelCount, decoder->getNumChannels());
                int maxScratchCh    = scratch->getNumChannels();
                readChannels        = std::min(readChannels, maxScratchCh);

                if (readChannels > 0) {
                    bool decoded = false;
                    if (std::abs(sourceStep - 1.0) < 1e-6 &&
                        std::abs(currentSample - std::round(currentSample)) < 1e-6) {
                        decoded = decoder->readSamples(
                            scratch->getArrayOfWritePointers(), readChannels,
                            static_cast<int64_t>(std::llround(currentSample)), numSamples);
                    } else {
                        decoded = decoder->readInterpolatedSamples(
                            scratch->getArrayOfWritePointers(), readChannels,
                            currentSample, sourceStep, numSamples);
                    }

                    if (decoded) {
                        for (int c = 0; c < readChannels; ++c) {
                            const float* src = scratch->getReadPointer(c);
                            float* dst = outputChannels[c];
                            if (src && dst)
                                std::memcpy(dst, src, numSamples * sizeof(float));
                        }

                        controller_.advancePosition(numSamples, systemSampleRate_);
                        dspChain_.process(outputChannels, channelCount, numSamples);

                        if (traceId % 100 == 0) {
                            char buf[RtLogger::kMaxMsgLen];
                            std::snprintf(buf, sizeof(buf),
                                "[DECK PEAK] peak=%.6f pos=%.3f dur=%.3f ch=%d",
                                peakOf(outputChannels, channelCount, numSamples),
                                controller_.getCurrentPosition(),
                                controller_.getDuration(),
                                readChannels);
                            RtLogger::get().log(buf);
                        }

                        const int meterCh = std::min(channelCount, 8);
                        const float* meterPtrs[8] = {};
                        for (int ch = 0; ch < meterCh; ++ch)
                            meterPtrs[ch] = outputChannels[ch];
                        meterEngine_.process(meterPtrs, meterCh, numSamples);
                    } else if (traceId % 100 == 0) {
                        char buf[RtLogger::kMaxMsgLen];
                        std::snprintf(buf, sizeof(buf),
                            "[DECK PEAK] decode failed pos=%.3f dur=%.3f",
                            controller_.getCurrentPosition(),
                            controller_.getDuration());
                        RtLogger::get().log(buf);
                    }
                }
            }
        }
    }

    processing_.store(false, std::memory_order_release);
}

void DeckPlayer::reset() noexcept {
    controller_.reset();
    dspChain_.reset();
    meterEngine_.reset();
    pitchPercent_.store(0.0f, std::memory_order_relaxed);
}

void DeckPlayer::release() noexcept {
    // Signal any in-flight loader that we are shutting down, then join it.
    // The loader thread only touches audioFile_ / rawAudioFile_ / controller_,
    // all of which we reset below after join, so the ordering is safe.
    controller_.stop();
    while (processing_.load(std::memory_order_acquire)) {}

    // Wait for background decode to finish before we free the buffers it
    // may be writing into.
    joinLoaderThread();
    loadInProgress_.store(false, std::memory_order_relaxed);

    rawAudioFile_.store(nullptr, std::memory_order_release);
    audioFile_.reset();
    controller_.reset();
    dspChain_.release();
    meterEngine_.reset();
    pitchPercent_.store(0.0f, std::memory_order_relaxed);
}

bool DeckPlayer::isActive() const noexcept { return isPlaying(); }
double DeckPlayer::getSampleRate() const noexcept  { return systemSampleRate_; }
int DeckPlayer::getChannelCount() const noexcept   { return systemChannelCount_; }

ChannelDSPChain& DeckPlayer::getChannelDSPChain() noexcept       { return dspChain_; }
const ChannelDSPChain& DeckPlayer::getChannelDSPChain() const noexcept { return dspChain_; }
MeterEngine& DeckPlayer::getMeterEngine() noexcept       { return meterEngine_; }
const MeterEngine& DeckPlayer::getMeterEngine() const noexcept { return meterEngine_; }

} // namespace melodymeet
