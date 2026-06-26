#include "RJSession.h"

#include <algorithm>
#include <cmath>
#include <iostream>

namespace melodymeet
{

namespace
{
} // namespace

RJSession::RJSession(BufferPool& bufferPool)
    : playbackManager_(bufferPool)
{
    // Initialize MicrophoneManager for RJ layout (5 microphones)
    microphoneManager_.initialize(5);

    // Register sources to mixer
    mixer_.registerSource(playbackManager_.getDeckA());
    mixer_.registerSource(playbackManager_.getDeckB());

    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mixer_.registerSource(mic);
        }
    }
}

void RJSession::prepare(double sampleRate, int bufferSize, int numOutputChannels)
{
    mixer_.prepare(sampleRate, bufferSize, numOutputChannels);
    outputStage_.prepare(sampleRate, bufferSize, numOutputChannels);
    broadcastPipeline_.prepare(sampleRate, bufferSize, numOutputChannels);
    
    if (auto deckA = playbackManager_.getDeckA()) deckA->prepare(sampleRate, bufferSize, numOutputChannels);
    if (auto deckB = playbackManager_.getDeckB()) deckB->prepare(sampleRate, bufferSize, numOutputChannels);
    
    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mic->prepare(sampleRate, bufferSize, numOutputChannels);
        }
    }
}

void RJSession::release()
{
    mixer_.release();
    outputStage_.release();
    broadcastPipeline_.release();
    
    if (auto deckA = playbackManager_.getDeckA()) deckA->release();
    if (auto deckB = playbackManager_.getDeckB()) deckB->release();
    
    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mic->release();
        }
    }
}

void RJSession::process(float* const* outputChannelData, int numOutputChannels, int numSamples)
{
    // If the engine state is running, we process audio
    if (state_.getEngineState() == SessionState::EngineState::Running) {
        mixer_.process(outputChannelData, numOutputChannels, numSamples);
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

        broadcastPipeline_.process(outputChannelData, numOutputChannels, numSamples);
        
        // Metering could be updated here based on outputStage / mixer outputs
    }
}

} // namespace melodymeet
