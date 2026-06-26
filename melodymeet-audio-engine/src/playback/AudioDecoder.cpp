#include "AudioDecoder.h"

#include <algorithm>
#include <cmath>
#include <iostream>
#include <cstring>

namespace melodymeet {

AudioDecoder::AudioDecoder() {
    formatManager_.registerBasicFormats();

    // Register OS-native formats to support AAC and MP3 where available
#if JUCE_MAC || JUCE_IOS
    formatManager_.registerFormat(new juce::CoreAudioFormat(), true);
#elif JUCE_WINDOWS
    formatManager_.registerFormat(new juce::WindowsMediaAudioFormat(), true);
#endif
}

bool AudioDecoder::load(const std::string& path) {
    std::cout << "[ENGINE TRACE] AudioDecoder::load path=" << path << std::endl;
    if (path.empty())
        return false;

    juce::File audioFile(juce::String::fromUTF8(path.c_str()));
    if (!audioFile.existsAsFile()) {
        std::cout << "[ENGINE TRACE] AudioDecoder::load file missing path=" << audioFile.getFullPathName().toStdString() << std::endl;
        return false;
    }

    std::unique_ptr<juce::AudioFormatReader> reader(formatManager_.createReaderFor(audioFile));
    if (!reader) {
        std::cout << "[ENGINE TRACE] AudioDecoder::load no reader path=" << audioFile.getFullPathName().toStdString() << std::endl;
        return false;
    }

    sampleRate_ = reader->sampleRate;
    numChannels_ = static_cast<int>(reader->numChannels);
    lengthInSamples_ = reader->lengthInSamples;
    
    if (lengthInSamples_ <= 0 || numChannels_ <= 0) {
        std::cout << "[ENGINE TRACE] AudioDecoder::load invalid metadata path=" << audioFile.getFullPathName().toStdString() << std::endl;
        return false;
    }

    // Allocate memory and decode entire file (synchronous, on control thread)
    decodedBuffer_.setSize(numChannels_, static_cast<int>(lengthInSamples_));
    decodedBuffer_.clear();
    
    bool success = reader->read(decodedBuffer_.getArrayOfWritePointers(), numChannels_, 0, static_cast<int>(lengthInSamples_));
    if (!success) {
        decodedBuffer_.setSize(0, 0);
        std::cout << "[ENGINE TRACE] AudioDecoder::load decode read failed path=" << audioFile.getFullPathName().toStdString() << std::endl;
        return false;
    }

    isLoaded_ = true;
    std::cout << "[ENGINE TRACE] AudioDecoder::load success path=" << audioFile.getFullPathName().toStdString() << std::endl;
    return true;
}

bool AudioDecoder::readSamples(float* const* destChannels, int numDestChannels, int64_t startSample, int numSamples) {
    if (!isLoaded_ || destChannels == nullptr || numDestChannels <= 0 || numSamples <= 0)
        return false;

    if (startSample >= lengthInSamples_)
        return false;

    const int samplesToCopy = std::min(numSamples, static_cast<int>(lengthInSamples_ - startSample));
    const int channelsToCopy = std::min(numDestChannels, numChannels_);

    for (int ch = 0; ch < channelsToCopy; ++ch) {
        if (destChannels[ch] != nullptr) {
            std::memcpy(destChannels[ch], decodedBuffer_.getReadPointer(ch, static_cast<int>(startSample)), samplesToCopy * sizeof(float));
        }
    }

    // Zero out remaining samples if we reached EOF early
    if (samplesToCopy < numSamples) {
        for (int ch = 0; ch < channelsToCopy; ++ch) {
            if (destChannels[ch] != nullptr) {
                std::memset(destChannels[ch] + samplesToCopy, 0, (numSamples - samplesToCopy) * sizeof(float));
            }
        }
    }

    // Zero out any requested channels that the file doesn't have
    for (int ch = channelsToCopy; ch < numDestChannels; ++ch) {
        if (destChannels[ch] != nullptr) {
            std::memset(destChannels[ch], 0, numSamples * sizeof(float));
        }
    }

    return true;
}

bool AudioDecoder::readInterpolatedSamples(float* const* destChannels, int numDestChannels, double startSample, double sourceStep, int numSamples) {
    if (!isLoaded_ || destChannels == nullptr || numDestChannels <= 0 || numSamples <= 0 || sourceStep <= 0.0)
        return false;

    const int channelsToCopy = std::min(numDestChannels, numChannels_);
    const int64_t lastValidSample = std::max<int64_t>(0, lengthInSamples_ - 1);

    for (int sampleIndex = 0; sampleIndex < numSamples; ++sampleIndex) {
        const double sourcePosition = startSample + (static_cast<double>(sampleIndex) * sourceStep);
        const int64_t baseSample = static_cast<int64_t>(std::floor(sourcePosition));

        if (baseSample >= lengthInSamples_) {
            for (int ch = 0; ch < channelsToCopy; ++ch) {
                if (destChannels[ch] != nullptr) {
                    std::memset(destChannels[ch] + sampleIndex, 0, static_cast<size_t>(numSamples - sampleIndex) * sizeof(float));
                }
            }
            break;
        }

        const double fraction = sourcePosition - static_cast<double>(baseSample);
        const int64_t nextSample = std::min<int64_t>(baseSample + 1, lastValidSample);

        for (int ch = 0; ch < channelsToCopy; ++ch) {
            if (!destChannels[ch]) {
                continue;
            }

            const float* channelData = decodedBuffer_.getReadPointer(ch);
            const float sampleA = channelData[static_cast<int>(baseSample)];
            const float sampleB = channelData[static_cast<int>(nextSample)];
            destChannels[ch][sampleIndex] = static_cast<float>(sampleA + ((sampleB - sampleA) * fraction));
        }
    }

    for (int ch = channelsToCopy; ch < numDestChannels; ++ch) {
        if (destChannels[ch] != nullptr) {
            std::memset(destChannels[ch], 0, static_cast<size_t>(numSamples) * sizeof(float));
        }
    }

    return true;
}

double AudioDecoder::getSampleRate() const noexcept {
    return sampleRate_;
}

int AudioDecoder::getNumChannels() const noexcept {
    return numChannels_;
}

int64_t AudioDecoder::getLengthInSamples() const noexcept {
    return lengthInSamples_;
}

} // namespace melodymeet
