#pragma once

namespace melodymeet
{

class AudioSource
{
public:
    virtual ~AudioSource();

    virtual void prepare(double sampleRate, int maxBlockSize, int channelCount) = 0;
    virtual void release() noexcept = 0;
    virtual void process(float* const* outputChannels, int channelCount, int numSamples) noexcept = 0;
    virtual void reset() noexcept = 0;

    virtual bool isActive() const noexcept = 0;
    virtual double getSampleRate() const noexcept = 0;
    virtual int getChannelCount() const noexcept = 0;
};

} // namespace melodymeet
