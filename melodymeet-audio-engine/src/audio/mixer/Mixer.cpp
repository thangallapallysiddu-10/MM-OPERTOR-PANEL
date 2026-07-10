#include "Mixer.h"

#include "../../utilities/RtLogger.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdio>
#include <iostream>
#include <thread>

namespace melodymeet
{

namespace
{
float peakOf(float* const* channels, int channelCount, int numSamples) noexcept
{
    float peak = 0.0f;
    if (channels == nullptr)
        return peak;

    for (int ch = 0; ch < channelCount; ++ch)
    {
        const auto* data = channels[ch];
        if (!data)
            continue;

        for (int s = 0; s < numSamples; ++s)
            peak = std::max(peak, std::abs(data[s]));
    }

    return peak;
}
} // namespace

Mixer::~Mixer()
{
    release();
}

// =============================================================================
// Source Registration
// =============================================================================

Mixer::SourceId Mixer::registerSource(std::shared_ptr<AudioSource> source) noexcept
{
    if (!source)
        return invalidSourceId;

    for (auto& channel : channels_)
    {
        if (!channel.isAssigned())
        {
            const auto sourceId = nextSourceId_++;
            if (nextSourceId_ == invalidSourceId)
                nextSourceId_ = 1;

            channel.assign(sourceId, std::move(source));
            ++sourceCount_;

            if (prepared_)
                channel.getSource()->prepare(sampleRate_, maxBlockSize_, channelCount_);

            return sourceId;
        }
    }

    return invalidSourceId;
}

bool Mixer::unregisterSource(SourceId sourceId) noexcept
{
    if (auto* channel = findChannel(sourceId))
    {
        channel->deactivate();

        while (channel->isProcessing())
            std::this_thread::yield();

        if (prepared_)
            channel->getSource()->release();

        channel->clear();
        --sourceCount_;
        return true;
    }

    return false;
}

void Mixer::clearSources() noexcept
{
    for (auto& channel : channels_)
    {
        if (channel.isAssigned())
            channel.deactivate();
    }

    for (auto& channel : channels_)
    {
        if (channel.isAssigned())
        {
            while (channel.isProcessing())
                std::this_thread::yield();

            if (prepared_)
                channel.getSource()->release();

            channel.clear();
        }
    }

    sourceCount_ = 0;
}

std::size_t Mixer::getSourceCount() const noexcept
{
    return sourceCount_;
}

bool Mixer::hasSource(SourceId sourceId) const noexcept
{
    return findChannel(sourceId) != nullptr;
}

// =============================================================================
// Channel Control
// =============================================================================

bool Mixer::setGain(SourceId sourceId, float gain) noexcept
{
    if (auto* channel = findChannel(sourceId))
    {
        channel->setGain(gain);
        return true;
    }

    return false;
}

float Mixer::getGain(SourceId sourceId) const noexcept
{
    if (const auto* channel = findChannel(sourceId))
        return channel->getGain();

    return 0.0f;
}

bool Mixer::setMute(SourceId sourceId, bool muted) noexcept
{
    if (auto* channel = findChannel(sourceId))
    {
        channel->setMuted(muted);
        return true;
    }

    return false;
}

bool Mixer::isMuted(SourceId sourceId) const noexcept
{
    if (const auto* channel = findChannel(sourceId))
        return channel->isMuted();

    return false;
}

bool Mixer::setSolo(SourceId sourceId, bool soloed) noexcept
{
    std::cout << "[MIXER SOLO] setSolo called: sourceId=" << sourceId 
              << " soloed=" << (soloed ? "true" : "false") << std::endl;
    
    if (auto* channel = findChannel(sourceId))
    {
        std::cout << "[MIXER SOLO] Channel FOUND for sourceId=" << sourceId << std::endl;
        channel->setSoloed(soloed);
        std::cout << "[MIXER SOLO] Channel->setSoloed() called. isSoloed=" 
                  << (channel->isSoloed() ? "true" : "false") << std::endl;
        return true;
    }

    std::cout << "[MIXER SOLO ERROR] Channel NOT FOUND for sourceId=" << sourceId << std::endl;
    return false;
}

bool Mixer::isSoloed(SourceId sourceId) const noexcept
{
    if (const auto* channel = findChannel(sourceId))
        return channel->isSoloed();

    return false;
}

bool Mixer::enableSource(SourceId sourceId) noexcept
{
    if (auto* channel = findChannel(sourceId))
    {
        channel->setEnabled(true);
        return true;
    }

    return false;
}

bool Mixer::disableSource(SourceId sourceId) noexcept
{
    if (auto* channel = findChannel(sourceId))
    {
        channel->setEnabled(false);
        return true;
    }

    return false;
}

bool Mixer::isSourceEnabled(SourceId sourceId) const noexcept
{
    if (const auto* channel = findChannel(sourceId))
        return channel->isEnabled();

    return false;
}

// =============================================================================
// Read-only Channel Access
// =============================================================================

const MixerChannel* Mixer::getChannel(SourceId sourceId) const noexcept
{
    return findChannel(sourceId);
}

bool Mixer::hasSoloedSource() const noexcept
{
    static std::atomic<uint64_t> checkCount{0};
    const auto count = checkCount.fetch_add(1, std::memory_order_relaxed);
    
    bool foundSolo = false;
    int soloedCount = 0;
    
    for (const auto& channel : channels_)
    {
        if (channel.getSourcePointer() != nullptr && channel.isSoloed()) {
            foundSolo = true;
            soloedCount++;
            
            if (count % 100 == 0) {
                std::cout << "[MIXER HAS SOLO] Found soloed channel: sourceId=" 
                          << channel.getChannelId() << std::endl;
            }
        }
    }
    
    if (count % 100 == 0) {
        std::cout << "[MIXER HAS SOLO] Result=" << (foundSolo ? "TRUE" : "FALSE")
                  << " soloedCount=" << soloedCount << std::endl;
    }

    return foundSolo;
}

// =============================================================================
// Deck-Aware Mixer Control API (Frozen)
// =============================================================================

void Mixer::setDeckSourceIds(SourceId deckAId, SourceId deckBId) noexcept
{
    deckASourceId_ = deckAId;
    deckBSourceId_ = deckBId;
    updateEffectiveGains();
}

Mixer::SourceId Mixer::resolveDeckId(const std::string& deckId) const noexcept
{
    if (deckId == "A") return deckASourceId_;
    if (deckId == "B") return deckBSourceId_;
    return invalidSourceId;
}

void Mixer::setCrossfade(float value) noexcept
{
    crossfade_.store(std::clamp(value, 0.0f, 100.0f), std::memory_order_relaxed);
    updateEffectiveGains();
    version_.fetch_add(1, std::memory_order_relaxed);
}

void Mixer::setDeckGain(const std::string& deckId, float gain) noexcept
{
    gain = std::clamp(gain, 0.0f, 4.0f);
    if (deckId == "A") deckABaseGain_.store(gain, std::memory_order_relaxed);
    else if (deckId == "B") deckBBaseGain_.store(gain, std::memory_order_relaxed);
    updateEffectiveGains();
    version_.fetch_add(1, std::memory_order_relaxed);
}

void Mixer::setMasterGain(float gain) noexcept
{
    // Master gain is owned by the MasterDSPChain. This method is retained only
    // for legacy snapshot/control compatibility and must not affect audio.
    masterGain_.store(std::clamp(gain, 0.0f, 4.0f), std::memory_order_relaxed);
    version_.fetch_add(1, std::memory_order_relaxed);
}

void Mixer::muteDeck(const std::string& deckId, bool muted) noexcept
{
    auto id = resolveDeckId(deckId);
    if (id != invalidSourceId) {
        if (setMute(id, muted)) {
            version_.fetch_add(1, std::memory_order_relaxed);
        }
    }
}

void Mixer::soloDeck(const std::string& deckId, bool soloed) noexcept
{
    auto id = resolveDeckId(deckId);
    if (id != invalidSourceId) {
        if (setSolo(id, soloed)) {
            version_.fetch_add(1, std::memory_order_relaxed);
        }
    }
}

void Mixer::resetMixer() noexcept
{
    crossfade_.store(50.0f, std::memory_order_relaxed);
    deckABaseGain_.store(1.0f, std::memory_order_relaxed);
    deckBBaseGain_.store(1.0f, std::memory_order_relaxed);
    masterGain_.store(1.0f, std::memory_order_relaxed);

    if (deckASourceId_ != invalidSourceId)
    {
        setMute(deckASourceId_, false);
        setSolo(deckASourceId_, false);
    }
    if (deckBSourceId_ != invalidSourceId)
    {
        setMute(deckBSourceId_, false);
        setSolo(deckBSourceId_, false);
    }

    updateEffectiveGains();
    version_.fetch_add(1, std::memory_order_relaxed);
}

Mixer::MixerSnapshot Mixer::getMixerSnapshot() const noexcept
{
    MixerSnapshot snap{};
    snap.deckAGain = deckABaseGain_.load(std::memory_order_relaxed);
    snap.deckBGain = deckBBaseGain_.load(std::memory_order_relaxed);
    snap.masterGain = masterGain_.load(std::memory_order_relaxed);
    snap.crossfade = crossfade_.load(std::memory_order_relaxed);
    snap.deckAMuted = (deckASourceId_ != invalidSourceId) ? isMuted(deckASourceId_) : false;
    snap.deckBMuted = (deckBSourceId_ != invalidSourceId) ? isMuted(deckBSourceId_) : false;
    snap.deckASolo  = (deckASourceId_ != invalidSourceId) ? isSoloed(deckASourceId_) : false;
    snap.deckBSolo  = (deckBSourceId_ != invalidSourceId) ? isSoloed(deckBSourceId_) : false;
    snap.soloActive = hasSoloedSource();
    return snap;
}

void Mixer::updateEffectiveGains() noexcept
{
    // Constant-power crossfade: cos/sin curve over [0, pi/2]
    // crossfade_ is in [0, 100] where 0 = full A, 100 = full B
    constexpr float kPiOver2 = 1.5707963267948966f;
    const float t = crossfade_.load(std::memory_order_relaxed) / 100.0f;  // normalize to [0, 1]
    const float gainA = std::cos(t * kPiOver2);
    const float gainB = std::sin(t * kPiOver2);

    const float effectiveA = deckABaseGain_.load(std::memory_order_relaxed) * gainA;
    const float effectiveB = deckBBaseGain_.load(std::memory_order_relaxed) * gainB;

    if (deckASourceId_ != invalidSourceId) setGain(deckASourceId_, effectiveA);
    if (deckBSourceId_ != invalidSourceId) setGain(deckBSourceId_, effectiveB);
}

// =============================================================================
// AudioSource Interface
// =============================================================================

void Mixer::prepare(double sampleRate, int maxBlockSize, int channelCount)
{
    sampleRate_ = sampleRate > 0.0 ? sampleRate : 0.0;
    maxBlockSize_ = maxBlockSize > 0 ? maxBlockSize : 0;
    channelCount_ = channelCount > 0 ? channelCount : 0;

    const auto sampleCount = static_cast<std::size_t>(maxBlockSize_ * channelCount_);
    programBuffer_.assign(sampleCount, 0.0f);
    scratchBuffer_.assign(sampleCount, 0.0f);
    programChannels_.assign(static_cast<std::size_t>(channelCount_), nullptr);
    scratchChannels_.assign(static_cast<std::size_t>(channelCount_), nullptr);

    for (int channel = 0; channel < channelCount_; ++channel)
    {
        const auto offset = static_cast<std::size_t>(channel * maxBlockSize_);
        programChannels_[static_cast<std::size_t>(channel)] = programBuffer_.data() + offset;
        scratchChannels_[static_cast<std::size_t>(channel)] = scratchBuffer_.data() + offset;
    }

    prepared_ = sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0;

    for (auto& ch : channels_)
    {
        if (ch.isAssigned())
            ch.getSource()->prepare(sampleRate_, maxBlockSize_, channelCount_);
    }
}

void Mixer::release() noexcept
{
    for (auto& ch : channels_)
    {
        if (ch.isAssigned())
            ch.getSource()->release();
    }

    prepared_ = false;
}

void Mixer::process(float* const* outputChannels, int channelCount, int numSamples) noexcept
{
    static std::atomic<uint64_t> mixerTraceCount{0};
    static std::atomic<uint64_t> soloLogThrottle{0};
    const auto traceId = mixerTraceCount.fetch_add(1, std::memory_order_relaxed) + 1;

    if (!prepared_ || numSamples <= 0 || channelCount_ <= 0)
        return;

    const auto samplesToProcess = std::min(numSamples, maxBlockSize_);

    // Step 1: Clear the program buffer to silence.
    clearProgramBuffer(samplesToProcess);

    // Determine if any channel is soloed (affects which channels contribute).
    const bool soloActive = hasSoloedSource();
    
    // Log solo state every 100 process calls to avoid spam
    const auto logCount = soloLogThrottle.fetch_add(1, std::memory_order_relaxed);
    if (logCount % 100 == 0) {
        std::cout << "[MIXER PROCESS] soloActive=" << (soloActive ? "TRUE" : "FALSE") 
                  << " sourceCount=" << sourceCount_ << std::endl;
        
        if (soloActive) {
            std::cout << "[MIXER PROCESS] SOLO IS ACTIVE - listing all channels:" << std::endl;
            for (const auto& ch : channels_) {
                if (ch.isAssigned()) {
                    std::cout << "  sourceId=" << ch.getChannelId() 
                              << " enabled=" << (ch.isEnabled() ? "Y" : "N")
                              << " muted=" << (ch.isMuted() ? "Y" : "N")
                              << " SOLOED=" << (ch.isSoloed() ? "YES" : "NO") << std::endl;
                }
            }
        }
    }

    // Step 2: Iterate over every registered channel.
    int sourceIndex = 0;
    int skippedBySolo = 0;
    int processedChannels = 0;
    
    for (const auto& ch : channels_)
    {
        ++sourceIndex;
        ScopedProcessingMark mark(ch);

        auto* source = ch.getSourcePointer();

        // Skip unassigned slots.
        if (!source)
            continue;

        // Step 3: Skip disabled channels.
        if (!ch.isEnabled())
            continue;

        // Step 7: Apply mute — muted channels produce no output.
        if (ch.isMuted())
            continue;

        // Solo logic: when any channel is soloed, only soloed channels contribute.
        if (soloActive && !ch.isSoloed()) {
            skippedBySolo++;
            continue;
        }

        processedChannels++;

        // Step 4: Skip inactive sources.
        if (!source->isActive())
            continue;

        // Clear the scratch buffer before the source writes into it.
        for (int c = 0; c < channelCount_; ++c)
        {
            auto* scratch = scratchChannels_[static_cast<std::size_t>(c)];
            std::fill(scratch, scratch + samplesToProcess, 0.0f);
        }

        // Step 5: Call source->process() to render into the scratch buffer.
        source->process(scratchChannels_.data(), channelCount_, samplesToProcess);

        // Step 6: Apply gain and Step 8: Sum samples into the program buffer.
        const float gain = ch.getGain();

        if (gain > 0.0f)
        {
            for (int c = 0; c < channelCount_; ++c)
            {
                auto* destination = programChannels_[static_cast<std::size_t>(c)];
                const auto* scratch = scratchChannels_[static_cast<std::size_t>(c)];

                if (gain == 1.0f)
                {
                    for (int s = 0; s < samplesToProcess; ++s)
                        destination[s] += scratch[s];
                }
                else
                {
                    for (int s = 0; s < samplesToProcess; ++s)
                        destination[s] += scratch[s] * gain;
                }
            }
        }
    }
    
    // Log channel processing stats when solo is active
    if (logCount % 100 == 0 && soloActive) {
        std::cout << "[MIXER PROCESS] Solo active: skipped=" << skippedBySolo 
                  << " processed=" << processedChannels << std::endl;
    }

    // Copy the final program mix to the caller-provided output buffers.
    copyProgramBufferTo(outputChannels, channelCount, samplesToProcess);
}

void Mixer::reset() noexcept
{
    for (const auto& ch : channels_)
    {
        ScopedProcessingMark mark(ch);
        if (auto* source = ch.getSourcePointer())
            source->reset();
    }

    clearProgramBuffer(maxBlockSize_);
}

bool Mixer::isActive() const noexcept
{
    for (const auto& ch : channels_)
    {
        ScopedProcessingMark mark(ch);
        auto* source = ch.getSourcePointer();
        if (source && ch.isEnabled() && !ch.isMuted() && source->isActive())
            return true;
    }

    return false;
}

double Mixer::getSampleRate() const noexcept
{
    return sampleRate_;
}

int Mixer::getChannelCount() const noexcept
{
    return channelCount_;
}

// =============================================================================
// Output Buffer Access
// =============================================================================

const float* const* Mixer::getProgramBuffer() const noexcept
{
    if (!prepared_ || programChannels_.empty())
        return nullptr;

    return programChannels_.data();
}

int Mixer::getProgramChannelCount() const noexcept
{
    return channelCount_;
}

const float* Mixer::getOutputChannelData(int channel) const noexcept
{
    if (channel < 0 || channel >= channelCount_ || programChannels_.empty())
        return nullptr;

    return programChannels_[static_cast<std::size_t>(channel)];
}

int Mixer::getOutputBufferSize() const noexcept
{
    return maxBlockSize_;
}

// =============================================================================
// Private Helpers
// =============================================================================

MixerChannel* Mixer::findChannel(SourceId sourceId) noexcept
{
    if (sourceId == invalidSourceId)
        return nullptr;

    for (auto& channel : channels_)
    {
        if (channel.getChannelId() == sourceId)
            return &channel;
    }

    return nullptr;
}

const MixerChannel* Mixer::findChannel(SourceId sourceId) const noexcept
{
    if (sourceId == invalidSourceId)
        return nullptr;

    for (const auto& channel : channels_)
    {
        if (channel.getChannelId() == sourceId)
            return &channel;
    }

    return nullptr;
}

void Mixer::clearProgramBuffer(int numSamples) noexcept
{
    const auto samplesToClear = std::min(numSamples, maxBlockSize_);

    for (int channel = 0; channel < channelCount_; ++channel)
    {
        auto* output = programChannels_[static_cast<std::size_t>(channel)];
        std::fill(output, output + samplesToClear, 0.0f);
    }
}

void Mixer::copyProgramBufferTo(float* const* outputChannels, int channelCount, int numSamples) const noexcept
{
    if (outputChannels == nullptr || channelCount <= 0)
        return;

    const auto channelsToCopy = std::min(channelCount, channelCount_);
    const auto samplesToCopy = std::min(numSamples, maxBlockSize_);

    // Copy channels that exist in the program buffer.
    for (int channel = 0; channel < channelsToCopy; ++channel)
    {
        auto* destination = outputChannels[channel];
        const auto* source = programChannels_[static_cast<std::size_t>(channel)];

        if (destination != nullptr)
            std::copy(source, source + samplesToCopy, destination);
    }

    // Silence any extra output channels beyond our channel count.
    for (int channel = channelsToCopy; channel < channelCount; ++channel)
    {
        if (auto* destination = outputChannels[channel])
            std::fill(destination, destination + samplesToCopy, 0.0f);
    }
}

} // namespace melodymeet
