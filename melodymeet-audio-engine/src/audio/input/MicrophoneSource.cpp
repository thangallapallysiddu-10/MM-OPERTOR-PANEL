#include "MicrophoneSource.h"

#include <algorithm>
#include <cstring>
#include <cmath>
#include <atomic>
#include <iostream>

#include "../dsp/processors/GainProcessor.h"
#include "../dsp/processors/NoiseGateProcessor.h"
#include "../dsp/processors/HighPassFilter.h"
#include "../dsp/processors/CompressorProcessor.h"
#include "../dsp/processors/EQProcessor.h"
#include "../dsp/processors/LimiterProcessor.h"

namespace melodymeet {

namespace
{
} // namespace

MicrophoneSource::MicrophoneSource() {
    auto gain = std::make_shared<GainProcessor>();
    gain->setGain(1.0f);

    auto gate = std::make_shared<NoiseGateProcessor>();
    gate->setBypass(true);

    auto highPass = std::make_shared<HighPassFilter>();
    highPass->setBypass(true);

    auto compressor = std::make_shared<CompressorProcessor>();
    compressor->setBypass(true);
    compressor->setRatio(1.0f);
    compressor->setMakeupGain(0.0f);

    auto eq = std::make_shared<EQProcessor>();
    eq->setBandGainDb(EQProcessor::LowShelf, 0.0f);
    eq->setBandGainDb(EQProcessor::MidPeak, 0.0f);
    eq->setBandGainDb(EQProcessor::HighShelf, 0.0f);

    auto limiter = std::make_shared<LimiterProcessor>();
    limiter->setBypass(true);
    limiter->setCeiling(0.0f);

    dspChain_.setProcessor(ChannelDSPChain::Slot::Gain, gain);
    dspChain_.setProcessor(ChannelDSPChain::Slot::NoiseGate, gate);
    dspChain_.setProcessor(ChannelDSPChain::Slot::HighPassFilter, highPass);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Compressor, compressor);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Equalizer, eq);
    dspChain_.setProcessor(ChannelDSPChain::Slot::Limiter, limiter);
}

MicrophoneSource::~MicrophoneSource() {
    release();
}

void MicrophoneSource::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    channelCount_ = channelCount;
    numFifoChannels_ = channelCount;

    // Pre-allocate FIFO for ~bufferDurationSeconds_ of audio.
    int fifoCapacityFrames = static_cast<int>(sampleRate * bufferDurationSeconds_);

    // Round up to nearest power of 2 for efficient modular arithmetic.
    int pow2 = 1;
    while (pow2 < fifoCapacityFrames) pow2 *= 2;
    fifoCapacityFrames = pow2;

    fifo_.setTotalSize(fifoCapacityFrames);
    fifoBuffer_.assign(static_cast<size_t>(fifoCapacityFrames) * numFifoChannels_, 0.0f);

    dspChain_.prepare(sampleRate, maxBlockSize, channelCount);
    meterEngine_.prepare(sampleRate, maxBlockSize, channelCount);

    prepared_ = true;
}

void MicrophoneSource::process(float* const* outputChannels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || !enabled_.load(std::memory_order_relaxed)) {
        meterEngine_.reset();
        return;
    }

    // Zero the entire output buffer first to guarantee silence on underrun
    // and prevent stale data when FIFO has fewer samples than requested.
    for (int ch = 0; ch < channelCount; ++ch) {
        if (outputChannels[ch]) {
            std::memset(outputChannels[ch], 0, static_cast<std::size_t>(numSamples) * sizeof(float));
        }
    }

    int ready = fifo_.getNumReady();
    int toRead = std::min(numSamples, ready);

    if (toRead <= 0) {
        meterEngine_.reset();
        return; // Underrun — output is already zeroed above.
    }

    bool isMuted = muted_.load(std::memory_order_relaxed);

    int startIndex1, blockSize1, startIndex2, blockSize2;
    fifo_.prepareToRead(toRead, startIndex1, blockSize1, startIndex2, blockSize2);

    auto readBlock = [&](int startIdx, int bSize, int destOffset) {
        if (bSize <= 0) return;

        if (isMuted) {
            // Consume the data but don't mix it — output stays silent.
            return;
        }

        int chToCopy = std::min(channelCount, numFifoChannels_);
        for (int ch = 0; ch < chToCopy; ++ch) {
            float* dest = outputChannels[ch] + destOffset;
            const float* src = fifoBuffer_.data() + static_cast<size_t>(startIdx) * numFifoChannels_ + ch;

            for (int s = 0; s < bSize; ++s) {
                dest[s] = src[s * numFifoChannels_];
            }
        }
    };

    readBlock(startIndex1, blockSize1, 0);
    readBlock(startIndex2, blockSize2, blockSize1);

    fifo_.finishedRead(blockSize1 + blockSize2);

    // Apply DSP to the full block (tail beyond toRead is zeroed).
    dspChain_.process(outputChannels, channelCount, numSamples);

    const int channelsToMeter = std::min(channelCount, 8);
    const float* meterChannels[8] = {};
    for (int ch = 0; ch < channelsToMeter; ++ch) {
        meterChannels[ch] = outputChannels[ch];
    }
    meterEngine_.process(meterChannels, channelsToMeter, numSamples);
}

