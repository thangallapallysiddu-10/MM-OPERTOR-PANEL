#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include <atomic>
#include <memory>
#include <vector>

namespace melodymeet {

/// Forward declaration.
class BufferPool;

struct BufferPoolEntry {
    std::unique_ptr<juce::AudioBuffer<float>> buffer;
    std::atomic<bool> inUse{false};
};

/// RAII wrapper for an acquired buffer. Automatically releases it back
/// to the pool upon destruction.
class PooledBuffer {
public:
    PooledBuffer() = default;
    PooledBuffer(juce::AudioBuffer<float>* buffer, BufferPool* pool) noexcept;
    ~PooledBuffer();

    PooledBuffer(const PooledBuffer&) = delete;
    PooledBuffer& operator=(const PooledBuffer&) = delete;

    PooledBuffer(PooledBuffer&& other) noexcept;
    PooledBuffer& operator=(PooledBuffer&& other) noexcept;

    juce::AudioBuffer<float>* get() const noexcept { return buffer_; }
    juce::AudioBuffer<float>* operator->() const noexcept { return buffer_; }

    bool isValid() const noexcept { return buffer_ != nullptr; }

private:
    juce::AudioBuffer<float>* buffer_{nullptr};
    BufferPool* pool_{nullptr};
};

/// A fixed-capacity, lock-free pool of audio buffers.
/// Designed to provide temporary scratch buffers to the playback, mixer,
/// and DSP subsystems without triggering heap allocations on the audio thread.
class BufferPool final {
public:
    BufferPool() = default;
    ~BufferPool() = default;

    BufferPool(const BufferPool&) = delete;
    BufferPool& operator=(const BufferPool&) = delete;

    /// Pre-allocates the fixed-capacity pool.
    /// MUST be called from the control thread during engine initialization.
    /// @param capacity The number of buffers to pre-allocate.
    /// @param channels The number of channels per buffer.
    /// @param samples The maximum number of samples per buffer.
    void prepare(int capacity, int channels, int samples);

    /// Releases all pre-allocated memory.
    /// MUST be called from the control thread when the engine shuts down.
    void release() noexcept;

    /// Attempts to acquire a free buffer from the pool.
    /// Lock-free and real-time safe.
    /// @return A RAII PooledBuffer object. If the pool is exhausted, isValid() will be false.
    PooledBuffer acquireBuffer() noexcept;

    /// Returns a buffer back to the pool.
    /// Lock-free and real-time safe. Normally called automatically by ~PooledBuffer.
    void releaseBuffer(juce::AudioBuffer<float>* buffer) noexcept;

    /// Returns the number of buffers currently available.
    int getAvailableCount() const noexcept;

    /// Returns the total capacity of the pool.
    int getCapacity() const noexcept;

private:
    std::vector<std::unique_ptr<BufferPoolEntry>> pool_;
    int capacity_{0};
    int channels_{0};
    int samples_{0};
    bool prepared_{false};
};

} // namespace melodymeet
