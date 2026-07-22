#pragma once

#include "repository.hpp"

#include <mutex>
#include <unordered_map>

namespace exotic::autonomy::agents {

class InMemoryAgentRepository final : public AgentRepository {
public:
    AgentId next_agent_id() override;
    CapabilityDefinitionId next_capability_definition_id() override;
    CapabilityEvidenceId next_capability_evidence_id() override;
    PerformanceRecordId next_performance_record_id() override;
    AssignmentId next_assignment_id() override;
    WorkerBindingId next_worker_binding_id() override;

    void save_agent(const AgentIdentity& agent) override;
    std::optional<AgentIdentity> load_agent(AgentId id) override;
    std::optional<AgentIdentity> find_agent(std::string_view identity_key) override;
    std::vector<AgentIdentity> load_agents() override;
    std::vector<AgentIdentity> load_live_agents(TimePoint heartbeat_cutoff) override;

    void save_capability_definition(const CapabilityDefinition& definition) override;
    std::optional<CapabilityDefinition> load_capability_definition(std::string_view key) override;
    std::vector<CapabilityDefinition> load_capability_definitions() override;

    void save_agent_capability(const AgentCapability& capability) override;
    std::vector<AgentCapability> load_agent_capabilities(AgentId agent_id) override;
    std::vector<AgentCapability> find_agents_with_capability(std::string_view capability_key) override;

    void save_tool_permission(const ToolPermission& permission) override;
    std::vector<ToolPermission> load_tool_permissions(AgentId agent_id) override;

    void append_capability_evidence(const CapabilityEvidence& evidence) override;
    std::vector<CapabilityEvidence> load_capability_evidence(AgentId agent_id, std::string_view capability_key) override;

    void save_assignment(const WorkAssignment& assignment) override;
    std::optional<WorkAssignment> load_assignment(AssignmentId id) override;
    std::optional<WorkAssignment> find_assignment_by_job(scheduler::JobId job_id) override;
    std::vector<WorkAssignment> load_active_assignments() override;

    void save_worker_binding(const WorkerBinding& binding) override;
    std::vector<WorkerBinding> load_active_bindings() override;
    std::vector<WorkerBinding> load_expired_bindings(TimePoint now) override;
    bool heartbeat_binding(WorkerBindingId id, TimePoint heartbeat_at, TimePoint expires_at) override;
    bool release_binding(WorkerBindingId id, TimePoint released_at) override;

    void append_performance_record(const PerformanceRecord& record) override;
    std::vector<PerformanceRecord> load_performance_records(AgentId agent_id, std::size_t limit) override;

    RegistryStatus status(TimePoint heartbeat_cutoff) override;

private:
    std::mutex mutex_;
    AgentId next_agent_{1};
    CapabilityDefinitionId next_definition_{1};
    CapabilityEvidenceId next_evidence_{1};
    PerformanceRecordId next_performance_{1};
    AssignmentId next_assignment_{1};
    WorkerBindingId next_binding_{1};
    std::unordered_map<AgentId, AgentIdentity> agents_;
    std::unordered_map<std::string, CapabilityDefinition> definitions_;
    std::vector<AgentCapability> capabilities_;
    std::vector<ToolPermission> permissions_;
    std::vector<CapabilityEvidence> evidence_;
    std::unordered_map<AssignmentId, WorkAssignment> assignments_;
    std::unordered_map<WorkerBindingId, WorkerBinding> bindings_;
    std::vector<PerformanceRecord> performance_;
};

} // namespace exotic::autonomy::agents
