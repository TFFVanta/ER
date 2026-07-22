#include "exotic/runtime/full_stack_bootstrap.hpp"
#include "exotic/runtime/dashboard.hpp"
#include "exotic/runtime/telemetry.hpp"
#include "exotic/autonomy/objective.hpp"
#include "exotic/autonomy/proposal.hpp"
#include "exotic/autonomy/persistence/sqlite_repository.hpp"
#include "exotic/autonomy/governance/sqlite_repository.hpp"
#include "exotic/autonomy/governance/service.hpp"
#include "exotic/autonomy/scheduler/types.hpp"

#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <optional>
#include <string>
#include <thread>

namespace {

using namespace exotic;

struct SmokeIds {
    autonomy::ObjectiveId objective_id{};
    autonomy::ProposalId proposal_id{};
    autonomy::governance::ApprovalRequestId approval_id{};
    autonomy::scheduler::JobId job_id{};
};

std::filesystem::path parse_workspace(int argc, char** argv) {
    std::filesystem::path workspace = std::filesystem::current_path();
    for (int i = 1; i < argc; ++i) {
        const std::string value{argv[i]};
        if (value == "--workspace" && i + 1 < argc) {
            workspace = argv[++i];
        }
    }
    return std::filesystem::absolute(workspace);
}

SmokeIds seed_objective_proposal_and_approval(
    const runtime::RuntimeConfig& base_config,
    const std::filesystem::path& database_path
) {
    SmokeIds ids;

    {
        autonomy::persistence::SqliteAutonomyRepository repository{database_path};
        autonomy::persistence::RecoveryManager recovery{repository};
        recovery.recover();
        autonomy::AutonomyKernel kernel{repository};

        autonomy::Objective objective;
        objective.title = "EXOTIC v1.0 simulation verification";
        objective.desired_outcome =
            "Verify the complete durable continuous-operations chain.";
        objective.priority = autonomy::Priority::High;
        objective.success_metrics.push_back({"verified_operations", 1.0, "count"});
        objective.constraints.push_back("No external side effects");
        ids.objective_id = kernel.create_objective(std::move(objective));

        autonomy::Proposal proposal;
        proposal.objective_id = ids.objective_id;
        proposal.proposed_by = "exotic.smoke.requester";
        proposal.plan.name = "Internal simulation cycle";
        proposal.plan.steps = {
            {"Observe", "Read the isolated simulation workspace state.", true},
            {"Execute", "Run the internal Autonomy operation path.", true},
            {"Verify", "Persist and verify the resulting operation.", true}
        };
        proposal.risk = autonomy::RiskLevel::Minimal;
        proposal.cost.estimated_usd = 1.0;
        proposal.cost.estimated_compute_seconds = 1.0;
        proposal.cost.estimated_duration_seconds = 2.0;
        proposal.expected_value = 1.0;
        proposal.confidence = 0.99;
        proposal.human_approval_required = false;
        ids.proposal_id = kernel.submit_proposal(std::move(proposal));
    }

    {
        autonomy::governance::SqliteGovernanceRepository repository{database_path};
        autonomy::governance::GovernanceService governance{repository};

        autonomy::governance::ApprovalRequest request;
        request.proposal_id = ids.proposal_id;
        request.requester_id = "exotic.smoke.requester";
        request.action = "proposal.execute";
        request.resource = {"proposal", std::to_string(ids.proposal_id), {}};
        request.risk = autonomy::RiskLevel::Minimal;
        request.requested_autonomy = autonomy::governance::AutonomyLevel::Bounded;
        request.requested_budget_usd = base_config.default_job_budget_usd;
        request.required_approvals = 2;
        request.require_distinct_roles = true;
        request.simulation_only = false;
        request.expires_at = autonomy::Clock::now() + std::chrono::hours(1);
        ids.approval_id = governance.request_approval(std::move(request));

        autonomy::governance::Subject security{
            "exotic.smoke.security",
            {"security"},
            {{"environment", "simulation"}}
        };
        autonomy::governance::Subject finance{
            "exotic.smoke.finance",
            {"finance"},
            {{"environment", "simulation"}}
        };
        governance.decide(ids.approval_id, security,
                          autonomy::governance::Vote::Approve,
                          "Simulation security approval");
        const auto result = governance.decide(
            ids.approval_id,
            finance,
            autonomy::governance::Vote::Approve,
            "Simulation budget approval"
        );
        if (result != autonomy::governance::ApprovalStatus::Approved) {
            throw std::runtime_error("simulation approval quorum did not pass");
        }
    }

    return ids;
}

bool terminal(autonomy::scheduler::JobStatus status) {
    using autonomy::scheduler::JobStatus;
    return status == JobStatus::Completed ||
           status == JobStatus::Cancelled ||
           status == JobStatus::DeadLettered;
}

} // namespace

