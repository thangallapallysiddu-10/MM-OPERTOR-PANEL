#include "Logger.h"

#include <iostream>

namespace melodymeet
{

void Logger::info(const std::string& message) const
{
    log("INFO", message);
}

void Logger::warn(const std::string& message) const
{
    log("WARN", message);
}

void Logger::error(const std::string& message) const
{
    log("ERROR", message);
}

void Logger::debug(const std::string& message) const
{
    log("DEBUG", message);
}

void Logger::log(const std::string& level, const std::string& message) const
{
    std::cout << '[' << level << "] " << message << '\n';
}

} // namespace melodymeet
