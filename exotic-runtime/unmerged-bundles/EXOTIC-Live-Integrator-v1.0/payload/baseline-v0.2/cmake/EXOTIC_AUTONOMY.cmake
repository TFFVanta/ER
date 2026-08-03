find_package(SQLite3 REQUIRED)
add_library(exotic_autonomy
 src/exotic/autonomy/decision_gate.cpp
 src/exotic/autonomy/autonomy_kernel.cpp
 src/exotic/autonomy/persistence/database.cpp
 src/exotic/autonomy/persistence/transaction.cpp
 src/exotic/autonomy/persistence/migrations.cpp
 src/exotic/autonomy/persistence/sqlite_repository.cpp
 src/exotic/autonomy/persistence/recovery_manager.cpp)
target_include_directories(exotic_autonomy PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src)
target_compile_features(exotic_autonomy PUBLIC cxx_std_20)
target_link_libraries(exotic_autonomy PRIVATE SQLite::SQLite3)
if(MSVC)
 target_compile_options(exotic_autonomy PRIVATE /W4 /permissive-)
else()
 target_compile_options(exotic_autonomy PRIVATE -Wall -Wextra -Wpedantic)
endif()
add_executable(exotic_autonomy_persistence_tests tests/autonomy/autonomy_persistence_tests.cpp)
target_link_libraries(exotic_autonomy_persistence_tests PRIVATE exotic_autonomy)
target_compile_features(exotic_autonomy_persistence_tests PRIVATE cxx_std_20)
add_test(NAME exotic.autonomy.persistence COMMAND exotic_autonomy_persistence_tests)
