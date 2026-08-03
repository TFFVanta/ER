#include "recovery.hpp"
#include <algorithm>
namespace exotic::autonomy::agents {
AgentRecoveryManager::AgentRecoveryManager(AgentRepository&r,WorkAllocator&a):repository_(r),allocator_(a){}
AgentRecoveryReport AgentRecoveryManager::recover(TimePoint now,std::chrono::milliseconds timeout){AgentRecoveryReport report;const auto cutoff=now-timeout;auto agents=repository_.load_agents();for(auto&a:agents){if(a.status==AgentStatus::Active&&(!a.last_heartbeat_at||*a.last_heartbeat_at<cutoff)){a.status=AgentStatus::Offline;a.availability=Availability::Unavailable;a.updated_at=now;repository_.save_agent(a);++report.stale_agents;}}
    auto expired=repository_.load_expired_bindings(now);for(const auto&b:expired){repository_.release_binding(b.id,now);++report.released_bindings;auto assignment=repository_.load_assignment(b.assignment_id);if(!assignment)continue;if(assignment->status==AssignmentStatus::Completed||assignment->status==AssignmentStatus::Cancelled)continue;assignment->status=AssignmentStatus::Interrupted;assignment->failure_reason="Worker binding expired during restart recovery";assignment->updated_at=now;repository_.save_assignment(*assignment);++report.interrupted_assignments;auto replacement=allocator_.replace(assignment->id,b.agent_id,"stale worker binding");if(replacement.allocated)++report.replacements_created;else report.unresolved_assignments.push_back(assignment->id);}
    for(auto assignment:repository_.load_active_assignments()){if(assignment.status==AssignmentStatus::Running){assignment.status=AssignmentStatus::Interrupted;assignment.failure_reason="Process restarted before assignment completion";assignment.updated_at=now;repository_.save_assignment(assignment);++report.interrupted_assignments;}}
    return report;}
}
