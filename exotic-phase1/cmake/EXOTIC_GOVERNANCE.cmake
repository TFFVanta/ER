add_library(exotic_governance
 src/exotic/autonomy/governance/types.cpp
 src/exotic/autonomy/governance/sha256.cpp
 src/exotic/autonomy/governance/evaluator.cpp
 src/exotic/autonomy/governance/service.cpp
 src/exotic/autonomy/governance/sqlite_repository.cpp
 src/exotic/autonomy/governance/scheduler_bridge.cpp
 src/exotic/autonomy/governance/cli.cpp)
target_include_directories(exotic_governance PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_features(exotic_governance PUBLIC cxx_std_20)
target_link_libraries(exotic_governance PUBLIC exotic_autonomy exotic_scheduler SQLite3::SQLite3)
add_executable(exotic_governance_tests tests/autonomy/governance_tests.cpp)
target_link_libraries(exotic_governance_tests PRIVATE exotic_governance)
add_test(NAME exotic.governance COMMAND exotic_governance_tests)
