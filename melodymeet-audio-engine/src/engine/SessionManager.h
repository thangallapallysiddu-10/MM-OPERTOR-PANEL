#pragma once

#include "AudioSession.h"
#include <map>
#include <memory>
#include <vector>

namespace melodymeet
{

class BufferPool;

class SessionManager
{
public:
    enum class SessionType {
        RJ,
        Podcast
    };

    explicit SessionManager(BufferPool& bufferPool);
    ~SessionManager() = default;

    SessionManager(const SessionManager&) = delete;
    SessionManager& operator=(const SessionManager&) = delete;

    void prepare(double sampleRate, int bufferSize, int numOutputChannels);
    void release();

    // Returns a session regardless of whether it's active in the UI
    AudioSession* getSession(SessionType type) const;

    // The UI's currently focused session for control routing
    AudioSession* getActiveSession() const;
    void setActiveSession(SessionType type);

    // The session currently driving physical hardware output
    AudioSession* getOutputSession() const;
    void setOutputSession(SessionType type);

    // Audio Thread: Processes only the dedicated output session.
    void process(float* const* outputChannelData, int numOutputChannels, int numSamples);

    // Push hardware input to the dedicated output session.
    void pushAudioInput(const float* const* inputChannels, int numInputChannels, int numSamples);

private:
    std::map<SessionType, std::unique_ptr<AudioSession>> sessions_;
    SessionType activeSessionType_{SessionType::RJ};
    SessionType outputSessionType_{SessionType::RJ};
};

} // namespace melodymeet
