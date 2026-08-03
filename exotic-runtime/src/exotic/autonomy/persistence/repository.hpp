#pragma once
#include "../objective.hpp"
#include "../operation.hpp"
#include "../proposal.hpp"
#include <optional>
#include <vector>
namespace exotic::autonomy::persistence {
class AutonomyRepository {
public:
    virtual~AutonomyRepository()=default;
    virtual void save_objective(const Objective&)=0; virtual void save_proposal(const Proposal&)=0; virtual void save_operation(const OperationRecord&)=0; virtual void append_audit_event(const AuditEvent&)=0;
    virtual std::optional<Objective>load_objective(ObjectiveId)=0; virtual std::optional<Proposal>load_proposal(ProposalId)=0; virtual std::optional<OperationRecord>load_operation(OperationId)=0;
    virtual std::vector<Objective>load_objectives()=0; virtual std::vector<Proposal>load_proposals()=0; virtual std::vector<OperationRecord>load_operations()=0; virtual std::vector<AuditEvent>load_audit_events(std::size_t)=0;
    virtual ObjectiveId next_objective_id()=0; virtual ProposalId next_proposal_id()=0; virtual OperationId next_operation_id()=0; virtual AuditEventId next_audit_event_id()=0;
};
}
