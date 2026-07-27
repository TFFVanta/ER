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
        "Automate policy decisions",
        "Apply policy automation over governance and verification",
        "packages/codex-operator",
        PromptTemplateKind::Testing,
        {},
        {},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/policy-automation-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/src/automation/policy_automation_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/docs/policy-automation-architecture.md"), false, true, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "session-engine", "verification-engine", "governance-engine"};
    input.existing_architecture = "PolicyAutomationEngine evaluates policy rules and delegates actions to GovernanceEngine.";
    input.build_status = {true, "healthy", {}};
    input.test_results = {true, {}, "healthy"};
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"policy_automation_engine_tests"};
    input.constraints.required_documentation = {"policy-automation-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    return input;
}

exotic::codex_operator::PolicyAutomation auto_approve_policy() {
    using namespace exotic::codex_operator;
    PolicyAutomation automation;
    automation.id = "auto-approve";
    automation.name = "Auto Approve Passing Sessions";
    automation.approval_policy.id = "automation-approval-policy";
    automation.approval_policy.name = "Automation Approval Policy";
    automation.rules.push_back({"rule.auto.approve", "Approve when verification passes and evidence is complete.", true, true, true, true, true, false, false});
    return automation;
}

exotic::codex_operator::PolicyAutomation auto_escalate_policy() {
    using namespace exotic::codex_operator;
    PolicyAutomation automation;
    automation.id = "auto-escalate";
    automation.name = "Escalate Missing Evidence";
    automation.approval_policy.id = "automation-escalation-policy";
    automation.approval_policy.name = "Automation Escalation Policy";
    automation.rules.push_back({"rule.auto.escalate", "Escalate when evidence is missing.", true, true, true, true, false, false, true});
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
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-policy-state"),
            sink);
        auto session_engine = package->create_session_engine();
        auto verification_engine = package->create_verification_engine(*session_engine);
        auto governance_engine = package->create_governance_engine(*session_engine, *verification_engine);
        auto automation_engine = package->create_policy_automation_engine(*session_engine, *verification_engine, *governance_engine);

        automation_engine->register_automation(auto_approve_policy());
        automation_engine->register_automation(auto_escalate_policy());

        const auto approved_session = session_engine->create_session(make_input("objective.policy.1"));
        (void)session_engine->run_session(approved_session.id);
        verification_engine->record_evidence({"evidence.test", approved_session.id, EvidenceKind::TestResult, "policy_automation_engine_tests passed", {"policy_automation_engine_tests.cpp"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.docs", approved_session.id, EvidenceKind::Documentation, "policy-automation-architecture.md updated", {"policy-automation-architecture.md"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.build", approved_session.id, EvidenceKind::BuildResult, "build target configured", {"EXOTIC_CODEX_OPERATOR.cmake"}, {}, Clock::now()});
        verification_engine->record_evidence({"evidence.review", approved_session.id, EvidenceKind::Review, "review complete", {}, {}, Clock::now()});

        const auto approved_eval = automation_engine->evaluate("auto-approve", approved_session.id);
        assert(approved_eval.decision == PolicyAutomationDecision::AutoApprove);
        assert(session_engine->find(approved_session.id)->status == SessionStatus::Completed);

        const auto escalated_session = session_engine->create_session(make_input("objective.policy.2"));
        (void)session_engine->run_session(escalated_session.id);
        verification_engine->record_evidence({"evidence.test.2", escalated_session.id, EvidenceKind::TestResult, "policy_automation_engine_tests passed", {"policy_automation_engine_tests.cpp"}, {}, Clock::now()});
        const auto escalated_eval = automation_engine->evaluate("auto-escalate", escalated_session.id);
        assert(escalated_eval.decision == PolicyAutomationDecision::AutoEscalate);

        const auto snapshot = automation_engine->snapshot();
        assert(snapshot.metrics.registered_automations == 2);
        assert(snapshot.metrics.total_evaluations == 2);
        assert(snapshot.metrics.auto_approved >= 1);
        assert(snapshot.metrics.auto_escalated >= 1);
        assert(!snapshot.events.empty());
        assert(automation_engine->api().handle({"GET", "/policy-automations"}).body.find("auto-approve") != std::string::npos);
        assert(!sink->entries().empty());

        std::cout << "policy_automation_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "policy_automation_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
