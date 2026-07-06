#include "OutputStage.h"
#include "../dsp/processors/MasterGainProcessor.h"
#include "../dsp/processors/CompressorProcessor.h"
#include "../dsp/processors/LimiterProcessor.h"
#include "../../utilities/RtLogger.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdio>
#include <cstring>

namespace melodymeet {

namespace
{
float peakOf(const float* const* channels, int channelCount, int numSamples) noexcept
{
    float peak = 0.0f;
    if (channels == nullptr)
        return peak;

    for (int ch = 0; ch < channelCount; ++ch) {
        const auto* data = channels[ch];
        if (!data)
            continue;

        for (int s = 0; s < numSamples; ++s)
            peak = std::max(peak, std::abs(data[s]));
    }

    return peak;
}

float peakOf(float* const* channels, int channelCount, int numSamples) noexcept
{
    float peak = 0.0f;
    if (channels == nullptr)
        return peak;

    for (int ch = 0; ch < channelCount; ++ch) {
        const auto* data = channels[ch];
        if (!data)
            continue;

        for (int s = 0; s < numSamples; ++s)
            peak = std::max(peak, std::abs(data[s]));
    }

    return peak;
}
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
    static std::atomic<uint64_t> outputTraceCount{0};
    const auto traceId = outputTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    if (!prepared_ || inputChannels == nullptr || channelCount <= 0 || numSamples <= 0)
        return;

    const int channelsToCopy = std::min(channelCount, channelCount_);
    const int samplesToCopy = std::min(numSamples, maxBlockSize_);
    if (samplesToCopy <= 0)
        return;

    const float masterInputPeak = peakOf(inputChannels, channelsToCopy, samplesToCopy);

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

    // Step 2: Sanitize — replace any NaN or Inf with 0 before DSP.
    // A single NaN produced by an upstream DSP processor (bad filter state,
    // divide-by-zero in a compressor) will propagate through every subsequent
    // processor and reach the hardware output as a full-scale click or
    // sustained loud artefact. This is the last firewall before the DAC.
    // The loop is branchless for finite values and costs ~1 ns per block on
    // modern CPUs — well within budget for a broadcast engine.
    for (int ch = 0; ch < channelsToCopy; ++ch) {
        float* buf = processedChannels_[static_cast<std::size_t>(ch)];
        for (int s = 0; s < samplesToCopy; ++s) {
            if (!std::isfinite(buf[s])) {
                buf[s] = 0.0f;
            }
        }
    }

    // Step 3: Apply master DSP in-place (MasterGain → Compressor → Limiter).
    {
        // Suppress denormals for the entire master chain. Denormal floats in
        // the compressor's envelope follower or the limiter's lookahead buffer
        // can cause ~100× CPU spikes. This is a zero-overhead hardware flag on
        // x86/ARM and is safe to set and restore around a single DSP block.
        juce::ScopedNoDenormals noDenormals;
        masterChain_.process(processedChannels_.data(), channelsToCopy, samplesToCopy);
    }

    if (traceId % 100 == 0) {
        float outPeak = peakOf(processedChannels_.data(), channelsToCopy, samplesToCopy);
        char buf[RtLogger::kMaxMsgLen];
        std::snprintf(buf, sizeof(buf),
            "[MASTER PEAK] input=%.6f output=%.6f",
            masterInputPeak,
            outPeak);
        RtLogger::get().log(buf);
        std::cout << "[MASTER PEAK] " << outPeak << std::endl;
        std::cout << "[MONITOR PEAK] 0.0 (Monitor routing is not implemented in OutputStage/RJSession)" << std::endl;
    }

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
