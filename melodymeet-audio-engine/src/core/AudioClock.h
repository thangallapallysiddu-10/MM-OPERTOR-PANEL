#pragma once

#include <cstdint>

namespace melodymeet
{

class AudioClock
{
public:
    AudioClock() = default;

    bool initialize(double sampleRate, int bufferSize) noexcept;

    void start() noexcept;
    void stop() noexcept;
    void reset() noexcept;
    void processBlock(int numSamples) noexcept;

    std::uint64_t getCurrentSample() const noexcept;
    double getCurrentTimeSeconds() const noexcept;
    double getSampleRate() const noexcept;
    int getBufferSize() const noexcept;
    std::uint64_t getProcessedBufferCount() const noexcept;
    bool isRunning() const noexcept;

private:
    double sampleRate_ = 0.0;
    int bufferSize_ = 0;
    std::uint64_t currentSamplePosition_ = 0;
    std::uint64_t processedBufferCount_ = 0;
    bool engineRunning_ = false;
};

} // namespace melodymeet
