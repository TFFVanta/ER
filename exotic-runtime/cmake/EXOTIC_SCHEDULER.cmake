find_package(SQLite3 REQUIRED)

add_library(exotic_scheduler
    src/exotic/autonomy/scheduler/types.cpp
    src/exotic/autonomy/scheduler/retry.cpp
    src/exotic/autonomy/scheduler/condition.cpp
    src/exotic/autonomy/scheduler/sqlite_repository.cpp
    src/exotic/autonomy/scheduler/autonomy_bridge.cpp
    src/exotic/autonomy/scheduler/scheduler.cpp
    src/exotic/autonomy/scheduler/cli.cpp
)

target_include_directories(exotic_scheduler PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_features(exotic_scheduler PUBLIC cxx_std_20)
target_link_libraries(exotic_scheduler PUBLIC exotic_autonomy PRIVATE SQLite3::SQLite3)

if(MSVC)
  target_compile_options(exotic_scheduler PRIVATE /W4 /permissive-)
else()
  target_compile_options(exotic_scheduler PRIVATE -Wall -Wextra -Wpedantic)
endif()

add_executable(exotic_scheduler_tests tests/autonomy/scheduler_tests.cpp)
target_link_libraries(exotic_scheduler_tests PRIVATE exotic_scheduler)
add_test(NAME exotic.scheduler.core COMMAND exotic_scheduler_tests)

add_executable(exotic_retry_tests tests/autonomy/retry_tests.cpp)
target_link_libraries(exotic_retry_tests PRIVATE exotic_scheduler)
add_test(NAME exotic.scheduler.retry COMMAND exotic_retry_tests)

add_executable(exotic_condition_tests tests/autonomy/condition_tests.cpp)
target_link_libraries(exotic_condition_tests PRIVATE exotic_scheduler)
add_test(NAME exotic.scheduler.conditions COMMAND exotic_condition_tests)

add_executable(exotic_scheduler_recovery_tests tests/autonomy/recovery_scheduler_tests.cpp)
target_link_libraries(exotic_scheduler_recovery_tests PRIVATE exotic_scheduler)
add_test(NAME exotic.scheduler.recovery COMMAND exotic_scheduler_recovery_tests)
