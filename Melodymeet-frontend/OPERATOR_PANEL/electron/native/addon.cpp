#include <napi.h>
#include "AudioBridge.h"

#include <iostream>
#include <memory>

/// Global singleton bridge instance (lives for the lifetime of the Node process).
static std::unique_ptr<AudioBridge> g_bridge;

/// Lazily creates the bridge singleton.
static AudioBridge& getBridge()
{
    if (!g_bridge)
    {
        g_bridge = std::make_unique<AudioBridge>();
    }
    return *g_bridge;
}

// ─── Exported N-API functions ───────────────────────────────────────────────

/// initialize() → void (throws on failure)
Napi::Value Initialize(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        getBridge().initialize();
        return env.Undefined();
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

/// shutdown() → void (throws on failure)
Napi::Value Shutdown(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        getBridge().shutdown();
        return env.Undefined();
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

/// version() → string
Napi::Value GetVersion(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        std::string ver = getBridge().version();
        return Napi::String::New(env, ver);
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

/// isInitialized() → boolean
Napi::Value IsInitialized(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        bool state = getBridge().isInitialized();
        return Napi::Boolean::New(env, state);
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

/// getEngineInfo() → Object
Napi::Value SetActiveSession(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
        throw Napi::TypeError::New(env, "Expected string sessionType");
    try {
        getBridge().setActiveSession(info[0].As<Napi::String>().Utf8Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetOutputSession(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
        throw Napi::TypeError::New(env, "Expected string sessionType");
    try {
        getBridge().setOutputSession(info[0].As<Napi::String>().Utf8Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetEngineInfo(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        auto infoData = getBridge().getEngineInfo();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version", Napi::String::New(env, infoData.version));
        obj.Set("initialized", Napi::Boolean::New(env, infoData.initialized));
        obj.Set("sampleRate", Napi::Number::New(env, infoData.sampleRate));
        obj.Set("bufferSize", Napi::Number::New(env, infoData.bufferSize));
        return obj;
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetEngineHealthSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        auto snap = getBridge().getEngineHealthSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("cpuLoad", Napi::Number::New(env, snap.cpuLoad));
        obj.Set("xruns", Napi::Number::New(env, static_cast<double>(snap.xruns)));
        obj.Set("sampleRate", Napi::Number::New(env, snap.sampleRate));
        obj.Set("bufferSize", Napi::Number::New(env, snap.bufferSize));
        obj.Set("callbackTime", Napi::Number::New(env, snap.callbackTime));
        return obj;
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetVersions(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        auto snap = getBridge().getVersions();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("mixer", Napi::Number::New(env, static_cast<double>(snap.mixer)));
        obj.Set("microphone", Napi::Number::New(env, static_cast<double>(snap.microphone)));
        obj.Set("recording", Napi::Number::New(env, static_cast<double>(snap.recording)));
        obj.Set("broadcast", Napi::Number::New(env, static_cast<double>(snap.broadcast)));
        obj.Set("dsp", Napi::Number::New(env, static_cast<double>(snap.dsp)));
        return obj;
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Deck API ───────────────────────────────────────────────────────────────

Napi::Value LoadDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString())
    {
        throw Napi::TypeError::New(env, "Expected string deckId and string path");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();
    std::string path = info[1].As<Napi::String>().Utf8Value();

    try {
        std::cout << "[NATIVE TRACE] addon.loadDeck deckId=" << deckId << " path=" << path << std::endl;
        bool result = getBridge().loadDeck(deckId, path);
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value PlayDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        throw Napi::TypeError::New(env, "Expected string deckId");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();

    try {
        std::cout << "[ADDON PLAY CALLED] deck=" << deckId << std::endl;
        bool result = getBridge().play(deckId);
        std::cout << "[ADDON PLAY RESULT] deck=" << deckId << " result=" << result << std::endl;
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value PauseDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        throw Napi::TypeError::New(env, "Expected string deckId");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();

    try {
        bool result = getBridge().pause(deckId);
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value StopDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        throw Napi::TypeError::New(env, "Expected string deckId");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();

    try {
        getBridge().stop(deckId);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value UnloadDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
    {
        throw Napi::TypeError::New(env, "Expected string deckId");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();

    try {
        getBridge().stop(deckId);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SeekDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
    {
        throw Napi::TypeError::New(env, "Expected string deckId and number seconds");
    }
    std::string deckId = info[0].As<Napi::String>().Utf8Value();
    double seconds = info[1].As<Napi::Number>().DoubleValue();

    try {
        bool result = getBridge().seek(deckId, seconds);
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetCue(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Expected string deckId and number seconds");
    try {
        getBridge().setCue(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Number>().DoubleValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value JumpToCue(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
        throw Napi::TypeError::New(env, "Expected string deckId");
    try {
        bool result = getBridge().jumpToCue(info[0].As<Napi::String>().Utf8Value());
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetLoop(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBoolean())
        throw Napi::TypeError::New(env, "Expected string deckId and boolean loop");
    try {
        getBridge().setLoop(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Boolean>().Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetLoopRange(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsString() || !info[1].IsNumber() || !info[2].IsNumber())
        throw Napi::TypeError::New(env, "Expected string deckId and two number values");
    try {
        getBridge().setLoopRange(
            info[0].As<Napi::String>().Utf8Value(),
            info[1].As<Napi::Number>().DoubleValue(),
            info[2].As<Napi::Number>().DoubleValue()
        );
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetPitch(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Expected string deckId and number percent");
    try {
        getBridge().setPitch(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try
    {
        auto snap = getBridge().getSnapshot();
        Napi::Object obj = Napi::Object::New(env);

        auto makeDeck = [&](const AudioBridge::DeckSnapshot& ds) {
            Napi::Object d = Napi::Object::New(env);
            d.Set("state",      Napi::Number::New(env, ds.state));
            d.Set("position",   Napi::Number::New(env, ds.position));
            d.Set("duration",   Napi::Number::New(env, ds.duration));
            d.Set("isLoaded",   Napi::Boolean::New(env, ds.isLoaded));
            d.Set("isLoading",  Napi::Boolean::New(env, ds.isLoading));
            d.Set("loadFailed", Napi::Boolean::New(env, ds.loadFailed));
            return d;
        };

        obj.Set("deckA", makeDeck(snap.deckA));
        obj.Set("deckB", makeDeck(snap.deckB));

        return obj;
    }
    catch (const std::exception& e)
    {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Mixer API ──────────────────────────────────────────────────────────────

Napi::Value SetCrossfade(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Expected number value");
    try {
        getBridge().setCrossfade(info[0].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetDeckGain(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Expected string deckId and number gain");
    try {
        getBridge().setDeckGain(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetMasterGain(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Expected number gain");
    try {
        getBridge().setMasterGain(info[0].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value MuteDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBoolean())
        throw Napi::TypeError::New(env, "Expected string deckId and boolean muted");
    try {
        getBridge().muteDeck(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Boolean>().Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SoloDeck(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBoolean())
        throw Napi::TypeError::New(env, "Expected string deckId and boolean soloed");
    try {
        getBridge().soloDeck(info[0].As<Napi::String>().Utf8Value(), info[1].As<Napi::Boolean>().Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value ResetMixer(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().resetMixer();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetMixerSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getMixerSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version",     Napi::Number::New(env, static_cast<double>(snap.version)));
        obj.Set("deckAGain",   Napi::Number::New(env, snap.deckAGain));
        obj.Set("deckBGain",   Napi::Number::New(env, snap.deckBGain));
        obj.Set("masterGain",  Napi::Number::New(env, snap.masterGain));
        obj.Set("crossfade",   Napi::Number::New(env, snap.crossfade));
        obj.Set("deckAMuted",  Napi::Boolean::New(env, snap.deckAMuted));
        obj.Set("deckBMuted",  Napi::Boolean::New(env, snap.deckBMuted));
        obj.Set("deckASolo",   Napi::Boolean::New(env, snap.deckASolo));
        obj.Set("deckBSolo",   Napi::Boolean::New(env, snap.deckBSolo));
        obj.Set("soloActive",  Napi::Boolean::New(env, snap.soloActive));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Microphone API ─────────────────────────────────────────────────────────

Napi::Value GetAvailableInputDevices(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto devices = getBridge().getAvailableInputDevices();
        Napi::Array arr = Napi::Array::New(env, devices.size());
        for (size_t i = 0; i < devices.size(); ++i) {
            arr.Set(i, Napi::String::New(env, devices[i]));
        }
        return arr;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value EnableMicrophone(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    std::string deviceName = "";
    if (info.Length() >= 1 && info[0].IsString()) {
        deviceName = info[0].As<Napi::String>().Utf8Value();
    }
    try {
        bool success = getBridge().enableMicrophone(deviceName);
        return Napi::Boolean::New(env, success);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value EnableMicrophoneByIndex(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Expected number micIndex and optional string deviceName");
    std::string deviceName = "";
    if (info.Length() >= 2 && info[1].IsString()) {
        deviceName = info[1].As<Napi::String>().Utf8Value();
    }
    
    int micIndex = info[0].As<Napi::Number>().Int32Value();
    std::cout
        << "\n\n========== ADDON ENABLE MIC ==========\n"
        << "micIndex=" << micIndex
        << " device=" << deviceName
        << "\n=====================================\n";
    
    try {
        bool success = getBridge().enableMicrophone(micIndex, deviceName);
        std::cout << "[NATIVE ENABLE MIC] success: " << (success ? "true" : "false") << std::endl;
        return Napi::Boolean::New(env, success);
    } catch (const std::exception& e) {
        std::cerr << "[NATIVE ENABLE MIC] exception: " << e.what() << std::endl;
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value DisableMicrophone(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().disableMicrophone();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value DisableMicrophoneByIndex(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Expected number micIndex");
    
    int micIndex = info[0].As<Napi::Number>().Int32Value();
    std::cout
        << "\n\n========== ADDON DISABLE MIC ==========\n"
        << "micIndex=" << micIndex
        << "\n=======================================\n";

    try {
        getBridge().disableMicrophone(info[0].As<Napi::Number>().Int32Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetMicrophoneGain(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber())
        throw Napi::TypeError::New(env, "Expected number gain");
    try {
        getBridge().setMicrophoneGain(info[0].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetMicrophoneGainByIndex(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
        throw Napi::TypeError::New(env, "Expected number micIndex and number gain");
    try {
        getBridge().setMicrophoneGain(info[0].As<Napi::Number>().Int32Value(), info[1].As<Napi::Number>().FloatValue());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value MuteMicrophone(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBoolean())
        throw Napi::TypeError::New(env, "Expected boolean muted");
    try {
        getBridge().muteMicrophone(info[0].As<Napi::Boolean>().Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value MuteMicrophoneByIndex(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsBoolean())
        throw Napi::TypeError::New(env, "Expected number micIndex and boolean muted");
    try {
        getBridge().muteMicrophone(info[0].As<Napi::Number>().Int32Value(), info[1].As<Napi::Boolean>().Value());
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetMicrophoneSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getMicrophoneSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version",      Napi::Number::New(env, static_cast<double>(snap.version)));
        obj.Set("enabled",      Napi::Boolean::New(env, snap.enabled));
        obj.Set("muted",        Napi::Boolean::New(env, snap.muted));
        obj.Set("gain",         Napi::Number::New(env, snap.gain));
        obj.Set("activeDevice", Napi::String::New(env, snap.activeDevice));
        obj.Set("sampleRate",   Napi::Number::New(env, snap.sampleRate));
        obj.Set("channels",     Napi::Number::New(env, snap.channels));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Recording API ──────────────────────────────────────────────────────────

Napi::Value StartRecording(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
        throw Napi::TypeError::New(env, "Expected string outputPath");
    try {
        bool result = getBridge().startRecording(info[0].As<Napi::String>().Utf8Value());
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value PauseRecording(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().pauseRecording();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value ResumeRecording(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().resumeRecording();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value StopRecording(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().stopRecording();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetRecordingSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getRecordingSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version",    Napi::Number::New(env, static_cast<double>(snap.version)));
        obj.Set("recording",  Napi::Boolean::New(env, snap.recording));
        obj.Set("paused",     Napi::Boolean::New(env, snap.paused));
        obj.Set("duration",   Napi::Number::New(env, snap.duration));
        obj.Set("outputFile", Napi::String::New(env, snap.outputFile));
        obj.Set("sampleRate", Napi::Number::New(env, snap.sampleRate));
        obj.Set("channels",   Napi::Number::New(env, snap.channels));
        obj.Set("fileSize",   Napi::Number::New(env, snap.fileSize));
        obj.Set("peakLevel",  Napi::Number::New(env, snap.peakLevel));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Broadcast API ──────────────────────────────────────────────────────────

Napi::Value StartBroadcast(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "Expected object config");
    try {
        Napi::Object cfg = info[0].As<Napi::Object>();
        AudioBridge::BroadcastConfig config;
        config.server = cfg.Has("server") ? cfg.Get("server").As<Napi::String>().Utf8Value() : "";
        config.streamKey = cfg.Has("streamKey") ? cfg.Get("streamKey").As<Napi::String>().Utf8Value() : "";
        config.bitrate = cfg.Has("bitrate") ? cfg.Get("bitrate").As<Napi::Number>().Int32Value() : 128;
        bool result = getBridge().startBroadcast(config);
        return Napi::Boolean::New(env, result);
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value StopBroadcast(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().stopBroadcast();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetBroadcastSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getBroadcastSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version",       Napi::Number::New(env, static_cast<double>(snap.version)));
        obj.Set("broadcasting",  Napi::Boolean::New(env, snap.broadcasting));
        obj.Set("server",        Napi::String::New(env, snap.server));
        obj.Set("bitrate",       Napi::Number::New(env, snap.bitrate));
        obj.Set("sampleRate",    Napi::Number::New(env, snap.sampleRate));
        obj.Set("reconnecting",  Napi::Boolean::New(env, snap.reconnecting));
        obj.Set("bytesSent",     Napi::Number::New(env, static_cast<double>(snap.bytesSent)));
        obj.Set("uptime",        Napi::Number::New(env, snap.uptime));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── DSP API ────────────────────────────────────────────────────────────────

Napi::Value SetEQ(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsObject())
        throw Napi::TypeError::New(env, "Expected string channelId and object settings");
    try {
        std::string channelId = info[0].As<Napi::String>().Utf8Value();
        Napi::Object obj = info[1].As<Napi::Object>();
        AudioBridge::EQSettings settings;
        settings.low = obj.Has("eqBass") ? obj.Get("eqBass").As<Napi::Number>().FloatValue()
                     : obj.Has("low") ? obj.Get("low").As<Napi::Number>().FloatValue()
                     : 0.0f;
        settings.mid = obj.Has("eqMid") ? obj.Get("eqMid").As<Napi::Number>().FloatValue()
                     : obj.Has("mid") ? obj.Get("mid").As<Napi::Number>().FloatValue()
                     : 0.0f;
        settings.high = obj.Has("eqTreble") ? obj.Get("eqTreble").As<Napi::Number>().FloatValue()
                      : obj.Has("high") ? obj.Get("high").As<Napi::Number>().FloatValue()
                      : 0.0f;
        settings.hasHighPassFilter = obj.Has("highPassFilter");
        settings.highPassFilter = settings.hasHighPassFilter
            ? obj.Get("highPassFilter").As<Napi::Number>().FloatValue()
            : 0.0f;

        getBridge().setEQ(channelId, settings);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetEQ(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString())
        throw Napi::TypeError::New(env, "Expected string channelId");
    try {
        std::string channelId = info[0].As<Napi::String>().Utf8Value();
        auto settings = getBridge().getEQ(channelId);
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("low", Napi::Number::New(env, settings.low));
        obj.Set("mid", Napi::Number::New(env, settings.mid));
        obj.Set("high", Napi::Number::New(env, settings.high));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetCompressor(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "Expected object settings");
    try {
        Napi::Object obj = info[0].As<Napi::Object>();
        AudioBridge::CompressorSettings settings;
        settings.enabled = obj.Has("enabled") ? obj.Get("enabled").As<Napi::Boolean>().Value() : true;
        settings.threshold = obj.Has("threshold") ? obj.Get("threshold").As<Napi::Number>().FloatValue() : -18.0f;
        settings.ratio = obj.Has("ratio") ? obj.Get("ratio").As<Napi::Number>().FloatValue() : 3.0f;
        settings.attack = obj.Has("attack") ? obj.Get("attack").As<Napi::Number>().FloatValue() : 10.0f;
        settings.release = obj.Has("release") ? obj.Get("release").As<Napi::Number>().FloatValue() : 120.0f;
        settings.makeup = obj.Has("makeup") ? obj.Get("makeup").As<Napi::Number>().FloatValue() : 2.0f;

        getBridge().setCompressor(settings);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetCompressor(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto settings = getBridge().getCompressor();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("enabled", Napi::Boolean::New(env, settings.enabled));
        obj.Set("threshold", Napi::Number::New(env, settings.threshold));
        obj.Set("ratio", Napi::Number::New(env, settings.ratio));
        obj.Set("attack", Napi::Number::New(env, settings.attack));
        obj.Set("release", Napi::Number::New(env, settings.release));
        obj.Set("makeup", Napi::Number::New(env, settings.makeup));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetLimiter(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsObject())
        throw Napi::TypeError::New(env, "Expected object settings");
    try {
        Napi::Object obj = info[0].As<Napi::Object>();
        AudioBridge::LimiterSettings settings;
        settings.enabled = obj.Has("enabled") ? obj.Get("enabled").As<Napi::Boolean>().Value() : true;
        settings.threshold = obj.Has("threshold") ? obj.Get("threshold").As<Napi::Number>().FloatValue() : -1.0f;
        settings.release = obj.Has("release") ? obj.Get("release").As<Napi::Number>().FloatValue() : 80.0f;

        getBridge().setLimiter(settings);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetMicrophoneCompressor(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsObject())
        throw Napi::TypeError::New(env, "Expected number micIndex and object settings");
    try {
        Napi::Object obj = info[1].As<Napi::Object>();
        AudioBridge::CompressorSettings settings;
        settings.enabled = obj.Has("enabled") ? obj.Get("enabled").As<Napi::Boolean>().Value() : true;
        settings.threshold = obj.Has("threshold") ? obj.Get("threshold").As<Napi::Number>().FloatValue() : -18.0f;
        settings.ratio = obj.Has("ratio") ? obj.Get("ratio").As<Napi::Number>().FloatValue() : 3.0f;
        settings.attack = obj.Has("attack") ? obj.Get("attack").As<Napi::Number>().FloatValue() : 10.0f;
        settings.release = obj.Has("release") ? obj.Get("release").As<Napi::Number>().FloatValue() : 120.0f;
        settings.makeup = obj.Has("makeup") ? obj.Get("makeup").As<Napi::Number>().FloatValue() : 2.0f;
        getBridge().setMicrophoneCompressor(info[0].As<Napi::Number>().Int32Value(), settings);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value SetMicrophoneLimiter(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsObject())
        throw Napi::TypeError::New(env, "Expected number micIndex and object settings");
    try {
        Napi::Object obj = info[1].As<Napi::Object>();
        AudioBridge::LimiterSettings settings;
        settings.enabled = obj.Has("enabled") ? obj.Get("enabled").As<Napi::Boolean>().Value() : true;
        settings.threshold = obj.Has("threshold") ? obj.Get("threshold").As<Napi::Number>().FloatValue() : -1.0f;
        settings.release = obj.Has("release") ? obj.Get("release").As<Napi::Number>().FloatValue() : 80.0f;
        getBridge().setMicrophoneLimiter(info[0].As<Napi::Number>().Int32Value(), settings);
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetLimiter(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto settings = getBridge().getLimiter();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("enabled", Napi::Boolean::New(env, settings.enabled));
        obj.Set("threshold", Napi::Number::New(env, settings.threshold));
        obj.Set("release", Napi::Number::New(env, settings.release));
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value ResetDSP(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        getBridge().resetDSP();
        return env.Undefined();
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetDSPSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getDSPSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("version", Napi::Number::New(env, static_cast<double>(snap.version)));

        Napi::Object channelsObj = Napi::Object::New(env);
        for (const auto& pair : snap.channels) {
            Napi::Object chObj = Napi::Object::New(env);
            
            Napi::Object eqObj = Napi::Object::New(env);
            eqObj.Set("low", Napi::Number::New(env, pair.second.eq.low));
            eqObj.Set("mid", Napi::Number::New(env, pair.second.eq.mid));
            eqObj.Set("high", Napi::Number::New(env, pair.second.eq.high));
            
            chObj.Set("eq", eqObj);
            chObj.Set("bypass", Napi::Boolean::New(env, pair.second.bypass));
            
            channelsObj.Set(pair.first, chObj);
        }
        obj.Set("channels", channelsObj);

        Napi::Object masterObj = Napi::Object::New(env);
        
        Napi::Object compObj = Napi::Object::New(env);
        compObj.Set("enabled", Napi::Boolean::New(env, snap.master.compressor.enabled));
        compObj.Set("threshold", Napi::Number::New(env, snap.master.compressor.threshold));
        compObj.Set("ratio", Napi::Number::New(env, snap.master.compressor.ratio));
        compObj.Set("attack", Napi::Number::New(env, snap.master.compressor.attack));
        compObj.Set("release", Napi::Number::New(env, snap.master.compressor.release));
        compObj.Set("makeup", Napi::Number::New(env, snap.master.compressor.makeup));
        masterObj.Set("compressor", compObj);

        Napi::Object limObj = Napi::Object::New(env);
        limObj.Set("enabled", Napi::Boolean::New(env, snap.master.limiter.enabled));
        limObj.Set("threshold", Napi::Number::New(env, snap.master.limiter.threshold));
        limObj.Set("release", Napi::Number::New(env, snap.master.limiter.release));
        masterObj.Set("limiter", limObj);

        obj.Set("master", masterObj);

        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

Napi::Value GetMeterSnapshot(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();
    try {
        auto snap = getBridge().getMeterSnapshot();
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("masterPeakL", Napi::Number::New(env, snap.masterPeakL));
        obj.Set("masterPeakR", Napi::Number::New(env, snap.masterPeakR));
        obj.Set("masterRmsL", Napi::Number::New(env, snap.masterRmsL));
        obj.Set("masterRmsR", Napi::Number::New(env, snap.masterRmsR));
        
        obj.Set("deckAPeakL", Napi::Number::New(env, snap.deckAPeakL));
        obj.Set("deckAPeakR", Napi::Number::New(env, snap.deckAPeakR));
        
        obj.Set("deckBPeakL", Napi::Number::New(env, snap.deckBPeakL));
        obj.Set("deckBPeakR", Napi::Number::New(env, snap.deckBPeakR));
        
        obj.Set("micPeakL", Napi::Number::New(env, snap.micPeakL));
        obj.Set("micPeakR", Napi::Number::New(env, snap.micPeakR));
        obj.Set("micRmsL", Napi::Number::New(env, snap.micRmsL));
        obj.Set("micRmsR", Napi::Number::New(env, snap.micRmsR));

        Napi::Array rjMicPeak = Napi::Array::New(env, snap.rjMicPeak.size());
        Napi::Array rjMicRms = Napi::Array::New(env, snap.rjMicRms.size());
        for (size_t i = 0; i < snap.rjMicPeak.size(); ++i) {
            rjMicPeak.Set(i, Napi::Number::New(env, snap.rjMicPeak[i]));
            rjMicRms.Set(i, Napi::Number::New(env, snap.rjMicRms[i]));
        }
        obj.Set("rjMicPeak", rjMicPeak);
        obj.Set("rjMicRms", rjMicRms);
        return obj;
    } catch (const std::exception& e) {
        throw Napi::Error::New(env, e.what());
    }
}

// ─── Module registration ────────────────────────────────────────────────────

Napi::Object InitModule(Napi::Env env, Napi::Object exports)
{
    exports.Set("initialize",     Napi::Function::New(env, Initialize));
    exports.Set("shutdown",       Napi::Function::New(env, Shutdown));
    exports.Set("version",        Napi::Function::New(env, GetVersion));
    exports.Set("isInitialized",  Napi::Function::New(env, IsInitialized));
    exports.Set("setActiveSession", Napi::Function::New(env, SetActiveSession));
    exports.Set("setOutputSession", Napi::Function::New(env, SetOutputSession));
    exports.Set("getEngineInfo",   Napi::Function::New(env, GetEngineInfo));
    exports.Set("getEngineHealthSnapshot", Napi::Function::New(env, GetEngineHealthSnapshot));
    exports.Set("getVersions",    Napi::Function::New(env, GetVersions));
    
    exports.Set("loadDeck",       Napi::Function::New(env, LoadDeck));
    exports.Set("play",           Napi::Function::New(env, PlayDeck));
    exports.Set("pause",          Napi::Function::New(env, PauseDeck));
    exports.Set("stop",           Napi::Function::New(env, StopDeck));
    exports.Set("unloadDeck",     Napi::Function::New(env, UnloadDeck));
    exports.Set("seek",           Napi::Function::New(env, SeekDeck));
    exports.Set("setCue",         Napi::Function::New(env, SetCue));
    exports.Set("jumpToCue",      Napi::Function::New(env, JumpToCue));
    exports.Set("setLoop",        Napi::Function::New(env, SetLoop));
    exports.Set("setLoopRange",   Napi::Function::New(env, SetLoopRange));
    exports.Set("setPitch",       Napi::Function::New(env, SetPitch));
    exports.Set("getSnapshot",    Napi::Function::New(env, GetSnapshot));
    exports.Set("getMeterSnapshot", Napi::Function::New(env, GetMeterSnapshot));

    // Mixer API
    exports.Set("setCrossfade",      Napi::Function::New(env, SetCrossfade));
    exports.Set("setDeckGain",       Napi::Function::New(env, SetDeckGain));
    exports.Set("setMasterGain",     Napi::Function::New(env, SetMasterGain));
    exports.Set("muteDeck",          Napi::Function::New(env, MuteDeck));
    exports.Set("soloDeck",          Napi::Function::New(env, SoloDeck));
    exports.Set("resetMixer",        Napi::Function::New(env, ResetMixer));
    exports.Set("getMixerSnapshot",  Napi::Function::New(env, GetMixerSnapshot));

    // Microphone API
    exports.Set("getAvailableInputDevices", Napi::Function::New(env, GetAvailableInputDevices));
    exports.Set("enableMicrophone",         Napi::Function::New(env, EnableMicrophone));
    exports.Set("enableMicrophoneByIndex",  Napi::Function::New(env, EnableMicrophoneByIndex));
    exports.Set("disableMicrophone",        Napi::Function::New(env, DisableMicrophone));
    exports.Set("disableMicrophoneByIndex", Napi::Function::New(env, DisableMicrophoneByIndex));
    exports.Set("setMicrophoneGain",        Napi::Function::New(env, SetMicrophoneGain));
    exports.Set("setMicrophoneGainByIndex", Napi::Function::New(env, SetMicrophoneGainByIndex));
    exports.Set("muteMicrophone",           Napi::Function::New(env, MuteMicrophone));
    exports.Set("muteMicrophoneByIndex",    Napi::Function::New(env, MuteMicrophoneByIndex));
    exports.Set("getMicrophoneSnapshot",    Napi::Function::New(env, GetMicrophoneSnapshot));

    // Recording API
    exports.Set("startRecording",           Napi::Function::New(env, StartRecording));
    exports.Set("pauseRecording",           Napi::Function::New(env, PauseRecording));
    exports.Set("resumeRecording",          Napi::Function::New(env, ResumeRecording));
    exports.Set("stopRecording",            Napi::Function::New(env, StopRecording));
    exports.Set("getRecordingSnapshot",     Napi::Function::New(env, GetRecordingSnapshot));

    // Broadcast API
    exports.Set("startBroadcast",           Napi::Function::New(env, StartBroadcast));
    exports.Set("stopBroadcast",            Napi::Function::New(env, StopBroadcast));
    exports.Set("getBroadcastSnapshot",     Napi::Function::New(env, GetBroadcastSnapshot));

    // DSP API
    exports.Set("setEQ",              Napi::Function::New(env, SetEQ));
    exports.Set("getEQ",              Napi::Function::New(env, GetEQ));
    exports.Set("setCompressor",      Napi::Function::New(env, SetCompressor));
    exports.Set("getCompressor",      Napi::Function::New(env, GetCompressor));
    exports.Set("setLimiter",         Napi::Function::New(env, SetLimiter));
    exports.Set("getLimiter",         Napi::Function::New(env, GetLimiter));
    exports.Set("setMicrophoneCompressor", Napi::Function::New(env, SetMicrophoneCompressor));
    exports.Set("setMicrophoneLimiter",    Napi::Function::New(env, SetMicrophoneLimiter));
    exports.Set("resetDSP",           Napi::Function::New(env, ResetDSP));
    exports.Set("getDSPSnapshot",     Napi::Function::New(env, GetDSPSnapshot));

    return exports;
}

NODE_API_MODULE(melodymeet_addon, InitModule)
