#include "MicrophoneManager.h"

namespace melodymeet
{

MicrophoneManager::MicrophoneManager()
{
    // By default, create one microphone source to ensure backward compatibility.
    microphones_.push_back(std::make_shared<MicrophoneSource>());
}

void MicrophoneManager::initialize(int numMicrophones)
{
    microphones_.clear();
    for (int i = 0; i < numMicrophones; ++i)
    {
        microphones_.push_back(std::make_shared<MicrophoneSource>());
    }
}

std::shared_ptr<MicrophoneSource> MicrophoneManager::getPrimaryMicrophone() const
{
    if (microphones_.empty()) {
        return nullptr;
    }
    return microphones_[0];
}

std::shared_ptr<MicrophoneSource> MicrophoneManager::getMicrophone(std::size_t index) const
{
    if (index >= microphones_.size()) {
        return nullptr;
    }
    return microphones_[index];
}

const std::vector<std::shared_ptr<MicrophoneSource>>& MicrophoneManager::getMicrophones() const
{
    return microphones_;
}

} // namespace melodymeet
