#include "exotic/codex_operator/operator.hpp"

#include <cassert>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(std::string objective_id, bool approval_required = true) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        std::move(objective_id),
        "Govern autonomous delivery",
        "Apply approval policy after verification",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/governance-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/governance/governance_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/docs/governance-architecture.md"), false, true, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine"};
    input.existing_architecture = "GovernanceEngine consumes verification results and resolves session approvals.";
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"governance_engine_tests"};
    input.constraints.required_documentation = {"governance-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    input.constraints.approval_required = approval_required;
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
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-governance-state"),
            sink);
        auto session_engine = package->create_session_engine();
        auto verification_engine = package->create_verification_engine(*session_engine);
        auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);

        const auto session = session_engine->create_session(make_input("objective.governance.1", false));
        (void)session_engine->run_session(session.id);
        verification_engine->record_evidence({"evidence.test", session.id, EvidenceKind::TestResult, "governance_engine_tests passed", {"governance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs", session.id, EvidenceKind::Documentation, "governance-architecture.md updated", {"governance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build", session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review", session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});

        ApprovalPolicy policy;
        policy.id = "release-policy";
        policy.name = "Release Policy";
        policy.minimum_approvers = 1;
        const auto review = governance_engine->request_review(session.id, policy);
        const auto approved = governance_engine->approve(review.id, "lead-1", "ship it");
        assert(approved.decision == GovernanceDecision::Approved);
        assert(session_engine->find(session.id)->status == SessionStatus::Completed);
        assert(verification_engine->api().handle({"GET", "/evidence"}).body.find("approval") != std::string::npos);

        const auto rejected_session = session_engine->create_session(make_input("objective.governance.2", false));
        (void)session_engine->run_session(rejected_session.id);
        verification_engine->record_evidence({"evidence.test.2", rejected_session.id, EvidenceKind::TestResult, "governance_engine_tests passed", {"governance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs.2", rejected_session.id, EvidenceKind::Documentation, "governance-architecture.md updated", {"governance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build.2", rejected_session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review.2", rejected_session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        const auto rejected_review = governance_engine->request_review(rejected_session.id, policy);
        const auto rejected = governance_engine->reject(rejected_review.id, "lead-2", "hold release");
        assert(rejected.decision == GovernanceDecision::Rejected);
        assert(session_engine->find(rejected_session.id)->status == SessionStatus::Cancelled);

        const auto escalated_session = session_engine->create_session(make_input("objective.governance.3", false));
        (void)session_engine->run_session(escalated_session.id);
        verification_engine->record_evidence({"evidence.test.3", escalated_session.id, EvidenceKind::TestResult, "governance_engine_tests passed", {"governance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs.3", escalated_session.id, EvidenceKind::Documentation, "governance-architecture.md updated", {"governance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build.3", escalated_session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review.3", escalated_session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        const auto escalated_review = governance_engine->request_review(escalated_session.id, policy);
        const auto escalated = governance_engine->escalate(escalated_review.id, "needs executive review");
        assert(escalated.decision == GovernanceDecision::Escalated);

        const auto snapshot = governance_engine->snapshot();
        assert(snapshot.metrics.total_reviews == 3);
        assert(snapshot.metrics.approved_reviews >= 1);
        assert(snapshot.metrics.rejected_reviews >= 1);
        assert(snapshot.metrics.escalated_reviews >= 1);
        assert(!snapshot.events.empty());
        assert(governance_engine->api().handle({"GET", "/governance-reviews"}).body.find("approved") != std::string::npos);
        assert(!sink->entries().empty());

        std::cout << "governance_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "governance_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
