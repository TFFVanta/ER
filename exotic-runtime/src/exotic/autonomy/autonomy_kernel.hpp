#pragma once
#include "decision_gate.hpp"
#include "objective.hpp"
#include "operation.hpp"
#include "proposal.hpp"
#include "persistence/repository.hpp"
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>
namespace exotic::autonomy {
class AutonomyKernel {
public:
    explicit AutonomyKernel(persistence::AutonomyRepository&);
    ObjectiveId create_objective(Objective); ProposalId submit_proposal(Proposal); DecisionResult evaluate_proposal(ProposalId);
    std::optional<OperationId>execute_proposal(ProposalId,std::string agent_id); VerificationResult verify_operation(OperationId);
    bool pause_operation(OperationId); bool cancel_operation(OperationId); bool rollback_operation(OperationId);
    std::optional<Objective>objective(ObjectiveId)const; std::optional<Proposal>proposal(ProposalId)const; std::optional<OperationRecord>operation(OperationId)const; std::vector<OperationRecord>operations()const;
private:
    persistence::AutonomyRepository&repository_; DecisionGate decision_gate_;
    std::unordered_map<ObjectiveId,Objective>objectives_;std::unordered_map<ProposalId,Proposal>proposals_;std::unordered_map<OperationId,OperationRecord>operations_;
    void audit(std::string event_type,std::string entity_type,std::uint64_t entity_id,std::string actor,std::string message);
};
}
