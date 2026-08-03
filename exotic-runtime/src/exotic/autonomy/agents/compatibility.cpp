#include "compatibility.hpp"
namespace exotic::autonomy::agents {
CompatibilityDecision GovernanceAgentCompatibility::validate(const AgentIdentity& agent,const TaskRequirement& requirement){
    governance::Subject subject;subject.id=agent.identity_key;subject.roles=agent.roles;subject.attributes=agent.attributes;
    governance::Resource resource;resource.type="proposal";resource.id=std::to_string(requirement.proposal_id);resource.attributes={{"domain",requirement.domain}};
    governance::AuthorityContext context;context.subject=std::move(subject);context.resource=std::move(resource);context.action=requirement.action;context.risk=RiskLevel::Medium;context.requested_autonomy=governance::AutonomyLevel::Bounded;context.budget_usd=requirement.maximum_team_cost_usd;context.simulation=requirement.simulation;context.proposal_id=requirement.proposal_id;
    auto result=gate_.revalidate(context);
    if(result.allowed)return {true,requirement.simulation,CompatibilityFailure::None,result.reason};
    if(!result.approval_required||!requirement.governance_approval_id)return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,result.reason};
    auto approval=repository_.load_request(*requirement.governance_approval_id);
    if(!approval)return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval was not found"};
    if(approval->status!=governance::ApprovalStatus::Approved)return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval is not approved"};
    if(approval->proposal_id!=requirement.proposal_id||approval->action!=requirement.action)return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval does not match the task"};
    if(approval->resource.type!="proposal"||approval->resource.id!=std::to_string(requirement.proposal_id))return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval scope does not match the proposal"};
    if(approval->expires_at<=Clock::now())return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval has expired"};
    if(approval->requested_budget_usd+1e-9<requirement.maximum_team_cost_usd)return {false,requirement.simulation,CompatibilityFailure::GovernanceDenied,"Governance approval budget is insufficient"};
    if(approval->simulation_only&&!requirement.simulation)return {false,false,CompatibilityFailure::GovernanceDenied,"Simulation-only approval cannot authorize real execution"};
    return {true,requirement.simulation||approval->simulation_only,CompatibilityFailure::None,"Durable governance approval revalidated for selected agent"};
}
CompatibilityDecision ResourceBudgetCompatibility::validate(const AgentIdentity& agent,const TaskRequirement& requirement,double estimated_agent_cost_usd){
    if(requirement.resource_account_id==0)return {false,false,CompatibilityFailure::ResourceIncompatible,"No resource account was supplied"};
    resources::AdmissionRequest request;request.job_id=requirement.job_id;request.proposal_id=requirement.proposal_id;request.leaf_account_id=requirement.resource_account_id;request.workload_key="agent-preflight:"+agent.identity_key;request.idempotency_key="preview:"+std::to_string(requirement.job_id)+":"+std::to_string(agent.id);request.estimate=requirement.resource_estimate;request.estimate.add(resources::ResourceDimension::MoneyUsd,estimated_agent_cost_usd);request.governance_approval_id=requirement.governance_approval_id;request.reservation_ttl=requirement.reservation_ttl;request.simulation=true;
    auto decision=governor_.preview(request);return {decision.allowed,true,decision.allowed?CompatibilityFailure::None:CompatibilityFailure::ResourceIncompatible,decision.reason};
}
}
