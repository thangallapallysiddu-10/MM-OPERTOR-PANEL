#pragma once

#include "../command/CommandManager.h"
#include "../core/Configuration.h"
#include "../core/Logger.h"
#include "../core/Version.h"
#include "../event/EventManager.h"
#include "../state/StateManager.h"
#include "AudioEngine.h"

namespace melodymeet
{

class EngineHost
{
public:
    EngineHost();

    bool initialize();

    void shutdown();

private:
    Logger logger;
    Configuration configuration;
    Version version;
    CommandManager commandManager;
    EventManager eventManager;
    StateManager stateManager;
    AudioEngine audioEngine;
};

} // namespace melodymeet
