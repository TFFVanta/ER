#include "in_memory_repository.hpp"

#include <algorithm>

namespace exotic::autonomy::agents {

AgentId InMemoryAgentRepository::next_agent_id(){std::scoped_lock lock{mutex_};return next_agent_++;}
CapabilityDefinitionId InMemoryAgentRepository::next_capability_definition_id(){std::scoped_lock lock{mutex_};return next_definition_++;}
CapabilityEvidenceId InMemoryAgentRepository::next_capability_evidence_id(){std::scoped_lock lock{mutex_};return next_evidence_++;}
PerformanceRecordId InMemoryAgentRepository::next_performance_record_id(){std::scoped_lock lock{mutex_};return next_performance_++;}
AssignmentId InMemoryAgentRepository::next_assignment_id(){std::scoped_lock lock{mutex_};return next_assignment_++;}
WorkerBindingId InMemoryAgentRepository::next_worker_binding_id(){std::scoped_lock lock{mutex_};return next_binding_++;}

void InMemoryAgentRepository::save_agent(const AgentIdentity& agent){std::scoped_lock lock{mutex_};agents_[agent.id]=agent;}
std::optional<AgentIdentity> InMemoryAgentRepository::load_agent(AgentId id){std::scoped_lock lock{mutex_};auto it=agents_.find(id);return it==agents_.end()?std::nullopt:std::optional<AgentIdentity>{it->second};}
std::optional<AgentIdentity> InMemoryAgentRepository::find_agent(std::string_view key){std::scoped_lock lock{mutex_};for(const auto& [id,a]:agents_)if(a.identity_key==key)return a;return std::nullopt;}
std::vector<AgentIdentity> InMemoryAgentRepository::load_agents(){std::scoped_lock lock{mutex_};std::vector<AgentIdentity> out;for(const auto& [id,a]:agents_)out.push_back(a);return out;}
std::vector<AgentIdentity> InMemoryAgentRepository::load_live_agents(TimePoint cutoff){std::scoped_lock lock{mutex_};std::vector<AgentIdentity> out;for(const auto& [id,a]:agents_){if(a.status==AgentStatus::Active&&a.last_heartbeat_at&&*a.last_heartbeat_at>=cutoff)out.push_back(a);}return out;}

void InMemoryAgentRepository::save_capability_definition(const CapabilityDefinition& d){std::scoped_lock lock{mutex_};definitions_[d.key]=d;}
std::optional<CapabilityDefinition> InMemoryAgentRepository::load_capability_definition(std::string_view key){std::scoped_lock lock{mutex_};auto it=definitions_.find(std::string{key});return it==definitions_.end()?std::nullopt:std::optional<CapabilityDefinition>{it->second};}
std::vector<CapabilityDefinition> InMemoryAgentRepository::load_capability_definitions(){std::scoped_lock lock{mutex_};std::vector<CapabilityDefinition> out;for(const auto& [k,d]:definitions_)out.push_back(d);return out;}

void InMemoryAgentRepository::save_agent_capability(const AgentCapability& c){std::scoped_lock lock{mutex_};auto it=std::find_if(capabilities_.begin(),capabilities_.end(),[&](const auto& x){return x.agent_id==c.agent_id&&x.capability_key==c.capability_key;});if(it==capabilities_.end())capabilities_.push_back(c);else *it=c;}
std::vector<AgentCapability> InMemoryAgentRepository::load_agent_capabilities(AgentId id){std::scoped_lock lock{mutex_};std::vector<AgentCapability> out;for(const auto& c:capabilities_)if(c.agent_id==id)out.push_back(c);return out;}
std::vector<AgentCapability> InMemoryAgentRepository::find_agents_with_capability(std::string_view key){std::scoped_lock lock{mutex_};std::vector<AgentCapability> out;for(const auto& c:capabilities_)if(c.capability_key==key)out.push_back(c);return out;}

void InMemoryAgentRepository::save_tool_permission(const ToolPermission& p){std::scoped_lock lock{mutex_};auto it=std::find_if(permissions_.begin(),permissions_.end(),[&](const auto& x){return x.agent_id==p.agent_id&&x.tool_key==p.tool_key&&x.scope==p.scope;});if(it==permissions_.end())permissions_.push_back(p);else *it=p;}
std::vector<ToolPermission> InMemoryAgentRepository::load_tool_permissions(AgentId id){std::scoped_lock lock{mutex_};std::vector<ToolPermission> out;for(const auto& p:permissions_)if(p.agent_id==id)out.push_back(p);return out;}
void InMemoryAgentRepository::append_capability_evidence(const CapabilityEvidence& e){std::scoped_lock lock{mutex_};evidence_.push_back(e);}
std::vector<CapabilityEvidence> InMemoryAgentRepository::load_capability_evidence(AgentId id,std::string_view key){std::scoped_lock lock{mutex_};std::vector<CapabilityEvidence> out;for(const auto& e:evidence_)if(e.agent_id==id&&e.capability_key==key)out.push_back(e);return out;}

void InMemoryAgentRepository::save_assignment(const WorkAssignment& a){std::scoped_lock lock{mutex_};assignments_[a.id]=a;}
std::optional<WorkAssignment> InMemoryAgentRepository::load_assignment(AssignmentId id){std::scoped_lock lock{mutex_};auto it=assignments_.find(id);return it==assignments_.end()?std::nullopt:std::optional<WorkAssignment>{it->second};}
std::optional<WorkAssignment> InMemoryAgentRepository::find_assignment_by_job(scheduler::JobId id){std::scoped_lock lock{mutex_};for(const auto& [aid,a]:assignments_)if(a.job_id==id)return a;return std::nullopt;}
std::vector<WorkAssignment> InMemoryAgentRepository::load_active_assignments(){std::scoped_lock lock{mutex_};std::vector<WorkAssignment> out;for(const auto& [id,a]:assignments_)if(a.status==AssignmentStatus::Bound||a.status==AssignmentStatus::Running||a.status==AssignmentStatus::Replacing)out.push_back(a);return out;}

void InMemoryAgentRepository::save_worker_binding(const WorkerBinding& b){std::scoped_lock lock{mutex_};bindings_[b.id]=b;}
std::vector<WorkerBinding> InMemoryAgentRepository::load_active_bindings(){std::scoped_lock lock{mutex_};std::vector<WorkerBinding> out;for(const auto& [id,b]:bindings_)if(!b.released)out.push_back(b);return out;}
std::vector<WorkerBinding> InMemoryAgentRepository::load_expired_bindings(TimePoint now){std::scoped_lock lock{mutex_};std::vector<WorkerBinding> out;for(const auto& [id,b]:bindings_)if(!b.released&&b.expires_at<=now)out.push_back(b);return out;}
bool InMemoryAgentRepository::heartbeat_binding(WorkerBindingId id,TimePoint h,TimePoint e){std::scoped_lock lock{mutex_};auto it=bindings_.find(id);if(it==bindings_.end()||it->second.released)return false;it->second.heartbeat_at=h;it->second.expires_at=e;return true;}
bool InMemoryAgentRepository::release_binding(WorkerBindingId id,TimePoint){std::scoped_lock lock{mutex_};auto it=bindings_.find(id);if(it==bindings_.end())return false;it->second.released=true;return true;}

void InMemoryAgentRepository::append_performance_record(const PerformanceRecord& r){std::scoped_lock lock{mutex_};performance_.push_back(r);}
std::vector<PerformanceRecord> InMemoryAgentRepository::load_performance_records(AgentId id,std::size_t limit){std::scoped_lock lock{mutex_};std::vector<PerformanceRecord> out;for(auto it=performance_.rbegin();it!=performance_.rend()&&out.size()<limit;++it)if(it->agent_id==id)out.push_back(*it);return out;}
RegistryStatus InMemoryAgentRepository::status(TimePoint cutoff){std::scoped_lock lock{mutex_};RegistryStatus s;for(const auto& [id,a]:agents_){++s.registered;if(a.status==AgentStatus::Active)++s.active;if(a.status==AgentStatus::Revoked)++s.revoked;if(a.health==HealthState::Unhealthy)++s.unhealthy;if(a.status==AgentStatus::Active&&a.availability==Availability::Available&&a.last_heartbeat_at&&*a.last_heartbeat_at>=cutoff)++s.available;}for(const auto& [id,a]:assignments_)if(a.status==AssignmentStatus::Running)++s.running_assignments;for(const auto& [id,b]:bindings_)if(!b.released&&b.expires_at<Clock::now())++s.stale_bindings;return s;}

} // namespace exotic::autonomy::agents
