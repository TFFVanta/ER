#pragma once
#include "scoring.hpp"
namespace exotic::autonomy::agents {
struct RouterConfig{std::chrono::milliseconds liveness_window{30000};double minimum_candidate_score{0.45};};
class WorkAllocator{
public:WorkAllocator(AgentRepository&,CandidateScorer&,RouterConfig={});
AllocationDecision allocate(TaskRequirement requirement);
AllocationDecision replace(AssignmentId assignment_id,AgentId failed_agent,std::string reason);
private:AgentRepository& repository_;CandidateScorer& scorer_;RouterConfig config_;
std::vector<CandidateScore> rank(const TaskRequirement&);
std::optional<WorkPlan> form_team(const TaskRequirement&,const std::vector<CandidateScore>&);
};
}
