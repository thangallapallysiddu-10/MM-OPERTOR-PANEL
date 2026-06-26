#include "AudioCallback.h"
#include <atomic>
#include <iostream>
#include <algorithm>
#include <cmath>
#include <cstring>

namespace melodymeet
{

namespace
{
} // namespace

AudioCallback::~AudioCallback()
{
    shutdown();
}

void AudioCallback::initialize(AudioClock& audioClock, SessionManager& sessionManager, EngineStatistics& engineStats) noexcept
{
    audioClock_ = &audioClock;
    sessionManager_ = &sessionManager;
    engineStats_ = &engineStats;
}

void AudioCallback::shutdown() noexcept
{
    audioClock_ = nullptr;
    sessionManager_ = nullptr;
    engineStats_ = nullptr;
}

void AudioCallback::audioDeviceIOCallbackWithContext(
    const float* const* inputChannelData,
    int numInputChannels,
    float* const* outputChannelData,
    int numOutputChannels,
    int numSamples,
    const juce::AudioIODeviceCallbackContext& /*context*/)
{
    (void) inputChannelData;
    (void) numInputChannels;
    
    auto startTime = juce::Time::getHighResolutionTicks();
    static std::atomic<uint64_t> callbackTraceCount{0};
    const auto traceId = callbackTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    // Step 1: Tick the global engine clock
    if (audioClock_)
    {
        audioClock_->processBlock(numSamples);
    }

    if (outputChannelData != nullptr && numOutputChannels > 0 && numSamples > 0)
    {
        for (int ch = 0; ch < numOutputChannels; ++ch) {
            std::fill_n(outputChannelData[ch], numSamples, 0.0f);
        }

        // Step 3: Process all active sessions
        if (sessionManager_)
        {
            sessionManager_->process(outputChannelData, numOutputChannels, numSamples);
        }
    }

    if (engineStats_)
    {
        auto endTime = juce::Time::getHighResolutionTicks();
        double elapsedMs = juce::Time::highResolutionTicksToSeconds(endTime - startTime) * 1000.0;
        engineStats_->reportCallback(elapsedMs);
    }
}

void AudioCallback::audioDeviceAboutToStart(juce::AudioIODevice* /*device*/)
{
}

void AudioCallback::audioDeviceStopped()
{
}

} // namespace melodymeet
