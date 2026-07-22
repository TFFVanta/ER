#pragma once
#include "types.hpp"
#include <string>
#include <vector>
namespace exotic::autonomy {
struct VerificationResult { bool passed{false}; double confidence{0.0}; std::vector<std::string> findings; std::vector<std::string> corrections; };
struct OperationRecord {
    OperationId id{0}; ObjectiveId objective_id{0}; ProposalId proposal_id{0}; std::string agent_id;
    OperationStatus status{OperationStatus::Pending}; TimePoint created_at{Clock::now()}; TimePoint started_at{}; TimePoint completed_at{};
    std::vector<std::string> execution_trace; VerificationResult verification; std::string failure_reason;
};
struct AuditEvent {
    AuditEventId id{0}; std::string event_type; std::string entity_type; std::uint64_t entity_id{0};
    std::string actor; std::string message; std::string metadata_json{"{}"}; TimePoint created_at{Clock::now()};
};
}
