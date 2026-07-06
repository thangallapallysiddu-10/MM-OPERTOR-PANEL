#include "SessionManager.h"
#include "RJSession.h"
#include "PodcastSession.h"

#include "../utilities/RtLogger.h"

#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <cstdio>

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

const char* engineStateName(SessionState::EngineState state) noexcept
{
    switch (state)
    {
        case SessionState::EngineState::Stopped: return "Stopped";
        case SessionState::EngineState::Initializing: return "Initializing";
        case SessionState::EngineState::Running: return "Running";
        case SessionState::EngineState::Shutdown: return "Shutdown";
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
    return getSession(activeSessionType_.load(std::memory_order_acquire));
}

void SessionManager::setActiveSession(SessionType type)
{
    activeSessionType_.store(type, std::memory_order_release);
}

AudioSession* SessionManager::getOutputSession() const
{
    return getSession(outputSessionType_.load(std::memory_order_acquire));
}

void SessionManager::setOutputSession(SessionType type)
{
    outputSessionType_.store(type, std::memory_order_release);
}

void SessionManager::process(float* const* outputChannelData, int numOutputChannels, int numSamples)
{
    static std::atomic<uint64_t> processTraceCount{0};
    const auto traceId = processTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;
    const auto activeType = activeSessionType_.load(std::memory_order_acquire);
    const auto outputType = outputSessionType_.load(std::memory_order_acquire);
    auto* session = getSession(outputType);

    if (traceId % 100 == 0)
    {
        char buf[RtLogger::kMaxMsgLen];
        std::snprintf(buf, sizeof(buf),
            "[SESSION ROUTING] active=%s output=%s outputState=%s outputs=%d samples=%d",
            sessionTypeName(activeType),
            sessionTypeName(outputType),
            (session ? engineStateName(session->getState().getEngineState()) : "null"),
            numOutputChannels, numSamples);
        RtLogger::get().log(buf);
    }

    if (session && session->getState().getEngineState() == SessionState::EngineState::Running) {
        session->process(outputChannelData, numOutputChannels, numSamples);
    }
}

void SessionManager::pushAudioInput(const float* const* inputChannels, int numInputChannels, int numSamples)
{
    std::cout << "[PUSH AUDIO INPUT]" << " inputs=" << numInputChannels << std::endl;

    static bool pushEntered = false;
    if (!pushEntered) {
        pushEntered = true;
        RtLogger::get().log("[PUSH AUDIO INPUT ENTERED]");
    }

    static std::atomic<bool> routingPatchLogged{false};
    if (!routingPatchLogged.exchange(true, std::memory_order_relaxed)) {
        std::cout << "=== ROUTING PATCH ACTIVE ===" << std::endl;
    }

    auto* session = getOutputSession();
    if (!session || session->getState().getEngineState() != SessionState::EngineState::Running)
        return;

    // STEP 2 DIAGNOSTIC: SessionManager routing
    static std::atomic<uint64_t> pushTraceCount{0};
    const auto traceId = pushTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    const auto& mics = session->getMicrophoneManager().getMicrophones();
    
    if (traceId % 100 == 0) {
        int enabledCount = 0;
        for (const auto& mic : mics) {
            if (mic && mic->isEnabled()) enabledCount++;
        }
        char buf[RtLogger::kMaxMsgLen];
        std::snprintf(buf, sizeof(buf), 
            "[MIC ROUTING] totalMics=%zu enabledMics=%d numInputChannels=%d",
            mics.size(), enabledCount, numInputChannels);
        RtLogger::get().log(buf);
    }

    // CRITICAL FIX: Map input channels to microphone indices
    // Each microphone should receive its corresponding input channel
    // Mic 0 → Input Channel 0
    // Mic 1 → Input Channel 1
    // etc.
    for (std::size_t micIndex = 0; micIndex < mics.size(); ++micIndex)
    {
        const auto& mic = mics[micIndex];
        std::cout << "[ROUTING]" << " mic=" << micIndex << " enabled=" << (mic ? mic->isEnabled() : false) << std::endl;

        if (!mic || !mic->isEnabled())
            continue;

        if (numInputChannels <= 0)
            continue;

        // Map the logical mixer strip to an available hardware channel using modulo.
        // This ensures that even if the physical device has fewer channels (e.g., a 1-channel USB mic),
        // the UI's logical mic strips still receive valid audio rather than silence.
        int inputChannel = static_cast<int>(micIndex) % numInputChannels;
        
        // Create a single-channel view pointing to this mic's input channel
        const float* micInputChannel[1] = { 
            inputChannels[inputChannel] 
        };
        
        if (micInputChannel[0]) {
            if (traceId % 100 == 0) {
                char buf[RtLogger::kMaxMsgLen];
                std::snprintf(buf, sizeof(buf), 
                    "[MIC ROUTING]\nmicIndex=%zu\ninputChannel=%d\nnumInputChannels=%d",
                    micIndex, inputChannel, numInputChannels);
                RtLogger::get().log(buf);
            }
            
            if (traceId % 100 == 0) {
                std::cout << "[MIC ROUTING]\nmicIndex=" << micIndex 
                          << "\ninputChannel=" << inputChannel 
                          << "\nnumInputChannels=" << numInputChannels 
                          << std::endl;
            }

            mic->pushAudio(micInputChannel, 1, numSamples);
        }
    }
}

} // namespace melodymeet