void MicrophoneSource::reset() noexcept {
    fifo_.reset();
    dspChain_.reset();
    meterEngine_.reset();
}

void MicrophoneSource::release() noexcept {
    prepared_ = false;
    fifo_.reset();
    dspChain_.release();
    meterEngine_.reset();
    // Note: We don't call clear()/shrink_to_fit() here because release()
    // may be called from any thread. The buffers will be freed with the object.
}

bool MicrophoneSource::isActive() const noexcept {
    return prepared_ && enabled_.load(std::memory_order_relaxed);
}

double MicrophoneSource::getSampleRate() const noexcept {
    return sampleRate_;
}

int MicrophoneSource::getChannelCount() const noexcept {
    return channelCount_;
}

void MicrophoneSource::pushAudio(const float* const* inputChannels, int numInputChannels, int numSamples) noexcept {
    if (!prepared_ || !enabled_.load(std::memory_order_relaxed)
        || numSamples <= 0 || inputChannels == nullptr)
    {
        return;
    }

    int freeSpace = fifo_.getFreeSpace();
    int toWrite = std::min(numSamples, freeSpace);

    if (toWrite <= 0)
    {
        return; // Overflow — drop this block.
    }

    int startIndex1, blockSize1, startIndex2, blockSize2;
    fifo_.prepareToWrite(toWrite, startIndex1, blockSize1, startIndex2, blockSize2);

    auto writeBlock = [&](int startIdx, int bSize, int srcOffset) {
        if (bSize <= 0) return;

        float sum = 0.0f;
        for (int ch = 0; ch < numFifoChannels_; ++ch) {
            // If input has fewer channels than FIFO, duplicate channel 0 (mono→stereo).
            int inputCh = (ch < numInputChannels) ? ch : 0;
            const float* src = inputChannels[inputCh] + srcOffset;
            float* dest = fifoBuffer_.data() + static_cast<size_t>(startIdx) * numFifoChannels_ + ch;

            for (int s = 0; s < bSize; ++s) {
                dest[s * numFifoChannels_] = src[s];
                if (ch == 0) sum += std::abs(src[s]);
            }
        }
    };

    writeBlock(startIndex1, blockSize1, 0);
    writeBlock(startIndex2, blockSize2, blockSize1);

    fifo_.finishedWrite(blockSize1 + blockSize2);
}

void MicrophoneSource::setEnabled(bool enabled) noexcept {
    enabled_.store(enabled, std::memory_order_relaxed);
    if (!enabled) reset();
    version_.fetch_add(1, std::memory_order_relaxed);
}

bool MicrophoneSource::isEnabled() const noexcept {
    return enabled_.load(std::memory_order_relaxed);
}

void MicrophoneSource::setMuted(bool muted) noexcept {
    muted_.store(muted, std::memory_order_relaxed);
    version_.fetch_add(1, std::memory_order_relaxed);
}

bool MicrophoneSource::isMuted() const noexcept {
    return muted_.load(std::memory_order_relaxed);
}

void MicrophoneSource::setGain(float gainLinear) noexcept {
    const float safeGain = std::max(0.0f, gainLinear);
    gain_.store(safeGain, std::memory_order_relaxed);
    if (auto processor = dspChain_.getProcessor(ChannelDSPChain::Slot::Gain)) {
        if (auto* gain = dynamic_cast<GainProcessor*>(processor.get())) {
            gain->setGain(safeGain);
        }
    }
    version_.fetch_add(1, std::memory_order_relaxed);
}

float MicrophoneSource::getGain() const noexcept {
    return gain_.load(std::memory_order_relaxed);
}

void MicrophoneSource::setBufferDuration(double seconds) noexcept {
    bufferDurationSeconds_ = seconds;
}

ChannelDSPChain& MicrophoneSource::getChannelDSPChain() noexcept {
    return dspChain_;
}

const ChannelDSPChain& MicrophoneSource::getChannelDSPChain() const noexcept {
    return dspChain_;
}

MeterEngine& MicrophoneSource::getMeterEngine() noexcept {
    return meterEngine_;
}

const MeterEngine& MicrophoneSource::getMeterEngine() const noexcept {
    return meterEngine_;
}

} // namespace melodymeet
