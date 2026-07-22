#pragma once
#include "compatibility.hpp"
namespace exotic::autonomy::agents {
struct ScoringWeights{double capability{0.30};double reliability{0.18};double trust{0.10};double availability{0.10};double health{0.10};double workload{0.10};double cost{0.07};double domain{0.05};};
class CandidateScorer{
public:CandidateScorer(AgentRepository&,AgentRegistry&,GovernanceCompatibility&,ResourceCompatibility&,ScoringWeights={});
CandidateScore score(const AgentIdentity&,const TaskRequirement&);
double estimated_cost(const AgentIdentity&,const TaskRequirement&)const;
private:AgentRepository& repository_;AgentRegistry& registry_;GovernanceCompatibility& governance_;ResourceCompatibility& resources_;ScoringWeights weights_;
};
}
