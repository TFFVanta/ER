#include "decision_gate.hpp"
namespace exotic::autonomy {
DecisionResult DecisionGate::evaluate(const Proposal& proposal) const {
    if(proposal.objective_id==0)return{DecisionType::Deny,"Proposal is not connected to an objective."};
    if(proposal.plan.steps.empty())return{DecisionType::RequestRevision,"Proposal has no executable steps."};
    if(proposal.confidence<0.70)return{DecisionType::RequestRevision,"Proposal confidence is below the required threshold."};
    if(proposal.risk==RiskLevel::Critical)return{DecisionType::Deny,"Critical-risk proposals cannot execute automatically."};
    if(proposal.risk==RiskLevel::High||proposal.human_approval_required)return{DecisionType::RequireApproval,"Human approval is required."};
    if(proposal.cost.estimated_usd>25.0)return{DecisionType::RequireApproval,"Proposal exceeds the automatic spending limit."};
    return{DecisionType::Approve,"Proposal passed the decision gate."};
}
}
