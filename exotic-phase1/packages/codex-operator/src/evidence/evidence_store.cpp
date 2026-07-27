#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

void EvidenceStore::record(const EvidenceArtifact& artifact) {
    std::scoped_lock lock(mutex_);
    artifacts_.push_back(artifact);
}

std::vector<EvidenceArtifact> EvidenceStore::find_by_session(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    std::vector<EvidenceArtifact> matching;
    for (const auto& artifact : artifacts_) {
        if (artifact.session_id == session_id) {
            matching.push_back(artifact);
        }
    }
    return matching;
}

std::vector<EvidenceArtifact> EvidenceStore::list() const {
    std::scoped_lock lock(mutex_);
    return artifacts_;
}

std::string to_string(EvidenceKind value) {
    switch (value) {
    case EvidenceKind::Prompt: return "prompt";
    case EvidenceKind::WorkerOutput: return "worker_output";
    case EvidenceKind::TestResult: return "test_result";
    case EvidenceKind::BuildResult: return "build_result";
    case EvidenceKind::Documentation: return "documentation";
    case EvidenceKind::Review: return "review";
    case EvidenceKind::Metric: return "metric";
    case EvidenceKind::Approval: return "approval";
    }
    return "unknown";
}

std::string to_string(VerificationStatus value) {
    switch (value) {
    case VerificationStatus::Pending: return "pending";
    case VerificationStatus::Running: return "running";
    case VerificationStatus::Passed: return "passed";
    case VerificationStatus::Failed: return "failed";
    case VerificationStatus::Rejected: return "rejected";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
