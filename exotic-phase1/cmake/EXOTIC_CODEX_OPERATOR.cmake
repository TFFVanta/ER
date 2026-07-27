add_library(exotic_codex_operator
    packages/codex-operator/src/audit/compliance_engine.cpp
    packages/codex-operator/src/config/configuration.cpp
    packages/codex-operator/src/context/context_compiler.cpp
    packages/codex-operator/src/constraints/constraints_engine.cpp
    packages/codex-operator/src/canon/canon_selector.cpp
    packages/codex-operator/src/dispatcher/dispatcher.cpp
    packages/codex-operator/src/automation/policy_automation_engine.cpp
    packages/codex-operator/src/execution/execution_engine.cpp
    packages/codex-operator/src/evidence/evidence_store.cpp
    packages/codex-operator/src/governance/governance_engine.cpp
    packages/codex-operator/src/logging/logger.cpp
    packages/codex-operator/src/messaging/messaging.cpp
    packages/codex-operator/src/messaging/governance_events.cpp
    packages/codex-operator/src/messaging/audit_events.cpp
    packages/codex-operator/src/messaging/observability_events.cpp
    packages/codex-operator/src/messaging/session_events.cpp
    packages/codex-operator/src/messaging/verification_events.cpp
    packages/codex-operator/src/messaging/policy_automation_events.cpp
    packages/codex-operator/src/metrics/metrics.cpp
    packages/codex-operator/src/observability/observability_engine.cpp
    packages/codex-operator/src/prompt_compiler/prompt_compiler.cpp
    packages/codex-operator/src/coordination/worker_runtime_api.cpp
    packages/codex-operator/src/render/prompt_renderer.cpp
    packages/codex-operator/src/registry/worker_registry.cpp
    packages/codex-operator/src/repository/repository_analyzer.cpp
    packages/codex-operator/src/routing/routing.cpp
    packages/codex-operator/src/session/session_store.cpp
    packages/codex-operator/src/session_engine/session_engine.cpp
    packages/codex-operator/src/services/service_registry.cpp
    packages/codex-operator/src/state/state_store.cpp
    packages/codex-operator/src/verification/verification_engine.cpp
    packages/codex-operator/src/lifecycle/lifecycle_manager.cpp
    packages/codex-operator/src/plugins/plugin_registry.cpp
    packages/codex-operator/src/runtime/bootstrap.cpp
    packages/codex-operator/src/validation/prompt_validator.cpp
    packages/codex-operator/src/workers/default_workers.cpp
    packages/codex-operator/src/worker_runtime/worker_runtime.cpp
    packages/codex-operator/src/operator.cpp
)

target_include_directories(exotic_codex_operator
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/packages/codex-operator/include
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_features(exotic_codex_operator PUBLIC cxx_std_20)
target_link_libraries(exotic_codex_operator
    PUBLIC
        exotic_core
    PRIVATE
        exotic_continuous_operations
)

if(WIN32)
    target_link_libraries(exotic_codex_operator PRIVATE Psapi)
endif()

if(MSVC)
    target_compile_options(exotic_codex_operator PRIVATE /W4 /permissive-)
else()
    target_compile_options(exotic_codex_operator PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(EXOTIC_BUILD_TESTS)
    add_executable(exotic_codex_operator_tests packages/codex-operator/tests/codex_operator_tests.cpp)
    target_link_libraries(exotic_codex_operator_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator COMMAND exotic_codex_operator_tests)
    add_executable(exotic_codex_prompt_compiler_tests packages/codex-operator/tests/prompt_compiler_tests.cpp)
    target_link_libraries(exotic_codex_prompt_compiler_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.prompt_compiler COMMAND exotic_codex_prompt_compiler_tests)
    add_executable(exotic_codex_worker_runtime_tests packages/codex-operator/tests/worker_runtime_tests.cpp)
    target_link_libraries(exotic_codex_worker_runtime_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.worker_runtime COMMAND exotic_codex_worker_runtime_tests)
    add_executable(exotic_codex_session_engine_tests packages/codex-operator/tests/session_engine_tests.cpp)
    target_link_libraries(exotic_codex_session_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.session_engine COMMAND exotic_codex_session_engine_tests)
    add_executable(exotic_codex_verification_engine_tests packages/codex-operator/tests/verification_engine_tests.cpp)
    target_link_libraries(exotic_codex_verification_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.verification_engine COMMAND exotic_codex_verification_engine_tests)
    add_executable(exotic_codex_governance_engine_tests packages/codex-operator/tests/governance_engine_tests.cpp)
    target_link_libraries(exotic_codex_governance_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.governance_engine COMMAND exotic_codex_governance_engine_tests)
    add_executable(exotic_codex_policy_automation_engine_tests packages/codex-operator/tests/policy_automation_engine_tests.cpp)
    target_link_libraries(exotic_codex_policy_automation_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.policy_automation_engine COMMAND exotic_codex_policy_automation_engine_tests)
    add_executable(exotic_codex_compliance_engine_tests packages/codex-operator/tests/compliance_engine_tests.cpp)
    target_link_libraries(exotic_codex_compliance_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.compliance_engine COMMAND exotic_codex_compliance_engine_tests)
    add_executable(exotic_codex_observability_engine_tests packages/codex-operator/tests/observability_engine_tests.cpp)
    target_link_libraries(exotic_codex_observability_engine_tests PRIVATE exotic_codex_operator)
    add_test(NAME exotic.codex_operator.observability_engine COMMAND exotic_codex_observability_engine_tests)
endif()

add_executable(exotic_codex_operator_benchmark packages/codex-operator/benchmarks/codex_operator_benchmark.cpp)
target_link_libraries(exotic_codex_operator_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_prompt_compiler_benchmark packages/codex-operator/benchmarks/prompt_compiler_benchmark.cpp)
target_link_libraries(exotic_codex_prompt_compiler_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_worker_runtime_benchmark packages/codex-operator/benchmarks/worker_runtime_benchmark.cpp)
target_link_libraries(exotic_codex_worker_runtime_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_session_engine_benchmark packages/codex-operator/benchmarks/session_engine_benchmark.cpp)
target_link_libraries(exotic_codex_session_engine_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_verification_engine_benchmark packages/codex-operator/benchmarks/verification_engine_benchmark.cpp)
target_link_libraries(exotic_codex_verification_engine_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_governance_engine_benchmark packages/codex-operator/benchmarks/governance_engine_benchmark.cpp)
target_link_libraries(exotic_codex_governance_engine_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_policy_automation_engine_benchmark packages/codex-operator/benchmarks/policy_automation_engine_benchmark.cpp)
target_link_libraries(exotic_codex_policy_automation_engine_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_compliance_engine_benchmark packages/codex-operator/benchmarks/compliance_engine_benchmark.cpp)
target_link_libraries(exotic_codex_compliance_engine_benchmark PRIVATE exotic_codex_operator)
add_executable(exotic_codex_observability_engine_benchmark packages/codex-operator/benchmarks/observability_engine_benchmark.cpp)
target_link_libraries(exotic_codex_observability_engine_benchmark PRIVATE exotic_codex_operator)
