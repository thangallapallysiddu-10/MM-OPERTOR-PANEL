#include "AudioCallback.h"

#include "../utilities/RtLogger.h"

#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <cstdio>   // snprintf — safe in RT context (no heap, no lock on most platforms)

namespace melodymeet
{

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
// Watchdog constants
// =============================================================================
// If xruns accumulate at this rate (per kWatchdogWindow callbacks), the
// session DSP state is reset on the next block to clear any corrupted
// filter state that may have caused the underrun.
constexpr uint64_t kWatchdogWindow      = 500;   // callbacks (~5 s at 44100/512)
constexpr uint64_t kXRunResetThreshold  = 3;      // 3 xruns in 500 callbacks → reset

// Trace period: log every N callbacks (keeps log volume at ~1 msg/sec at 86 cbs/s)
constexpr uint64_t kTracePeriod = 100;

// =============================================================================

AudioCallback::~AudioCallback()
{
    shutdown();
}

void AudioCallback::initialize(AudioClock&       audioClock,
                               SessionManager&   sessionManager,
                               EngineStatistics& engineStats,
                               BufferPool&       bufferPool) noexcept
{
    audioClock_     = &audioClock;
    sessionManager_ = &sessionManager;
    engineStats_    = &engineStats;
    bufferPool_     = &bufferPool;
}

void AudioCallback::shutdown() noexcept
{
    audioClock_     = nullptr;
    sessionManager_ = nullptr;
    engineStats_    = nullptr;
    bufferPool_     = nullptr;
}

void AudioCallback::audioDeviceIOCallbackWithContext(
    const float* const* inputChannelData,
    int                 numInputChannels,
    float* const*       outputChannelData,
    int                 numOutputChannels,
    int                 numSamples,
    const juce::AudioIODeviceCallbackContext& /*context*/)
{
    (void)inputChannelData;
    (void)numInputChannels;

    const auto startTime = juce::Time::getHighResolutionTicks();

    // ── Callback counter ─────────────────────────────────────────────────────
    static std::atomic<uint64_t> callbackCount{0};
    const uint64_t traceId = callbackCount.fetch_add(1, std::memory_order_relaxed) + 1;

    // ── Trace (lock-free, RT-safe) ────────────────────────────────────────────
    if (traceId % kTracePeriod == 0) {
        char buf[RtLogger::kMaxMsgLen];
        std::snprintf(buf, sizeof(buf),
            "[AUDIO CALLBACK] count=%llu outputs=%d samples=%d",
            static_cast<unsigned long long>(traceId), numOutputChannels, numSamples);
        RtLogger::get().log(buf);
    }

    // ── Clock tick ───────────────────────────────────────────────────────────
    if (audioClock_)
        audioClock_->processBlock(numSamples);

    // ── Audio processing ─────────────────────────────────────────────────────
    if (outputChannelData != nullptr && numOutputChannels > 0 && numSamples > 0)
    {
        // Zero the hardware buffer first — silence is always the safe output.
        for (int ch = 0; ch < numOutputChannels; ++ch)
            std::fill_n(outputChannelData[ch], numSamples, 0.0f);

        if (sessionManager_)
            sessionManager_->process(outputChannelData, numOutputChannels, numSamples);

        if (traceId % kTracePeriod == 0) {
            char buf[RtLogger::kMaxMsgLen];
            std::snprintf(buf, sizeof(buf),
                "[AUDIO CALLBACK OUTPUT PEAK] %.6f",
                peakOf(outputChannelData, numOutputChannels, numSamples));
            RtLogger::get().log(buf);
        }
    }

    // ── Statistics + watchdog ─────────────────────────────────────────────────
    if (engineStats_)
    {
        const auto endTime  = juce::Time::getHighResolutionTicks();
        const double elapsed = juce::Time::highResolutionTicksToSeconds(endTime - startTime) * 1000.0;
        engineStats_->reportCallback(elapsed);

        // Watchdog: if too many xruns accumulate in a short window, the DSP
        // chain may have accumulated bad state (corrupted filter coefficients,
        // stuck envelope followers). Reset all session DSP without stopping
        // the device — this clears filter history and smoother state in a
        // single cheap memset-equivalent call, which is safe from the audio
        // thread because DSPChain::reset() only touches non-atomic members
        // and is protected by the prepared_ flag check.
        if ((traceId % kWatchdogWindow) == 0)
        {
            const auto snap     = engineStats_->getSnapshot();
            const auto xrunNow  = snap.xruns;

            // We store the xrun baseline in a static atomic — safe from a
            // single audio thread.
            static std::atomic<uint64_t> lastXRunBaseline{0};
            const uint64_t baseline = lastXRunBaseline.load(std::memory_order_relaxed);
            const uint64_t delta    = (xrunNow > baseline) ? (xrunNow - baseline) : 0;

            if (delta >= kXRunResetThreshold && sessionManager_)
            {
                // Reset DSP state on both sessions to clear corrupted filters.
                // reset() is noexcept and touches no atomics on the hot path.
                if (auto* active = sessionManager_->getOutputSession())
                    active->getMixer().reset();

                char warnBuf[RtLogger::kMaxMsgLen];
                std::snprintf(warnBuf, sizeof(warnBuf),
                    "[WATCHDOG] %llu xruns in last %llu callbacks — DSP reset applied",
                    static_cast<unsigned long long>(delta),
                    static_cast<unsigned long long>(kWatchdogWindow));
                RtLogger::get().log(warnBuf);
            }

            lastXRunBaseline.store(xrunNow, std::memory_order_relaxed);
        }
    }
}

void AudioCallback::audioDeviceAboutToStart(juce::AudioIODevice* device)
{
    // Flush any log messages queued during the previous run.
    RtLogger::get().drain();

    if (device == nullptr)
        return;

    // Capture the live device format. These values are written here on the
    // device-management thread and are stable before any IO callback fires.
    sampleRate_        = device->getCurrentSampleRate();
    bufferSize_        = device->getCurrentBufferSizeSamples();
    numOutputChannels_ = device->getActiveOutputChannels().countNumberOfSetBits();

    if (sampleRate_ <= 0.0 || bufferSize_ <= 0)
        return;

    // Re-initialise the clock with the (possibly new) device format.
    // This is safe here because no IO callback is running yet.
    if (audioClock_)
    {
        audioClock_->initialize(sampleRate_, bufferSize_);
        audioClock_->start();
    }

    // Re-prepare the buffer pool to match any new buffer size.
    if (bufferPool_)
        bufferPool_->prepare(32, numOutputChannels_, bufferSize_);

    // Re-prepare all sessions so DSP chains, FIFOs, and meters are sized
    // correctly for the new format. Sessions remain in Running state — they
    // were never stopped, just re-prepared.
    if (sessionManager_)
        sessionManager_->prepare(sampleRate_, bufferSize_, numOutputChannels_);

    if (engineStats_)
        engineStats_->setFormat(sampleRate_, bufferSize_);

    char buf[RtLogger::kMaxMsgLen];
    std::snprintf(buf, sizeof(buf),
        "[AUDIO CALLBACK] device started: sr=%.0f buf=%d outCh=%d",
        sampleRate_, bufferSize_, numOutputChannels_);
    RtLogger::get().log(buf);
}

void AudioCallback::audioDeviceStopped()
{
    // Flush remaining log messages before the device closes.
    RtLogger::get().drain();

    char buf[RtLogger::kMaxMsgLen];
    std::snprintf(buf, sizeof(buf), "[AUDIO CALLBACK] device stopped");
    RtLogger::get().log(buf);
    RtLogger::get().drain();
}

} // namespace melodymeet
