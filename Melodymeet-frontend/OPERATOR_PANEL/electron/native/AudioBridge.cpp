#include "AudioBridge.h"

#include <engine/AudioEngine.h>
#include <engine/RJSession.h>
#include <engine/PodcastSession.h>
#include <core/Version.h>
#include <iostream>

AudioBridge::AudioBridge()
    : engine_(std::make_unique<melodymeet::AudioEngine>())
{
}

AudioBridge::~AudioBridge()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (initialized_ && engine_)
    {
        try { engine_->shutdown(); } catch (...) {}
        initialized_ = false;
    }
}

void AudioBridge::initialize()
{
    std::cout << "[NATIVE TRACE] AudioBridge::initialize() entered." << std::endl;
    std::lock_guard<std::mutex> lock(mutex_);
    if (initialized_) throw std::runtime_error("AudioEngine is already initialized");
    if (!engine_) throw std::runtime_error("AudioEngine instance is null");

    try {
        if (!engine_->initialize()) throw std::runtime_error("AudioEngine::initialize() returned false");
    } catch (const std::exception& e) {
        throw std::runtime_error(std::string("AudioEngine initialization failed: ") + e.what());
    }

    initialized_ = true;
}

void AudioBridge::shutdown()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_) throw std::runtime_error("AudioEngine is not initialized");
    engine_->shutdown();
    initialized_ = false;
}

std::string AudioBridge::version() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    melodymeet::Version v;
    return v.toString();
}

bool AudioBridge::isInitialized() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    return initialized_;
}

AudioBridge::EngineInfo AudioBridge::getEngineInfo() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    EngineInfo info;
    info.version = melodymeet::Version().toString();
    info.initialized = initialized_;
    if (initialized_ && engine_)
    {
        info.sampleRate = engine_->getAudioClock().getSampleRate();
        info.bufferSize = engine_->getAudioClock().getBufferSize();
    }
    else
    {
        info.sampleRate = 0.0;
        info.bufferSize = 0;
    }
    return info;
}

AudioBridge::EngineHealthSnapshot AudioBridge::getEngineHealthSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    EngineHealthSnapshot snap{};
    if (initialized_ && engine_)
    {
        auto stats = engine_->getStatistics().getSnapshot();
        snap.cpuLoad = stats.callbackLoadPercentage;
        snap.xruns = stats.xruns;
        snap.sampleRate = stats.sampleRate;
        snap.bufferSize = stats.bufferSize;
        snap.callbackTime = stats.averageCallbackDurationMs;
    }
    return snap;
}

AudioBridge::VersionsSnapshot AudioBridge::getVersions() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    VersionsSnapshot snap{0, 0, 0, 0, 0};
    if (initialized_ && engine_) {
        if (auto* session = engine_->getSessionManager().getActiveSession()) {
            snap.mixer = session->getMixer().getVersion();
            if (auto mic = session->getMicrophoneManager().getPrimaryMicrophone()) {
                snap.microphone = mic->getVersion();
            }
        }
        if (auto* pod = dynamic_cast<melodymeet::PodcastSession*>(engine_->getSessionManager().getActiveSession())) {
            snap.recording = pod->getRecorder().getVersion();
        }
        snap.broadcast = engine_->getBroadcastSnapshot().version;
        snap.dsp = engine_->getDSPSnapshot().version;
    }
    return snap;
}

AudioBridge::PlaybackSnapshot AudioBridge::getSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    PlaybackSnapshot snap{};

    auto fillDeck = [](std::shared_ptr<melodymeet::DeckPlayer> deck, DeckSnapshot& out) {
        if (deck) {
            out.state = static_cast<int>(deck->getState());
            out.position = deck->getCurrentPosition();
            out.duration = deck->getDuration();
            out.isLoaded = deck->isLoaded();
            out.loadFailed = deck->hasLoadFailed();
        } else {
            out.state = 0;
            out.position = 0.0;
            out.duration = 0.0;
            out.isLoaded = false;
            out.loadFailed = false;
        }
    };

    if (initialized_ && engine_) {
        if (auto* rj = dynamic_cast<melodymeet::RJSession*>(engine_->getSessionManager().getActiveSession())) {
            fillDeck(rj->getPlaybackManager().getDeckA(), snap.deckA);
            fillDeck(rj->getPlaybackManager().getDeckB(), snap.deckB);
        } else {
            fillDeck(nullptr, snap.deckA);
            fillDeck(nullptr, snap.deckB);
        }
    }

    return snap;
}

bool AudioBridge::loadDeck(const std::string& deckId, const std::string& path)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    if (auto* rj = dynamic_cast<melodymeet::RJSession*>(engine_->getSessionManager().getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) return rj->getPlaybackManager().getDeckA()->load(path);
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) return rj->getPlaybackManager().getDeckB()->load(path);
    }
    throw std::runtime_error("Deck not found or session not RJ");
}

