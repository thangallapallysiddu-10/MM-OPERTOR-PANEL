#pragma once

#include <juce_audio_formats/juce_audio_formats.h>

#include <memory>
#include <string>

namespace melodymeet {

/// Synchronous audio decoder supporting WAV, MP3, and AAC (where OS supported).
/// This is the only decoder used within the engine.
class AudioDecoder final {
public:
    AudioDecoder();
    ~AudioDecoder() = default;

    AudioDecoder(const AudioDecoder&) = delete;
    AudioDecoder& operator=(const AudioDecoder&) = delete;

    /// Attempts to open and prepare the file for decoding.
    /// @return true if successfully opened and a valid decoder was found.
    bool load(const std::string& path);

    /// Reads a block of samples synchronously.
    /// @param destChannels Pointers to the destination channel buffers.
    /// @param numDestChannels Number of destination channels.
    /// @param startSample The sample index in the file to start reading from.
    /// @param numSamples The number of samples to read.
    /// @return true if successful.
    bool readSamples(float* const* destChannels, int numDestChannels, int64_t startSample, int numSamples);

    /// Reads a resampled block of samples using linear interpolation.
    /// @param destChannels Pointers to the destination channel buffers.
    /// @param numDestChannels Number of destination channels.
    /// @param startSample The starting position in source samples.
    /// @param sourceStep The source-sample step per destination sample.
    /// @param numSamples The number of destination samples to produce.
    /// @return true if successful.
    bool readInterpolatedSamples(float* const* destChannels, int numDestChannels, double startSample, double sourceStep, int numSamples);

    bool isLoaded() const noexcept { return isLoaded_; }

    double getSampleRate() const noexcept;
    int getNumChannels() const noexcept;
    int64_t getLengthInSamples() const noexcept;

private:
    juce::AudioFormatManager formatManager_;
    juce::AudioBuffer<float> decodedBuffer_;
    
    double sampleRate_{0.0};
    int numChannels_{0};
    int64_t lengthInSamples_{0};
    bool isLoaded_{false};
};

} // namespace melodymeet
