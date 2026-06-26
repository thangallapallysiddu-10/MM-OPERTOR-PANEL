#pragma once

#include <string>

namespace melodymeet
{

class Version
{
public:
    Version() = default;

    int major() const;
    int minor() const;
    int patch() const;

    std::string toString() const;
};

} // namespace melodymeet