bool AudioBridge::play(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    if (auto* rj = dynamic_cast<melodymeet::RJSession*>(engine_->getSessionManager().getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) return rj->getPlaybackManager().getDeckA()->play();
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) return rj->getPlaybackManager().getDeckB()->play();
    }
    throw std::runtime_error("Deck not found or session not RJ");
}

bool AudioBridge::pause(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    if (auto* rj = dynamic_cast<melodymeet::RJSession*>(engine_->getSessionManager().getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) return rj->getPlaybackManager().getDeckA()->pause();
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) return rj->getPlaybackManager().getDeckB()->pause();
    }
    throw std::runtime_error("Deck not found or session not RJ");
}

void AudioBridge::stop(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    if (auto* rj = dynamic_cast<melodymeet::RJSession*>(engine_->getSessionManager().getActiveSession())) {
        if (deckId == "A" && rj->getPlaybackManager().getDeckA()) { rj->getPlaybackManager().getDeckA()->stop(); return; }
        if (deckId == "B" && rj->getPlaybackManager().getDeckB()) { rj->getPlaybackManager().getDeckB()->stop(); return; }
    }
    throw std::runtime_error("Deck not found or session not RJ");
}

bool AudioBridge::seek(const std::string& deckId, double seconds)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    return engine_->seek(deckId, seconds);
}

void AudioBridge::setCue(const std::string& deckId, double seconds)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setCue(deckId, seconds);
}

bool AudioBridge::jumpToCue(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    return engine_->jumpToCue(deckId);
}

void AudioBridge::setLoop(const std::string& deckId, bool loop)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setLoop(deckId, loop);
}

void AudioBridge::setLoopRange(const std::string& deckId, double startSeconds, double endSeconds)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setLoopRange(deckId, startSeconds, endSeconds);
}

void AudioBridge::setPitch(const std::string& deckId, float percent)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setPitch(deckId, percent);
}

void AudioBridge::setCrossfade(float value)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setCrossfade(value);
}

void AudioBridge::setDeckGain(const std::string& deckId, float gain)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setDeckGain(deckId, gain);
}

void AudioBridge::setMasterGain(float gain)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setMasterGain(gain);
}

void AudioBridge::muteDeck(const std::string& deckId, bool muted)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setDeckMute(deckId, muted);
}

void AudioBridge::soloDeck(const std::string& deckId, bool soloed)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setDeckSolo(deckId, soloed);
}

void AudioBridge::resetMixer()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->resetMixer();
}

AudioBridge::MixerSnapshot AudioBridge::getMixerSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    MixerSnapshot snap{};
    if (initialized_ && engine_) {
        if (auto* session = engine_->getSessionManager().getActiveSession()) {
            auto ms = session->getMixer().getMixerSnapshot();
            snap.version     = session->getMixer().getVersion();
            snap.deckAGain   = ms.deckAGain;
            snap.deckBGain   = ms.deckBGain;
            snap.masterGain  = ms.masterGain;
            snap.crossfade   = ms.crossfade;
            snap.deckAMuted  = ms.deckAMuted;
            snap.deckBMuted  = ms.deckBMuted;
            snap.deckASolo   = ms.deckASolo;
            snap.deckBSolo   = ms.deckBSolo;
            snap.soloActive  = ms.soloActive;
        }
    }
    return snap;
}

std::vector<std::string> AudioBridge::getAvailableInputDevices() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {};
    return engine_->getAvailableInputDevices();
}

bool AudioBridge::enableMicrophone(const std::string& deviceName)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    return engine_->enableMicrophone(deviceName);
}

void AudioBridge::disableMicrophone()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->disableMicrophone();
}

void AudioBridge::setMicrophoneGain(float gain)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->setMicrophoneGain(gain);
}

void AudioBridge::muteMicrophone(bool muted)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    engine_->muteMicrophone(muted);
}

AudioBridge::MicrophoneSnapshot AudioBridge::getMicrophoneSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    MicrophoneSnapshot snap{};
    snap.version = 0;
    snap.enabled = false;
    snap.muted = false;
    snap.gain = 1.0f;
    snap.sampleRate = 0.0;
    snap.channels = 0;

    if (initialized_ && engine_) {
        if (auto* session = engine_->getSessionManager().getActiveSession()) {
            if (auto mic = session->getMicrophoneManager().getPrimaryMicrophone()) {
                snap.version = mic->getVersion();
                snap.enabled = mic->isEnabled();
                snap.muted = mic->isMuted();
                snap.gain = mic->getGain();
                snap.sampleRate = mic->getSampleRate();
                snap.channels = mic->getChannelCount();
                snap.activeDevice = engine_->getInputManager().getCurrentInputDevice();
            }
        }
    }
    return snap;
}

bool AudioBridge::startRecording(const std::string& outputPath)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return false;
    return engine_->startRecording(outputPath);
}

void AudioBridge::pauseRecording()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->pauseRecording();
}

