#include "DSPChain.h"

#include <algorithm>
#include <thread>

namespace melodymeet {

DSPChain::DSPChain() {
    activeChain_.store(new std::vector<DSPNode>(), std::memory_order_relaxed);
}

DSPChain::~DSPChain() {
    release();

    auto* oldChain = activeChain_.exchange(nullptr, std::memory_order_seq_cst);
    
    // Spin-wait until the audio thread exits the processing block.
    while (processing_.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }

    delete oldChain;
}

void DSPChain::prepare(double sampleRate, int maxBlockSize, int channelCount) {
    std::lock_guard<std::mutex> lock(controlMutex_);
    sampleRate_ = sampleRate;
    maxBlockSize_ = maxBlockSize;
    channelCount_ = channelCount;
    prepared_ = (sampleRate_ > 0.0 && maxBlockSize_ > 0 && channelCount_ > 0);

    if (auto* chain = activeChain_.load(std::memory_order_relaxed)) {
        for (auto& node : *chain) {
            if (node.processor) {
                node.processor->prepare(sampleRate_, maxBlockSize_, channelCount_);
                node.processor->reset();
            }
        }
    }
}

void DSPChain::release() noexcept {
    std::lock_guard<std::mutex> lock(controlMutex_);
    prepared_ = false;

    if (auto* chain = activeChain_.load(std::memory_order_relaxed)) {
        for (auto& node : *chain) {
            if (node.processor) {
                node.processor->release();
            }
        }
    }
}

void DSPChain::reset() noexcept {
    std::lock_guard<std::mutex> lock(controlMutex_);
    if (auto* chain = activeChain_.load(std::memory_order_relaxed)) {
        for (auto& node : *chain) {
            if (node.processor) {
                node.processor->reset();
            }
        }
    }
}

void DSPChain::process(float* const* channels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || numSamples <= 0 || channelCount <= 0 || channels == nullptr)
        return;

    // Enter critical section (wait-free)
    processing_.store(true, std::memory_order_seq_cst);

    if (auto* chain = activeChain_.load(std::memory_order_seq_cst)) {
        for (const auto& node : *chain) {
            if (node.enabled && node.processor) {
                node.processor->process(channels, channelCount, numSamples);
            }
        }
    }

    // Exit critical section
    processing_.store(false, std::memory_order_seq_cst);
}

void DSPChain::process(const float* const* inputChannels, float* const* outputChannels, int channelCount, int numSamples) noexcept {
    if (!prepared_ || numSamples <= 0 || channelCount <= 0 || inputChannels == nullptr || outputChannels == nullptr)
        return;

    // First, safely copy input to output if they are distinct buffers.
    for (int c = 0; c < channelCount; ++c) {
        if (inputChannels[c] != nullptr && outputChannels[c] != nullptr && inputChannels[c] != outputChannels[c]) {
            std::copy(inputChannels[c], inputChannels[c] + numSamples, outputChannels[c]);
        }
    }

    // Then process the output buffer in-place.
    process(outputChannels, channelCount, numSamples);
}

bool DSPChain::addProcessor(std::shared_ptr<IDspProcessor> processor) {
    if (!processor) return false;

    std::lock_guard<std::mutex> lock(controlMutex_);

    auto* oldChain = activeChain_.load(std::memory_order_relaxed);
    auto* newChain = new std::vector<DSPNode>(*oldChain);

    newChain->push_back({processor, true});

    if (prepared_) {
        processor->prepare(sampleRate_, maxBlockSize_, channelCount_);
        processor->reset();
    }

    activeChain_.store(newChain, std::memory_order_release);

    while (processing_.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }

    delete oldChain;
    return true;
}

bool DSPChain::removeProcessor(const std::shared_ptr<IDspProcessor>& processor) {
    if (!processor) return false;

    std::lock_guard<std::mutex> lock(controlMutex_);

    auto* oldChain = activeChain_.load(std::memory_order_relaxed);
    auto* newChain = new std::vector<DSPNode>(*oldChain);

    auto it = std::remove_if(newChain->begin(), newChain->end(),
        [&processor](const DSPNode& node) { return node.processor == processor; });

    if (it == newChain->end()) {
        delete newChain;
        return false;
    }

    newChain->erase(it, newChain->end());

    activeChain_.store(newChain, std::memory_order_release);

    while (processing_.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }

    // Call release on the removed processor since it's disconnected
    processor->release();

    delete oldChain;
    return true;
}

bool DSPChain::setProcessorEnabled(const std::shared_ptr<IDspProcessor>& processor, bool enabled) {
    if (!processor) return false;

    std::lock_guard<std::mutex> lock(controlMutex_);

    auto* oldChain = activeChain_.load(std::memory_order_relaxed);
    auto* newChain = new std::vector<DSPNode>(*oldChain);

    bool found = false;
    for (auto& node : *newChain) {
        if (node.processor == processor) {
            node.enabled = enabled;
            found = true;
        }
    }

    if (!found) {
        delete newChain;
        return false;
    }

    activeChain_.store(newChain, std::memory_order_release);

    while (processing_.load(std::memory_order_acquire)) {
        std::this_thread::yield();
    }

    delete oldChain;
    return true;
}

bool DSPChain::isProcessorEnabled(const std::shared_ptr<IDspProcessor>& processor) const {
    if (!processor) return false;

    std::lock_guard<std::mutex> lock(controlMutex_);
    if (auto* chain = activeChain_.load(std::memory_order_relaxed)) {
        for (const auto& node : *chain) {
            if (node.processor == processor) {
                return node.enabled;
            }
        }
    }
    return false;
}

} // namespace melodymeet
