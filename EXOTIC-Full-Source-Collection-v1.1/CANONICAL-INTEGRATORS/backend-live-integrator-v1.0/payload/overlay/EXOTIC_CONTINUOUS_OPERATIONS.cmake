option(EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP "Build the concrete v0.1-v0.6 production bootstrap" OFF)
option(EXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE "Build EXOTIC as a Windows service executable" OFF)
option(EXOTIC_RUNTIME_BUILD_CLI "Build the standalone EXOTIC runtime control CLI" ON)
add_library(exotic_continuous_operations
 src/exotic/runtime/types.cpp
 src/exotic/runtime/config.cpp
 src/exotic/runtime/workspace.cpp
 src/exotic/runtime/service_graph.cpp
 src/exotic/runtime/lifecycle.cpp
 src/exotic/runtime/in_memory_telemetry.cpp
 src/exotic/runtime/sqlite_telemetry.cpp
 src/exotic/runtime/telemetry.cpp
 src/exotic/runtime/dashboard.cpp
 src/exotic/runtime/failure_injection.cpp
 src/exotic/runtime/service_adapters.cpp
 src/exotic/runtime/emergency.cpp
 src/exotic/runtime/health_supervisor.cpp
 src/exotic/runtime/control_plane.cpp
 src/exotic/runtime/continuous_runtime.cpp
 src/exotic/runtime/cli.cpp
 src/exotic/runtime/windows_service.cpp
 src/exotic/runtime/root_cli_bridge.cpp)
target_include_directories(exotic_continuous_operations PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_features(exotic_continuous_operations PUBLIC cxx_std_20)
target_link_libraries(exotic_continuous_operations PUBLIC exotic_autonomy exotic_scheduler exotic_governance exotic_resources exotic_agents PRIVATE SQLite::SQLite3)
if(EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP)
 target_sources(exotic_continuous_operations PRIVATE src/exotic/runtime/full_stack_bootstrap.cpp)
 target_compile_definitions(exotic_continuous_operations PUBLIC EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=1)
endif()
if(MSVC)
 target_compile_options(exotic_continuous_operations PRIVATE /W4 /permissive-)
else()
 target_compile_options(exotic_continuous_operations PRIVATE -Wall -Wextra -Wpedantic)
endif()
function(exotic_add_runtime_test target source test_name)
 add_executable(${target} ${source})
 target_link_libraries(${target} PRIVATE exotic_continuous_operations)
 add_test(NAME ${test_name} COMMAND ${target})
endfunction()
exotic_add_runtime_test(exotic_runtime_service_graph_tests tests/runtime/service_graph_tests.cpp exotic.runtime.service_graph)
exotic_add_runtime_test(exotic_runtime_lifecycle_tests tests/runtime/lifecycle_tests.cpp exotic.runtime.lifecycle)
exotic_add_runtime_test(exotic_runtime_workspace_tests tests/runtime/workspace_tests.cpp exotic.runtime.workspace)
exotic_add_runtime_test(exotic_runtime_telemetry_tests tests/runtime/telemetry_tests.cpp exotic.runtime.telemetry)
exotic_add_runtime_test(exotic_runtime_failure_tests tests/runtime/failure_injection_tests.cpp exotic.runtime.failure_injection)
exotic_add_runtime_test(exotic_runtime_scheduler_integration_tests tests/runtime/scheduler_integration_tests.cpp exotic.runtime.scheduler_integration)
exotic_add_runtime_test(exotic_runtime_agent_stack_tests tests/runtime/agent_stack_integration_tests.cpp exotic.runtime.agent_stack)
exotic_add_runtime_test(exotic_runtime_soak_tests tests/runtime/soak_tests.cpp exotic.runtime.soak)

exotic_add_runtime_test(exotic_runtime_authority_scope_tests tests/runtime/authority_scope_tests.cpp exotic.runtime.authority_scope)

if(EXOTIC_RUNTIME_BUILD_CLI)
 add_executable(exotic-runtime-cli apps/exotic_runtime_cli_main.cpp)
 target_link_libraries(exotic-runtime-cli PRIVATE exotic_continuous_operations)
 target_compile_features(exotic-runtime-cli PRIVATE cxx_std_20)
endif()
if(EXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE)
 if(NOT EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP)
  message(FATAL_ERROR "Windows service requires EXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON")
 endif()
 add_executable(exotic-runtime-service apps/exotic_runtime_service_main.cpp)
 target_link_libraries(exotic-runtime-service PRIVATE exotic_continuous_operations)
 target_compile_features(exotic-runtime-service PRIVATE cxx_std_20)
endif()

option(EXOTIC_RUNTIME_BUILD_SMOKE "Build the live end-to-end simulation verifier" ON)
if(EXOTIC_RUNTIME_BUILD_SMOKE)
 add_executable(exotic-runtime-smoke apps/exotic_runtime_smoke_main.cpp)
 target_link_libraries(exotic-runtime-smoke PRIVATE exotic_continuous_operations)
 target_compile_features(exotic-runtime-smoke PRIVATE cxx_std_20)
endif()
if(TARGET exotic)
 target_link_libraries(exotic PRIVATE exotic_continuous_operations)
endif()
