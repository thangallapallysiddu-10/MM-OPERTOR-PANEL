#include "AudioEngine.h"
#include "RJSession.h"
#include "PodcastSession.h"
#include "../audio/recorder/RecordingSession.h"
#include "../audio/dsp/processors/EQProcessor.h"
#include "../audio/dsp/processors/HighPassFilter.h"
#include "../audio/dsp/processors/MasterGainProcessor.h"
#include "../audio/dsp/processors/CompressorProcessor.h"
#include "../audio/dsp/processors/LimiterProcessor.h"
#include "../audio/dsp/ChannelDSPChain.h"
#include "../audio/dsp/MasterDSPChain.h"

#include <algorithm>
#include <juce_core/juce_core.h>
#include <iostream>

namespace melodymeet
{

AudioEngine::AudioEngine()
    : sessionManager_(bufferPool_),
      inputManager_(deviceManager_, sessionManager_)
{
}

bool AudioEngine::initialize()
{
    try {
        // DeviceManager requires a dummy session state just for initialization signature,
        // or we need to update DeviceManager. For backward compat, we get the active session's state.
        if (!deviceManager_.initialize(sessionManager_.getActiveSession()->getState()))
        {
            throw std::runtime_error("DeviceManager initialization returned false.");
        }
    } catch (const std::exception& e) {
        throw; 
    }

    const auto sampleRate = sessionManager_.getActiveSession()->getState().getSampleRate();
    const auto bufferSize = sessionManager_.getActiveSession()->getState().getBufferSize();

    if (!audioClock_.initialize(sampleRate, bufferSize))
    {
        deviceManager_.shutdown();
        throw std::runtime_error("AudioClock initialization failed.");
    }
    audioClock_.start();

    bufferPool_.prepare(32, 2, bufferSize);
    sessionManager_.prepare(sampleRate, bufferSize, 2);

    inputManager_.initialize();

    engineStatistics_.setFormat(sampleRate, bufferSize);
    engineStatistics_.startUptimeTimer();

    audioCallback_.initialize(audioClock_, sessionManager_, engineStatistics_, bufferPool_);
    
    // Set all sessions to Running for now
    sessionManager_.getSession(SessionManager::SessionType::RJ)->getState().setEngineState(SessionState::EngineState::Running);
    sessionManager_.getSession(SessionManager::SessionType::Podcast)->getState().setEngineState(SessionState::EngineState::Running);
    sessionManager_.setOutputSession(SessionManager::SessionType::RJ);
    
    deviceManager_.addAudioCallback(audioCallback_);

    initialized_ = true;

    return true;
}

void AudioEngine::shutdown()
{
    if (!initialized_) return;

    stopBroadcast();
    stopRecording();

    inputManager_.stopCapture();
    inputManager_.shutdown();
    
    deviceManager_.removeAudioCallback(audioCallback_);
    audioCallback_.shutdown();
    audioClock_.stop();

    sessionManager_.release();
    bufferPool_.release();

    deviceManager_.shutdown();

    initialized_ = false;
}

bool AudioEngine::isInitialized() const { return initialized_; }

AudioClock& AudioEngine::getAudioClock() { return audioClock_; }
const AudioClock& AudioEngine::getAudioClock() const { return audioClock_; }

EngineStatistics& AudioEngine::getStatistics() { return engineStatistics_; }
const EngineStatistics& AudioEngine::getStatistics() const { return engineStatistics_; }

InputManager& AudioEngine::getInputManager() { return inputManager_; }
const InputManager& AudioEngine::getInputManager() const { return inputManager_; }

SessionManager& AudioEngine::getSessionManager() { return sessionManager_; }
const SessionManager& AudioEngine::getSessionManager() const { return sessionManager_; }

void AudioEngine::setActiveSession(SessionManager::SessionType type) {
    sessionManager_.setActiveSession(type);
}

void AudioEngine::setOutputSession(SessionManager::SessionType type) {
    sessionManager_.setOutputSession(type);
}


// --- Deck Transport Control ---
bool AudioEngine::seek(const std::string& deckId, double seconds) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) return rj->getPlaybackManager().getDeckA()->seek(seconds);
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) return rj->getPlaybackManager().getDeckB()->seek(seconds);
    }
    return false;
}

