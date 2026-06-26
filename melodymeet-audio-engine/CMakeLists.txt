cmake_minimum_required(VERSION 3.22)

project(MelodyMeetAudioEngine VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(JUCE CONFIG REQUIRED)

file(GLOB_RECURSE SOURCE_FILES "src/*.cpp")
list(REMOVE_ITEM SOURCE_FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/main/main.cpp")

add_library(MelodyMeetEngineLibrary STATIC ${SOURCE_FILES})

target_include_directories(MelodyMeetEngineLibrary PUBLIC
    src
)

target_link_libraries(MelodyMeetEngineLibrary PUBLIC
    juce::juce_core
    juce::juce_audio_basics
    juce::juce_events
    juce::juce_audio_devices
    juce::juce_audio_formats
    juce::juce_dsp
)

# Main executable
add_executable(MelodyMeetAudioEngine src/main/main.cpp)
target_link_libraries(MelodyMeetAudioEngine PRIVATE MelodyMeetEngineLibrary)

# Example Application
add_executable(PlaybackExample examples/PlaybackExample/main.cpp)
target_link_libraries(PlaybackExample PRIVATE MelodyMeetEngineLibrary)
