#pragma once

#include "governor.hpp"
#include "../governance/authority_gate.hpp"
#include "../governance/repository.hpp"
#include "../scheduler/execution_bridge.hpp"

#include <chrono>
#include <stop_token>

namespace exotic::autonomy::resources {

struct ResourcePlan {
    ResourceAccountId leaf_account_id{0};
    ResourceVector estimate;
    std::string workload_key;
    std::string idempotency_key;
    std::optional<GovernanceApprovalId> governance_approval_id;
    std::chrono::milliseconds reservation_ttl{600000};
    bool simulation{false};
};

class JobResourcePlanner {
public:
    virtual ~JobResourcePlanner() = default;
    virtual ResourcePlan plan(const scheduler::Job& job) = 0;
};

class FixedJobResourcePlanner final : public JobResourcePlanner {
public:
    FixedJobResourcePlanner(
        ResourceAccountId leaf_account_id,
        ResourceVector estimate,
        std::chrono::milliseconds reservation_ttl = std::chrono::minutes(10)
    );

    ResourcePlan plan(const scheduler::Job& job) override;

private:
    ResourceAccountId leaf_account_id_;
    ResourceVector estimate_;
    std::chrono::milliseconds reservation_ttl_;
};

struct SchedulerAuthorityDecision {
    bool allowed{false};
    bool simulation{false};
    bool emergency_stopped{false};
    std::string reason;
    std::optional<GovernanceApprovalId> approval_id;
};

class SchedulerAuthorityValidator {
public:
    virtual ~SchedulerAuthorityValidator() = default;
    virtual SchedulerAuthorityDecision validate(
        const scheduler::Job& job,
        const ResourcePlan& plan
    ) = 0;
};

class GovernanceSchedulerAuthorityValidator final : public SchedulerAuthorityValidator {
public:
    GovernanceSchedulerAuthorityValidator(
        governance::AuthorityGate& gate,
        governance::GovernanceRepository& repository,
        governance::Subject worker,
        governance::AutonomyLevel autonomy = governance::AutonomyLevel::Bounded
    );

    SchedulerAuthorityDecision validate(
        const scheduler::Job& job,
        const ResourcePlan& plan
    ) override;

private:
    governance::AuthorityGate& gate_;
    governance::GovernanceRepository& repository_;
    governance::Subject worker_;
    governance::AutonomyLevel autonomy_;
};

class UsageMeter {
public:
    virtual ~UsageMeter() = default;

    virtual ResourceVector measure(
        const scheduler::Job& job,
        const ResourcePlan& plan,
        const scheduler::ExecutionResult& result,
        std::chrono::milliseconds elapsed
    ) = 0;
};

class EstimatedUsageMeter final : public UsageMeter {
public:
    ResourceVector measure(
        const scheduler::Job& job,
        const ResourcePlan& plan,
        const scheduler::ExecutionResult& result,
        std::chrono::milliseconds elapsed
    ) override;
};

// Exact execution order:
// authority -> resource admission/reservation -> inner autonomy execution
// -> usage report -> reconciliation/release -> circuit outcome.
class GovernedResourceExecutionBridge final : public scheduler::ExecutionBridge {
public:
    GovernedResourceExecutionBridge(
        SchedulerAuthorityValidator& authority,
        ResourceGovernor& governor,
        JobResourcePlanner& planner,
        UsageMeter& meter,
        scheduler::ExecutionBridge& inner
    );

    scheduler::ExecutionResult execute(
        const scheduler::Job& job,
        std::stop_token stop_token
    ) override;

private:
    SchedulerAuthorityValidator& authority_;
    ResourceGovernor& governor_;
    JobResourcePlanner& planner_;
    UsageMeter& meter_;
    scheduler::ExecutionBridge& inner_;

    static scheduler::FailureClass failure_class(AdmissionFailure failure);
};

} // namespace exotic::autonomy::resources
