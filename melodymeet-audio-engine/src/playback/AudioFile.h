#pragma once

#include "AudioMetadata.h"
#include "AudioDecoder.h"

#include <memory>
#include <string>

namespace melodymeet {

/// Domain object representing a successfully loaded audio file.
/// Owns the static metadata and the active decoder used to extract frames.
class AudioFile {
public:
    AudioFile(std::string path, AudioMetadata metadata, std::unique_ptr<AudioDecoder> decoder);
    ~AudioFile() = default;

    AudioFile(const AudioFile&) = delete;
    AudioFile& operator=(const AudioFile&) = delete;

    AudioFile(AudioFile&&) noexcept = default;
    AudioFile& operator=(AudioFile&&) noexcept = default;

    const std::string& getPath() const noexcept { return path_; }
    const AudioMetadata& getMetadata() const noexcept { return metadata_; }
    AudioDecoder* getDecoder() const noexcept { return decoder_.get(); }

private:
    std::string path_;
    AudioMetadata metadata_;
    std::unique_ptr<AudioDecoder> decoder_;
};

} // namespace melodymeet
