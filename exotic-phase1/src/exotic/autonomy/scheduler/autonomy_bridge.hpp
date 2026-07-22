#pragma once
#include "execution_bridge.hpp"
#include "../autonomy_kernel.hpp"
#include <functional>
namespace exotic::autonomy::scheduler {
class AutonomyExecutionBridge final:public ExecutionBridge{
public:using AgentIdentityResolver=std::function<std::string()>;AutonomyExecutionBridge(AutonomyKernel&,std::string fallback_agent_id);AutonomyExecutionBridge(AutonomyKernel&,AgentIdentityResolver,std::string fallback_agent_id);ExecutionResult execute(const Job&,std::stop_token)override;
private:AutonomyKernel&kernel_;AgentIdentityResolver resolver_;std::string fallback_agent_id_;
};}
