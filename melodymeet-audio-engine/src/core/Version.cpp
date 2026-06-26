#include "Version.h"

namespace melodymeet
{

int Version::major() const
{
    return 1;
}

int Version::minor() const
{
    return 0;
}

int Version::patch() const
{
    return 0;
}

std::string Version::toString() const
{
    return std::to_string(major()) + "." +
           std::to_string(minor()) + "." +
           std::to_string(patch());
}

} // namespace melodymeet