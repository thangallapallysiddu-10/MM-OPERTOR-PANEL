#include "EngineHost.h"

namespace melodymeet
{

EngineHost::EngineHost() = default;

bool EngineHost::initialize()
{
    logger.info("======================================");
    logger.info(" MelodyMeet Audio Engine");
    logger.info(" Version " + version.toString());
    logger.info("======================================");

    logger.info("Initializing Engine...");

    if (!audioEngine.initialize())
    {
        logger.error("Failed to initialize Audio Engine.");
        return false;
    }

    logger.info("Engine Ready");


    return true;
}

void EngineHost::shutdown()
{
    logger.info("Shutting down engine...");

    audioEngine.shutdown();

    logger.info("Shutdown complete.");

}

} // namespace melodymeet
