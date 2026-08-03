#pragma once
#include "router.hpp"
namespace exotic::autonomy::agents {
struct AgentRecoveryReport{std::size_t stale_agents{0};std::size_t released_bindings{0};std::size_t interrupted_assignments{0};std::size_t replacements_created{0};std::vector<AssignmentId> unresolved_assignments;};
class AgentRecoveryManager{
public:AgentRecoveryManager(AgentRepository&,WorkAllocator&);AgentRecoveryReport recover(TimePoint now=Clock::now(),std::chrono::milliseconds heartbeat_timeout=std::chrono::seconds(30));
private:AgentRepository& repository_;WorkAllocator& allocator_;
};
}
