#pragma once
#include "taxonomy.hpp"
namespace exotic::autonomy::agents {
class AgentRegistry {
public:
    explicit AgentRegistry(AgentRepository& repository):repository_(repository),taxonomy_(repository){}
    AgentId register_agent(AgentIdentity agent);
    bool activate(AgentId id);
    bool revoke(AgentId id,std::string reason,TimePoint at=Clock::now());
    bool heartbeat(AgentId id,HealthState health,Availability availability,WorkloadState workload,TimePoint at=Clock::now());
    bool set_availability(AgentId id,Availability availability);
    bool set_health(AgentId id,HealthState health);
    void define_capability(CapabilityDefinition definition);
    void grant_capability(AgentCapability capability);
    void grant_tool_permission(ToolPermission permission);
    CapabilityEvidenceId add_evidence(CapabilityEvidence evidence);
    [[nodiscard]] bool tool_allowed(AgentId id,const ToolRequirement& requirement,TimePoint at=Clock::now());
    [[nodiscard]] std::optional<AgentIdentity> load(AgentId id);
    [[nodiscard]] AgentRepository& repository() noexcept{return repository_;}
private:
    AgentRepository& repository_;
    CapabilityTaxonomy taxonomy_;
};
}
