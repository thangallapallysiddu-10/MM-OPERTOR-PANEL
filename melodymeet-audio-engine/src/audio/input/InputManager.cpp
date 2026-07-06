#include "InputManager.h"
#include "../../engine/SessionManager.h"
#include "../../utilities/RtLogger.h"

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
    std::cout << "[SET INPUT DEVICE] " << deviceName << std::endl;
    if (deviceName.empty()) return false;
    return deviceManager_.setCurrentInputDevice(deviceName);
}

bool InputManager::startCapture() {
    std::cout << "[START CAPTURE]" << std::endl;
    if (!initialized_) return false;

    if (capturing_.load(std::memory_order_acquire))
        return true; // Already capturing — idempotent.

    deviceManager_.addAudioCallback(*this);
    capturing_.store(true, std::memory_order_release);
    return true;
}

void InputManager::stopCapture() {
    if (!capturing_.load(std::memory_order_acquire)) return;

    // Remove the callback BEFORE clearing the flag so the audio thread
    // cannot observe capturing_==false while this object is still registered.
    // JUCE's removeAudioCallback() blocks until any in-flight callback returns,
    // guaranteeing no further calls arrive after this line.
    deviceManager_.removeAudioCallback(*this);
    capturing_.store(false, std::memory_order_release);
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
    static bool callbackSeen = false;
    if (!callbackSeen) {
        callbackSeen = true;
        RtLogger::get().log("[CALLBACK ENTERED]");
    }

    static int counter = 0;
    if (++counter % 100 == 0) {
        std::cout << "[CALLBACK] numInputChannels=" << numInputChannels << std::endl;
    }

    if (numInputChannels == 0) {
        static int zeroCounter = 0;
        if (++zeroCounter % 100 == 0) {
            std::cout << "[CALLBACK] numInputChannels==0" << std::endl;
        }
    }

    // Fast path out if not capturing or no input
    if (!capturing_.load(std::memory_order_relaxed) || 
        inputChannelData == nullptr || 
        numInputChannels == 0) {
        return;
    }

    // STEP 1 DIAGNOSTIC: Input Device Level
    static std::atomic<uint64_t> inputTraceCount{0};
    const auto traceId = inputTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;
    
    if (traceId % 100 == 0) {
        float peak = 0.0f;
        for (int ch = 0; ch < numInputChannels; ++ch) {
            if (inputChannelData[ch]) {
                for (int s = 0; s < numSamples; ++s) {
                    peak = std::max(peak, std::abs(inputChannelData[ch][s]));
                }
            }
        }
        
        char buf[256];
        std::snprintf(buf, sizeof(buf), "[MIC INPUT] channels=%d samples=%d peak=%.6f",
            numInputChannels, numSamples, peak);
        melodymeet::RtLogger::get().log(buf);
    }

    RtLogger::get().log("[CALLING PUSH AUDIO INPUT]");
    sessionManager_.pushAudioInput(inputChannelData, numInputChannels, numSamples);
}

void InputManager::audioDeviceAboutToStart(juce::AudioIODevice* device) {
    if (device) {
        std::cout << "[DEVICE START] activeInputs=" << device->getActiveInputChannels().countNumberOfSetBits() << std::endl;
    }
}

void InputManager::audioDeviceStopped() {
    // Nothing to do — MicrophoneSource retains its prepared state across restarts.
    // capturing_ is not cleared here: the device may restart without a full
    // stopCapture/startCapture cycle (e.g. sample-rate change), and the flag
    // correctly reflects whether this callback is registered with the device manager.
}

} // namespace melodymeet
