#pragma once

// =============================================================================
// RtLogger — lock-free, allocation-free real-time safe logger
// =============================================================================
//
// Design:
//   - Fixed-size ring buffer of pre-allocated message slots.
//   - Audio thread writes by claiming a slot via atomic fetch_add, then fills
//     it and marks it ready — zero locks, zero heap allocations.
//   - A background thread (or polling from any non-RT context) drains the
//     buffer and forwards messages to std::cout.
//   - If the ring fills up (drain is too slow) the audio thread's write is
//     silently dropped — preferable to blocking or allocating.
//
// Usage from RT code:
//   RtLogger::get().log("[DECK PEAK] pos=1.234 peak=0.88");
//
// Drain call (from any non-RT thread, e.g. the engine statistics poll):
//   RtLogger::get().drain();   // prints everything accumulated since last drain

#include <array>
#include <atomic>
#include <cstring>
#include <iostream>
#include <string_view>

namespace melodymeet {

class RtLogger final {
public:
    // Maximum number of characters per log entry (including null terminator).
    static constexpr std::size_t kMaxMsgLen  = 256;
    // Number of slots in the ring buffer.
    // At 44100 Hz / 512 samples, the audio thread fires ~86 times/second.
    // Logging every 100 blocks = ~1 log/sec. 128 slots gives ~128 seconds
    // of buffer depth before overflow — more than enough for any drain cycle.
    static constexpr std::size_t kRingSize   = 128;

    static RtLogger& get() noexcept {
        static RtLogger instance;
        return instance;
    }

    // ── Audio-thread API (RT safe) ──────────────────────────────────────────

    /// Enqueue a message. Returns false and drops silently if the ring is full.
    bool log(std::string_view msg) noexcept {
        // Claim the next write slot.
        const std::size_t writeIdx = writeHead_.fetch_add(1, std::memory_order_relaxed);
        const std::size_t slot     = writeIdx & kRingMask;

        // Check if the slot is still occupied by an unread message.
        // If ready_[slot] is true, the drain hasn't caught up — drop the msg.
        if (slots_[slot].ready.load(std::memory_order_acquire)) {
            // Ring full — silent drop (we already incremented writeHead_,
            // which is fine; drain will clear the slot and the next log call
            // for this slot index will succeed).
            return false;
        }

        // Copy the message into the slot (bounded, no allocation).
        const std::size_t len = std::min(msg.size(), kMaxMsgLen - 1);
        std::memcpy(slots_[slot].text, msg.data(), len);
        slots_[slot].text[len] = '\0';

        // Publish the slot.
        slots_[slot].ready.store(true, std::memory_order_release);
        return true;
    }

    // ── Non-RT drain API ────────────────────────────────────────────────────

    /// Drain all pending messages to stdout. Call this from a non-RT thread
    /// (e.g. the engine health poll, a timer, or a dedicated drain thread).
    void drain() noexcept {
        for (std::size_t i = 0; i < kRingSize; ++i) {
            if (slots_[i].ready.load(std::memory_order_acquire)) {
                std::cout << slots_[i].text << '\n';
                slots_[i].ready.store(false, std::memory_order_release);
            }
        }
    }

private:
    RtLogger() = default;

    static constexpr std::size_t kRingMask = kRingSize - 1;
    static_assert((kRingSize & kRingMask) == 0, "kRingSize must be a power of two");

    struct Slot {
        std::atomic<bool> ready{false};
        char text[kMaxMsgLen]{};
    };

    std::array<Slot, kRingSize> slots_{};
    std::atomic<std::size_t> writeHead_{0};
};

// ── Convenience macro ────────────────────────────────────────────────────────
// RT_LOG(msg) — zero-cost when MELODYMEET_RT_LOGGING is not defined.
// Always safe to call from the audio thread.
#ifdef MELODYMEET_RT_LOGGING
  #define RT_LOG(msg) ::melodymeet::RtLogger::get().log(msg)
#else
  #define RT_LOG(msg) ((void)0)
#endif

} // namespace melodymeet
