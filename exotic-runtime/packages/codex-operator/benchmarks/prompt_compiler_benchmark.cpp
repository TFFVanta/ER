#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <iostream>

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;

    Runtime runtime;
    StructuredLogger logger{LogLevel::Error};
    MetricsCollector metrics{"prompt-benchmark"};
    PromptCompiler compiler{runtime, logger, metrics};

    PromptCompilerInput input;
    input.objective = {"benchmark-objective", "Benchmark prompt compiler", "Measure prompt compile throughput", "packages/codex-operator", PromptTemplateKind::Performance, {}, {}, true};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/benchmark";
    input.repository_state.files.reserve(200);
    for (int index = 0; index < 200; ++index) {
        input.repository_state.files.push_back({std::filesystem::path("packages/codex-operator/src/file" + std::to_string(index) + ".cpp"), false, false, false, 256});
    }
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"cmake"};
    input.canon = {{"architecture", "Keep prompts deterministic.", {"always"}}};
    input.build_status = {true, "passed", {}};
    input.test_results = {true, {}, "passed"};
    input.constraints.maximum_file_count = 32;
    input.constraints.maximum_token_budget = 8000;
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 250; ++index) {
        input.objective.id = "benchmark-objective-" + std::to_string(index);
        (void)compiler.compile(input);
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "compiled_prompts=250\n";
    return 0;
}
