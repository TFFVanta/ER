#pragma once
#include "database.hpp"
#include "repository.hpp"
#include <filesystem>
namespace exotic::autonomy::persistence {
class SqliteAutonomyRepository final:public AutonomyRepository {
public:
    explicit SqliteAutonomyRepository(const std::filesystem::path&);
    void save_objective(const Objective&)override; void save_proposal(const Proposal&)override; void save_operation(const OperationRecord&)override; void append_audit_event(const AuditEvent&)override;
    std::optional<Objective>load_objective(ObjectiveId)override; std::optional<Proposal>load_proposal(ProposalId)override; std::optional<OperationRecord>load_operation(OperationId)override;
    std::vector<Objective>load_objectives()override; std::vector<Proposal>load_proposals()override; std::vector<OperationRecord>load_operations()override; std::vector<AuditEvent>load_audit_events(std::size_t)override;
    ObjectiveId next_objective_id()override; ProposalId next_proposal_id()override; OperationId next_operation_id()override; AuditEventId next_audit_event_id()override;
private: Database database_;
};
}
