#pragma once
#include "telemetry.hpp"
#include "../autonomy/governance/service.hpp"
#include "../autonomy/governance/repository.hpp"
#include "../autonomy/resources/governor.hpp"
namespace exotic::runtime {
class EmergencyCoordinator{public:EmergencyCoordinator(autonomy::governance::GovernanceService&,autonomy::governance::GovernanceRepository&,autonomy::resources::ResourceGovernor&,AuditTimeline&);void activate(std::string_view actor,std::string_view reason);void clear(std::string_view actor,std::string_view reason);bool active();private:autonomy::governance::GovernanceService&governance_;autonomy::governance::GovernanceRepository&governance_repo_;autonomy::resources::ResourceGovernor&resources_;AuditTimeline&audit_;};
}
