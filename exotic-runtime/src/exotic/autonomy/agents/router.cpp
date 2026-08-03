#include "router.hpp"
#include <algorithm>
#include <numeric>
#include <unordered_set>
namespace exotic::autonomy::agents {
WorkAllocator::WorkAllocator(AgentRepository&r,CandidateScorer&s,RouterConfig c):repository_(r),scorer_(s),config_(c){}
std::vector<CandidateScore> WorkAllocator::rank(const TaskRequirement&r){
    auto agents=repository_.load_live_agents(Clock::now()-config_.liveness_window);std::vector<CandidateScore> scores;scores.reserve(agents.size());
    for(const auto&a:agents){if(std::find(r.excluded_agents.begin(),r.excluded_agents.end(),a.id)!=r.excluded_agents.end())continue;scores.push_back(scorer_.score(a,r));}
    std::stable_sort(scores.begin(),scores.end(),[](const auto&l,const auto&r){if(l.eligible!=r.eligible)return l.eligible>r.eligible;return l.total>r.total;});return scores;
}
std::optional<WorkPlan> WorkAllocator::form_team(const TaskRequirement&r,const std::vector<CandidateScore>&scores){
    std::vector<CandidateScore> eligible;for(const auto&s:scores)if(s.eligible&&s.total>=config_.minimum_candidate_score)eligible.push_back(s);if(eligible.size()<r.minimum_team_size)return std::nullopt;
    const auto desired=std::clamp<std::uint32_t>(r.preferred_team_size,r.minimum_team_size,std::max(r.minimum_team_size,r.maximum_team_size));WorkPlan plan;plan.mode=r.mode;double total_score=0,total_cost=0;
    std::unordered_set<std::string> covered;for(const auto&candidate:eligible){if(plan.agent_ids.size()>=desired)break;auto agent=repository_.load_agent(candidate.agent_id);if(!agent)continue;double cost=scorer_.estimated_cost(*agent,r);if(r.maximum_team_cost_usd>0&&total_cost+cost>r.maximum_team_cost_usd)continue;bool adds=plan.agent_ids.empty();for(const auto&c:candidate.covered_capabilities)if(!covered.contains(c)){adds=true;break;}if(!adds&&plan.agent_ids.size()>=r.minimum_team_size)continue;plan.agent_ids.push_back(candidate.agent_id);total_score+=candidate.total;total_cost+=cost;for(const auto&c:candidate.covered_capabilities)covered.insert(c);}
    if(plan.agent_ids.size()<r.minimum_team_size)return std::nullopt;
    for(const auto&req:r.capabilities)if(req.required&&!covered.contains(req.capability_key))return std::nullopt;
    if(r.supervisor_required){for(const auto&candidate:eligible){if(std::find(plan.agent_ids.begin(),plan.agent_ids.end(),candidate.agent_id)==plan.agent_ids.end())continue;if(!r.supervisor_capability||std::find(candidate.covered_capabilities.begin(),candidate.covered_capabilities.end(),*r.supervisor_capability)!=candidate.covered_capabilities.end()){plan.supervisor_id=candidate.agent_id;break;}}if(!plan.supervisor_id)return std::nullopt;plan.mode=WorkPlanMode::SupervisorWorkers;}
    if(plan.mode==WorkPlanMode::Sequential){for(std::size_t i=0;i<plan.agent_ids.size();++i){WorkStage st;st.index=static_cast<std::uint32_t>(i);st.name="stage-"+std::to_string(i+1);st.mode=WorkPlanMode::Single;st.agent_ids={plan.agent_ids[i]};if(i>0)st.depends_on_stages={static_cast<std::uint32_t>(i-1)};plan.stages.push_back(std::move(st));}}
    else {WorkStage st;st.index=0;st.name=plan.mode==WorkPlanMode::Parallel?"parallel-work":"assigned-work";st.mode=plan.mode;st.agent_ids=plan.agent_ids;plan.stages.push_back(std::move(st));}
    plan.estimated_cost_usd=total_cost;plan.score=total_score/static_cast<double>(plan.agent_ids.size());return plan;
}
AllocationDecision WorkAllocator::allocate(TaskRequirement requirement){
    if(requirement.job_id==0||requirement.proposal_id==0||requirement.minimum_team_size==0||requirement.maximum_team_size<requirement.minimum_team_size)return {false,CompatibilityFailure::InvalidRequirement,"Invalid task requirement",std::nullopt,{}};
    auto existing=repository_.find_assignment_by_job(requirement.job_id);
    if(existing&&existing->status!=AssignmentStatus::Failed&&existing->status!=AssignmentStatus::Cancelled&&existing->status!=AssignmentStatus::Interrupted)return {true,CompatibilityFailure::None,"Existing durable assignment reused",existing,{}};
    auto scores=rank(requirement);auto plan=form_team(requirement,scores);if(!plan)return {false,CompatibilityFailure::NoCandidate,"No authorized team satisfies all constraints",std::nullopt,std::move(scores)};
    WorkAssignment assignment;
    if(existing){assignment=*existing;assignment.version+=1;assignment.status=AssignmentStatus::Planned;assignment.failure_reason.clear();assignment.started_at.reset();assignment.completed_at.reset();assignment.reservation_id.reset();assignment.requirement=std::move(requirement);assignment.plan=std::move(*plan);assignment.updated_at=Clock::now();}
    else {assignment.id=repository_.next_assignment_id();assignment.job_id=requirement.job_id;assignment.proposal_id=requirement.proposal_id;assignment.requirement=std::move(requirement);assignment.plan=std::move(*plan);assignment.continuity_key="job:"+std::to_string(assignment.job_id);assignment.created_at=Clock::now();assignment.updated_at=assignment.created_at;}
    repository_.save_assignment(assignment);return {true,CompatibilityFailure::None,existing?"Assignment replanned with continuity preserved":"Team allocated",assignment,std::move(scores)};
}
AllocationDecision WorkAllocator::replace(AssignmentId id,AgentId failed,std::string reason){
    auto current=repository_.load_assignment(id);if(!current)return {false,CompatibilityFailure::InvalidRequirement,"Assignment not found",std::nullopt,{}};current->status=AssignmentStatus::Replacing;current->failure_reason=reason;current->updated_at=Clock::now();repository_.save_assignment(*current);
    auto requirement=current->requirement;requirement.excluded_agents.push_back(failed);for(auto id2:current->plan.agent_ids)if(id2!=failed)requirement.excluded_agents.push_back(id2);requirement.excluded_agents.erase(std::remove(requirement.excluded_agents.begin(),requirement.excluded_agents.end(),failed),requirement.excluded_agents.end());
    auto replacementScores=rank(requirement);AgentId replacement=0;for(const auto&s:replacementScores)if(s.eligible&&std::find(current->plan.agent_ids.begin(),current->plan.agent_ids.end(),s.agent_id)==current->plan.agent_ids.end()){replacement=s.agent_id;break;}if(replacement==0){current->status=AssignmentStatus::Failed;current->updated_at=Clock::now();repository_.save_assignment(*current);return {false,CompatibilityFailure::NoCandidate,"No replacement agent available",current,std::move(replacementScores)};}
    auto it=std::find(current->plan.agent_ids.begin(),current->plan.agent_ids.end(),failed);if(it!=current->plan.agent_ids.end())*it=replacement;for(auto&stage:current->plan.stages)for(auto&aid:stage.agent_ids)if(aid==failed)aid=replacement;if(current->plan.supervisor_id&&*current->plan.supervisor_id==failed)current->plan.supervisor_id=replacement;current->version+=1;current->status=AssignmentStatus::Bound;current->failure_reason="Replaced agent "+std::to_string(failed)+": "+reason;current->updated_at=Clock::now();repository_.save_assignment(*current);return {true,CompatibilityFailure::None,"Replacement assigned without changing continuity key",current,std::move(replacementScores)};
}
}
