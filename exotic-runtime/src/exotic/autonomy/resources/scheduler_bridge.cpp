#include "scheduler_bridge.hpp"

#include <algorithm>
#include <condition_variable>
#include <mutex>
#include <thread>

namespace exotic::autonomy::resources {

FixedJobResourcePlanner::FixedJobResourcePlanner(
    ResourceAccountId leaf_account_id,
    ResourceVector estimate,
    std::chrono::milliseconds reservation_ttl
) : leaf_account_id_(leaf_account_id),
    estimate_(std::move(estimate)),
    reservation_ttl_(reservation_ttl) {}

ResourcePlan FixedJobResourcePlanner::plan(const scheduler::Job& job) {
    ResourcePlan plan;
    plan.leaf_account_id = leaf_account_id_;
    plan.estimate = estimate_;
    plan.workload_key = job.name.empty() ? "proposal:" + std::to_string(job.proposal_id) : job.name;
    plan.idempotency_key = "resource:job:" + std::to_string(job.id) + ":attempt:" + std::to_string(job.attempt + 1);
    plan.reservation_ttl = reservation_ttl_;
    return plan;
}

GovernanceSchedulerAuthorityValidator::GovernanceSchedulerAuthorityValidator(
    governance::AuthorityGate& gate,
    governance::GovernanceRepository& repository,
    governance::Subject worker,
    governance::AutonomyLevel autonomy
) : gate_(gate),
    repository_(repository),
    worker_(std::move(worker)),
    autonomy_(autonomy) {}

SchedulerAuthorityDecision GovernanceSchedulerAuthorityValidator::validate(
    const scheduler::Job& job,
    const ResourcePlan& plan
) {
    governance::AuthorityContext context;
    context.subject = worker_;
    context.resource = {"proposal", std::to_string(job.proposal_id), {}};
    context.action = "proposal.execute";
    context.risk = job.priority >= scheduler::JobPriority::High
        ? RiskLevel::High
        : RiskLevel::Medium;
    context.requested_autonomy = autonomy_;
    context.budget_usd = plan.estimate.get(ResourceDimension::MoneyUsd);
    context.simulation = plan.simulation;
    context.proposal_id = job.proposal_id;

    const auto authority = gate_.revalidate(context);
    if (authority.emergency_stopped) {
        return {false, plan.simulation, true, authority.reason, std::nullopt};
    }
    if (authority.allowed) {
        return {true, plan.simulation, false, authority.reason, plan.governance_approval_id};
    }
    if (!authority.approval_required) {
        return {false, plan.simulation, false, authority.reason, std::nullopt};
    }
    if (!plan.governance_approval_id) {
        return {false, plan.simulation, false, "durable governance approval is required", std::nullopt};
    }

    const auto request = repository_.load_request(*plan.governance_approval_id);
    if (!request) {
        return {false, plan.simulation, false, "governance approval request was not found", std::nullopt};
    }
    if (request->status != governance::ApprovalStatus::Approved) {
        return {false, plan.simulation, false, "governance approval is not approved", std::nullopt};
    }
    if (request->proposal_id != job.proposal_id) {
        return {false, plan.simulation, false, "governance approval belongs to another proposal", std::nullopt};
    }
    if (request->action != "proposal.execute") {
        return {false, plan.simulation, false, "governance approval does not authorize proposal execution", std::nullopt};
    }
    if (
        request->resource.type != "proposal" ||
        request->resource.id != std::to_string(job.proposal_id)
    ) {
        return {false, plan.simulation, false, "governance approval scope does not match the proposal", std::nullopt};
    }
    if (request->expires_at <= Clock::now()) {
        return {false, plan.simulation, false, "governance approval has expired", std::nullopt};
    }
    if (
        request->requested_budget_usd + 1e-9 <
        plan.estimate.get(ResourceDimension::MoneyUsd)
    ) {
        return {false, plan.simulation, false, "governance approval budget is insufficient", std::nullopt};
    }
    if (request->simulation_only && !plan.simulation) {
        return {false, false, false, "simulation-only governance approval cannot authorize real execution", std::nullopt};
    }

    return {
        true,
        plan.simulation || request->simulation_only,
        false,
        "durable governance approval revalidated",
        request->id
    };
}

ResourceVector EstimatedUsageMeter::measure(
    const scheduler::Job&,
    const ResourcePlan& plan,
    const scheduler::ExecutionResult&,
    std::chrono::milliseconds elapsed
) {
    auto actual = plan.estimate;
    if (actual.get(ResourceDimension::CpuMilliseconds) <= 0.0) {
        actual.set(
            ResourceDimension::CpuMilliseconds,
            static_cast<double>(std::max<std::int64_t>(0, elapsed.count()))
        );
    }
    // Ephemeral dimensions are capacity checks, not cumulative consumption.
    actual.set(ResourceDimension::MemoryBytes, 0.0);
    actual.set(ResourceDimension::ConcurrencySlots, 0.0);
    return actual;
}

GovernedResourceExecutionBridge::GovernedResourceExecutionBridge(
    SchedulerAuthorityValidator& authority,
    ResourceGovernor& governor,
    JobResourcePlanner& planner,
    UsageMeter& meter,
    scheduler::ExecutionBridge& inner
) : authority_(authority),
    governor_(governor),
    planner_(planner),
    meter_(meter),
    inner_(inner) {}

scheduler::FailureClass GovernedResourceExecutionBridge::failure_class(
    AdmissionFailure failure
) {
    switch (failure) {
        case AdmissionFailure::RateLimited:
        case AdmissionFailure::CircuitOpen:
            return scheduler::FailureClass::Transient;
        case AdmissionFailure::EmergencyStop:
        case AdmissionFailure::AccountUnavailable:
        case AdmissionFailure::BudgetExceeded:
        case AdmissionFailure::ApprovalRequired:
        case AdmissionFailure::ApprovalInvalid:
        case AdmissionFailure::InvalidRequest:
        case AdmissionFailure::DuplicateConflict:
            return scheduler::FailureClass::PolicyDenied;
        case AdmissionFailure::None:
            return scheduler::FailureClass::Permanent;
    }
    return scheduler::FailureClass::Permanent;
}

scheduler::ExecutionResult GovernedResourceExecutionBridge::execute(
    const scheduler::Job& job,
    std::stop_token stop_token
) {
    auto plan = planner_.plan(job);

    // Authority is always checked first.
    const auto authority = authority_.validate(job, plan);
    if (!authority.allowed) {
        return {false, scheduler::FailureClass::PolicyDenied, authority.reason};
    }
    plan.simulation = authority.simulation;
    if (authority.approval_id) {
        plan.governance_approval_id = authority.approval_id;
    }

    AdmissionRequest request;
    request.job_id = job.id;
    request.proposal_id = job.proposal_id;
    request.leaf_account_id = plan.leaf_account_id;
    request.workload_key = plan.workload_key;
    request.idempotency_key = plan.idempotency_key;
    request.estimate = plan.estimate;
    request.governance_approval_id = plan.governance_approval_id;
    request.reservation_ttl = plan.reservation_ttl;
    request.simulation = plan.simulation;

    if (plan.simulation) {
        const auto preview = governor_.preview(request);
        if (!preview.allowed) {
            return {false, failure_class(preview.failure), preview.reason};
        }
        return {
            true,
            scheduler::FailureClass::Permanent,
            "authority and resource simulation passed; external execution suppressed"
        };
    }

    // Resource admission occurs after authority and before actual execution.
    const auto admission = governor_.admit(request);
    if (!admission.allowed || !admission.reservation) {
        return {false, failure_class(admission.failure), admission.reason};
    }

    const auto reservation_id = admission.reservation->id;
    const auto heartbeat_interval = std::max(
        std::chrono::milliseconds{1000},
        std::min(std::chrono::milliseconds{30000}, plan.reservation_ttl / 3)
    );

    std::mutex heartbeat_mutex;
    std::condition_variable_any heartbeat_condition;
    std::jthread heartbeat_thread([
        this,
        reservation_id,
        ttl = plan.reservation_ttl,
        heartbeat_interval,
        &heartbeat_mutex,
        &heartbeat_condition
    ](std::stop_token stop) {
        std::unique_lock lock{heartbeat_mutex};
        while (!stop.stop_requested()) {
            const bool stopped = heartbeat_condition.wait_for(
                lock,
                stop,
                heartbeat_interval,
                [] { return false; }
            );
            (void)stopped;
            if (stop.stop_requested()) {
                break;
            }
            lock.unlock();
            const bool renewed = governor_.heartbeat(reservation_id, ttl);
            lock.lock();
            if (!renewed) {
                break;
            }
        }
    });

    const auto started = std::chrono::steady_clock::now();
    scheduler::ExecutionResult result;
    try {
        result = inner_.execute(job, stop_token);
    } catch (const std::exception& error) {
        result = {false, scheduler::FailureClass::Permanent, error.what()};
    } catch (...) {
        result = {false, scheduler::FailureClass::Permanent, "unknown execution failure"};
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started
    );

    heartbeat_thread.request_stop();
    heartbeat_condition.notify_all();

    const auto actual = meter_.measure(job, plan, result, elapsed);
    if (!governor_.reconcile(reservation_id, actual, "exotic.scheduler.resource_bridge")) {
        governor_.release(reservation_id, "reconciliation failed; reservation released defensively");
        governor_.record_execution_failure(plan.workload_key, "resource reconciliation failed");
        return {
            false,
            scheduler::FailureClass::VerificationFailed,
            "operation finished but resource reconciliation failed"
        };
    }

    if (result.success) {
        governor_.record_execution_success(plan.workload_key);
    } else {
        governor_.record_execution_failure(plan.workload_key, result.message);
    }
    return result;
}

} // namespace exotic::autonomy::resources
