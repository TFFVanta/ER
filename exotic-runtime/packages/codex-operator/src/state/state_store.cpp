#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

void WorkerStateStore::update(const WorkerState& state) {
    std::scoped_lock lock(mutex_);
    states_[state.worker_id] = state;
}

std::optional<WorkerState> WorkerStateStore::find(std::string_view worker_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = states_.find(std::string(worker_id));
    if (it == states_.end()) {
        return std::nullopt;
    }
    return it->second;
}

std::vector<WorkerState> WorkerStateStore::list() const {
    std::scoped_lock lock(mutex_);
    std::vector<WorkerState> result;
    result.reserve(states_.size());
    for (const auto& [id, state] : states_) {
        (void)id;
        result.push_back(state);
    }
    return result;
}

} // namespace exotic::codex_operator
