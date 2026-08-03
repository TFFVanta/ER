#include "scheduler_bridge.hpp"
namespace exotic::autonomy::governance {
GovernedExecutionBridge::GovernedExecutionBridge(AuthorityGate&g,scheduler::ExecutionBridge&i,Subject w,double b,bool s):gate_(g),inner_(i),worker_(std::move(w)),budget_(b),simulation_(s){}
scheduler::ExecutionResult GovernedExecutionBridge::execute(const scheduler::Job&j,std::stop_token st){AuthorityContext c;c.subject=worker_;c.resource={"proposal",std::to_string(j.proposal_id),{}};c.action="proposal.execute";c.risk=j.priority>=scheduler::JobPriority::High?RiskLevel::High:RiskLevel::Medium;c.requested_autonomy=AutonomyLevel::Bounded;c.budget_usd=budget_;c.simulation=simulation_;c.proposal_id=j.proposal_id;auto r=gate_.revalidate(c);if(r.emergency_stopped||!r.allowed)return{false,scheduler::FailureClass::PolicyDenied,r.reason};if(simulation_)return{true,scheduler::FailureClass::Permanent,"simulation authorized; execution suppressed"};return inner_.execute(j,st);}
}
