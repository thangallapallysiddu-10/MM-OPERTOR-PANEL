#pragma once

#include <string>

namespace melodymeet
{

class Logger
{
public:
    void info(const std::string& message) const;
    void warn(const std::string& message) const;
    void error(const std::string& message) const;
    void debug(const std::string& message) const;

private:
    void log(const std::string& level, const std::string& message) const;
};

} // namespace melodymeet
