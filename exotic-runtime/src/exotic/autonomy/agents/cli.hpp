#pragma once
#include "recovery.hpp"
#include <iosfwd>
#include <span>
namespace exotic::autonomy::agents {
int run_agent_cli(AgentRepository&,AgentRegistry&,AgentRecoveryManager&,std::span<const std::string> args,std::ostream& out,std::ostream& err);
}
