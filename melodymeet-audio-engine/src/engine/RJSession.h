#pragma once

#include "AudioSession.h"
#include "PlaybackManager.h"
#include "../audio/broadcast/BroadcastPipeline.h"

namespace melodymeet
{

class BufferPool;

class RJSession : public AudioSession
{
public:
    explicit RJSession(BufferPool& bufferPool);
    ~RJSession() override = default;

    void prepare(double sampleRate, int bufferSize, int numOutputChannels) override;
    void release() override;
    void process(float* const* outputChannelData, int numOutputChannels, int numSamples) override;

    MicrophoneManager& getMicrophoneManager() override { return microphoneManager_; }
    const MicrophoneManager& getMicrophoneManager() const override { return microphoneManager_; }

    bool supportsBroadcast() const override { return true; }

    PlaybackManager& getPlaybackManager() { return playbackManager_; }
    const PlaybackManager& getPlaybackManager() const { return playbackManager_; }

    BroadcastPipeline& getBroadcastPipeline() { return broadcastPipeline_; }
    const BroadcastPipeline& getBroadcastPipeline() const { return broadcastPipeline_; }

private:
    PlaybackManager playbackManager_;
    MicrophoneManager microphoneManager_;
    BroadcastPipeline broadcastPipeline_;
};

} // namespace melodymeet
