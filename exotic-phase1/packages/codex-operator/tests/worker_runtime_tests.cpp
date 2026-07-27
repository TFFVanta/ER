#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <cassert>
#include <iostream>

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;

    try {
        Runtime runtime;
        auto sink = std::make_shared<MemoryLogSink>();
        StructuredLogger logger{LogLevel::Trace};
        logger.add_sink(sink);
        MetricsCollector metrics{"worker-runtime-tests"};

        WorkerRuntime worker_runtime{runtime, logger, metrics};
        worker_runtime.register_default_workers();

        auto snapshot = worker_runtime.snapshot();
        assert(snapshot.workers.size() >= 14);

        WorkerAssignment feature_assignment;
        feature_assignment.id = "assignment-feature";
        feature_assignment.objective = {
            "objective.feature",
            "Implement feature",
            "Add worker runtime feature support",
            "packages/codex-operator",
            PromptTemplateKind::FeatureImplementation,
            {},
            {},
            true
        };
        feature_assignment.prompt.prompt = "feature prompt";
        feature_assignment.prompt.checksum = "abc123";
        worker_runtime.submit(feature_assignment);

        WorkerAssignment test_assignment;
        test_assignment.id = "assignment-test";
        test_assignment.objective = {
            "objective.test",
            "Add tests",
            "Add worker runtime tests",
            "packages/codex-operator",
            PromptTemplateKind::Testing,
            {},
            {},
            true
        };
        test_assignment.prompt.prompt = "test prompt";
        test_assignment.prompt.checksum = "def456";
        worker_runtime.submit(test_assignment);

        const auto sequential_results = worker_runtime.execute_all(ExecutionMode::Sequential);
        assert(sequential_results.size() == 2);
        assert(std::all_of(sequential_results.begin(), sequential_results.end(), [](const WorkerResult& result) {
            return result.success;
        }));

        auto api = worker_runtime.api();
        assert(api.handle({"GET", "/workers"}).status == 200);
        assert(api.handle({"GET", "/metrics"}).body.find("success_count") != std::string::npos);

        WorkerRegistration flaky_registration;
        flaky_registration.id = "flaky-builder";
        flaky_registration.kind = WorkerKind::Builder;
        flaky_registration.version = "1.0.0";
        flaky_registration.capabilities.supported_objective_types = {PromptTemplateKind::BugFix};
        flaky_registration.capabilities.maximum_concurrency = 1;
        flaky_registration.capabilities.reliability_score = 0.2;
        flaky_registration.trust_score = 0.4;

        int failures_remaining = 3;
        worker_runtime.register_worker(std::make_shared<CallbackWorker>(flaky_registration, [&](const WorkerAssignment& assignment) {
            WorkerResult result;
            result.assignment_id = assignment.id;
            result.worker_id = "flaky-builder";
            result.success = failures_remaining-- <= 0;
            result.summary = result.success ? "recovered" : "failed";
            result.duration = std::chrono::milliseconds(5);
            return result;
        }));

        WorkerAssignment failing_assignment;
        failing_assignment.id = "assignment-failing";
        failing_assignment.objective = {
            "objective.bugfix",
            "Fix bug",
            "Exercise retry and quarantine",
            "packages/codex-operator",
            PromptTemplateKind::BugFix,
            {},
            {},
            true
        };
        failing_assignment.prompt.prompt = "bugfix prompt";
        failing_assignment.prompt.checksum = "ghi789";
        worker_runtime.submit(failing_assignment);

        const auto failure_results = worker_runtime.execute_all(ExecutionMode::DependencyAware);
        assert(!failure_results.empty());
        const auto states = worker_runtime.snapshot().states;
        const auto flaky_state = std::find_if(states.begin(), states.end(), [](const WorkerState& state) {
            return state.worker_id == "flaky-builder";
        });
        assert(flaky_state != states.end());
        assert(flaky_state->health == WorkerHealthStatus::Quarantined);

        WorkerAssignment parallel_assignment_a = feature_assignment;
        parallel_assignment_a.id = "assignment-parallel-a";
        WorkerAssignment parallel_assignment_b = feature_assignment;
        parallel_assignment_b.id = "assignment-parallel-b";
        worker_runtime.submit(parallel_assignment_a);
        worker_runtime.submit(parallel_assignment_b);
        const auto parallel_results = worker_runtime.execute_all(ExecutionMode::Parallel);
        assert(parallel_results.size() == 2);

        worker_runtime.pause();
        WorkerAssignment paused_assignment = feature_assignment;
        paused_assignment.id = "assignment-paused";
        worker_runtime.submit(paused_assignment);
        const auto paused_result = worker_runtime.execute_next();
        assert(!paused_result.success);
        worker_runtime.resume();
        const auto resumed_result = worker_runtime.execute_next();
        assert(resumed_result.success);

        assert(!sink->entries().empty());
        std::cout << "worker_runtime_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "worker_runtime_tests failure: " << error.what() << '\n';
        return 1;
    }
}
