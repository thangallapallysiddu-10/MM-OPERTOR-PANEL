#include "AudioBridge.h"

#include <engine/AudioEngine.h>
#include <core/Version.h>

AudioBridge::AudioBridge()
    : engine_(std::make_unique<melodymeet::AudioEngine>())
{
}

AudioBridge::~AudioBridge()
{
    // RAII: if still initialized when destroyed, shut down gracefully
    std::lock_guard<std::mutex> lock(mutex_);
    if (initialized_ && engine_)
    {
        try
        {
            engine_->shutdown();
        }
        catch (...)
        {
            // Swallow exceptions in destructor
        }
        initialized_ = false;
    }
}

void AudioBridge::initialize()
{
    std::cout << "[NATIVE TRACE] AudioBridge::initialize() entered." << std::endl;
    std::lock_guard<std::mutex> lock(mutex_);

    if (initialized_)
    {
        std::cout << "[NATIVE TRACE] AudioEngine is already initialized." << std::endl;
        throw std::runtime_error("AudioEngine is already initialized");
    }

    if (!engine_)
    {
        std::cout << "[NATIVE TRACE] AudioEngine instance is null." << std::endl;
        throw std::runtime_error("AudioEngine instance is null");
    }

    std::cout << "[NATIVE TRACE] Calling engine_->initialize()..." << std::endl;
    try {
        bool result = engine_->initialize();
        if (!result)
        {
            std::cout << "[NATIVE TRACE] engine_->initialize() returned false without throwing." << std::endl;
            throw std::runtime_error("AudioEngine::initialize() returned false");
        }
    } catch (const std::exception& e) {
        std::cout << "[NATIVE TRACE] AudioBridge caught exception from engine_->initialize(): " << e.what() << std::endl;
        throw std::runtime_error(std::string("AudioEngine initialization failed: ") + e.what());
    }

    std::cout << "[NATIVE TRACE] AudioBridge::initialize() completed successfully." << std::endl;
    initialized_ = true;
}

void AudioBridge::shutdown()
{
    std::lock_guard<std::mutex> lock(mutex_);

    if (!initialized_)
    {
        throw std::runtime_error("AudioEngine is not initialized");
    }

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

AudioBridge::EngineInfo AudioBridge::engineInfo() const
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
    else
    {
        snap.cpuLoad = 0.0;
        snap.xruns = 0;
        snap.sampleRate = 0.0;
        snap.bufferSize = 0;
        snap.callbackTime = 0.0;
    }
    
    return snap;
}

AudioBridge::VersionsSnapshot AudioBridge::getVersions() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    VersionsSnapshot snap{0, 0, 0, 0, 0};
    if (initialized_ && engine_) {
        snap.mixer = engine_->getMixer().getVersion();
        snap.microphone = engine_->getMicrophone().getVersion();
        snap.recording = engine_->getRecorder().getVersion();
        if (auto b = engine_->getBroadcastSnapshot(); true) { // Hacky way to get broadcast version from snapshot, wait no:
            snap.broadcast = b.version;
        }
        snap.dsp = engine_->getDSPSnapshot().version;
    }
    return snap;
}

AudioBridge::PlaybackSnapshot AudioBridge::getSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    PlaybackSnapshot snap{};

    auto fillDeck = [](melodymeet::DeckPlayer* deck, DeckSnapshot& out) {
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
        fillDeck(&engine_->getDeckA(), snap.deckA);
        fillDeck(&engine_->getDeckB(), snap.deckB);
    } else {
        fillDeck(nullptr, snap.deckA);
        fillDeck(nullptr, snap.deckB);
    }

    return snap;
}

melodymeet::DeckPlayer* AudioBridge::getDeck(const std::string& deckId) const
{
    if (!initialized_ || !engine_) return nullptr;
    
    if (deckId == "A") return &engine_->getDeckA();
    if (deckId == "B") return &engine_->getDeckB();
    
    return nullptr;
}

bool AudioBridge::loadDeck(const std::string& deckId, const std::string& path)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (auto* deck = getDeck(deckId)) {
        return deck->load(path);
    }
    throw std::runtime_error("Deck not found or engine not initialized");
}

bool AudioBridge::play(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (auto* deck = getDeck(deckId)) {
        return deck->play();
    }
    throw std::runtime_error("Deck not found or engine not initialized");
}

bool AudioBridge::pause(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (auto* deck = getDeck(deckId)) {
        return deck->pause();
    }
    throw std::runtime_error("Deck not found or engine not initialized");
}

void AudioBridge::stop(const std::string& deckId)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (auto* deck = getDeck(deckId)) {
        deck->stop();
        return;
    }
    throw std::runtime_error("Deck not found or engine not initialized");
}

bool AudioBridge::seek(const std::string& deckId, double seconds)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (auto* deck = getDeck(deckId)) {
        return deck->seek(seconds);
    }
    throw std::runtime_error("Deck not found or engine not initialized");
}

// =============================================================================
// Mixer API
// =============================================================================

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
        auto ms = engine_->getMixer().getMixerSnapshot();
        snap.version     = engine_->getMixer().getVersion();
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
    return snap;
}

// =============================================================================
// Microphone API
// =============================================================================

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
        const auto& mic = engine_->getMicrophone();
        snap.version = mic.getVersion();
        snap.enabled = mic.isEnabled();
        snap.muted = mic.isMuted();
        snap.gain = mic.getGain();
        snap.sampleRate = mic.getSampleRate();
        snap.channels = mic.getChannelCount();
        snap.activeDevice = engine_->getInputManager().getCurrentInputDevice();
    }
    return snap;
}

