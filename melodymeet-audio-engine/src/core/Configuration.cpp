#include "Configuration.h"

namespace melodymeet
{

int Configuration::sampleRate() const
{
    return 48000;
}

int Configuration::bufferSize() const
{
    return 512;
}

int Configuration::bitDepth() const
{
    return 24;
}

int Configuration::outputChannels() const
{
    return 2;
}

} // namespace melodymeet