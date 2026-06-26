#include "AudioFile.h"

namespace melodymeet {

AudioFile::AudioFile(std::string path, AudioMetadata metadata, std::unique_ptr<AudioDecoder> decoder)
    : path_(std::move(path))
    , metadata_(std::move(metadata))
    , decoder_(std::move(decoder))
{
}

} // namespace melodymeet
