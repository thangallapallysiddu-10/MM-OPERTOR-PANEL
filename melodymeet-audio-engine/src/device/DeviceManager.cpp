#include "DeviceManager.h"
#include <iostream>

namespace melodymeet
{

DeviceManager::~DeviceManager()
{
    shutdown();
}

bool DeviceManager::initialize()
{
    if (initialized_) {
        return true;
    }
    const auto error = audioDeviceManager_.initialise(
        defaultInputChannels,
        defaultOutputChannels,
        nullptr,
        true);

    if (error.isNotEmpty()) {
        throw std::runtime_error("DeviceManager failed to open audio device: " + error.toStdString());
    }

    audioDeviceManager_.initialiseWithDefaultDevices(defaultInputChannels, defaultOutputChannels);
    initialized_ = true;
    return true;
}

bool DeviceManager::initialize(SessionState& sessionState)
{
    if (!initialize())
        return false;

    updateSession(sessionState);
    return true;
}

void DeviceManager::shutdown()
{
    if (!initialized_)
        return;

    audioDeviceManager_.closeAudioDevice();
    initialized_ = false;
}

bool DeviceManager::isInitialized() const noexcept
{
    return initialized_;
}

std::string DeviceManager::getCurrentDeviceName() const
{
    if (!initialized_)
        return "";

    if (auto* device = audioDeviceManager_.getCurrentAudioDevice())
        return device->getName().toStdString();

    return "";
}

std::string DeviceManager::getCurrentInputDevice() const
{
    if (!initialized_)
        return "";

    auto setup = audioDeviceManager_.getAudioDeviceSetup();
    return setup.inputDeviceName.toStdString();
}

void DeviceManager::refreshInputDevices()
{
    // Rescanning is implicit in JUCE, no action needed for now.
}

bool DeviceManager::setCurrentInputDevice(const std::string& deviceName)
{
    if (!initialized_)
        return false;

    auto setup = audioDeviceManager_.getAudioDeviceSetup();
    
    // If we're turning it off
    if (deviceName.empty()) {
        setup.useDefaultInputChannels = false;
        setup.inputDeviceName = "";
    } else {
        setup.inputDeviceName = deviceName;
        setup.useDefaultInputChannels = true;
    }

    auto result = audioDeviceManager_.setAudioDeviceSetup(setup, true);
    return result.isEmpty();
}

double DeviceManager::getSampleRate() const noexcept
{
    if (auto* device = audioDeviceManager_.getCurrentAudioDevice())
        return device->getCurrentSampleRate();
    return 0.0;
}

int DeviceManager::getBufferSize() const noexcept
{
    if (auto* device = audioDeviceManager_.getCurrentAudioDevice())
        return device->getCurrentBufferSizeSamples();
    return 0;
}

std::vector<std::string> DeviceManager::getAvailableInputDevices() const
{
    return getAvailableDevices(true);
}

std::vector<std::string> DeviceManager::getAvailableOutputDevices() const
{
    return getAvailableDevices(false);
}

void DeviceManager::addAudioCallback(juce::AudioIODeviceCallback& callback)
{
    if (initialized_)
    {
        audioDeviceManager_.addAudioCallback(&callback);
    }
}

void DeviceManager::removeAudioCallback(juce::AudioIODeviceCallback& callback)
{
    if (initialized_)
    {
        audioDeviceManager_.removeAudioCallback(&callback);
    }
}

std::vector<std::string> DeviceManager::getAvailableDevices(bool inputDevices) const
{
    std::vector<std::string> deviceNames;
    if (!initialized_)
        return deviceNames;

    if (auto* type = audioDeviceManager_.getCurrentDeviceTypeObject())
    {
        type->scanForDevices();
        auto names = type->getDeviceNames(inputDevices);
        for (const auto& name : names)
            deviceNames.push_back(name.toStdString());
    }
    return deviceNames;
}

void DeviceManager::updateSession(SessionState& sessionState) const noexcept
{
    sessionState.setSampleRate(getSampleRate());
    sessionState.setBufferSize(getBufferSize());
}

} // namespace melodymeet
