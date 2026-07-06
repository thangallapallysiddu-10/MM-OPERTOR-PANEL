#include "RJSession.h"

#include "../utilities/RtLogger.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdio>

namespace melodymeet
{

namespace
{
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

RJSession::RJSession(BufferPool& bufferPool)
    : playbackManager_(bufferPool)
{
    // Initialize MicrophoneManager for RJ layout (5 microphones)
    microphoneManager_.initialize(5);

    // Register sources to mixer and bind deck-aware controls.
    const auto deckAId = mixer_.registerSource(playbackManager_.getDeckA());
    const auto deckBId = mixer_.registerSource(playbackManager_.getDeckB());
    mixer_.setDeckSourceIds(deckAId, deckBId);

    char buf[256];
    std::snprintf(buf, sizeof(buf), "[RJ INIT] Registered Deck A (id=%u) Deck B (id=%u)",
        static_cast<unsigned>(deckAId), static_cast<unsigned>(deckBId));
    melodymeet::RtLogger::get().log(buf);

    for (std::size_t i = 0; i < microphoneManager_.getMicrophones().size(); ++i) {
        const auto& mic = microphoneManager_.getMicrophones()[i];
        if (mic) {
            const auto micId = mixer_.registerSource(mic);
            std::snprintf(buf, sizeof(buf), "[RJ INIT] Registered Mic %zu (sourceId=%u)",
                i, static_cast<unsigned>(micId));
            melodymeet::RtLogger::get().log(buf);
        }
    }
}

void RJSession::prepare(double sampleRate, int bufferSize, int numOutputChannels)
{
    // mixer_.prepare() iterates all registered sources and calls prepare() on
    // each one — decks and mics are registered in the constructor, so they are
    // all covered. Calling prepare() on them again here would be a double-prepare.
    mixer_.prepare(sampleRate, bufferSize, numOutputChannels);
    outputStage_.prepare(sampleRate, bufferSize, numOutputChannels);
    broadcastPipeline_.prepare(sampleRate, bufferSize, numOutputChannels);
}

void RJSession::release()
{
    // mixer_.release() calls release() on all registered sources.
    mixer_.release();
    outputStage_.release();
    broadcastPipeline_.release();
}

void RJSession::process(float* const* outputChannelData, int numOutputChannels, int numSamples)
{
    static std::atomic<uint64_t> rjTraceCount{0};
    const auto traceId = rjTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    // If the engine state is running, we process audio
    if (state_.getEngineState() == SessionState::EngineState::Running) {
        mixer_.process(outputChannelData, numOutputChannels, numSamples);

        if (traceId % 100 == 0) {
            char buf[melodymeet::RtLogger::kMaxMsgLen];
            std::snprintf(buf, sizeof(buf), "[RJ SESSION] afterMixerPeak=%.6f",
                peakOf(outputChannelData, numOutputChannels, numSamples));
            melodymeet::RtLogger::get().log(buf);
        }

        outputStage_.process(outputChannelData, numOutputChannels, numSamples);

        // Copy processed master mix back to hardware buffer
        if (const auto* processed = outputStage_.getProcessedBuffer()) {
            const int channelsToCopy = std::min(numOutputChannels, outputStage_.getProcessedChannelCount());
            const int samplesToCopy = std::max(0, numSamples);
            for (int ch = 0; ch < channelsToCopy; ++ch) {
                if (outputChannelData[ch] && processed[ch]) {
                    std::memcpy(outputChannelData[ch], processed[ch], static_cast<std::size_t>(samplesToCopy) * sizeof(float));
                }
            }
        }

        if (traceId % 100 == 0) {
            char buf[melodymeet::RtLogger::kMaxMsgLen];
            std::snprintf(buf, sizeof(buf), "[RJ SESSION] hardwareBufferPeak=%.6f",
                peakOf(outputChannelData, numOutputChannels, numSamples));
            melodymeet::RtLogger::get().log(buf);
        }

        broadcastPipeline_.process(outputChannelData, numOutputChannels, numSamples);
        
        // Metering could be updated here based on outputStage / mixer outputs
    }
}

} // namespace melodymeet
