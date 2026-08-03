#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(int index) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        "benchmark-governance-" + std::to_string(index),
        "Benchmark governance engine",
        "Measure approval throughput",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/governance-benchmark";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/governance/governance_engine.cpp"), false, false, false, 4096}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine"};
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"governance_engine_tests"};
    input.constraints.required_documentation = {"governance-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
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
        OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-governance-benchmark"));
    auto session_engine = package->create_session_engine();
    auto verification_engine = package->create_verification_engine(*session_engine);
    auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 100; ++index) {
        const auto session = session_engine->create_session(make_input(index));
        (void)session_engine->run_session(session.id);
        verification_engine->record_evidence({"test-" + std::to_string(index), session.id, EvidenceKind::TestResult, "governance_engine_tests passed", {"governance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"doc-" + std::to_string(index), session.id, EvidenceKind::Documentation, "governance docs updated", {"governance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"build-" + std::to_string(index), session.id, EvidenceKind::BuildResult, "build configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"review-" + std::to_string(index), session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        const auto review = governance_engine->request_review(session.id);
        (void)governance_engine->approve(review.id, "approver-" + std::to_string(index), "approved");
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    const auto snapshot = governance_engine->snapshot();
    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "approved_reviews=" << snapshot.metrics.approved_reviews << '\n';
    return snapshot.metrics.approved_reviews == 100 ? 0 : 1;
}