// =============================================================================
// Recording API
// =============================================================================

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
    if (!initialized_ || !engine_) {
        return {0, false, false, 0.0, "", 0.0, 0, 0, 0.0f};
    }
    
    auto engSnap = engine_->getRecordingSnapshot();
    return {
        engSnap.version,
        engSnap.recording,
        engSnap.paused,
        engSnap.duration,
        engSnap.outputFile,
        engSnap.sampleRate,
        engSnap.channels,
        engSnap.fileSize,
        engSnap.peakLevel
    };
}

// =============================================================================
// Broadcast API
// =============================================================================

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
    if (!initialized_ || !engine_) {
        return {0, false, "", 0, 0, false, 0, 0.0};
    }

    auto engSnap = engine_->getBroadcastSnapshot();
    return {
        engSnap.version,
        engSnap.broadcasting,
        engSnap.server,
        engSnap.bitrate,
        engSnap.sampleRate,
        engSnap.reconnecting,
        engSnap.bytesSent,
        engSnap.uptime
    };
}

// =============================================================================
// DSP API
// =============================================================================

void AudioBridge::setEQ(const std::string& channelId, const EQSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;

    melodymeet::AudioEngine::EQSettings engSettings;
    engSettings.low = settings.low;
    engSettings.mid = settings.mid;
    engSettings.high = settings.high;

    engine_->setEQ(channelId, engSettings);
}

AudioBridge::EQSettings AudioBridge::getEQ(const std::string& channelId) const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {50.0f, 50.0f, 50.0f};

    auto engSettings = engine_->getEQ(channelId);
    return {engSettings.low, engSettings.mid, engSettings.high};
}

void AudioBridge::setCompressor(const CompressorSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;

    melodymeet::AudioEngine::CompressorSettings engSettings;
    engSettings.enabled = settings.enabled;
    engSettings.threshold = settings.threshold;
    engSettings.ratio = settings.ratio;
    engSettings.attack = settings.attack;
    engSettings.release = settings.release;
    engSettings.makeup = settings.makeup;

    engine_->setCompressor(engSettings);
}

AudioBridge::CompressorSettings AudioBridge::getCompressor() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {true, -18.0f, 3.0f, 10.0f, 120.0f, 2.0f};

    auto engSettings = engine_->getCompressor();
    return {
        engSettings.enabled,
        engSettings.threshold,
        engSettings.ratio,
        engSettings.attack,
        engSettings.release,
        engSettings.makeup
    };
}

void AudioBridge::setLimiter(const LimiterSettings& settings)
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return;

    melodymeet::AudioEngine::LimiterSettings engSettings;
    engSettings.enabled = settings.enabled;
    engSettings.threshold = settings.threshold;
    engSettings.release = settings.release;

    engine_->setLimiter(engSettings);
}

AudioBridge::LimiterSettings AudioBridge::getLimiter() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    if (!initialized_ || !engine_) return {true, -1.0f, 80.0f};

    auto engSettings = engine_->getLimiter();
    return {
        engSettings.enabled,
        engSettings.threshold,
        engSettings.release
    };
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
    if (!initialized_ || !engine_) {
        DSPSnapshot snap;
        snap.version = 0;
        snap.master.compressor = {true, -18.0f, 3.0f, 10.0f, 120.0f, 2.0f};
        snap.master.limiter = {true, -1.0f, 80.0f};
        return snap;
    }

    auto engSnap = engine_->getDSPSnapshot();
    DSPSnapshot snap;
    snap.version = engSnap.version;
    
    for (const auto& [id, chSnap] : engSnap.channels) {
        ChannelDSPSnapshot brSnap;
        brSnap.eq = {chSnap.eq.low, chSnap.eq.mid, chSnap.eq.high};
        brSnap.bypass = chSnap.bypass;
        snap.channels.push_back({id, brSnap});
    }

    snap.master.compressor = {
        engSnap.master.compressor.enabled,
        engSnap.master.compressor.threshold,
        engSnap.master.compressor.ratio,
        engSnap.master.compressor.attack,
        engSnap.master.compressor.release,
        engSnap.master.compressor.makeup
    };

    snap.master.limiter = {
        engSnap.master.limiter.enabled,
        engSnap.master.limiter.threshold,
        engSnap.master.limiter.release
    };

    return snap;
}

AudioBridge::MeterSnapshot AudioBridge::getMeterSnapshot() const
{
    std::lock_guard<std::mutex> lock(mutex_);
    MeterSnapshot snap{};

    if (initialized_ && engine_) {
        // Master meters
        auto& rmsMeter = engine_->getOutputStage().getMeterEngine().getRMSMeter();
        auto& peakMeter = engine_->getOutputStage().getMeterEngine().getPeakMeter();
        
        // Output stage typically has 2 channels. 
        snap.masterRmsL = rmsMeter.getRMS(0);
        snap.masterRmsR = rmsMeter.getRMS(1);
        
        snap.masterPeakL = peakMeter.getPeak(0);
        snap.masterPeakR = peakMeter.getPeak(1);

        snap.deckAPeakL = 0.0f; snap.deckAPeakR = 0.0f;
        snap.deckBPeakL = 0.0f; snap.deckBPeakR = 0.0f;
        snap.micPeakL = 0.0f; snap.micPeakR = 0.0f;
    }
    
    return snap;
}