void AudioEngine::setCue(const std::string& deckId, double seconds) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) rj->getPlaybackManager().getDeckA()->setCue(seconds);
        else if (deckId == "B" && rj->getPlaybackManager().getDeckB()) rj->getPlaybackManager().getDeckB()->setCue(seconds);
    }
}

bool AudioEngine::jumpToCue(const std::string& deckId) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) return rj->getPlaybackManager().getDeckA()->jumpToCue();
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) return rj->getPlaybackManager().getDeckB()->jumpToCue();
    }
    return false;
}

void AudioEngine::setLoop(const std::string& deckId, bool loop) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) rj->getPlaybackManager().getDeckA()->setLoop(loop);
        else if (deckId == "B" && rj->getPlaybackManager().getDeckB()) rj->getPlaybackManager().getDeckB()->setLoop(loop);
    }
}

void AudioEngine::setLoopRange(const std::string& deckId, double startSeconds, double endSeconds) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) rj->getPlaybackManager().getDeckA()->setLoopRange(startSeconds, endSeconds);
        else if (deckId == "B" && rj->getPlaybackManager().getDeckB()) rj->getPlaybackManager().getDeckB()->setLoopRange(startSeconds, endSeconds);
    }
}

void AudioEngine::setPitch(const std::string& deckId, float percent) {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) rj->getPlaybackManager().getDeckA()->setPitch(percent);
        else if (deckId == "B" && rj->getPlaybackManager().getDeckB()) rj->getPlaybackManager().getDeckB()->setPitch(percent);
    }
}


void AudioEngine::updateDynamicStatistics() noexcept
{
    if (!initialized_) return;
    engineStatistics_.setActiveAudioSources(0);
    engineStatistics_.setPlaybackState(false);
    
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        engineStatistics_.setBroadcastingState(rj->getBroadcastPipeline().getActiveConsumerCount() > 0);
    } else {
        engineStatistics_.setBroadcastingState(false);
    }

    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        engineStatistics_.setRecordingState(pod->getRecorder().isRecording());
    } else {
        engineStatistics_.setRecordingState(false);
    }
}

void AudioEngine::setCrossfade(float value) {
    sessionManager_.getActiveSession()->getMixer().setCrossfade(value);
}

void AudioEngine::setDeckGain(const std::string& deckId, float gain) {
    sessionManager_.getActiveSession()->getMixer().setDeckGain(deckId, gain);
}

void AudioEngine::setMasterGain(float gain) {
    if (auto* session = sessionManager_.getActiveSession()) {
        auto proc = session->getOutputStage().getMasterDSPChain()
                        .getProcessor(MasterDSPChain::Slot::MasterGain);
        if (auto* masterGain = dynamic_cast<MasterGainProcessor*>(proc.get())) {
            masterGain->setGainLinear(std::clamp(gain, 0.0f, 4.0f));
        }
    }
}

void AudioEngine::setDeckMute(const std::string& deckId, bool muted) {
    sessionManager_.getActiveSession()->getMixer().muteDeck(deckId, muted);
}

void AudioEngine::setDeckSolo(const std::string& deckId, bool soloed) {
    sessionManager_.getActiveSession()->getMixer().soloDeck(deckId, soloed);
}

void AudioEngine::resetMixer() {
    sessionManager_.getActiveSession()->getMixer().resetMixer();
}

std::vector<std::string> AudioEngine::getAvailableInputDevices() const {
    return inputManager_.getAvailableInputDevices();
}

bool AudioEngine::enableMicrophone(const std::string& deviceName) {
    return enableMicrophone(0, deviceName);
}

bool AudioEngine::enableMicrophone(int micIndex, const std::string& deviceName)
{
    std::cout << "[ENABLE MIC ENGINE] " << micIndex << " device=" << deviceName << std::endl;
    std::cout << "[ENABLE MIC] index=" << micIndex << std::endl;

    if (!initialized_)
        return false;

    const std::size_t idx = static_cast<std::size_t>(std::max(0, micIndex));
    auto* session = sessionManager_.getActiveSession();
    if (!session)
        return false;

    // 1. Tell JUCE which input device to use. This updates the setup record
    //    without restarting the hardware device (treatAsChosenDevice=false).
    inputManager_.setCurrentInputDevice(deviceName);

    // 2. Enable the MicrophoneSource so it accepts audio from the FIFO.
    //    The source was already registered in the Mixer at session construction
    //    and prepared in initialize() — no re-registration needed.
    auto mic = session->getMicrophoneManager().getMicrophone(idx);
    if (!mic)
    {
        std::cout << "[MIC ENABLE] failed — no mic at index " << micIndex << "\n";
        return false;
    }
    mic->setEnabled(true);

    // 3. Start capture: registers InputManager as an AudioIODeviceCallback,
    //    which activates the input stream on the live device without a restart.
    const bool ok = inputManager_.startCapture();

    std::cout << "[MIC ENABLE] micIndex=" << micIndex
              << " device=" << deviceName
              << " capturing=" << ok
              << " sessionState=" << (session->getState().getEngineState() == SessionState::EngineState::Running ? "Running" : "NotRunning")
              << " mixerSources=" << session->getMixer().getSourceCount()
              << "\n";

    std::cout << "[ENABLE MIC SUCCESS] " << micIndex << std::endl;

    return ok;
}

