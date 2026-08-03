#include "scheduler_bridge.hpp"

#include <algorithm>
#include <condition_variable>
#include <mutex>
#include <thread>

namespace exotic::autonomy::agents {

FixedTaskRequirementPlanner::FixedTaskRequirementPlanner(TaskRequirement r):requirement_(std::move(r)){}
TaskRequirement FixedTaskRequirementPlanner::plan(const scheduler::Job& job){auto r=requirement_;r.job_id=job.id;r.proposal_id=job.proposal_id;return r;}

AgentOrchestratedExecutionBridge::AgentOrchestratedExecutionBridge(
    AgentRepository& repository,AgentRegistry& registry,WorkAllocator& allocator,
    GovernanceCompatibility& governance,ResourceCompatibility& resources,
    resources::ResourceGovernor& governor,resources::UsageMeter& meter,
    AgentLearningEngine& learning,TaskRequirementPlanner& planner,
    scheduler::ExecutionBridge& inner,AgentBridgeConfig config)
    :repository_(repository),registry_(registry),allocator_(allocator),governance_(governance),resources_(resources),governor_(governor),meter_(meter),learning_(learning),planner_(planner),inner_(inner),config_(config){}

scheduler::FailureClass AgentOrchestratedExecutionBridge::map_failure(CompatibilityFailure f){
    switch(f){case CompatibilityFailure::Unavailable:case CompatibilityFailure::Unhealthy:case CompatibilityFailure::NoCandidate:return scheduler::FailureClass::Transient;case CompatibilityFailure::GovernanceDenied:case CompatibilityFailure::ResourceIncompatible:case CompatibilityFailure::TrustInsufficient:case CompatibilityFailure::ToolDenied:case CompatibilityFailure::DomainMismatch:case CompatibilityFailure::CostExceeded:return scheduler::FailureClass::PolicyDenied;case CompatibilityFailure::CapabilityMissing:case CompatibilityFailure::InvalidRequirement:return scheduler::FailureClass::Permanent;case CompatibilityFailure::None:return scheduler::FailureClass::Permanent;}return scheduler::FailureClass::Permanent;
}
scheduler::FailureClass AgentOrchestratedExecutionBridge::map_admission(resources::AdmissionFailure f){switch(f){case resources::AdmissionFailure::RateLimited:case resources::AdmissionFailure::CircuitOpen:return scheduler::FailureClass::Transient;case resources::AdmissionFailure::EmergencyStop:case resources::AdmissionFailure::AccountUnavailable:case resources::AdmissionFailure::BudgetExceeded:case resources::AdmissionFailure::ApprovalRequired:case resources::AdmissionFailure::ApprovalInvalid:case resources::AdmissionFailure::InvalidRequest:case resources::AdmissionFailure::DuplicateConflict:return scheduler::FailureClass::PolicyDenied;case resources::AdmissionFailure::None:return scheduler::FailureClass::Permanent;}return scheduler::FailureClass::Permanent;}
PerformanceOutcome AgentOrchestratedExecutionBridge::map_outcome(const scheduler::ExecutionResult&r){if(r.success)return PerformanceOutcome::Success;switch(r.failure_class){case scheduler::FailureClass::Timeout:return PerformanceOutcome::Timeout;case scheduler::FailureClass::Cancelled:return PerformanceOutcome::Cancelled;case scheduler::FailureClass::VerificationFailed:return PerformanceOutcome::VerificationFailed;default:return PerformanceOutcome::Failure;}}
void AgentOrchestratedExecutionBridge::set_agents_running(const WorkAssignment&a,bool running){for(auto id:a.plan.agent_ids){auto agent=repository_.load_agent(id);if(!agent)continue;if(running){++agent->workload.active_tasks;agent->availability=agent->workload.active_tasks>=agent->workload.maximum_tasks?Availability::Busy:Availability::Available;}else{if(agent->workload.active_tasks>0)--agent->workload.active_tasks;agent->availability=agent->status==AgentStatus::Active?Availability::Available:Availability::Unavailable;}agent->workload.utilization=agent->workload.maximum_tasks?clamp_score(static_cast<double>(agent->workload.active_tasks)/agent->workload.maximum_tasks):1.0;agent->workload.updated_at=Clock::now();agent->updated_at=agent->workload.updated_at;repository_.save_agent(*agent);}}

scheduler::ExecutionResult AgentOrchestratedExecutionBridge::execute(const scheduler::Job& job,std::stop_token stop_token){
    auto requirement=planner_.plan(job);requirement.job_id=job.id;requirement.proposal_id=job.proposal_id;
    auto allocation=allocator_.allocate(requirement);if(!allocation.allocated||!allocation.assignment)return {false,map_failure(allocation.failure),allocation.reason};
    auto assignment=*allocation.assignment;

    // Revalidate every selected identity immediately before reservation/execution.
    for(auto id:assignment.plan.agent_ids){auto agent=repository_.load_agent(id);if(!agent)return {false,scheduler::FailureClass::Transient,"Selected agent disappeared before execution"};auto gd=governance_.validate(*agent,assignment.requirement);if(!gd.allowed)return {false,map_failure(gd.failure),"Agent "+agent->identity_key+": "+gd.reason};auto rd=resources_.validate(*agent,assignment.requirement,agent->cost.fixed_cost_usd+agent->cost.hourly_cost_usd*assignment.requirement.estimated_duration_hours);if(!rd.allowed)return {false,map_failure(rd.failure),"Agent "+agent->identity_key+": "+rd.reason};}

    resources::ResourceVector estimate=assignment.requirement.resource_estimate;estimate.add(resources::ResourceDimension::MoneyUsd,assignment.plan.estimated_cost_usd);double api=0.0;for(auto id:assignment.plan.agent_ids)if(auto a=repository_.load_agent(id))api+=a->cost.api_credits_per_task;estimate.add(resources::ResourceDimension::ApiCredits,api);
    resources::AdmissionRequest request;request.job_id=job.id;request.proposal_id=job.proposal_id;request.leaf_account_id=assignment.requirement.resource_account_id;request.workload_key=job.name.empty()?"agent-assignment:"+std::to_string(assignment.id):job.name;request.idempotency_key="agents:assignment:"+std::to_string(assignment.id)+":v:"+std::to_string(assignment.version)+":attempt:"+std::to_string(job.attempt+1);request.estimate=estimate;request.governance_approval_id=assignment.requirement.governance_approval_id;request.reservation_ttl=assignment.requirement.reservation_ttl;request.simulation=assignment.requirement.simulation;
    if(request.simulation){auto preview=governor_.preview(request);if(!preview.allowed)return {false,map_admission(preview.failure),preview.reason};assignment.status=AssignmentStatus::Completed;assignment.completed_at=Clock::now();assignment.updated_at=*assignment.completed_at;assignment.failure_reason="simulation only: external execution suppressed";repository_.save_assignment(assignment);return {true,scheduler::FailureClass::Permanent,"agent selection, governance, and resource simulation passed"};}
    auto admission=governor_.admit(request);if(!admission.allowed||!admission.reservation)return {false,map_admission(admission.failure),admission.reason};assignment.reservation_id=admission.reservation->id;assignment.status=AssignmentStatus::Bound;assignment.updated_at=Clock::now();repository_.save_assignment(assignment);

    std::vector<WorkerBinding> bindings;for(auto id:assignment.plan.agent_ids){auto agent=repository_.load_agent(id);if(!agent)continue;WorkerBinding b;b.id=repository_.next_worker_binding_id();b.assignment_id=assignment.id;b.job_id=job.id;b.agent_id=id;b.worker_key=agent->identity_key;b.bound_at=Clock::now();b.heartbeat_at=b.bound_at;b.expires_at=b.bound_at+config_.binding_ttl;repository_.save_worker_binding(b);bindings.push_back(b);}
    assignment.status=AssignmentStatus::Running;assignment.started_at=Clock::now();assignment.updated_at=*assignment.started_at;repository_.save_assignment(assignment);set_agents_running(assignment,true);

    std::mutex heartbeat_mutex;std::condition_variable_any heartbeat_cv;std::jthread heartbeat([&](std::stop_token stop){std::unique_lock lock{heartbeat_mutex};while(!stop.stop_requested()){heartbeat_cv.wait_for(lock,stop,config_.heartbeat_interval,[]{return false;});if(stop.stop_requested())break;lock.unlock();governor_.heartbeat(*assignment.reservation_id,assignment.requirement.reservation_ttl);const auto now=Clock::now();for(const auto&b:bindings){repository_.heartbeat_binding(b.id,now,now+config_.binding_ttl);auto agent=repository_.load_agent(b.agent_id);if(agent)registry_.heartbeat(agent->id,agent->health,agent->availability,agent->workload,now);}lock.lock();}});

    const auto started=std::chrono::steady_clock::now();scheduler::ExecutionResult result;try{CurrentAssignmentGuard guard{assignment};result=inner_.execute(job,stop_token);}catch(const std::exception&e){result={false,scheduler::FailureClass::Permanent,e.what()};}catch(...){result={false,scheduler::FailureClass::Permanent,"unknown agent execution failure"};}
    const auto elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-started);heartbeat.request_stop();heartbeat_cv.notify_all();for(const auto&b:bindings)repository_.release_binding(b.id,Clock::now());set_agents_running(assignment,false);

