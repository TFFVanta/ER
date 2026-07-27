#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(int index) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        "benchmark-session-" + std::to_string(index),
        "Benchmark session engine",
        "Measure session orchestration throughput",
        "packages/codex-operator",
        index % 2 == 0 ? PromptTemplateKind::FeatureImplementation : PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/session-benchmark";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/session_engine/session_engine.cpp"), false, false, false, 4096}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "worker-runtime"};
    input.canon = {{"architecture", "Keep session orchestration deterministic.", {"always"}}};
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.maximum_file_count = 8;
    input.constraints.maximum_token_budget = 4000;
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    return input;
}

} // namespace

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    Runtime runtime;
    auto package = std::make_unique<CodexOperatorPackage>(
        runtime,
        OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-session-benchmark"));
    auto session_engine = package->create_session_engine();

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 100; ++index) {
        const auto session = session_engine->create_session(make_input(index));
        (void)session_engine->run_session(session.id);
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    const auto snapshot = session_engine->snapshot();
    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "completed_sessions=" << snapshot.metrics.completed_sessions << '\n';
    return snapshot.metrics.completed_sessions == 100 ? 0 : 1;
}
