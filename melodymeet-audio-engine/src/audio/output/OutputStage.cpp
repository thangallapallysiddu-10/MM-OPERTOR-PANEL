#include "OutputStage.h"
#include "../dsp/processors/MasterGainProcessor.h"
#include "../dsp/processors/CompressorProcessor.h"
#include "../dsp/processors/LimiterProcessor.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstring>
#include <iostream>

namespace melodymeet {

namespace
{
} // namespace

OutputStage::OutputStage() {
    auto masterGain = std::make_shared<MasterGainProcessor>();
    masterGain->setGainLinear(1.0f);

    auto compressor = std::make_shared<CompressorProcessor>();
    compressor->setBypass(true);
    compressor->setRatio(1.0f);
    compressor->setMakeupGain(0.0f);

    auto limiter = std::make_shared<LimiterProcessor>();
    limiter->setBypass(false);
    limiter->setCeiling(0.0f);
    limiter->setRelease(10.0f);

    masterChain_.setProcessor(MasterDSPChain::Slot::MasterGain, masterGain);
    masterChain_.setProcessor(MasterDSPChain::Slot::Compressor, compressor);
    masterChain_.setProcessor(MasterDSPChain::Slot::Limiter, limiter);
}

void OutputStage::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 0.0;
    maxBlockSize_ = maxBlockSize > 0 ? maxBlockSize : 0;
    channelCount_ = channelCount > 0 ? channelCount : 0;

    const auto sampleCount = static_cast<std::size_t>(maxBlockSize_ * channelCount_);
    processedBuffer_.assign(sampleCount, 0.0f);
    processedChannels_.assign(static_cast<std::size_t>(channelCount_), nullptr);
    processedChannelsConst_.assign(static_cast<std::size_t>(channelCount_), nullptr);

    for (int ch = 0; ch < channelCount_; ++ch) {
        const auto offset = static_cast<std::size_t>(ch * maxBlockSize_);
        processedChannels_[static_cast<std::size_t>(ch)] = processedBuffer_.data() + offset;
        processedChannelsConst_[static_cast<std::size_t>(ch)] = processedBuffer_.data() + offset;
    }

    prepared_ = sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0;

    masterChain_.prepare(sampleRate, maxBlockSize, channelCount);
    meterEngine_.prepare(sampleRate, maxBlockSize, channelCount);
}

void OutputStage::release() noexcept {
    masterChain_.release();
    processedBuffer_.clear();
    processedChannels_.clear();
    processedChannelsConst_.clear();
    prepared_ = false;
}

void OutputStage::reset() noexcept {
    masterChain_.reset();
    meterEngine_.reset();

    // Clear the processed buffer to silence.
    if (prepared_) {
        const auto sampleCount = static_cast<std::size_t>(maxBlockSize_ * channelCount_);
        std::fill(processedBuffer_.begin(), processedBuffer_.begin() + sampleCount, 0.0f);
    }
}

void OutputStage::process(const float* const* inputChannels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || inputChannels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    const int channelsToCopy = std::min(channelCount, channelCount_);
    const int samplesToCopy = std::min(numSamples, maxBlockSize_);
    if (samplesToCopy <= 0)
        return;

    // Always clear the complete internal block before copying the valid callback
    // span. This prevents stale samples from reaching DSP, meters, or consumers.
    for (int ch = 0; ch < channelCount_; ++ch) {
        std::memset(processedChannels_[static_cast<std::size_t>(ch)],
                    0,
                    static_cast<std::size_t>(maxBlockSize_) * sizeof(float));
    }

    // Step 1: Copy the Mixer's Program Buffer into our internal processed buffer.
    for (int ch = 0; ch < channelsToCopy; ++ch) {
        if (inputChannels[ch] != nullptr) {
            std::memcpy(processedChannels_[static_cast<std::size_t>(ch)],
                        inputChannels[ch],
                        static_cast<std::size_t>(samplesToCopy) * sizeof(float));
        }
    }

    // Step 2: Apply master DSP in-place
    masterChain_.process(processedChannels_.data(), channelsToCopy, samplesToCopy);

    // Apply metering
    meterEngine_.process(processedChannelsConst_.data(), channelsToCopy, samplesToCopy);
}

const float* const* OutputStage::getProcessedBuffer() const noexcept {
    if (!prepared_ || processedChannelsConst_.empty())
        return nullptr;

    return processedChannelsConst_.data();
}

int OutputStage::getProcessedChannelCount() const noexcept {
    return channelCount_;
}

MasterDSPChain& OutputStage::getMasterDSPChain() noexcept {
    return masterChain_;
}

const MasterDSPChain& OutputStage::getMasterDSPChain() const noexcept {
    return masterChain_;
}

} // namespace melodymeet
