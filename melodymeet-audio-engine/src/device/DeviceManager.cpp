#include "DeviceManager.h"

namespace melodymeet
{

DeviceManager::~DeviceManager()
{
    shutdown();
}

bool DeviceManager::initialize()
{
    std::cout << "=== DEVICE INIT PATCH ACTIVE ===" << std::endl;

    if (initialized_)
        return true;

    // Open the output device only. Input channels are requested on-demand
    // when the user enables a microphone — requesting them here would open
    // the input stream immediately and make the later setAudioDeviceSetup()
    // call restart the device, stalling the audio callback.
    // FIX: Actually, we MUST initialize with input channels, otherwise the 
    // audioDeviceManager will open the device stream with 0 inputs. When we later
    // call setAudioDeviceSetup(..., false), it updates the setup object but DOES NOT
    // restart the stream, meaning numInputChannels will forever be 0 in the callback.
    const auto error = audioDeviceManager_.initialise(
        256,                   // numInputChannelsNeeded
        defaultOutputChannels,
        nullptr,
        true);

    if (error.isNotEmpty())
        throw std::runtime_error("DeviceManager failed to open audio device: " + error.toStdString());

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

    std::cout << "[SET INPUT DEVICE DM] deviceName=" << deviceName << "\n"
              << "  old setup.inputDeviceName=" << setup.inputDeviceName.toStdString() << "\n"
              << "  old setup.useDefaultInputChannels=" << (setup.useDefaultInputChannels ? "true" : "false") << "\n";
    if (auto* device = audioDeviceManager_.getCurrentAudioDevice()) {
        std::cout << "  activeInputChannels=" << device->getActiveInputChannels().countNumberOfSetBits() << "\n";
    }

    bool changed = false;

    if (deviceName.empty())
    {
        if (setup.useDefaultInputChannels != false || setup.inputDeviceName.isNotEmpty()) changed = true;
        setup.useDefaultInputChannels = false;
        setup.inputDeviceName         = "";
    }
    else
    {
        if (setup.inputDeviceName.toStdString() != deviceName || setup.useDefaultInputChannels != true) changed = true;
        setup.inputDeviceName         = deviceName;
        setup.useDefaultInputChannels = true;
    }

    // Only restart the hardware device if the configuration actually changed.
    // This fixes device assignment while preventing unnecessary playback stalls.
    const auto error = audioDeviceManager_.setAudioDeviceSetup(setup, changed);

    auto newSetup = audioDeviceManager_.getAudioDeviceSetup();
    std::cout << "[SET INPUT DEVICE DM AFTER] error=" << error.toStdString() << "\n"
              << "  new setup.inputDeviceName=" << newSetup.inputDeviceName.toStdString() << "\n"
              << "  new setup.useDefaultInputChannels=" << (newSetup.useDefaultInputChannels ? "true" : "false") << "\n";
    if (auto* device = audioDeviceManager_.getCurrentAudioDevice()) {
        std::cout << "  activeInputChannels=" << device->getActiveInputChannels().countNumberOfSetBits() << "\n";
    }

    return error.isEmpty();
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
