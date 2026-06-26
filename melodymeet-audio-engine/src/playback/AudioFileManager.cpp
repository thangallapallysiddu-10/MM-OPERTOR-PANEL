#include "AudioFileManager.h"

#include <juce_core/juce_core.h>
#include <iostream>

namespace melodymeet {

std::unique_ptr<AudioFile> AudioFileManager::loadFile(const std::string& path) const {
    std::cout << "[ENGINE TRACE] AudioFileManager::loadFile path=" << path << std::endl;
    if (path.empty())
        return nullptr;

    auto decoder = std::make_unique<AudioDecoder>();
    if (!decoder->load(path)) {
        // Failed to load, or unsupported format
        std::cout << "[ENGINE TRACE] AudioFileManager::loadFile decoder rejected path=" << path << std::endl;
        return nullptr;
    }

    AudioMetadata metadata = extractMetadata(decoder.get(), path);
    std::cout << "[ENGINE TRACE] AudioFileManager::loadFile success path=" << path << std::endl;

    return std::make_unique<AudioFile>(path, std::move(metadata), std::move(decoder));
}

AudioMetadata AudioFileManager::extractMetadata(AudioDecoder* decoder, const std::string& path) const {
    AudioMetadata metadata;
    metadata.sampleRate = decoder->getSampleRate();
    metadata.numChannels = decoder->getNumChannels();
    
    if (metadata.sampleRate > 0.0) {
        metadata.durationSeconds = static_cast<double>(decoder->getLengthInSamples()) / metadata.sampleRate;
    } else {
        metadata.durationSeconds = 0.0;
    }

    // Basic extraction
    juce::File file(juce::String::fromUTF8(path.c_str()));
    metadata.title = file.getFileNameWithoutExtension().toStdString();
    metadata.formatName = file.getFileExtension().replace(".", "").toUpperCase().toStdString();
    
    // Default values
    metadata.artist = "Unknown Artist";
    metadata.album = "Unknown Album";
    metadata.bitRate = 0; // Requires deeper extraction from format reader if available

    return metadata;
}

} // namespace melodymeet
