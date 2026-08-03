#include "scoring.hpp"
#include <algorithm>
#include <cmath>
#include <unordered_map>
namespace exotic::autonomy::agents {
CandidateScorer::CandidateScorer(AgentRepository&r,AgentRegistry&g,GovernanceCompatibility&gov,ResourceCompatibility&res,ScoringWeights w):repository_(r),registry_(g),governance_(gov),resources_(res),weights_(w){}
double CandidateScorer::estimated_cost(const AgentIdentity&a,const TaskRequirement&r)const{return a.cost.fixed_cost_usd+a.cost.hourly_cost_usd*std::max(0.0,r.estimated_duration_hours);}
CandidateScore CandidateScorer::score(const AgentIdentity&a,const TaskRequirement&r){
    CandidateScore s;s.agent_id=a.id;
    if(a.status!=AgentStatus::Active){s.failure=CompatibilityFailure::Unavailable;s.reason="Agent is not active";return s;}
    if(a.availability==Availability::Unavailable||a.workload.active_tasks>=a.workload.maximum_tasks){s.failure=CompatibilityFailure::Unavailable;s.reason="Agent has no workload capacity";return s;}
    if(a.health==HealthState::Unhealthy||a.health==HealthState::Unknown){s.failure=CompatibilityFailure::Unhealthy;s.reason="Agent health is not sufficient";return s;}
    if(!trust_satisfies(a.trust,r.minimum_trust)){s.failure=CompatibilityFailure::TrustInsufficient;s.reason="Agent trust is below requirement";return s;}
    if(!r.domain.empty()&&!a.domain_scopes.empty()&&std::find(a.domain_scopes.begin(),a.domain_scopes.end(),r.domain)==a.domain_scopes.end()&&std::find(a.domain_scopes.begin(),a.domain_scopes.end(),"*")==a.domain_scopes.end()){s.failure=CompatibilityFailure::DomainMismatch;s.reason="Agent domain scope does not match";return s;}
    for(const auto&t:r.tools)if(!registry_.tool_allowed(a.id,t)){s.failure=CompatibilityFailure::ToolDenied;s.reason="Required tool permission is missing: "+t.tool_key;return s;}
    std::unordered_map<std::string,AgentCapability> caps;for(const auto&c:repository_.load_agent_capabilities(a.id))caps[c.capability_key]=c;
    double weight_sum=0,fit_sum=0,rel_sum=0;std::size_t required_covered=0;std::size_t required_total=0;
    for(const auto& req:r.capabilities){
        if(req.required)++required_total;
        auto it=caps.find(req.capability_key);
        const bool meets=it!=caps.end()&&it->second.proficiency>=req.minimum_proficiency&&it->second.reliability>=req.minimum_reliability;
        if(!meets){
            if(req.required&&r.maximum_team_size<=1){s.failure=CompatibilityFailure::CapabilityMissing;s.reason="Required capability is missing: "+req.capability_key;return s;}
            continue;
        }
        if(req.required)++required_covered;
        double w=std::max(0.0,req.weight);weight_sum+=w;fit_sum+=clamp_score(it->second.proficiency)*w;rel_sum+=clamp_score(it->second.reliability)*w;s.covered_capabilities.push_back(req.capability_key);
    }
    if(required_total>0&&required_covered==0){s.failure=CompatibilityFailure::CapabilityMissing;s.reason="Agent covers none of the required team capabilities";return s;}
    s.capability_fit=weight_sum>0?fit_sum/weight_sum:1.0;s.reliability=weight_sum>0?rel_sum/weight_sum:0.5;
    const double cost=estimated_cost(a,r);if(r.maximum_team_cost_usd>0&&cost>r.maximum_team_cost_usd){s.failure=CompatibilityFailure::CostExceeded;s.reason="Agent cost exceeds team budget";return s;}
    auto gd=governance_.validate(a,r);if(!gd.allowed){s.failure=gd.failure;s.reason=gd.reason;return s;}auto rd=resources_.validate(a,r,cost);if(!rd.allowed){s.failure=rd.failure;s.reason=rd.reason;return s;}
    s.trust_fit=static_cast<double>(static_cast<std::uint8_t>(a.trust)+1)/5.0;s.availability_fit=a.availability==Availability::Available?1.0:0.55;s.health_fit=a.health==HealthState::Healthy?1.0:0.65;s.workload_fit=1.0-clamp_score(a.workload.utilization);s.cost_fit=r.maximum_team_cost_usd>0?clamp_score(1.0-cost/r.maximum_team_cost_usd):1.0;s.domain_fit=r.domain.empty()||a.domain_scopes.empty()?0.75:1.0;
    s.total=clamp_score(s.capability_fit*weights_.capability+s.reliability*weights_.reliability+s.trust_fit*weights_.trust+s.availability_fit*weights_.availability+s.health_fit*weights_.health+s.workload_fit*weights_.workload+s.cost_fit*weights_.cost+s.domain_fit*weights_.domain);s.eligible=true;s.reason="eligible";return s;
}
}
