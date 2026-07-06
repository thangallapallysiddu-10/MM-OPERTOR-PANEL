#pragma once

#include "../core/AudioClock.h"
#include "../core/BufferPool.h"
#include "../core/SessionState.h"
#include "../core/statistics/EngineStatistics.h"
#include "../engine/SessionManager.h"

#include <juce_audio_devices/juce_audio_devices.h>

namespace melodymeet
{

class AudioCallback final : public juce::AudioIODeviceCallback
{
public:
    AudioCallback() = default;
    ~AudioCallback() override;

    AudioCallback(const AudioCallback&) = delete;
    AudioCallback& operator=(const AudioCallback&) = delete;
    AudioCallback(AudioCallback&&) = delete;
    AudioCallback& operator=(AudioCallback&&) = delete;

    void initialize(AudioClock&       audioClock,
                    SessionManager&   sessionManager,
                    EngineStatistics& engineStats,
                    BufferPool&       bufferPool) noexcept;
    void shutdown() noexcept;

    void audioDeviceIOCallbackWithContext(
        const float* const* inputChannelData,
        int numInputChannels,
        float* const* outputChannelData,
        int numOutputChannels,
        int numSamples,
        const juce::AudioIODeviceCallbackContext& context) override;

    void audioDeviceAboutToStart(juce::AudioIODevice* device) override;
    void audioDeviceStopped() override;

private:
    AudioClock*       audioClock_{nullptr};
    SessionManager*   sessionManager_{nullptr};
    EngineStatistics* engineStats_{nullptr};
    BufferPool*       bufferPool_{nullptr};

    // Cached format from the last audioDeviceAboutToStart() call.
    // Written only on the control thread (device start), read on the
    // audio thread — both sides are sequenced by the device start/stop
    // protocol, so no extra synchronisation is needed.
    int    numOutputChannels_{2};
    double sampleRate_{0.0};
    int    bufferSize_{0};
};

} // namespace melodymeet
