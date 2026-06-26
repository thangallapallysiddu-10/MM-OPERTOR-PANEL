#pragma once

#include <array>
#include <cstddef>
#include <string_view>

namespace melodymeet
{

class SessionState
{
public:
    enum class TransportState
    {
        Stopped,
        Playing,
        Paused
    };

    enum class EngineState
    {
        Stopped,
        Initializing,
        Running,
        Shutdown
    };

    SessionState() = default;

    bool initialize() noexcept;
    void shutdown() noexcept;
    void reset() noexcept;

    double getSampleRate() const noexcept;
    int getBufferSize() const noexcept;
    std::string_view getCurrentDeviceName() const noexcept;
    TransportState getTransportState() const noexcept;
    EngineState getEngineState() const noexcept;
    bool isInitialized() const noexcept;

    void setSampleRate(double sampleRate) noexcept;
    void setBufferSize(int bufferSize) noexcept;
    void setCurrentDeviceName(std::string_view deviceName) noexcept;
    void setTransportState(TransportState transportState) noexcept;
    void setEngineState(EngineState engineState) noexcept;

private:
    static constexpr std::size_t maxDeviceNameLength = 128;

    double sampleRate_ = 0.0;
    int bufferSize_ = 0;
    std::array<char, maxDeviceNameLength + 1> currentDeviceName_ = {};
    std::size_t currentDeviceNameLength_ = 0;
    TransportState transportState_ = TransportState::Stopped;
    EngineState engineState_ = EngineState::Stopped;
    bool initialized_ = false;
};

} // namespace melodymeet
