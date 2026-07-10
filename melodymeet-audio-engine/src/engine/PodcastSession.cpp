#include "PodcastSession.h"

#include "../utilities/RtLogger.h"

#include <algorithm>
#include <cmath>
#include <cstdio>

namespace melodymeet
{

namespace
{
} // namespace

PodcastSession::PodcastSession(BufferPool& bufferPool)
{
    // PHASE 1: Multi-mic activation for Podcast Studio (5 microphones)
    microphoneManager_.initialize(5);

    char buf[256];
    std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Microphone Manager initialized with %zu microphones",
        microphoneManager_.getMicrophones().size());
    melodymeet::RtLogger::get().log(buf);

    previewPlayback_ = std::make_shared<DeckPlayer>(bufferPool);

    // Register sources to mixer
    const auto previewId = mixer_.registerSource(previewPlayback_);
    std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Registered Preview Playback (sourceId=%u)",
        static_cast<unsigned>(previewId));
    melodymeet::RtLogger::get().log(buf);
    
    std::cout << "[PODCAST INIT CRITICAL] Preview sourceId=" << previewId << std::endl;

    for (std::size_t i = 0; i < microphoneManager_.getMicrophones().size(); ++i) {
        const auto& mic = microphoneManager_.getMicrophones()[i];
        if (mic) {
            const auto micId = mixer_.registerSource(mic);
            std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Registered Mic %zu (sourceId=%u)",
                i, static_cast<unsigned>(micId));
            melodymeet::RtLogger::get().log(buf);
            
            std::cout << "[PODCAST INIT CRITICAL] Mic index=" << i 
                      << " sourceId=" << micId << std::endl;
            
            // Validate DSP chain initialization
            const auto& dspChain = mic->getChannelDSPChain();
            std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Mic %zu DSP Chain Ready", i);
            melodymeet::RtLogger::get().log(buf);
            
            // Validate meter engine initialization
            const auto& meterEngine = mic->getMeterEngine();
            std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Mic %zu Meter Engine Ready", i);
            melodymeet::RtLogger::get().log(buf);
        }
    }

    std::snprintf(buf, sizeof(buf), "[PODCAST PHASE 1] Mixer Total Source Count: %zu",
        mixer_.getSourceCount());
    melodymeet::RtLogger::get().log(buf);
}

void PodcastSession::prepare(double sampleRate, int bufferSize, int numOutputChannels)
{
    // mixer_.prepare() calls prepare() on all registered sources (previewPlayback_
    // and the mic). No need to prepare them individually here.
    mixer_.prepare(sampleRate, bufferSize, numOutputChannels);
    outputStage_.prepare(sampleRate, bufferSize, numOutputChannels);
    recorder_.prepare(sampleRate, bufferSize, numOutputChannels);
}

void PodcastSession::release()
{
    // mixer_.release() calls release() on all registered sources.
    mixer_.release();
    outputStage_.release();
}

void PodcastSession::process(float* const* outputChannelData, int numOutputChannels, int numSamples)
{
    if (state_.getEngineState() == SessionState::EngineState::Running) {
        mixer_.process(outputChannelData, numOutputChannels, numSamples);
        outputStage_.process(outputChannelData, numOutputChannels, numSamples);

        // Copy processed master mix back to hardware buffer
        if (const auto* processed = outputStage_.getProcessedBuffer()) {
            const int channelsToCopy = std::min(numOutputChannels, outputStage_.getProcessedChannelCount());
            for (int ch = 0; ch < channelsToCopy; ++ch) {
                if (outputChannelData[ch] && processed[ch]) {
                    std::memcpy(outputChannelData[ch], processed[ch], static_cast<std::size_t>(numSamples) * sizeof(float));
                }
            }
        }

        recorder_.process(outputChannelData, numOutputChannels, numSamples);
    }
}

} // namespace melodymeet
