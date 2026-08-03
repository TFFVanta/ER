#pragma once

#include "types.hpp"

#include <optional>
#include <string_view>
#include <vector>

namespace exotic::autonomy::agents {

class AgentRepository {
public:
    virtual ~AgentRepository() = default;

    virtual AgentId next_agent_id() = 0;
    virtual CapabilityDefinitionId next_capability_definition_id() = 0;
    virtual CapabilityEvidenceId next_capability_evidence_id() = 0;
    virtual PerformanceRecordId next_performance_record_id() = 0;
    virtual AssignmentId next_assignment_id() = 0;
    virtual WorkerBindingId next_worker_binding_id() = 0;

    virtual void save_agent(const AgentIdentity& agent) = 0;
    virtual std::optional<AgentIdentity> load_agent(AgentId id) = 0;
    virtual std::optional<AgentIdentity> find_agent(std::string_view identity_key) = 0;
    virtual std::vector<AgentIdentity> load_agents() = 0;
    virtual std::vector<AgentIdentity> load_live_agents(TimePoint heartbeat_cutoff) = 0;

    virtual void save_capability_definition(const CapabilityDefinition& definition) = 0;
    virtual std::optional<CapabilityDefinition> load_capability_definition(std::string_view key) = 0;
    virtual std::vector<CapabilityDefinition> load_capability_definitions() = 0;

    virtual void save_agent_capability(const AgentCapability& capability) = 0;
    virtual std::vector<AgentCapability> load_agent_capabilities(AgentId agent_id) = 0;
    virtual std::vector<AgentCapability> find_agents_with_capability(std::string_view capability_key) = 0;

    virtual void save_tool_permission(const ToolPermission& permission) = 0;
    virtual std::vector<ToolPermission> load_tool_permissions(AgentId agent_id) = 0;

    virtual void append_capability_evidence(const CapabilityEvidence& evidence) = 0;
    virtual std::vector<CapabilityEvidence> load_capability_evidence(AgentId agent_id, std::string_view capability_key) = 0;

    virtual void save_assignment(const WorkAssignment& assignment) = 0;
    virtual std::optional<WorkAssignment> load_assignment(AssignmentId id) = 0;
    virtual std::optional<WorkAssignment> find_assignment_by_job(scheduler::JobId job_id) = 0;
    virtual std::vector<WorkAssignment> load_active_assignments() = 0;

    virtual void save_worker_binding(const WorkerBinding& binding) = 0;
    virtual std::vector<WorkerBinding> load_active_bindings() = 0;
    virtual std::vector<WorkerBinding> load_expired_bindings(TimePoint now) = 0;
    virtual bool heartbeat_binding(WorkerBindingId id, TimePoint heartbeat_at, TimePoint expires_at) = 0;
    virtual bool release_binding(WorkerBindingId id, TimePoint released_at) = 0;

    virtual void append_performance_record(const PerformanceRecord& record) = 0;
    virtual std::vector<PerformanceRecord> load_performance_records(AgentId agent_id, std::size_t limit) = 0;

    virtual RegistryStatus status(TimePoint heartbeat_cutoff) = 0;
};

} // namespace exotic::autonomy::agents
