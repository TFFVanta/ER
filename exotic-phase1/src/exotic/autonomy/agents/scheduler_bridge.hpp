#pragma once

#include "execution_context.hpp"
#include "learning.hpp"
#include "router.hpp"
#include "../resources/scheduler_bridge.hpp"

#include <functional>
#include <stop_token>

namespace exotic::autonomy::agents {

class TaskRequirementPlanner {
public:
    virtual ~TaskRequirementPlanner() = default;
    virtual TaskRequirement plan(const scheduler::Job& job) = 0;
};

class FixedTaskRequirementPlanner final : public TaskRequirementPlanner {
public:
    explicit FixedTaskRequirementPlanner(TaskRequirement requirement);
    TaskRequirement plan(const scheduler::Job& job) override;
private:
    TaskRequirement requirement_;
};

class CallbackTaskRequirementPlanner final : public TaskRequirementPlanner {
public:
    using Callback = std::function<TaskRequirement(const scheduler::Job&)>;
    explicit CallbackTaskRequirementPlanner(Callback callback):callback_(std::move(callback)){}
    TaskRequirement plan(const scheduler::Job& job) override{return callback_(job);}
private:
    Callback callback_;
};

struct AgentBridgeConfig {
    std::chrono::milliseconds binding_ttl{30000};
    std::chrono::milliseconds heartbeat_interval{5000};
    bool replace_single_agent_on_transient_failure{true};
};

// Exact execution order:
// task requirements -> durable agent allocation -> selected-agent governance
// revalidation -> aggregate resource reservation -> assignment binding ->
// autonomy execution -> usage reconciliation -> performance learning.
class AgentOrchestratedExecutionBridge final : public scheduler::ExecutionBridge {
public:
    AgentOrchestratedExecutionBridge(
        AgentRepository& repository,
        AgentRegistry& registry,
        WorkAllocator& allocator,
        GovernanceCompatibility& governance,
        ResourceCompatibility& resources,
        resources::ResourceGovernor& governor,
        resources::UsageMeter& meter,
        AgentLearningEngine& learning,
        TaskRequirementPlanner& planner,
        scheduler::ExecutionBridge& inner,
        AgentBridgeConfig config = {}
    );

    scheduler::ExecutionResult execute(
        const scheduler::Job& job,
        std::stop_token stop_token
    ) override;

private:
    AgentRepository& repository_;
    AgentRegistry& registry_;
    WorkAllocator& allocator_;
    GovernanceCompatibility& governance_;
    ResourceCompatibility& resources_;
    resources::ResourceGovernor& governor_;
    resources::UsageMeter& meter_;
    AgentLearningEngine& learning_;
    TaskRequirementPlanner& planner_;
    scheduler::ExecutionBridge& inner_;
    AgentBridgeConfig config_;

    static scheduler::FailureClass map_failure(CompatibilityFailure failure);
    static scheduler::FailureClass map_admission(resources::AdmissionFailure failure);
    static PerformanceOutcome map_outcome(const scheduler::ExecutionResult& result);
    void set_agents_running(const WorkAssignment& assignment, bool running);
};

} // namespace exotic::autonomy::agents