void AudioBridge::resumeRecording()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->resumeRecording();
}

void AudioBridge::stopRecording()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->stopRecording();
}

AudioBridge::RecordingSnapshot AudioBridge::getRecordingSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {0, false, false, 0.0, "", 0.0, 0, 0, 0.0f};
    auto engSnap = engine_->getRecordingSnapshot();
    return {
        engSnap.version, engSnap.recording, engSnap.paused, engSnap.duration,
        engSnap.outputFile, engSnap.sampleRate, engSnap.channels, engSnap.fileSize, engSnap.peakLevel
    };
}

bool AudioBridge::startBroadcast(const BroadcastConfig& config)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) throw std::runtime_error("Engine not initialized");
    melodymeet::AudioEngine::BroadcastConfig engConfig;
    engConfig.server = config.server;
    engConfig.streamKey = config.streamKey;
    engConfig.bitrate = config.bitrate;
    return engine_->startBroadcast(engConfig);
}

void AudioBridge::stopBroadcast()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->stopBroadcast();
}

AudioBridge::BroadcastSnapshot AudioBridge::getBroadcastSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {0, false, "", 0, 0, false, 0, 0.0};
    auto engSnap = engine_->getBroadcastSnapshot();
    return {
        engSnap.version, engSnap.broadcasting, engSnap.server, engSnap.bitrate,
        engSnap.sampleRate, engSnap.reconnecting, engSnap.bytesSent, engSnap.uptime
    };
}

void AudioBridge::setEQ(const std::string& channelId, const EQSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->setEQ(channelId, {
        settings.low,
        settings.mid,
        settings.high,
        settings.hasHighPassFilter,
        settings.highPassFilter
    });
}

AudioBridge::EQSettings AudioBridge::getEQ(const std::string& channelId) const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {0.0f, 0.0f, 0.0f};
    auto engSettings = engine_->getEQ(channelId);
    return {
        engSettings.low,
        engSettings.mid,
        engSettings.high,
        engSettings.hasHighPassFilter,
        engSettings.highPassFilter
    };
}

void AudioBridge::setCompressor(const CompressorSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->setCompressor({settings.enabled, settings.threshold, settings.ratio, settings.attack, settings.release, settings.makeup});
}

AudioBridge::CompressorSettings AudioBridge::getCompressor() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {true, -18.0f, 3.0f, 10.0f, 120.0f, 2.0f};
    auto engSettings = engine_->getCompressor();
    return {engSettings.enabled, engSettings.threshold, engSettings.ratio, engSettings.attack, engSettings.release, engSettings.makeup};
}

void AudioBridge::setLimiter(const LimiterSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->setLimiter({settings.enabled, settings.threshold, settings.release});
}

AudioBridge::LimiterSettings AudioBridge::getLimiter() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {true, -1.0f, 80.0f};
    auto engSettings = engine_->getLimiter();
    return {engSettings.enabled, engSettings.threshold, engSettings.release};
}

void AudioBridge::resetDSP()
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;
    engine_->resetDSP();
}

AudioBridge::DSPSnapshot AudioBridge::getDSPSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    DSPSnapshot snap;
    if (!initialized_ || !engine_) return snap;
    auto engSnap = engine_->getDSPSnapshot();
    snap.version = engSnap.version;
    for (const auto& [id, chSnap] : engSnap.channels) {
        snap.channels.push_back({id, {chSnap.eq.low, chSnap.eq.mid, chSnap.eq.high, chSnap.bypass}});
    }
    snap.master.compressor = {engSnap.master.compressor.enabled, engSnap.master.compressor.threshold, engSnap.master.compressor.ratio, engSnap.master.compressor.attack, engSnap.master.compressor.release, engSnap.master.compressor.makeup};
    snap.master.limiter = {engSnap.master.limiter.enabled, engSnap.master.limiter.threshold, engSnap.master.limiter.release};
    return snap;
}

AudioBridge::MeterSnapshot AudioBridge::getMeterSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    MeterSnapshot snap{};

    if (initialized_ && engine_) {
        if (auto* session = engine_->getSessionManager().getActiveSession()) {
            auto& rmsMeter = session->getOutputStage().getMeterEngine().getRMSMeter();
            auto& peakMeter = session->getOutputStage().getMeterEngine().getPeakMeter();
            snap.masterRmsL = rmsMeter.getRMS(0);
            snap.masterRmsR = rmsMeter.getRMS(1);
            snap.masterPeakL = peakMeter.getPeak(0);
            snap.masterPeakR = peakMeter.getPeak(1);

            if (auto mic = session->getMicrophoneManager().getPrimaryMicrophone()) {
                const auto& micPeakMeter = mic->getMeterEngine().getPeakMeter();
                snap.micPeakL = micPeakMeter.getPeak(0);
                snap.micPeakR = micPeakMeter.getPeak(1);
            }
        }
    }
    
    return snap;
}