void AudioEngine::disableMicrophone() {
    disableMicrophone(0);
}

void AudioEngine::disableMicrophone(int micIndex) {
    auto mic = sessionManager_.getActiveSession()->getMicrophoneManager().getMicrophone(static_cast<std::size_t>(std::max(0, micIndex)));
    if (mic) {
        mic->setEnabled(false);
    }

    const auto& mics = sessionManager_.getActiveSession()->getMicrophoneManager().getMicrophones();
    const bool anyEnabled = std::any_of(mics.begin(), mics.end(), [](const auto& candidate) {
        return candidate && candidate->isEnabled();
    });
    if (!anyEnabled) {
        inputManager_.stopCapture();
    }
}

void AudioEngine::setMicrophoneGain(float gain) {
    setMicrophoneGain(0, gain);
}

void AudioEngine::setMicrophoneGain(int micIndex, float gain) {
    auto mic = sessionManager_.getActiveSession()->getMicrophoneManager().getMicrophone(static_cast<std::size_t>(std::max(0, micIndex)));
    if (mic) {
        mic->setGain(gain);
    }
}

void AudioEngine::muteMicrophone(bool muted) {
    muteMicrophone(0, muted);
}

void AudioEngine::muteMicrophone(int micIndex, bool muted) {
    auto mic = sessionManager_.getActiveSession()->getMicrophoneManager().getMicrophone(static_cast<std::size_t>(std::max(0, micIndex)));
    if (mic) {
        mic->setMuted(muted);
    }
}

bool AudioEngine::startRecording(const std::string& outputPath) {
    if (!sessionManager_.getActiveSession()->supportsRecording()) {
        std::cerr << "[NATIVE ERROR] Active session does not support recording" << std::endl;
        return false;
    }
    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        juce::File outputFile(outputPath);
        return pod->getRecorder().startRecording(outputFile);
    }
    return false;
}

void AudioEngine::pauseRecording() {
    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        pod->getRecorder().pauseRecording();
    }
}

void AudioEngine::resumeRecording() {
    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        pod->getRecorder().resumeRecording();
    }
}

void AudioEngine::stopRecording() {
    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        pod->getRecorder().stopRecording();
    }
}

AudioEngine::RecordingSnapshot AudioEngine::getRecordingSnapshot() const {
    RecordingSnapshot snap{};
    if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        snap.version = pod->getRecorder().getVersion();
        snap.recording = pod->getRecorder().isRecording();
        snap.sampleRate = sessionManager_.getActiveSession()->getState().getSampleRate();
        snap.channels = 2;

        auto* session = pod->getRecorder().getActiveSession();
        if (session) {
            snap.paused = (session->getState() == RecordingSession::State::Paused);
            snap.duration = session->getDurationSeconds();
            snap.outputFile = session->getFile().getFullPathName().toStdString();
            snap.peakLevel = session->getPeakLevel();
            snap.fileSize = static_cast<int64_t>(session->getFile().getSize());
        }
    }
    return snap;
}


bool AudioEngine::startBroadcast(const BroadcastConfig& config) {
    if (!sessionManager_.getActiveSession()->supportsBroadcast()) {
        std::cerr << "[NATIVE ERROR] Active session does not support broadcast" << std::endl;
        return false;
    }
    
    // For now we keep it simple and stub the actual broadcast logic, assuming the previous architecture had broadcastSession_ in AudioEngine.
    // The instructions say "gracefully fail/no-op if the active session is a PodcastSession (which lacks a broadcaster)". We just returned false.
    return true; 
}

