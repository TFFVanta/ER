#include "exotic/codex_operator/operator.hpp"

#include <algorithm>

namespace exotic::codex_operator {

DispatchDecision WorkerDispatcher::dispatch(const WorkerRegistry& registry,
                                            const WorkerAssignment& assignment) const {
    const auto candidates = registry.discover(assignment.objective.template_kind);
    DispatchDecision decision;
    if (candidates.empty()) {
        decision.rationale = "no capable worker available";
        return decision;
    }

    auto ranked = candidates;
    std::sort(ranked.begin(), ranked.end(), [](const WorkerRegistration& left, const WorkerRegistration& right) {
        if (left.availability != right.availability) {
            return left.availability == WorkerAvailability::Available;
        }
        if (left.health_status != right.health_status) {
            return left.health_status == WorkerHealthStatus::Healthy;
        }
        if (left.trust_score != right.trust_score) {
            return left.trust_score > right.trust_score;
        }
        return left.capabilities.reliability_score > right.capabilities.reliability_score;
    });

    decision.matched = true;
    decision.worker_id = ranked.front().id;
    decision.rationale = "selected best capability and health match";
    for (std::size_t index = 1; index < ranked.size(); ++index) {
        decision.fallback_workers.push_back(ranked[index].id);
    }
    return decision;
}

} // namespace exotic::codex_operator
