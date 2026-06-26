#include "PodcastSession.h"

#include <algorithm>
#include <cmath>
#include <iostream>

namespace melodymeet
{

namespace
{
} // namespace

PodcastSession::PodcastSession(BufferPool& bufferPool)
{
    // Initialize MicrophoneManager for Podcast layout (6 microphones)
    microphoneManager_.initialize(6);

    previewPlayback_ = std::make_shared<DeckPlayer>(bufferPool);

    // Register sources to mixer
    mixer_.registerSource(previewPlayback_);

    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mixer_.registerSource(mic);
        }
    }
}

void PodcastSession::prepare(double sampleRate, int bufferSize, int numOutputChannels)
{
    mixer_.prepare(sampleRate, bufferSize, numOutputChannels);
    outputStage_.prepare(sampleRate, bufferSize, numOutputChannels);
    recorder_.prepare(sampleRate, bufferSize, numOutputChannels);
    
    if (previewPlayback_) previewPlayback_->prepare(sampleRate, bufferSize, numOutputChannels);
    
    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mic->prepare(sampleRate, bufferSize, numOutputChannels);
        }
    }
}

void PodcastSession::release()
{
    mixer_.release();
    outputStage_.release();
    
    if (previewPlayback_) previewPlayback_->release();
    
    for (const auto& mic : microphoneManager_.getMicrophones()) {
        if (mic) {
            mic->release();
        }
    }
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
