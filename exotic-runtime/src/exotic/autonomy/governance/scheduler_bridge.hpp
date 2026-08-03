#pragma once
#include "authority_gate.hpp"
#include "../scheduler/execution_bridge.hpp"
namespace exotic::autonomy::governance {
class GovernedExecutionBridge final:public scheduler::ExecutionBridge{public:GovernedExecutionBridge(AuthorityGate&,scheduler::ExecutionBridge&,Subject,double,bool=false);scheduler::ExecutionResult execute(const scheduler::Job&,std::stop_token)override;private:AuthorityGate&gate_;scheduler::ExecutionBridge&inner_;Subject worker_;double budget_;bool simulation_;};
}
