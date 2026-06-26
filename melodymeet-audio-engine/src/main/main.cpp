// main.cpp
#include "engine/EngineHost.h"
#include "engine/AudioEngine.h"

#include <iostream>

int main()
{
    melodymeet::EngineHost engine;

    if (!engine.initialize())
    {
        std::cerr << "Failed to initialize engine.\n";
        return -1;
    }

    std::cout << "\nMelodyMeet Audio Engine is running.\n";
    std::cout << "Press ENTER to exit...\n";

    std::cin.get();

    engine.shutdown();

    return 0;
}