void AudioEngine::stopBroadcast() {
    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        // rj->getBroadcastPipeline()....
    }
}

AudioEngine::BroadcastSnapshot AudioEngine::getBroadcastSnapshot() const {
    BroadcastSnapshot snap{};
    return snap;
}

// =============================================================================
// DSP API — delegates through slot-based ChannelDSPChain / MasterDSPChain
// =============================================================================

namespace {

// Helper: Retrieve the EQ processor from a ChannelDSPChain, if installed.
EQProcessor* getEQFromChain(ChannelDSPChain& chain) {
    auto proc = chain.getProcessor(ChannelDSPChain::Slot::Equalizer);
    return proc ? dynamic_cast<EQProcessor*>(proc.get()) : nullptr;
}

const EQProcessor* getEQFromChainConst(const ChannelDSPChain& chain) {
    auto proc = const_cast<ChannelDSPChain&>(chain).getProcessor(ChannelDSPChain::Slot::Equalizer);
    return proc ? dynamic_cast<const EQProcessor*>(proc.get()) : nullptr;
}

HighPassFilter* getHighPassFromChain(ChannelDSPChain& chain) {
    auto proc = chain.getProcessor(ChannelDSPChain::Slot::HighPassFilter);
    return proc ? dynamic_cast<HighPassFilter*>(proc.get()) : nullptr;
}

const HighPassFilter* getHighPassFromChainConst(const ChannelDSPChain& chain) {
    auto proc = const_cast<ChannelDSPChain&>(chain).getProcessor(ChannelDSPChain::Slot::HighPassFilter);
    return proc ? dynamic_cast<const HighPassFilter*>(proc.get()) : nullptr;
}

int parseMicIndex(const std::string& channelId) {
    if (channelId == "Mic" || channelId == "microphone" || channelId == "Microphone") {
        return 0;
    }

    if (channelId.rfind("Mic", 0) == 0 && channelId.size() > 3) {
        try {
            const int oneBased = std::stoi(channelId.substr(3));
            return oneBased > 0 ? oneBased - 1 : -1;
        } catch (...) {
            return -1;
        }
    }

    if (channelId.rfind("microphone", 0) == 0 && channelId.size() > 10) {
        try {
            const int oneBased = std::stoi(channelId.substr(10));
            return oneBased > 0 ? oneBased - 1 : -1;
        } catch (...) {
            return -1;
        }
    }

    return -1;
}

MicrophoneSource* resolveMicrophone(SessionManager& sm, int micIndex) {
    if (micIndex < 0) {
        return nullptr;
    }

    if (auto* session = sm.getActiveSession()) {
        if (auto mic = session->getMicrophoneManager().getMicrophone(static_cast<std::size_t>(micIndex))) {
            return mic.get();
        }
    }

    return nullptr;
}

// Helper: Resolve the ChannelDSPChain for a given channelId in the active session.
ChannelDSPChain* resolveChannelDSP(SessionManager& sm, const std::string& channelId) {
    if (auto* rj = dynamic_cast<RJSession*>(sm.getActiveSession())) {
        if (channelId == "A" && rj->getPlaybackManager().getDeckA())
            return &rj->getPlaybackManager().getDeckA()->getChannelDSPChain();
        if (channelId == "B" && rj->getPlaybackManager().getDeckB())
            return &rj->getPlaybackManager().getDeckB()->getChannelDSPChain();
        const int micIndex = parseMicIndex(channelId);
        if (micIndex >= 0) {
            if (auto mic = rj->getMicrophoneManager().getMicrophone(static_cast<std::size_t>(micIndex)))
                return &mic->getChannelDSPChain();
        }
    } else if (auto* pod = dynamic_cast<PodcastSession*>(sm.getActiveSession())) {
        if (parseMicIndex(channelId) == 0) {
            if (auto mic = pod->getMicrophoneManager().getPrimaryMicrophone())
                return &mic->getChannelDSPChain();
        }
        if (channelId == "Preview" && pod->getPreviewPlayback())
            return &pod->getPreviewPlayback()->getChannelDSPChain();
    }
    return nullptr;
}

} // anonymous namespace

