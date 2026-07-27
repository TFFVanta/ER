find_package(SQLite3 REQUIRED)

add_library(exotic_agents
    src/exotic/autonomy/agents/types.cpp
    src/exotic/autonomy/agents/in_memory_repository.cpp
    src/exotic/autonomy/agents/sqlite_repository.cpp
    src/exotic/autonomy/agents/taxonomy.cpp
    src/exotic/autonomy/agents/registry.cpp
    src/exotic/autonomy/agents/compatibility.cpp
    src/exotic/autonomy/agents/scoring.cpp
    src/exotic/autonomy/agents/router.cpp
    src/exotic/autonomy/agents/learning.cpp
    src/exotic/autonomy/agents/recovery.cpp
    src/exotic/autonomy/agents/execution_context.cpp
    src/exotic/autonomy/agents/scheduler_bridge.cpp
    src/exotic/autonomy/agents/cli.cpp
)

target_include_directories(exotic_agents
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_features(exotic_agents PUBLIC cxx_std_20)

target_link_libraries(exotic_agents
    PUBLIC
        exotic_autonomy
        exotic_scheduler
        exotic_governance
        exotic_resources
    PRIVATE
        SQLite::SQLite3
)

if(MSVC)
    target_compile_options(exotic_agents PRIVATE /W4 /permissive-)
else()
    target_compile_options(exotic_agents PRIVATE -Wall -Wextra -Wpedantic)
endif()

function(exotic_add_agent_test target source test_name)
    add_executable(${target} ${source})
    target_link_libraries(${target} PRIVATE exotic_agents)
    add_test(NAME ${test_name} COMMAND ${target})
endfunction()

exotic_add_agent_test(exotic_agent_registry_tests tests/autonomy/agent_registry_tests.cpp exotic.agents.registry)
exotic_add_agent_test(exotic_agent_routing_tests tests/autonomy/agent_routing_tests.cpp exotic.agents.routing)
exotic_add_agent_test(exotic_agent_team_tests tests/autonomy/agent_team_tests.cpp exotic.agents.team)
exotic_add_agent_test(exotic_agent_replacement_tests tests/autonomy/agent_replacement_tests.cpp exotic.agents.replacement)
exotic_add_agent_test(exotic_agent_learning_tests tests/autonomy/agent_learning_tests.cpp exotic.agents.learning)
exotic_add_agent_test(exotic_agent_recovery_tests tests/autonomy/agent_recovery_tests.cpp exotic.agents.recovery)
exotic_add_agent_test(exotic_sqlite_agent_tests tests/autonomy/sqlite_agent_tests.cpp exotic.agents.sqlite)
exotic_add_agent_test(exotic_agent_bridge_tests tests/autonomy/agent_bridge_tests.cpp exotic.agents.scheduler_bridge)
exotic_add_agent_test(exotic_agent_governance_compatibility_tests tests/autonomy/agent_governance_compatibility_tests.cpp exotic.agents.governance)
