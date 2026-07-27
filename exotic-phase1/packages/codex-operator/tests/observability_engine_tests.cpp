#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <cassert>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(std::string objective_id) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        std::move(objective_id),
        "Investigate autonomous execution health",
        "Build timelines and forensics reports for autonomous sessions",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/observability-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/observability/observability_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/docs/observability-architecture.md"), false, true, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine", "policy-automation-engine", "compliance-engine"};
    input.existing_architecture = "ObservabilityEngine builds immutable timelines and forensics reports from existing engine state.";
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"observability_engine_tests"};
    input.constraints.required_documentation = {"observability-architecture.md", "forensics-guide.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

exotic::codex_operator::PolicyAutomation auto_approve_policy() {
    using namespace exotic::codex_operator;

    PolicyAutomation automation;
    automation.id = "observability-auto-approve";
    automation.name = "Observability Auto Approve";
    automation.approval_policy.id = "observability-approval-policy";
    automation.approval_policy.name = "Observability Approval Policy";
    automation.rules.push_back({"rule.observability.approve", "Approve sessions with complete evidence.", true, true, true, true, true, false, false});
    return automation;
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
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-observability-state"),
            sink);
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

        automation_engine->register_automation(auto_approve_policy());

        CompliancePolicy policy;
        policy.id = "observability-compliance";
        policy.name = "Observability Compliance";
        policy.require_policy_automation = true;
        policy.required_audit_categories = {"operations", "security"};
        compliance_engine->register_policy(policy);

        const auto session = session_engine->create_session(make_input("objective.observability.1"));
        (void)session_engine->run_session(session.id);
        verification_engine->record_evidence({"evidence.test", session.id, EvidenceKind::TestResult, "observability_engine_tests passed", {"observability_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs", session.id, EvidenceKind::Documentation, "observability docs updated", {"observability-architecture.md", "forensics-guide.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build", session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review", session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        (void)automation_engine->evaluate("observability-auto-approve", session.id);
        compliance_engine->record_audit({"audit.operations", session.id, "operations", "operations review complete", {{"owner", "ops"}}, Clock::now()});
        compliance_engine->record_audit({"audit.security", session.id, "security", "security review complete", {{"owner", "security"}}, Clock::now()});
        const auto compliance = compliance_engine->check("observability-compliance", session.id);
        assert(compliance.status == ComplianceStatus::Compliant);

        observability_engine->record_signal({"signal.cpu", session.id, "worker-runtime", "cpu-spike", IncidentSeverity::Warning, "cpu usage exceeded budget", {{"worker_id", "builder"}}, Clock::now()});
        observability_engine->record_signal({"signal.retry", session.id, "verification-engine", "retry-backoff", IncidentSeverity::Info, "verification retried once", {{"attempt", "1"}}, Clock::now()});

        const auto incident = observability_engine->open_incident(session.id,
                                                                  "Builder worker anomaly",
                                                                  IncidentSeverity::Warning,
                                                                  {"signal.cpu"},
                                                                  {"worker-runtime", "latency"},
                                                                  "Builder worker exceeded CPU budget");
        observability_engine->update_incident(incident.id, "Builder worker exceeded CPU budget during verification", {"worker-runtime", "verification"});

        const auto timeline = observability_engine->compile_timeline(session.id);
        assert(!timeline.empty());
        assert(std::any_of(timeline.begin(), timeline.end(), [](const ForensicsTimelineEntry& entry) {
            return entry.category == "signal";
        }));

        const auto report = observability_engine->generate_report(session.id);
        assert(report.status == ForensicsStatus::Ready);
        assert(!report.timeline.empty());
        assert(std::find(report.related_incidents.begin(), report.related_incidents.end(), incident.id) != report.related_incidents.end());
        assert(std::any_of(report.findings.begin(), report.findings.end(), [](const std::string& finding) {
            return finding.find("open_incident:") != std::string::npos;
        }));
        assert(std::none_of(report.findings.begin(), report.findings.end(), [](const std::string& finding) {
            return finding == "compliance:compliant";
        }));

        observability_engine->close_incident(incident.id, "Incident mitigated after throttling");
        observability_engine->archive_report(report.id);

        const auto snapshot = observability_engine->snapshot();
        assert(snapshot.metrics.recorded_signals == 2);
        assert(snapshot.metrics.total_incidents == 1);
        assert(snapshot.metrics.closed_incidents == 1);
        assert(snapshot.metrics.generated_reports == 1);
        assert(snapshot.metrics.archived_reports == 1);
        assert(!snapshot.events.empty());
        assert(observability_engine->api().handle({"GET", "/observability-signals"}).body.find("worker-runtime") != std::string::npos);
        assert(observability_engine->api().handle({"GET", "/incidents"}).body.find("Builder worker anomaly") != std::string::npos);
        assert(observability_engine->api().handle({"GET", "/forensics-reports"}).body.find(session.id) != std::string::npos);
        assert(observability_engine->latest_report(session.id).has_value());
        assert(!sink->entries().empty());

        std::cout << "observability_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "observability_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
