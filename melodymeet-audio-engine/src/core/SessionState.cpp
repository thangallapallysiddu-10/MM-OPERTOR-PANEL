#include "SessionState.h"

#include <algorithm>

namespace melodymeet
{

bool SessionState::initialize() noexcept
{
    reset();
    engineState_ = EngineState::Initializing;
    initialized_ = true;

    return true;
}

void SessionState::shutdown() noexcept
{
    transportState_ = TransportState::Stopped;
    engineState_ = EngineState::Shutdown;
    initialized_ = false;
}

void SessionState::reset() noexcept
{
    sampleRate_ = 0.0;
    bufferSize_ = 0;
    currentDeviceName_.fill('\0');
    currentDeviceNameLength_ = 0;
    transportState_ = TransportState::Stopped;
    engineState_ = EngineState::Stopped;
    initialized_ = false;
}

double SessionState::getSampleRate() const noexcept
{
    return sampleRate_;
}

int SessionState::getBufferSize() const noexcept
{
    return bufferSize_;
}

std::string_view SessionState::getCurrentDeviceName() const noexcept
{
    return {currentDeviceName_.data(), currentDeviceNameLength_};
}

SessionState::TransportState SessionState::getTransportState() const noexcept
{
    return transportState_;
}

SessionState::EngineState SessionState::getEngineState() const noexcept
{
    return engineState_;
}

bool SessionState::isInitialized() const noexcept
{
    return initialized_;
}

void SessionState::setSampleRate(double sampleRate) noexcept
{
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 0.0;
}

void SessionState::setBufferSize(int bufferSize) noexcept
{
    bufferSize_ = bufferSize > 0 ? bufferSize : 0;
}

void SessionState::setCurrentDeviceName(std::string_view deviceName) noexcept
{
    currentDeviceName_.fill('\0');
    currentDeviceNameLength_ = std::min(deviceName.size(), maxDeviceNameLength);

    std::copy_n(deviceName.data(), currentDeviceNameLength_, currentDeviceName_.data());
}

void SessionState::setTransportState(TransportState transportState) noexcept
{
    transportState_ = transportState;
}

void SessionState::setEngineState(EngineState engineState) noexcept
{
    engineState_ = engineState;
}

} // namespace melodymeet
