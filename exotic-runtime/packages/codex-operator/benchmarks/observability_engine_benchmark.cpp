#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(int index) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        "benchmark-observability-" + std::to_string(index),
        "Benchmark observability engine",
        "Measure timeline and report throughput",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/observability-benchmark";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/observability/observability_engine.cpp"), false, false, false, 4096}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine", "policy-automation-engine", "compliance-engine", "observability-engine"};
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"observability_engine_tests"};
    input.constraints.required_documentation = {"observability-architecture.md", "forensics-guide.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

exotic::codex_operator::PolicyAutomation benchmark_automation() {
    using namespace exotic::codex_operator;

    PolicyAutomation automation;
    automation.id = "benchmark-observability-automation";
    automation.name = "Benchmark Observability Automation";
    automation.approval_policy.id = "benchmark-observability-policy";
    automation.approval_policy.name = "Benchmark Observability Approval Policy";
    automation.rules.push_back({"rule.benchmark.observability", "Approve benchmark sessions.", true, true, true, true, true, false, false});
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
        OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-observability-benchmark"));
    auto session_engine = package->create_session_engine();
    auto verification_engine = package->create_verification_engine(*session_engine);
    auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);
    auto automation_engine = package->create_policy_automation_engine(*session_engine, *verification_engine, *governance_engine);
    auto compliance_engine = package->create_compliance_engine(*session_engine, *verification_engine, *governance_engine, *automation_engine);
    auto observability_engine = package->create_observability_engine(*session_engine,
                                                                     *verification_engine,
                                                                     *governance_engine,
                                                                     *automation_engine,
                                                                     *compliance_engine);

    automation_engine->register_automation(benchmark_automation());

    CompliancePolicy policy;
    policy.id = "benchmark-observability-compliance";
    policy.name = "Benchmark Observability Compliance";
    policy.require_policy_automation = true;
    policy.required_audit_categories = {"operations"};
    compliance_engine->register_policy(policy);

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 50; ++index) {
        const auto session = session_engine->create_session(make_input(index));
        (void)session_engine->run_session(session.id);
        verification_engine->record_evidence({"test-" + std::to_string(index), session.id, EvidenceKind::TestResult, "observability_engine_tests passed", {"observability_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"doc-" + std::to_string(index), session.id, EvidenceKind::Documentation, "observability docs updated", {"observability-architecture.md", "forensics-guide.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"build-" + std::to_string(index), session.id, EvidenceKind::BuildResult, "build configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"review-" + std::to_string(index), session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        (void)automation_engine->evaluate("benchmark-observability-automation", session.id);
        compliance_engine->record_audit({"ops-" + std::to_string(index), session.id, "operations", "operations review complete", {}, Clock::now()});
        (void)compliance_engine->check("benchmark-observability-compliance", session.id);
        observability_engine->record_signal({"signal-" + std::to_string(index), session.id, "worker-runtime", "queue-depth", IncidentSeverity::Info, "queue depth sampled", {{"index", std::to_string(index)}}, Clock::now()});
        const auto incident = observability_engine->open_incident(session.id, "Transient worker pressure", IncidentSeverity::Warning, {"signal-" + std::to_string(index)}, {"benchmark"}, "Transient queue pressure observed");
        (void)observability_engine->generate_report(session.id);
        observability_engine->close_incident(incident.id, "Recovered");
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);

    const auto snapshot = observability_engine->snapshot();
    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "forensics_reports=" << snapshot.metrics.generated_reports << '\n';
    return snapshot.metrics.generated_reports == 50 ? 0 : 1;
}
