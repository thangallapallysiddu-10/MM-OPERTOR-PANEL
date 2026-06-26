#pragma once

#include <string>

namespace melodymeet {

/// Represents the metadata extracted from an audio file.
/// Contains no playback or processing logic.
struct AudioMetadata {
    double durationSeconds{0.0};
    int numChannels{0};
    double sampleRate{0.0};
    int bitRate{0};
    
    std::string formatName; // e.g., "WAV", "MP3", "AAC"
    
    std::string title;
    std::string artist;
    std::string album;
    
    // std::vector<uint8_t> coverArtData; // Reserved for future use
};

} // namespace melodymeet
