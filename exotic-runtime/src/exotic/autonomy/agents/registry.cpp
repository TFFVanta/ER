#include "registry.hpp"
#include <algorithm>
#include <stdexcept>
namespace exotic::autonomy::agents {
AgentId AgentRegistry::register_agent(AgentIdentity agent){
    if(agent.identity_key.empty()) throw std::invalid_argument("Agent identity key cannot be empty");
    if(repository_.find_agent(agent.identity_key)) throw std::invalid_argument("Agent identity key already exists");
    if (agent.id == 0) {
        agent.id = repository_.next_agent_id();
    }
    agent.registered_at = Clock::now();
    agent.updated_at = agent.registered_at;
    if (agent.workload.maximum_tasks == 0) {
        agent.workload.maximum_tasks = 1;
    }
    repository_.save_agent(agent);
    return agent.id;
}
bool AgentRegistry::activate(AgentId id){auto a=repository_.load_agent(id);if(!a||a->status==AgentStatus::Revoked)return false;a->status=AgentStatus::Active;a->health=HealthState::Healthy;a->availability=Availability::Available;a->updated_at=Clock::now();a->last_heartbeat_at=a->updated_at;repository_.save_agent(*a);return true;}
bool AgentRegistry::revoke(AgentId id,std::string reason,TimePoint at){auto a=repository_.load_agent(id);if(!a)return false;a->status=AgentStatus::Revoked;a->availability=Availability::Unavailable;a->revoked_at=at;a->revocation_reason=std::move(reason);a->updated_at=at;repository_.save_agent(*a);return true;}
bool AgentRegistry::heartbeat(AgentId id,HealthState health,Availability availability,WorkloadState workload,TimePoint at){auto a=repository_.load_agent(id);if(!a||a->status==AgentStatus::Revoked)return false;a->health=health;a->availability=availability;a->workload=workload;a->workload.updated_at=at;a->last_heartbeat_at=at;a->updated_at=at;if(a->status==AgentStatus::Offline||a->status==AgentStatus::Registered)a->status=AgentStatus::Active;if(health==HealthState::Unhealthy)a->status=AgentStatus::Unhealthy;repository_.save_agent(*a);return true;}
bool AgentRegistry::set_availability(AgentId id,Availability v){auto a=repository_.load_agent(id);if(!a||a->status==AgentStatus::Revoked)return false;a->availability=v;a->updated_at=Clock::now();repository_.save_agent(*a);return true;}
bool AgentRegistry::set_health(AgentId id,HealthState v){auto a=repository_.load_agent(id);if(!a||a->status==AgentStatus::Revoked)return false;a->health=v;a->status=v==HealthState::Unhealthy?AgentStatus::Unhealthy:AgentStatus::Active;a->updated_at=Clock::now();repository_.save_agent(*a);return true;}
void AgentRegistry::define_capability(CapabilityDefinition d){taxonomy_.define(std::move(d));}
void AgentRegistry::grant_capability(AgentCapability c){if(!repository_.load_agent(c.agent_id))throw std::invalid_argument("Unknown agent");if(!repository_.load_capability_definition(c.capability_key))throw std::invalid_argument("Unknown capability");c.proficiency=clamp_score(c.proficiency);c.reliability=clamp_score(c.reliability);repository_.save_agent_capability(c);}
void AgentRegistry::grant_tool_permission(ToolPermission p){if(!repository_.load_agent(p.agent_id))throw std::invalid_argument("Unknown agent");if(p.tool_key.empty())throw std::invalid_argument("Tool key cannot be empty");repository_.save_tool_permission(p);}
CapabilityEvidenceId AgentRegistry::add_evidence(CapabilityEvidence e){if(e.id==0)e.id=repository_.next_capability_evidence_id();e.confidence=clamp_score(e.confidence);repository_.append_capability_evidence(e);return e.id;}
bool AgentRegistry::tool_allowed(AgentId id,const ToolRequirement& req,TimePoint at){for(const auto& p:repository_.load_tool_permissions(id)){if(p.tool_key!=req.tool_key)continue;if(at<p.valid_from||(p.valid_until&&at>*p.valid_until))continue;if(!(p.scope=="*"||req.scope==p.scope))continue;if(p.operations.empty()||p.operations.contains("*")||p.operations.contains(req.operation))return p.allowed;}return !req.required;}
std::optional<AgentIdentity> AgentRegistry::load(AgentId id){return repository_.load_agent(id);}
}
