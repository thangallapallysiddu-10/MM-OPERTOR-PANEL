#pragma once

namespace melodymeet
{

class Configuration
{
public:
    Configuration() = default;

    int sampleRate() const;
    int bufferSize() const;
    int bitDepth() const;
    int outputChannels() const;
};

} // namespace melodymeet