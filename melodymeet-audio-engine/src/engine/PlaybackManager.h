#pragma once

#include "../deck/DeckPlayer.h"
#include <memory>
#include <string>

namespace melodymeet
{

class BufferPool;

class PlaybackManager
{
public:
    explicit PlaybackManager(BufferPool& bufferPool);
    ~PlaybackManager() = default;

    PlaybackManager(const PlaybackManager&) = delete;
    PlaybackManager& operator=(const PlaybackManager&) = delete;

    std::shared_ptr<DeckPlayer> getDeckA() const;
    std::shared_ptr<DeckPlayer> getDeckB() const;

    DeckPlayer* getDeckById(const std::string& deckId) const;

private:
    std::shared_ptr<DeckPlayer> deckA_;
    std::shared_ptr<DeckPlayer> deckB_;
};

} // namespace melodymeet
