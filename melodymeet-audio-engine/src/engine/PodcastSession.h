#pragma once

#include "AudioSession.h"
#include "../deck/DeckPlayer.h"
#include "../audio/recorder/Recorder.h"

namespace melodymeet
{

class BufferPool;

class PodcastSession : public AudioSession
{
public:
    explicit PodcastSession(BufferPool& bufferPool);
    ~PodcastSession() override = default;

    void prepare(double sampleRate, int bufferSize, int numOutputChannels) override;
    void release() override;
    void process(float* const* outputChannelData, int numOutputChannels, int numSamples) override;

    MicrophoneManager& getMicrophoneManager() override { return microphoneManager_; }
    const MicrophoneManager& getMicrophoneManager() const override { return microphoneManager_; }

    bool supportsRecording() const override { return true; }

    std::shared_ptr<DeckPlayer> getPreviewPlayback() { return previewPlayback_; }
    const std::shared_ptr<DeckPlayer> getPreviewPlayback() const { return previewPlayback_; }

    Recorder& getRecorder() { return recorder_; }
    const Recorder& getRecorder() const { return recorder_; }

private:
    std::shared_ptr<DeckPlayer> previewPlayback_;
    Recorder recorder_;
    MicrophoneManager microphoneManager_;
};

} // namespace melodymeet
