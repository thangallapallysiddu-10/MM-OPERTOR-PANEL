#include "InputManager.h"
#include "../../engine/SessionManager.h"
#include <atomic>
#include <algorithm>
#include <cmath>
#include <iostream>

namespace melodymeet {

namespace
{
} // namespace

InputManager::InputManager(DeviceManager& deviceManager, SessionManager& sessionManager)
    : deviceManager_(deviceManager), sessionManager_(sessionManager) {}

InputManager::~InputManager() {
    shutdown();
}

bool InputManager::initialize() {
    if (initialized_) return true;
    
    // Initial device scan
    refreshDevices();
    
    initialized_ = true;
    return true;
}

void InputManager::shutdown() {
    if (!initialized_) return;
    
    stopCapture();
    initialized_ = false;
}

void InputManager::refreshDevices() {
    deviceManager_.refreshInputDevices();
}

std::vector<std::string> InputManager::getAvailableInputDevices() const {
    return deviceManager_.getAvailableInputDevices();
}

std::string InputManager::getCurrentInputDevice() const {
    return deviceManager_.getCurrentInputDevice();
}

bool InputManager::setCurrentInputDevice(const std::string& deviceName) {
    if (deviceName.empty()) return false;
    
    // Setting device via DeviceManager takes care of restarting the audio
    // callback if it was already running.
    return deviceManager_.setCurrentInputDevice(deviceName);
}

bool InputManager::startCapture() {
    if (!initialized_) return false;
    
    if (capturing_.load()) {
        return true; // Already capturing
    }

    // Add this callback to the device manager to start receiving audio
    deviceManager_.addAudioCallback(*this);
    capturing_.store(true);
    return true;
}

void InputManager::stopCapture() {
    if (!capturing_.load()) return;
    
    capturing_.store(false);
    deviceManager_.removeAudioCallback(*this);
}

bool InputManager::isCapturing() const noexcept {
    return capturing_.load(std::memory_order_relaxed);
}

void InputManager::audioDeviceIOCallbackWithContext(
    const float* const* inputChannelData,
    int numInputChannels,
    [[maybe_unused]] float* const* outputChannelData,
    [[maybe_unused]] int numOutputChannels,
    int numSamples,
    [[maybe_unused]] const juce::AudioIODeviceCallbackContext& context)
{
    // Fast path out if not capturing or no input
    if (!capturing_.load(std::memory_order_relaxed) || 
        inputChannelData == nullptr || 
        numInputChannels == 0) {
        return;
    }

    sessionManager_.pushAudioInput(inputChannelData, numInputChannels, numSamples);
}

void InputManager::audioDeviceAboutToStart(juce::AudioIODevice* device) {
    (void) device;
    // MicrophoneSource is already prepared by AudioEngine.
}

void InputManager::audioDeviceStopped() {
    // Nothing to do. MicrophoneSource retains its state.
}

} // namespace melodymeet
