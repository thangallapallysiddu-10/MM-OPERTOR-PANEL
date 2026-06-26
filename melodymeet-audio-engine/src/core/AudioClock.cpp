#include "AudioClock.h"

namespace melodymeet
{

bool AudioClock::initialize(double sampleRate, int bufferSize) noexcept
{
    if (sampleRate <= 0.0 || bufferSize <= 0)
        return false;

    sampleRate_ = sampleRate;
    bufferSize_ = bufferSize;
    currentSamplePosition_ = 0;
    processedBufferCount_ = 0;
    engineRunning_ = false;

    return true;
}

void AudioClock::start() noexcept
{
    engineRunning_ = true;
}

void AudioClock::stop() noexcept
{
    engineRunning_ = false;
}

void AudioClock::reset() noexcept
{
    currentSamplePosition_ = 0;
    processedBufferCount_ = 0;
    engineRunning_ = false;
}

void AudioClock::processBlock(int numSamples) noexcept
{
    if (!engineRunning_ || numSamples <= 0)
        return;

    currentSamplePosition_ += static_cast<std::uint64_t>(numSamples);
    ++processedBufferCount_;
}

std::uint64_t AudioClock::getCurrentSample() const noexcept
{
    return currentSamplePosition_;
}

double AudioClock::getCurrentTimeSeconds() const noexcept
{
    if (sampleRate_ <= 0.0)
        return 0.0;

    return static_cast<double>(currentSamplePosition_) / sampleRate_;
}

double AudioClock::getSampleRate() const noexcept
{
    return sampleRate_;
}

int AudioClock::getBufferSize() const noexcept
{
    return bufferSize_;
}

std::uint64_t AudioClock::getProcessedBufferCount() const noexcept
{
    return processedBufferCount_;
}

bool AudioClock::isRunning() const noexcept
{
    return engineRunning_;
}

} // namespace melodymeet
