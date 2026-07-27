#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(int index) {
    using namespace exotic::codex_operator;
    PromptCompilerInput input;
    input.objective = {
        "benchmark-compliance-" + std::to_string(index),
        "Benchmark compliance engine",
        "Measure compliance and audit throughput",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/compliance-benchmark";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/audit/compliance_engine.cpp"), false, false, false, 4096}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine", "policy-automation-engine", "compliance-engine"};
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"compliance_engine_tests"};
    input.constraints.required_documentation = {"compliance-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

exotic::codex_operator::PolicyAutomation benchmark_automation() {
    using namespace exotic::codex_operator;
    PolicyAutomation automation;
    automation.id = "benchmark-compliance-automation";
    automation.name = "Benchmark Compliance Automation";
    automation.approval_policy.id = "benchmark-compliance-policy";
    automation.approval_policy.name = "Benchmark Compliance Approval Policy";
    automation.rules.push_back({"rule.benchmark.compliance", "Approve benchmark sessions.", true, true, true, true, true, false, false});
    return automation;
}

} // namespace

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    Runtime runtime;
    auto package = std::make_unique<CodexOperatorPackage>(
        runtime,
        OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-compliance-benchmark"));
    auto session_engine = package->create_session_engine();
    auto verification_engine = package->create_verification_engine(*session_engine);
    auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);
    auto automation_engine = package->create_policy_automation_engine(*session_engine, *verification_engine, *governance_engine);
    auto compliance_engine = package->create_compliance_engine(*session_engine, *verification_engine, *governance_engine, *automation_engine);
    automation_engine->register_automation(benchmark_automation());

    CompliancePolicy policy;
    policy.id = "benchmark-release-compliance";
    policy.name = "Benchmark Release Compliance";
    policy.require_policy_automation = true;
    policy.required_audit_categories = {"release"};
    compliance_engine->register_policy(policy);

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 100; ++index) {
        const auto session = session_engine->create_session(make_input(index));
        (void)session_engine->run_session(session.id);
        verification_engine->record_evidence({"test-" + std::to_string(index), session.id, EvidenceKind::TestResult, "compliance_engine_tests passed", {"compliance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"doc-" + std::to_string(index), session.id, EvidenceKind::Documentation, "compliance docs updated", {"compliance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"build-" + std::to_string(index), session.id, EvidenceKind::BuildResult, "build configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"review-" + std::to_string(index), session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        (void)automation_engine->evaluate("benchmark-compliance-automation", session.id);
        compliance_engine->record_audit({"release-" + std::to_string(index), session.id, "release", "release checklist complete", {}, Clock::now()});
        (void)compliance_engine->check("benchmark-release-compliance", session.id);
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    const auto snapshot = compliance_engine->snapshot();
    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "compliant_reports=" << snapshot.metrics.compliant_reports << '\n';
    return snapshot.metrics.compliant_reports == 100 ? 0 : 1;
}