    resources::ResourcePlan resource_plan;resource_plan.leaf_account_id=assignment.requirement.resource_account_id;resource_plan.estimate=estimate;resource_plan.workload_key=request.workload_key;resource_plan.idempotency_key=request.idempotency_key;resource_plan.governance_approval_id=assignment.requirement.governance_approval_id;resource_plan.reservation_ttl=assignment.requirement.reservation_ttl;const auto actual=meter_.measure(job,resource_plan,result,elapsed);
    if(!governor_.reconcile(*assignment.reservation_id,actual,"exotic.scheduler.agent_bridge")){governor_.release(*assignment.reservation_id,"agent bridge reconciliation failed");result={false,scheduler::FailureClass::VerificationFailed,"execution finished but resource reconciliation failed"};}
    if(result.success)governor_.record_execution_success(request.workload_key);else governor_.record_execution_failure(request.workload_key,result.message);

    assignment.status=result.success?AssignmentStatus::Completed:AssignmentStatus::Failed;assignment.completed_at=Clock::now();assignment.updated_at=*assignment.completed_at;assignment.failure_reason=result.success?"":result.message;repository_.save_assignment(assignment);
    const double actual_cost=actual.get(resources::ResourceDimension::MoneyUsd);learning_.record_assignment(assignment,map_outcome(result),result.success?1.0:0.0,result.success?0.95:0.0,elapsed,actual_cost,result.message);
    if(!result.success&&config_.replace_single_agent_on_transient_failure&&assignment.plan.agent_ids.size()==1&&(result.failure_class==scheduler::FailureClass::Transient||result.failure_class==scheduler::FailureClass::Timeout)){auto replacement=allocator_.replace(assignment.id,assignment.plan.agent_ids.front(),result.message);if(replacement.allocated)result.message+="; replacement agent prepared for retry";}
    return result;
}

} // namespace exotic::autonomy::agents
