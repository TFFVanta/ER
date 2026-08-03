find_package(SQLite3 REQUIRED)

add_library(exotic_resources
    src/exotic/autonomy/resources/types.cpp
    src/exotic/autonomy/resources/in_memory_repository.cpp
    src/exotic/autonomy/resources/sqlite_repository.cpp
    src/exotic/autonomy/resources/governance_approval.cpp
    src/exotic/autonomy/resources/forecast.cpp
    src/exotic/autonomy/resources/anomaly.cpp
    src/exotic/autonomy/resources/circuit_breaker.cpp
    src/exotic/autonomy/resources/governor.cpp
    src/exotic/autonomy/resources/recovery.cpp
    src/exotic/autonomy/resources/scheduler_bridge.cpp
    src/exotic/autonomy/resources/cli.cpp
)

target_include_directories(exotic_resources
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_features(exotic_resources PUBLIC cxx_std_20)

target_link_libraries(exotic_resources
    PUBLIC
        exotic_autonomy
        exotic_scheduler
        exotic_governance
    PRIVATE
        SQLite::SQLite3
)

if(MSVC)
    target_compile_options(exotic_resources PRIVATE /W4 /permissive-)
else()
    target_compile_options(exotic_resources PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_executable(exotic_resource_vector_tests
    tests/autonomy/resource_vector_tests.cpp
)
target_link_libraries(exotic_resource_vector_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.vector COMMAND exotic_resource_vector_tests)

add_executable(exotic_resource_governor_tests
    tests/autonomy/resource_governor_tests.cpp
)
target_link_libraries(exotic_resource_governor_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.governor COMMAND exotic_resource_governor_tests)

add_executable(exotic_resource_recovery_tests
    tests/autonomy/resource_recovery_tests.cpp
)
target_link_libraries(exotic_resource_recovery_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.recovery COMMAND exotic_resource_recovery_tests)

add_executable(exotic_resource_bridge_tests
    tests/autonomy/resource_bridge_tests.cpp
)
target_link_libraries(exotic_resource_bridge_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.scheduler_bridge COMMAND exotic_resource_bridge_tests)

add_executable(exotic_sqlite_resource_tests
    tests/autonomy/sqlite_resource_tests.cpp
)
target_link_libraries(exotic_sqlite_resource_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.sqlite COMMAND exotic_sqlite_resource_tests)

add_executable(exotic_governance_resource_integration_tests
    tests/autonomy/governance_resource_integration_tests.cpp
)
target_link_libraries(exotic_governance_resource_integration_tests PRIVATE exotic_resources)
add_test(NAME exotic.resources.governance_integration COMMAND exotic_governance_resource_integration_tests)
