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
        "Verify compliance and auditability",
        "Check compliance over governance and automation outcomes",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/compliance-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/audit/compliance_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/docs/compliance-architecture.md"), false, true, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine", "policy-automation-engine"};
    input.existing_architecture = "ComplianceEngine audits session, verification, governance, and automation state.";
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"compliance_engine_tests"};
    input.constraints.required_documentation = {"compliance-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

exotic::codex_operator::PolicyAutomation compliant_automation() {
    using namespace exotic::codex_operator;
    PolicyAutomation automation;
    automation.id = "compliance-auto-approve";
    automation.name = "Compliance Auto Approve";
    automation.approval_policy.id = "compliance-approval-policy";
    automation.approval_policy.name = "Compliance Approval Policy";
    automation.rules.push_back({"rule.compliance.approve", "Approve compliant sessions.", true, true, true, true, true, false, false});
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
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-compliance-state"),
            sink);
        auto session_engine = package->create_session_engine();
        auto verification_engine = package->create_verification_engine(*session_engine);
        auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);
        auto automation_engine = package->create_policy_automation_engine(*session_engine, *verification_engine, *governance_engine);
        auto compliance_engine = package->create_compliance_engine(*session_engine, *verification_engine, *governance_engine, *automation_engine);

        automation_engine->register_automation(compliant_automation());

        CompliancePolicy policy;
        policy.id = "release-compliance";
        policy.name = "Release Compliance";
        policy.require_policy_automation = true;
        policy.required_audit_categories = {"release", "security"};
        compliance_engine->register_policy(policy);

        const auto compliant_session = session_engine->create_session(make_input("objective.compliance.1"));
        (void)session_engine->run_session(compliant_session.id);
        verification_engine->record_evidence({"evidence.test", compliant_session.id, EvidenceKind::TestResult, "compliance_engine_tests passed", {"compliance_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs", compliant_session.id, EvidenceKind::Documentation, "compliance-architecture.md updated", {"compliance-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build", compliant_session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review", compliant_session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});
        (void)automation_engine->evaluate("compliance-auto-approve", compliant_session.id);
        compliance_engine->record_audit({"audit.release", compliant_session.id, "release", "release checklist complete", {{"owner", "ops"}}, Clock::now()});
        compliance_engine->record_audit({"audit.security", compliant_session.id, "security", "security review complete", {{"owner", "security"}}, Clock::now()});
        const auto compliant = compliance_engine->check("release-compliance", compliant_session.id);
        assert(compliant.status == ComplianceStatus::Compliant);

        const auto missing_session = session_engine->create_session(make_input("objective.compliance.2"));
        (void)session_engine->run_session(missing_session.id);
        verification_engine->record_evidence({"evidence.test.2", missing_session.id, EvidenceKind::TestResult, "compliance_engine_tests passed", {"compliance_engine_tests.cpp"}, {}, Clock::now()});
        const auto missing = compliance_engine->check("release-compliance", missing_session.id);
        assert(missing.status == ComplianceStatus::NeedsReview || missing.status == ComplianceStatus::NonCompliant);

        const auto snapshot = compliance_engine->snapshot();
        assert(snapshot.metrics.total_reports == 2);
        assert(snapshot.metrics.audit_records >= 2);
        assert(snapshot.metrics.compliant_reports >= 1);
        assert(!snapshot.events.empty());
        assert(compliance_engine->api().handle({"GET", "/compliance-policies"}).body.find("release-compliance") != std::string::npos);
        assert(compliance_engine->latest_report(compliant_session.id).has_value());
        assert(!sink->entries().empty());

        std::cout << "compliance_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "compliance_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
