#pragma once

#include "../core/SessionState.h"

#include <juce_audio_devices/juce_audio_devices.h>

#include <cstddef>
#include <string>
#include <vector>

namespace melodymeet
{

class DeviceManager
{
public:
    DeviceManager() = default;
    ~DeviceManager();

    DeviceManager(const DeviceManager&) = delete;
    DeviceManager& operator=(const DeviceManager&) = delete;
    DeviceManager(DeviceManager&&) = delete;
    DeviceManager& operator=(DeviceManager&&) = delete;

    bool initialize();
    bool initialize(SessionState& sessionState);
    void shutdown();

    bool isInitialized() const noexcept;
    std::string getCurrentDeviceName() const;
    std::string getCurrentInputDevice() const;
    void refreshInputDevices();
    bool setCurrentInputDevice(const std::string& deviceName);
    double getSampleRate() const noexcept;
    int getBufferSize() const noexcept;
    std::vector<std::string> getAvailableInputDevices() const;
    std::vector<std::string> getAvailableOutputDevices() const;
    void addAudioCallback(juce::AudioIODeviceCallback& callback);
    void removeAudioCallback(juce::AudioIODeviceCallback& callback);

private:
    static constexpr int defaultInputChannels = 2;
    static constexpr int defaultOutputChannels = 2;

    std::vector<std::string> getAvailableDevices(bool inputDevices) const;
    void updateSession(SessionState& sessionState) const noexcept;

    mutable juce::AudioDeviceManager audioDeviceManager_;
    bool initialized_ = false;
};

} // namespace melodymeet
