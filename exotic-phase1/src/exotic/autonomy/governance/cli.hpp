#pragma once
#include "service.hpp"
#include <span>
namespace exotic::autonomy::governance {int run_governance_cli(GovernanceRepository&,GovernanceService&,std::span<const std::string_view>);}
