#include "PlaybackManager.h"

namespace melodymeet
{

PlaybackManager::PlaybackManager(BufferPool& bufferPool)
{
    deckA_ = std::make_shared<DeckPlayer>(bufferPool);
    deckB_ = std::make_shared<DeckPlayer>(bufferPool);
}

std::shared_ptr<DeckPlayer> PlaybackManager::getDeckA() const
{
    return deckA_;
}

std::shared_ptr<DeckPlayer> PlaybackManager::getDeckB() const
{
    return deckB_;
}

DeckPlayer* PlaybackManager::getDeckById(const std::string& deckId) const
{
    if (deckId == "A") return deckA_.get();
    if (deckId == "B") return deckB_.get();
    return nullptr;
}

} // namespace melodymeet
