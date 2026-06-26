#include "SessionManager.h"
#include "RJSession.h"
#include "PodcastSession.h"

#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <iostream>

namespace melodymeet
{

namespace
{

const char* sessionTypeName(SessionManager::SessionType type) noexcept
{
    switch (type)
    {
        case SessionManager::SessionType::RJ: return "RJ";
        case SessionManager::SessionType::Podcast: return "Podcast";
    }

    return "Unknown";
}



} // namespace

SessionManager::SessionManager(BufferPool& bufferPool)
{
    sessions_[SessionType::RJ] = std::make_unique<RJSession>(bufferPool);
    sessions_[SessionType::Podcast] = std::make_unique<PodcastSession>(bufferPool);
}

void SessionManager::prepare(double sampleRate, int bufferSize, int numOutputChannels)
{
    for (auto& pair : sessions_) {
        pair.second->prepare(sampleRate, bufferSize, numOutputChannels);
    }
}

void SessionManager::release()
{
    for (auto& pair : sessions_) {
        pair.second->release();
    }
}

AudioSession* SessionManager::getSession(SessionType type) const
{
    auto it = sessions_.find(type);
    if (it != sessions_.end()) {
        return it->second.get();
    }
    return nullptr;
}

AudioSession* SessionManager::getActiveSession() const
{
    return getSession(activeSessionType_);
}

void SessionManager::setActiveSession(SessionType type)
{
    activeSessionType_ = type;
}

AudioSession* SessionManager::getOutputSession() const
{
    return getSession(outputSessionType_);
}

void SessionManager::setOutputSession(SessionType type)
{
    outputSessionType_ = type;
}

void SessionManager::process(float* const* outputChannelData, int numOutputChannels, int numSamples)
{
    auto* session = getOutputSession();
    if (session && session->getState().getEngineState() == SessionState::EngineState::Running) {
        session->process(outputChannelData, numOutputChannels, numSamples);
    }
}

void SessionManager::pushAudioInput(const float* const* inputChannels, int numInputChannels, int numSamples)
{
    auto* session = getOutputSession();
    if (session && session->getState().getEngineState() == SessionState::EngineState::Running) {
        auto& mics = session->getMicrophoneManager().getMicrophones();
        for (const auto& mic : mics) {
            if (mic) {
                mic->pushAudio(inputChannels, numInputChannels, numSamples);
            }
        }
    }
}

} // namespace melodymeet
