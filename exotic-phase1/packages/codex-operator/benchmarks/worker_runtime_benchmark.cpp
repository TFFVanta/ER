#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <iostream>

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;

    Runtime runtime;
    StructuredLogger logger{LogLevel::Error};
    MetricsCollector metrics{"worker-runtime-benchmark"};
    WorkerRuntime worker_runtime{runtime, logger, metrics};
    worker_runtime.register_default_workers();

    for (int index = 0; index < 200; ++index) {
        WorkerAssignment assignment;
        assignment.id = "assignment-" + std::to_string(index);
        assignment.objective = {
            "objective-" + std::to_string(index),
            "Benchmark",
            "Benchmark worker runtime",
            "packages/codex-operator",
            index % 2 == 0 ? PromptTemplateKind::FeatureImplementation : PromptTemplateKind::Testing,
            {},
            {},
            true
        };
        assignment.prompt.prompt = "prompt";
        assignment.prompt.checksum = std::to_string(index);
        worker_runtime.submit(std::move(assignment));
    }

    const auto started = std::chrono::steady_clock::now();
    const auto results = worker_runtime.execute_all(ExecutionMode::Parallel);
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "results=" << results.size() << '\n';
    return results.size() == 200 ? 0 : 1;
}
