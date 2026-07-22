#pragma once
#include "registry.hpp"
#include "../governance/authority_gate.hpp"
#include "../resources/governor.hpp"
namespace exotic::autonomy::agents {
class GovernanceCompatibility {
public: virtual ~GovernanceCompatibility()=default; virtual CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&)=0; };
class ResourceCompatibility {
public: virtual ~ResourceCompatibility()=default; virtual CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&,double estimated_agent_cost_usd)=0; };
class AllowAllGovernanceCompatibility final:public GovernanceCompatibility{public:CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&)override{return {true,false,CompatibilityFailure::None,"allowed"};}};
class AllowAllResourceCompatibility final:public ResourceCompatibility{public:CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&,double)override{return {true,false,CompatibilityFailure::None,"allowed"};}};
class GovernanceAgentCompatibility final:public GovernanceCompatibility{
public:GovernanceAgentCompatibility(governance::AuthorityGate& gate,governance::GovernanceRepository& repository):gate_(gate),repository_(repository){} CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&)override;
private:governance::AuthorityGate& gate_;governance::GovernanceRepository& repository_;
};
class ResourceBudgetCompatibility final:public ResourceCompatibility{
public:explicit ResourceBudgetCompatibility(resources::ResourceGovernor& governor):governor_(governor){} CompatibilityDecision validate(const AgentIdentity&,const TaskRequirement&,double)override;
private:resources::ResourceGovernor& governor_;
};
}
