#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

void SessionStore::upsert(const SessionRecord& session) {
    std::scoped_lock lock(mutex_);
    sessions_[session.id] = session;
}

std::optional<SessionRecord> SessionStore::find(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = sessions_.find(std::string(session_id));
    if (it == sessions_.end()) {
        return std::nullopt;
    }
    return it->second;
}

std::vector<SessionRecord> SessionStore::list() const {
    std::scoped_lock lock(mutex_);
    std::vector<SessionRecord> sessions;
    sessions.reserve(sessions_.size());
    for (const auto& [_, session] : sessions_) {
        sessions.push_back(session);
    }
    return sessions;
}

std::string to_string(SessionStatus value) {
    switch (value) {
    case SessionStatus::Created: return "created";
    case SessionStatus::Ready: return "ready";
    case SessionStatus::Running: return "running";
    case SessionStatus::WaitingApproval: return "waiting_approval";
    case SessionStatus::Verifying: return "verifying";
    case SessionStatus::Completed: return "completed";
    case SessionStatus::Failed: return "failed";
    case SessionStatus::Cancelled: return "cancelled";
    case SessionStatus::Archived: return "archived";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
