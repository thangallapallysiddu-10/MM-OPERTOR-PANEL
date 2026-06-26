#pragma once

#include "../core/SessionState.h"
#include "../audio/mixer/Mixer.h"
#include "../audio/output/OutputStage.h"
#include "../audio/metering/MeterEngine.h"
#include "MicrophoneManager.h"

namespace melodymeet
{

class AudioSession
{
public:
    AudioSession() = default;
    virtual ~AudioSession() = default;

    AudioSession(const AudioSession&) = delete;
    AudioSession& operator=(const AudioSession&) = delete;

    virtual void prepare(double sampleRate, int bufferSize, int numOutputChannels) = 0;
    virtual void release() = 0;
    virtual void process(float* const* outputChannelData, int numOutputChannels, int numSamples) = 0;

    Mixer& getMixer() { return mixer_; }
    const Mixer& getMixer() const { return mixer_; }

    OutputStage& getOutputStage() { return outputStage_; }
    const OutputStage& getOutputStage() const { return outputStage_; }

    // Use outputStage as DSP interface
    // ... we will route DSPSnapshot getters here later if needed

    SessionState& getState() { return state_; }
    const SessionState& getState() const { return state_; }

    virtual MicrophoneManager& getMicrophoneManager() = 0;
    virtual const MicrophoneManager& getMicrophoneManager() const = 0;

    virtual bool supportsRecording() const { return false; }
    virtual bool supportsBroadcast() const { return false; }

protected:
    SessionState state_;
    Mixer mixer_;
    OutputStage outputStage_;
};

} // namespace melodymeet
