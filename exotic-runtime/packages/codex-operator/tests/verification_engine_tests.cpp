#include "exotic/codex_operator/operator.hpp"

#include <cassert>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(std::string objective_id) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        std::move(objective_id),
        "Verify autonomous execution",
        "Collect deterministic evidence and verify outputs",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/verification-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/verification/verification_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/docs/verification-architecture.md"), false, true, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "worker-runtime"};
    input.existing_architecture = "SessionEngine owns execution and VerificationEngine validates evidence.";
    input.canon = {{"testing", "Verification must remain deterministic.", {"testing"}}};
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"verification_engine_tests"};
    input.constraints.required_documentation = {"verification-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

} // namespace

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    try {
        Runtime runtime;
        auto sink = std::make_shared<MemoryLogSink>();
        auto package = std::make_unique<CodexOperatorPackage>(
            runtime,
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-verification-state"),
            sink);
        auto session_engine = package->create_session_engine();
        auto verification_engine = package->create_verification_engine(*session_engine);
        assert(verification_engine != nullptr);

        const auto session = session_engine->create_session(make_input("objective.verification.1"));
        const auto run_results = session_engine->run_session(session.id);
        assert(run_results.size() == 1);
        assert(run_results.front().success);

        verification_engine->record_evidence({"evidence.test", session.id, EvidenceKind::TestResult, "verification_engine_tests passed", {"verification_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs", session.id, EvidenceKind::Documentation, "verification-architecture.md updated", {"verification-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build", session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review", session.id, EvidenceKind::Review, "review completed", {}, {}, Clock::now()});

        const auto request = verification_engine->create_request(session.id);
        const auto result = verification_engine->verify(request.id);
        assert(result.status == VerificationStatus::Passed);
        assert(!result.evidence_ids.empty());
        assert(verification_engine->api().handle({"GET", "/verification-results"}).body.find("passed") != std::string::npos);

        const auto failed_session = session_engine->create_session(make_input("objective.verification.2"));
        const auto failed_request = verification_engine->create_request(failed_session.id);
        const auto failed_result = verification_engine->verify(failed_request.id);
        assert(failed_result.status == VerificationStatus::Failed);
        assert(!failed_result.violations.empty());

        const auto snapshot = verification_engine->snapshot();
        assert(snapshot.metrics.total_requests == 2);
        assert(snapshot.metrics.passed >= 1);
        assert(snapshot.metrics.failed >= 1);
        assert(snapshot.metrics.evidence_artifacts >= 4);
        assert(!snapshot.events.empty());
        assert(verification_engine->latest_result(session.id).has_value());
        assert(!sink->entries().empty());

        std::cout << "verification_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "verification_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