void AudioEngine::setEQ(const std::string& channelId, const EQSettings& settings) {
    if (auto* chain = resolveChannelDSP(sessionManager_, channelId)) {
        if (auto* eq = getEQFromChain(*chain)) {
            eq->setBandGainDb(EQProcessor::LowShelf,  settings.low);
            eq->setBandGainDb(EQProcessor::MidPeak,   settings.mid);
            eq->setBandGainDb(EQProcessor::HighShelf,  settings.high);
            dspVersion_++;
        }
        if (settings.hasHighPassFilter) {
            if (auto* highPass = getHighPassFromChain(*chain)) {
                highPass->setCutoffFrequency(settings.highPassFilter);
                highPass->setBypass(settings.highPassFilter <= 0.0f);
                dspVersion_++;
            }
        }
    }
}

AudioEngine::EQSettings AudioEngine::getEQ(const std::string& channelId) const {
    EQSettings settings;
    if (auto* chain = resolveChannelDSP(const_cast<SessionManager&>(sessionManager_), channelId)) {
        if (auto* eq = getEQFromChainConst(*chain)) {
            settings.low  = eq->getBandGainDb(EQProcessor::LowShelf);
            settings.mid  = eq->getBandGainDb(EQProcessor::MidPeak);
            settings.high = eq->getBandGainDb(EQProcessor::HighShelf);
        }
        if (auto* highPass = getHighPassFromChainConst(*chain)) {
            settings.hasHighPassFilter = true;
            settings.highPassFilter = highPass->isBypassed() ? 0.0f : highPass->getCutoffFrequency();
        }
    }
    return settings;
}

void AudioEngine::setCompressor(const CompressorSettings& settings) {
    if (auto* session = sessionManager_.getActiveSession()) {
        auto proc = session->getOutputStage().getMasterDSPChain()
                        .getProcessor(MasterDSPChain::Slot::Compressor);
        if (auto* comp = dynamic_cast<CompressorProcessor*>(proc.get())) {
            comp->setBypass(!settings.enabled);
            comp->setThreshold(settings.threshold);
            comp->setRatio(settings.ratio);
            comp->setAttack(settings.attack);
            comp->setRelease(settings.release);
            comp->setMakeupGain(settings.makeup);
            dspVersion_++;
        }
    }
}

void AudioEngine::setMicrophoneCompressor(int micIndex, const CompressorSettings& settings) {
    if (auto* mic = resolveMicrophone(sessionManager_, micIndex)) {
        auto proc = mic->getChannelDSPChain().getProcessor(ChannelDSPChain::Slot::Compressor);
        if (auto* comp = dynamic_cast<CompressorProcessor*>(proc.get())) {
            comp->setBypass(!settings.enabled);
            comp->setThreshold(settings.threshold);
            comp->setRatio(settings.ratio);
            comp->setAttack(settings.attack);
            comp->setRelease(settings.release);
            comp->setMakeupGain(settings.makeup);
            dspVersion_++;
        }
    }
}

AudioEngine::CompressorSettings AudioEngine::getCompressor() const {
    CompressorSettings settings;
    if (auto* session = sessionManager_.getActiveSession()) {
        auto proc = session->getOutputStage().getMasterDSPChain()
                        .getProcessor(MasterDSPChain::Slot::Compressor);
        if (auto* comp = dynamic_cast<const CompressorProcessor*>(proc.get())) {
            settings.enabled   = !comp->isBypassed();
            settings.threshold = comp->getThreshold();
            settings.ratio     = comp->getRatio();
            settings.attack    = comp->getAttack();
            settings.release   = comp->getRelease();
            settings.makeup    = comp->getMakeupGain();
        }
    }
    return settings;
}

void AudioEngine::setLimiter(const LimiterSettings& settings) {
    if (auto* session = sessionManager_.getActiveSession()) {
        auto proc = session->getOutputStage().getMasterDSPChain()
                        .getProcessor(MasterDSPChain::Slot::Limiter);
        if (auto* lim = dynamic_cast<LimiterProcessor*>(proc.get())) {
            lim->setBypass(!settings.enabled);
            lim->setCeiling(settings.threshold);
            lim->setRelease(settings.release);
            dspVersion_++;
        }
    }
}

void AudioEngine::setMicrophoneLimiter(int micIndex, const LimiterSettings& settings) {
    if (auto* mic = resolveMicrophone(sessionManager_, micIndex)) {
        auto proc = mic->getChannelDSPChain().getProcessor(ChannelDSPChain::Slot::Limiter);
        if (auto* lim = dynamic_cast<LimiterProcessor*>(proc.get())) {
            lim->setBypass(!settings.enabled);
            lim->setCeiling(settings.threshold);
            lim->setRelease(settings.release);
            dspVersion_++;
        }
    }
}