int main(int argc, char** argv) {
    using namespace exotic;
    try {
        const auto workspace = parse_workspace(argc, argv);
        std::filesystem::create_directories(workspace);

        auto config = runtime::load_runtime_config(workspace);
        config.mode = runtime::RuntimeMode::Simulation;
        config.simulation_execute_internal = true;
        config.seed_simulation_identity = true;
        config.write_dashboard = true;
        config.scheduler_workers = 2;
        config.workspace_id = workspace.filename().string() + "-simulation";

        const runtime::WorkspaceContext context{config.workspace};
        const auto ids = seed_objective_proposal_and_approval(
            config,
            context.paths().runtime_database
        );
        config.default_governance_approval_id = ids.approval_id;

        auto production = runtime::FullStackBootstrap::build(config);
        runtime::TraceScope trace{
            *production->telemetry,
            config.workspace_id,
            "simulation",
            "objective-to-verification"
        };

        production->runtime->start();

        autonomy::scheduler::Job job;
        job.objective_id = ids.objective_id;
        job.proposal_id = ids.proposal_id;
        job.name = "exotic.v1.simulation.smoke";
        job.payload_json = "{\"simulation\":true,\"internal_execution\":true}";
        job.idempotency_key =
            "v1-smoke-proposal-" + std::to_string(ids.proposal_id);
        job.kind = autonomy::scheduler::JobKind::Immediate;
        job.priority = autonomy::scheduler::JobPriority::High;
        const auto job_id = production->scheduler->submit(job);

        std::optional<autonomy::scheduler::Job> final_job;
        const auto deadline = std::chrono::steady_clock::now() +
                              std::chrono::seconds(45);
        while (std::chrono::steady_clock::now() < deadline) {
            final_job = production->scheduler_repository->find_job(job_id);
            if (final_job && terminal(final_job->status)) break;
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(1200));
        runtime::DashboardWriter dashboard{context.paths().dashboards};
        dashboard.write(production->runtime->snapshot());
        production->runtime->request_stop();
        production->runtime->join();

        if (!final_job ||
            final_job->status != autonomy::scheduler::JobStatus::Completed) {
            trace.fail("{\"reason\":\"job-not-completed\"}");
            throw std::runtime_error(
                "scheduler job did not complete: " +
                (final_job ? autonomy::scheduler::to_string(final_job->status)
                           : std::string{"missing"})
            );
        }

        const auto approval =
            production->governance_repository->load_request(ids.approval_id);
        const auto evidence =
            production->governance_repository->load_evidence(ids.approval_id);
        const auto assignment =
            production->agent_repository->find_assignment_by_job(job_id);
        const auto operations = production->autonomy_repository->load_operations();
        const auto autonomy_audit =
            production->autonomy_repository->load_audit_events(200);
        const auto runtime_audit = production->telemetry->load_audit(200);
        const auto traces = production->telemetry->load_traces(200);
        const auto started_metrics =
            production->telemetry->load_metrics("runtime.started", 50);
        const auto stopped_metrics =
            production->telemetry->load_metrics("runtime.stopped", 50);
        const auto usage = production->resource_repository->load_usage_reports(
            job.name,
            50
        );

        std::optional<autonomy::resources::Reservation> reservation;
        if (assignment && assignment->reservation_id) {
            reservation = production->resource_repository->find_reservation(
                *assignment->reservation_id
            );
        }

        bool operation_found = false;
        bool verification_found = false;
        for (const auto& operation : operations) {
            if (operation.proposal_id == ids.proposal_id) {
                operation_found = true;
                verification_found = operation.verification.passed;
            }
        }

        const bool dashboard_json =
            std::filesystem::exists(dashboard.json_path());
        const bool dashboard_text =
            std::filesystem::exists(dashboard.text_path());

        const bool passed =
            approval &&
            approval->status == autonomy::governance::ApprovalStatus::Approved &&
            evidence.size() >= 3 &&
            assignment.has_value() &&
            reservation.has_value() &&
            !usage.empty() &&
            operation_found &&
            verification_found &&
            !autonomy_audit.empty() &&
            !runtime_audit.empty() &&
            !traces.empty() &&
            !started_metrics.empty() &&
            !stopped_metrics.empty() &&
            dashboard_json && dashboard_text;

        const auto report_directory = workspace / ".exotic" / "reports";
        std::filesystem::create_directories(report_directory);
        const auto report_path = report_directory / "v1-simulation-verification.txt";
        std::ofstream report{report_path, std::ios::trunc};
        auto line = [&](const std::string& key, bool value) {
            report << key << "=" << (value ? "verified" : "missing") << '\n';
            std::cout << key << "=" << (value ? "verified" : "missing") << '\n';
        };

        std::cout << "EXOTIC CONTINUOUS OPERATIONS V1.0 SIMULATION\n";
        std::cout << "workspace=" << workspace.string() << '\n';
        std::cout << "database=" << context.paths().runtime_database.string() << '\n';
        std::cout << "objective_id=" << ids.objective_id << '\n';
        std::cout << "proposal_id=" << ids.proposal_id << '\n';
        std::cout << "approval_id=" << ids.approval_id << '\n';
        std::cout << "job_id=" << job_id << '\n';
        line("approval", approval && approval->status == autonomy::governance::ApprovalStatus::Approved);
        line("decision_evidence", evidence.size() >= 3);
        line("assignment", assignment.has_value());
        line("reservation", reservation.has_value());
        line("usage", !usage.empty());
        line("operation", operation_found);
        line("verification", verification_found);
        line("autonomy_audit", !autonomy_audit.empty());
        line("runtime_audit", !runtime_audit.empty());
        line("trace", !traces.empty());
        line("metrics", !started_metrics.empty() && !stopped_metrics.empty());
        line("dashboard", dashboard_json && dashboard_text);
        report << "result=" << (passed ? "PASS" : "FAIL") << '\n';
        report << "dashboard_json=" << dashboard.json_path().string() << '\n';
        report << "dashboard_text=" << dashboard.text_path().string() << '\n';
        report.close();

        if (passed) {
            trace.success("{\"result\":\"verified\"}");
            std::cout << "result=PASS\n";
            std::cout << "report=" << report_path.string() << '\n';
            return 0;
        }

        trace.fail("{\"result\":\"incomplete\"}");
        std::cerr << "result=FAIL\n";
        std::cerr << "report=" << report_path.string() << '\n';
        return 3;
    } catch (const std::exception& error) {
        std::cerr << "EXOTIC simulation verification failed: "
                  << error.what() << '\n';
        return 2;
    }
}
