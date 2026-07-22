#pragma once
#include "repository.hpp"
#include "../persistence/database.hpp"
#include <filesystem>
namespace exotic::autonomy::agents {
class SqliteAgentRepository final:public AgentRepository{
public:
    explicit SqliteAgentRepository(const std::filesystem::path& database_path);
    AgentId next_agent_id() override; CapabilityDefinitionId next_capability_definition_id() override; CapabilityEvidenceId next_capability_evidence_id() override; PerformanceRecordId next_performance_record_id() override; AssignmentId next_assignment_id() override; WorkerBindingId next_worker_binding_id() override;
    void save_agent(const AgentIdentity&) override; std::optional<AgentIdentity> load_agent(AgentId) override; std::optional<AgentIdentity> find_agent(std::string_view) override; std::vector<AgentIdentity> load_agents() override; std::vector<AgentIdentity> load_live_agents(TimePoint) override;
    void save_capability_definition(const CapabilityDefinition&) override; std::optional<CapabilityDefinition> load_capability_definition(std::string_view) override; std::vector<CapabilityDefinition> load_capability_definitions() override;
    void save_agent_capability(const AgentCapability&) override; std::vector<AgentCapability> load_agent_capabilities(AgentId) override; std::vector<AgentCapability> find_agents_with_capability(std::string_view) override;
    void save_tool_permission(const ToolPermission&) override; std::vector<ToolPermission> load_tool_permissions(AgentId) override;
    void append_capability_evidence(const CapabilityEvidence&) override; std::vector<CapabilityEvidence> load_capability_evidence(AgentId,std::string_view) override;
    void save_assignment(const WorkAssignment&) override; std::optional<WorkAssignment> load_assignment(AssignmentId) override; std::optional<WorkAssignment> find_assignment_by_job(scheduler::JobId) override; std::vector<WorkAssignment> load_active_assignments() override;
    void save_worker_binding(const WorkerBinding&) override; std::vector<WorkerBinding> load_active_bindings() override; std::vector<WorkerBinding> load_expired_bindings(TimePoint) override; bool heartbeat_binding(WorkerBindingId,TimePoint,TimePoint) override; bool release_binding(WorkerBindingId,TimePoint) override;
    void append_performance_record(const PerformanceRecord&) override; std::vector<PerformanceRecord> load_performance_records(AgentId,std::size_t) override;
    RegistryStatus status(TimePoint) override;
private:
    persistence::Database database_;
    void migrate(); std::uint64_t next_id(std::string_view table);
    void save_agent_children(const AgentIdentity&); void load_agent_children(AgentIdentity&);
    void save_assignment_children(const WorkAssignment&); void load_assignment_children(WorkAssignment&);
    std::optional<WorkerBinding> load_binding(WorkerBindingId);
};
}
