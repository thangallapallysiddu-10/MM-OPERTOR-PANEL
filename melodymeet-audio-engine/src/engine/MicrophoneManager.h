#pragma once

#include "../audio/input/MicrophoneSource.h"
#include <cstddef>
#include <memory>
#include <vector>

namespace melodymeet
{

class MicrophoneManager
{
public:
    MicrophoneManager();
    ~MicrophoneManager() = default;

    MicrophoneManager(const MicrophoneManager&) = delete;
    MicrophoneManager& operator=(const MicrophoneManager&) = delete;

    // Initialize with a specific number of microphones for the session layout.
    void initialize(int numMicrophones);

    std::shared_ptr<MicrophoneSource> getPrimaryMicrophone() const;
    std::shared_ptr<MicrophoneSource> getMicrophone(std::size_t index) const;
    const std::vector<std::shared_ptr<MicrophoneSource>>& getMicrophones() const;

private:
    std::vector<std::shared_ptr<MicrophoneSource>> microphones_;
};

} // namespace melodymeet
