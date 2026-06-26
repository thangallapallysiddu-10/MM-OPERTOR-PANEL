cmake_minimum_required(VERSION 3.22)

project(melodymeet_addon VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── cmake-js integration ────────────────────────────────────────────────────
# cmake-js passes these variables automatically:
#   CMAKE_JS_INC  — Node.js / N-API include dirs
#   CMAKE_JS_LIB  — node.lib for linking on Windows
#   CMAKE_JS_SRC  — (unused, we use node-addon-api)

# ── Resolve node-addon-api headers ──────────────────────────────────────────
# cmake-js sets CMAKE_JS_NODEADDON_API_DIR when node-addon-api is installed
if(DEFINED CMAKE_JS_NODEADDON_API_DIR)
    set(NODE_ADDON_API_DIR "${CMAKE_JS_NODEADDON_API_DIR}")
else()
    # Fallback: resolve from node_modules
    execute_process(
        COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../.."
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    # Strip surrounding quotes if present
    string(REPLACE "\"" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")
endif()

message(STATUS "node-addon-api include dir: ${NODE_ADDON_API_DIR}")

# ── Resolve the MelodyMeet Audio Engine ─────────────────────────────────────
# The engine lives at the repository root, outside the Melody_meet directory.
set(ENGINE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../../melodymeet-audio-engine")
get_filename_component(ENGINE_ROOT "${ENGINE_ROOT}" ABSOLUTE)

message(STATUS "MelodyMeet Audio Engine root: ${ENGINE_ROOT}")

# ── Build the engine as a static library (controlled source list) ───────────
# Instead of add_subdirectory() on the engine's CMakeLists.txt (which GLOBs
# all sources including EngineHost.cpp that depends on unimplemented subsystems),
# we build only the engine sources that AudioBridge actually needs.
file(GLOB_RECURSE ENGINE_SOURCE_FILES "${ENGINE_ROOT}/src/*.cpp")

# Exclude files we don't need:
#   - main.cpp          : standalone executable entry point
#   - EngineHost.cpp    : depends on command/event/state subsystems not yet implemented
list(FILTER ENGINE_SOURCE_FILES EXCLUDE REGEX "src/main/main\\.cpp$")
list(FILTER ENGINE_SOURCE_FILES EXCLUDE REGEX "EngineHost\\.cpp$")

add_library(MelodyMeetEngineLibrary STATIC ${ENGINE_SOURCE_FILES})

target_include_directories(MelodyMeetEngineLibrary PUBLIC
    "${ENGINE_ROOT}/src"
)

# Find JUCE via vcpkg
find_package(JUCE CONFIG REQUIRED)

target_link_libraries(MelodyMeetEngineLibrary PUBLIC
    juce::juce_core
    juce::juce_audio_basics
    juce::juce_events
    juce::juce_audio_devices
    juce::juce_audio_formats
    juce::juce_dsp
)

# Force the engine library to use the DLL runtime (MD) to match the addon and Node.js
set_target_properties(MelodyMeetEngineLibrary PROPERTIES
    MSVC_RUNTIME_LIBRARY "MultiThreadedDLL"
)

# ── Build the native addon shared library ───────────────────────────────────
add_library(${PROJECT_NAME} SHARED
    addon.cpp
    AudioBridge.cpp
    AudioBridge.h
    ${CMAKE_JS_SRC}
)

# N-API / cmake-js / node-addon-api headers
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    ${NODE_ADDON_API_DIR}
)

# Link against the engine static library and Node.js
target_link_libraries(${PROJECT_NAME} PRIVATE
    MelodyMeetEngineLibrary
    ${CMAKE_JS_LIB}
)

# Use Node-API (not legacy NAN)
target_compile_definitions(${PROJECT_NAME} PRIVATE
    NAPI_VERSION=8
    NODE_ADDON_API_DISABLE_DEPRECATED
    BUILDING_NODE_EXTENSION
)

# Output as .node (required by Node.js require())
set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    # Ensure MSVC uses the same runtime as Node.js (dynamic CRT)
    MSVC_RUNTIME_LIBRARY "MultiThreadedDLL"
)
