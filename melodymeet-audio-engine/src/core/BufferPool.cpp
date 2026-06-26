#include "BufferPool.h"

namespace melodymeet {

// =============================================================================
// PooledBuffer
// =============================================================================

PooledBuffer::PooledBuffer(juce::AudioBuffer<float>* buffer, BufferPool* pool) noexcept
    : buffer_(buffer), pool_(pool) {}

PooledBuffer::~PooledBuffer() {
    if (pool_ != nullptr && buffer_ != nullptr) {
        pool_->releaseBuffer(buffer_);
    }
}

PooledBuffer::PooledBuffer(PooledBuffer&& other) noexcept
    : buffer_(other.buffer_), pool_(other.pool_) {
    other.buffer_ = nullptr;
    other.pool_ = nullptr;
}

PooledBuffer& PooledBuffer::operator=(PooledBuffer&& other) noexcept {
    if (this != &other) {
        if (pool_ != nullptr && buffer_ != nullptr) {
            pool_->releaseBuffer(buffer_);
        }
        buffer_ = other.buffer_;
        pool_ = other.pool_;
        other.buffer_ = nullptr;
        other.pool_ = nullptr;
    }
    return *this;
}

// =============================================================================
// BufferPool
// =============================================================================

void BufferPool::prepare(int capacity, int channels, int samples) {
    if (capacity <= 0 || channels <= 0 || samples <= 0)
        return;

    pool_.clear();
    pool_.resize(capacity);

    for (int i = 0; i < capacity; ++i) {
        pool_[i] = std::make_unique<BufferPoolEntry>();
        pool_[i]->buffer = std::make_unique<juce::AudioBuffer<float>>(channels, samples);
        pool_[i]->buffer->clear();
        pool_[i]->inUse.store(false, std::memory_order_relaxed);
    }

    capacity_ = capacity;
    channels_ = channels;
    samples_ = samples;
    prepared_ = true;
}

void BufferPool::release() noexcept {
    pool_.clear();
    capacity_ = 0;
    channels_ = 0;
    samples_ = 0;
    prepared_ = false;
}

PooledBuffer BufferPool::acquireBuffer() noexcept {
    if (!prepared_)
        return PooledBuffer{};

    for (int i = 0; i < capacity_; ++i) {
        bool expected = false;
        // memory_order_acquire ensures we see memory changes made by the previous owner before they released it
        if (pool_[i]->inUse.compare_exchange_strong(expected, true, std::memory_order_acquire, std::memory_order_relaxed)) {
            // Found a free buffer
            // Ensure the buffer data itself isn't stale, though usually audio code overwrites it immediately.
            return PooledBuffer{pool_[i]->buffer.get(), this};
        }
    }

    // Pool is exhausted
    return PooledBuffer{};
}

void BufferPool::releaseBuffer(juce::AudioBuffer<float>* buffer) noexcept {
    if (!prepared_ || buffer == nullptr)
        return;

    for (int i = 0; i < capacity_; ++i) {
        if (pool_[i]->buffer.get() == buffer) {
            // memory_order_release ensures our writes to the buffer are visible to the next acquiring thread
            pool_[i]->inUse.store(false, std::memory_order_release);
            return;
        }
    }
}

int BufferPool::getAvailableCount() const noexcept {
    if (!prepared_) return 0;

    int count = 0;
    for (int i = 0; i < capacity_; ++i) {
        if (!pool_[i]->inUse.load(std::memory_order_relaxed)) {
            count++;
        }
    }
    return count;
}

int BufferPool::getCapacity() const noexcept {
    return capacity_;
}

} // namespace melodymeet