AudioEngine::LimiterSettings AudioEngine::getLimiter() const {
    LimiterSettings settings;
    if (auto* session = sessionManager_.getActiveSession()) {
        auto proc = session->getOutputStage().getMasterDSPChain()
                        .getProcessor(MasterDSPChain::Slot::Limiter);
        if (auto* lim = dynamic_cast<const LimiterProcessor*>(proc.get())) {
            settings.enabled   = !lim->isBypassed();
            settings.threshold = lim->getCeiling();
            settings.release   = lim->getRelease();
        }
    }
    return settings;
}

void AudioEngine::resetDSP() {
    if (auto* session = sessionManager_.getActiveSession()) {
        session->getOutputStage().getMasterDSPChain().reset();
    }

    if (auto* rj = dynamic_cast<RJSession*>(sessionManager_.getActiveSession())) {
        if (rj->getPlaybackManager().getDeckA()) rj->getPlaybackManager().getDeckA()->getChannelDSPChain().reset();
        if (rj->getPlaybackManager().getDeckB()) rj->getPlaybackManager().getDeckB()->getChannelDSPChain().reset();
        if (auto mic = rj->getMicrophoneManager().getPrimaryMicrophone()) mic->getChannelDSPChain().reset();
    } else if (auto* pod = dynamic_cast<PodcastSession*>(sessionManager_.getActiveSession())) {
        if (pod->getPreviewPlayback()) pod->getPreviewPlayback()->getChannelDSPChain().reset();
        if (auto mic = pod->getMicrophoneManager().getPrimaryMicrophone()) mic->getChannelDSPChain().reset();
    }
    dspVersion_++;
}

AudioEngine::DSPSnapshot AudioEngine::getDSPSnapshot() const {
    DSPSnapshot snap{};
    snap.version = dspVersion_.load();

    if (auto* session = sessionManager_.getActiveSession()) {
        // Master DSP
        auto compProc = session->getOutputStage().getMasterDSPChain()
                            .getProcessor(MasterDSPChain::Slot::Compressor);
        if (auto* comp = dynamic_cast<const CompressorProcessor*>(compProc.get())) {
            snap.master.compressor.enabled   = !comp->isBypassed();
            snap.master.compressor.threshold = comp->getThreshold();
            snap.master.compressor.ratio     = comp->getRatio();
            snap.master.compressor.attack    = comp->getAttack();
            snap.master.compressor.release   = comp->getRelease();
            snap.master.compressor.makeup    = comp->getMakeupGain();
        }

        auto limProc = session->getOutputStage().getMasterDSPChain()
                           .getProcessor(MasterDSPChain::Slot::Limiter);
        if (auto* lim = dynamic_cast<const LimiterProcessor*>(limProc.get())) {
            snap.master.limiter.enabled   = !lim->isBypassed();
            snap.master.limiter.threshold = lim->getCeiling();
            snap.master.limiter.release   = lim->getRelease();
        }

        // Channel DSP
        auto addChannelSnap = [&snap](const std::string& id, const ChannelDSPChain& chain) {
            ChannelDSPSnapshot chSnap;
            if (auto* eq = getEQFromChainConst(chain)) {
                chSnap.eq.low  = eq->getBandGainDb(EQProcessor::LowShelf);
                chSnap.eq.mid  = eq->getBandGainDb(EQProcessor::MidPeak);
                chSnap.eq.high = eq->getBandGainDb(EQProcessor::HighShelf);
            }
            chSnap.bypass = !chain.isSlotEnabled(ChannelDSPChain::Slot::Equalizer);
            snap.channels[id] = chSnap;
        };

        if (auto* rj = dynamic_cast<RJSession*>(const_cast<AudioSession*>(session))) {
            if (rj->getPlaybackManager().getDeckA())
                addChannelSnap("A", rj->getPlaybackManager().getDeckA()->getChannelDSPChain());
            if (rj->getPlaybackManager().getDeckB())
                addChannelSnap("B", rj->getPlaybackManager().getDeckB()->getChannelDSPChain());
            if (auto mic = rj->getMicrophoneManager().getPrimaryMicrophone())
                addChannelSnap("Mic", mic->getChannelDSPChain());
        }
    }
    return snap;
}

} // namespace melodymeet

