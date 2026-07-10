#include "MixerChannel.h"

#include <algorithm>
#include <iostream>

namespace melodymeet
{

void MixerChannel::assign(ChannelId id, std::shared_ptr<AudioSource> source) noexcept
{
    channelId_.store(id, std::memory_order_relaxed);
    source_ = std::move(source);
    gain_.store(defaultGain, std::memory_order_relaxed);
    enabled_.store(true, std::memory_order_relaxed);
    muted_.store(false, std::memory_order_relaxed);
    soloed_.store(false, std::memory_order_relaxed);
    pfl_.store(false, std::memory_order_relaxed);
    rawSource_.store(source_.get(), std::memory_order_seq_cst);
}

void MixerChannel::clear() noexcept
{
    channelId_.store(invalidChannelId, std::memory_order_relaxed);
    source_.reset();
    rawSource_.store(nullptr, std::memory_order_seq_cst);
    gain_.store(defaultGain, std::memory_order_relaxed);
    enabled_.store(true, std::memory_order_relaxed);
    muted_.store(false, std::memory_order_relaxed);
    soloed_.store(false, std::memory_order_relaxed);
    pfl_.store(false, std::memory_order_relaxed);
}

bool MixerChannel::isAssigned() const noexcept
{
    return source_ != nullptr;
}

MixerChannel::ChannelId MixerChannel::getChannelId() const noexcept
{
    return channelId_.load(std::memory_order_relaxed);
}

const std::shared_ptr<AudioSource>& MixerChannel::getSource() const noexcept
{
    return source_;
}

AudioSource* MixerChannel::getSourcePointer() const noexcept
{
    return rawSource_.load(std::memory_order_seq_cst);
}

void MixerChannel::deactivate() noexcept
{
    rawSource_.store(nullptr, std::memory_order_seq_cst);
}

void MixerChannel::markProcessing() const noexcept
{
    processing_.store(true, std::memory_order_seq_cst);
}

void MixerChannel::unmarkProcessing() const noexcept
{
    processing_.store(false, std::memory_order_seq_cst);
}

bool MixerChannel::isProcessing() const noexcept
{
    return processing_.load(std::memory_order_seq_cst);
}

void MixerChannel::setEnabled(bool enabled) noexcept
{
    enabled_.store(enabled, std::memory_order_relaxed);
}

bool MixerChannel::isEnabled() const noexcept
{
    return enabled_.load(std::memory_order_relaxed);
}

void MixerChannel::setGain(float gain) noexcept
{
    gain_.store(std::clamp(gain, minGain, maxGain), std::memory_order_relaxed);
}

float MixerChannel::getGain() const noexcept
{
    return gain_.load(std::memory_order_relaxed);
}

void MixerChannel::setMuted(bool muted) noexcept
{
    muted_.store(muted, std::memory_order_relaxed);
}

bool MixerChannel::isMuted() const noexcept
{
    return muted_.load(std::memory_order_relaxed);
}

void MixerChannel::setSoloed(bool soloed) noexcept
{
    const bool wasSoloed = soloed_.load(std::memory_order_relaxed);
    soloed_.store(soloed, std::memory_order_relaxed);
    const bool nowSoloed = soloed_.load(std::memory_order_relaxed);
    
    std::cout << "[MIXERCHANNEL SOLO] channelId=" << channelId_ 
              << " wasSoloed=" << (wasSoloed ? "true" : "false")
              << " nowSoloed=" << (nowSoloed ? "true" : "false") << std::endl;
}

bool MixerChannel::isSoloed() const noexcept
{
    return soloed_.load(std::memory_order_relaxed);
}

void MixerChannel::setPFL(bool pfl) noexcept
{
    pfl_.store(pfl, std::memory_order_relaxed);
}

bool MixerChannel::isPFL() const noexcept
{
    return pfl_.load(std::memory_order_relaxed);
}

bool MixerChannel::isContributing() const noexcept
{
    return isAssigned() && isEnabled() && !isMuted();
}

} // namespace melodymeet
