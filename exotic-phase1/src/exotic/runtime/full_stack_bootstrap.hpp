#pragma once
#include "continuous_runtime.hpp"
#include "service_adapters.hpp"
#include "sqlite_telemetry.hpp"
#include "../autonomy/autonomy_kernel.hpp"
#include "../autonomy/persistence/sqlite_repository.hpp"
#include "../autonomy/persistence/recovery_manager.hpp"
#include "../autonomy/scheduler/sqlite_repository.hpp"
#include "../autonomy/scheduler/autonomy_bridge.hpp"
#include "../autonomy/governance/sqlite_repository.hpp"
#include "../autonomy/resources/sqlite_repository.hpp"
#include "../autonomy/resources/governance_approval.hpp"
#include "../autonomy/agents/sqlite_repository.hpp"
#include "../autonomy/agents/scheduler_bridge.hpp"
#include <memory>
namespace exotic::runtime {
struct ProductionRuntime;
class FullStackBootstrap{public:static std::unique_ptr<ProductionRuntime> build(RuntimeConfig config);};
struct ProductionRuntime{
    RuntimeConfig config;WorkspaceContext workspace;
    std::unique_ptr<autonomy::persistence::SqliteAutonomyRepository> autonomy_repository;std::unique_ptr<autonomy::persistence::RecoveryManager> autonomy_recovery;std::unique_ptr<autonomy::AutonomyKernel> autonomy_kernel;
    std::unique_ptr<autonomy::scheduler::SqliteSchedulerRepository> scheduler_repository;std::unique_ptr<autonomy::scheduler::BasicConditionEvaluator> condition_evaluator;
    std::unique_ptr<autonomy::governance::SqliteGovernanceRepository> governance_repository;std::unique_ptr<autonomy::governance::GovernanceService> governance_service;std::unique_ptr<autonomy::governance::AuthorityGate> authority_gate;
    std::unique_ptr<autonomy::resources::SqliteResourceRepository> resource_repository;std::unique_ptr<autonomy::resources::GovernanceBudgetApprovalVerifier> budget_verifier;std::unique_ptr<autonomy::resources::ResourceGovernor> resource_governor;std::unique_ptr<autonomy::resources::ResourceRecoveryManager> resource_recovery;
    std::unique_ptr<autonomy::agents::SqliteAgentRepository> agent_repository;std::unique_ptr<autonomy::agents::AgentRegistry> agent_registry;std::unique_ptr<autonomy::agents::GovernanceAgentCompatibility> agent_governance;std::unique_ptr<autonomy::agents::ResourceBudgetCompatibility> agent_resources;std::unique_ptr<autonomy::agents::CandidateScorer> scorer;std::unique_ptr<autonomy::agents::WorkAllocator> allocator;std::unique_ptr<autonomy::agents::AgentLearningEngine> learning;std::unique_ptr<autonomy::agents::AgentRecoveryManager> agent_recovery;
    std::unique_ptr<autonomy::scheduler::AutonomyExecutionBridge> autonomy_bridge;std::unique_ptr<autonomy::agents::TaskRequirementPlanner> requirement_planner;std::unique_ptr<autonomy::resources::EstimatedUsageMeter> usage_meter;std::unique_ptr<autonomy::agents::AgentOrchestratedExecutionBridge> execution_bridge;std::unique_ptr<autonomy::scheduler::DurableScheduler> scheduler;
    std::unique_ptr<SqliteTelemetryRepository> telemetry;std::unique_ptr<AuditTimeline> audit;std::unique_ptr<EmergencyCoordinator> emergency;std::unique_ptr<ContinuousOperationsRuntime> runtime;autonomy::agents::AgentId local_agent_id{0};autonomy::resources::ResourceAccountId workspace_account_id{0};
    explicit ProductionRuntime(RuntimeConfig c):config(std::move(c)),workspace(config.workspace){}
};
}
