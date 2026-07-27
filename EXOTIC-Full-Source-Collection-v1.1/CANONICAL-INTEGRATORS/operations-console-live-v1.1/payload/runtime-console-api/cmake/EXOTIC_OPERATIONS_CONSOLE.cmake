option(EXOTIC_OPERATIONS_CONSOLE_BUILD_API "Build the local EXOTIC Operations Console API" ON)

if(EXOTIC_OPERATIONS_CONSOLE_BUILD_API)
    if(NOT TARGET exotic_continuous_operations)
        message(FATAL_ERROR
            "EXOTIC Operations Console requires target exotic_continuous_operations. "
            "Include EXOTIC_RUNTIME.cmake before EXOTIC_OPERATIONS_CONSOLE.cmake."
        )
    endif()

    if(NOT TARGET exotic_governance)
        message(FATAL_ERROR
            "EXOTIC Operations Console requires target exotic_governance."
        )
    endif()

    if(NOT TARGET SQLite::SQLite3)
        find_package(SQLite3 REQUIRED)
    endif()

    add_library(exotic_operations_console_api
        src/exotic/operations_console/api_server.cpp
    )

    target_include_directories(exotic_operations_console_api
        PUBLIC
            ${CMAKE_CURRENT_SOURCE_DIR}/src
    )

    target_compile_features(exotic_operations_console_api PUBLIC cxx_std_20)

    target_link_libraries(exotic_operations_console_api
        PUBLIC
            exotic_continuous_operations
            exotic_governance
            SQLite::SQLite3
    )

    if(WIN32)
        target_link_libraries(exotic_operations_console_api PRIVATE ws2_32)
    endif()

    if(MSVC)
        target_compile_options(exotic_operations_console_api PRIVATE /W4 /permissive-)
    else()
        target_compile_options(exotic_operations_console_api PRIVATE -Wall -Wextra -Wpedantic)
    endif()

    add_executable(exotic-console-api
        apps/exotic_console_api_main.cpp
    )
    target_link_libraries(exotic-console-api PRIVATE exotic_operations_console_api)
    target_compile_features(exotic-console-api PRIVATE cxx_std_20)
endif()
