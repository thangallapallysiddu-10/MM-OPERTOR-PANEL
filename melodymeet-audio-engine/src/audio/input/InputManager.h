#pragma once

#include "MicrophoneSource.h"
#include "../../device/DeviceManager.h"

#include <juce_audio_devices/juce_audio_devices.h>

#include <atomic>
#include <memory>
#include <string>
#include <vector>

namespace melodymeet {

/// Manages audio input device selection and capture routing.
///
/// InputManager does NOT own a juce::AudioDeviceManager. It receives a reference
/// to the existing DeviceManager (which is the sole owner of the JUCE device
/// manager and audio clock) and delegates device operations to it.
///
/// When capture is active, InputManager registers itself as an AudioIODeviceCallback
/// on the DeviceManager to receive input channel data, which it pushes into the
/// MicrophoneSource's lock-free FIFO.
///
/// Thread safety:
///   - Device enumeration/selection: control thread only.
///   - audioDeviceIOCallbackWithContext: input device callback thread.
///   - No locks, no allocations on the audio thread.
class SessionManager;

class InputManager final : public juce::AudioIODeviceCallback {
public:
    explicit InputManager(DeviceManager& deviceManager, SessionManager& sessionManager);
    ~InputManager() override;

    InputManager(const InputManager&) = delete;
    InputManager& operator=(const InputManager&) = delete;
    InputManager(InputManager&&) = delete;
    InputManager& operator=(InputManager&&) = delete;

    // --- Lifecycle ---
    bool initialize();
    void shutdown();

    // --- Device Management (Control Thread) ---
    void refreshDevices();
    std::vector<std::string> getAvailableInputDevices() const;
    std::string getCurrentInputDevice() const;
    bool hasActiveInputDevice() const noexcept;
    bool setCurrentInputDevice(const std::string& deviceName);

    // --- Capture Control ---
    bool startCapture();
    void stopCapture();
    bool isCapturing() const noexcept;

    // --- juce::AudioIODeviceCallback (Input Device Thread) ---
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
    DeviceManager& deviceManager_;
    SessionManager& sessionManager_;

    std::atomic<bool> capturing_{false};
    bool initialized_{false};
};

} // namespace melodymeet
