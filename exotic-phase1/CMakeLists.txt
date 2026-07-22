cmake_minimum_required(VERSION 3.20)
project(Exotic VERSION 0.4.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(EXOTIC_BUILD_TESTS "Build Exotic tests" ON)

add_library(exotic_core
    src/core/id.cpp
    src/core/value.cpp
    src/core/entity.cpp
    src/core/graph.cpp
    src/core/event_bus.cpp
    src/core/memory.cpp
    src/security/security.cpp
    src/engines/engines.cpp
    src/runtime/runtime.cpp
    src/platform/platform.cpp
    src/services/services.cpp
    src/portal/portal_server.cpp
)

target_include_directories(exotic_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_features(exotic_core PUBLIC cxx_std_20)

if(MSVC)
  target_compile_options(exotic_core PRIVATE /W4 /permissive-)
else()
  target_compile_options(exotic_core PRIVATE -Wall -Wextra -Wpedantic -Wconversion)
endif()

add_executable(exotic src/cli/main.cpp)
target_link_libraries(exotic PRIVATE exotic_core)

if(WIN32)
  target_link_libraries(exotic_core PRIVATE ws2_32)
endif()

if(EXOTIC_BUILD_TESTS)
  enable_testing()
  add_executable(exotic_tests tests/test_main.cpp)
  target_link_libraries(exotic_tests PRIVATE exotic_core)
  add_test(NAME exotic_tests COMMAND exotic_tests)
endif()

install(TARGETS exotic exotic_core)

# BEGIN EXOTIC CONTINUOUS OPERATIONS V1
# Managed by EXOTIC-Live-Integrator-v1.0. Keep this block after the main
# exotic executable target so it can link the runtime control bridge.
enable_testing()
if(NOT TARGET exotic_autonomy)
  include(cmake/EXOTIC_AUTONOMY.cmake)
endif()
if(NOT TARGET exotic_scheduler)
  include(cmake/EXOTIC_SCHEDULER.cmake)
endif()
if(NOT TARGET exotic_governance)
  include(cmake/EXOTIC_GOVERNANCE.cmake)
endif()
if(NOT TARGET exotic_resources)
  include(cmake/EXOTIC_RESOURCES.cmake)
endif()
if(NOT TARGET exotic_agents)
  include(cmake/EXOTIC_AGENTS.cmake)
endif()
if(NOT TARGET exotic_continuous_operations)
  include(cmake/EXOTIC_CONTINUOUS_OPERATIONS.cmake)
endif()
# END EXOTIC CONTINUOUS OPERATIONS V1
