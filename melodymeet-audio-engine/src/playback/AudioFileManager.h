#pragma once

#include "AudioFile.h"

#include <memory>
#include <string>

namespace melodymeet {

/// Responsible for validating file paths, extracting metadata,
/// and returning an initialized AudioFile domain object.
class AudioFileManager {
public:
    AudioFileManager() = default;
    ~AudioFileManager() = default;

    /// Attempts to load and validate an audio file.
    /// @param path The filesystem path to the audio file.
    /// @return A unique_ptr to the AudioFile if successful, nullptr otherwise.
    std::unique_ptr<AudioFile> loadFile(const std::string& path) const;

private:
    AudioMetadata extractMetadata(AudioDecoder* decoder, const std::string& path) const;
};

} // namespace melodymeet
