#pragma once

#include <chrono>
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

namespace exotic::autonomy {

using ObjectiveId = std::uint64_t;
using ProposalId = std::uint64_t;
using OperationId = std::uint64_t;
using AuditEventId = std::uint64_t;
using Clock = std::chrono::system_clock;
using TimePoint = Clock::time_point;

enum class Priority { Low, Normal, High, Critical };
enum class RiskLevel { Minimal, Low, Medium, High, Critical };
enum class ObjectiveStatus { Draft, Active, Completed, Failed, Cancelled };
enum class ProposalStatus { Draft, Submitted, Approved, Rejected, Executing, Completed, Failed };
enum class OperationStatus { Pending, Running, Verifying, Completed, Failed, Paused, Cancelled, RolledBack, Interrupted };
enum class DecisionType { Approve, Deny, RequireApproval, RequestRevision, Defer };

inline std::int64_t to_unix_milliseconds(TimePoint point) {
    return std::chrono::duration_cast<std::chrono::milliseconds>(point.time_since_epoch()).count();
}

inline TimePoint from_unix_milliseconds(std::int64_t value) {
    return TimePoint{std::chrono::milliseconds{value}};
}

inline std::string to_string(Priority value) {
    switch (value) {
        case Priority::Low: return "low";
        case Priority::Normal: return "normal";
        case Priority::High: return "high";
        case Priority::Critical: return "critical";
    }
    return "normal";
}

inline std::optional<Priority> priority_from_string(std::string_view value) {
    if (value == "low") return Priority::Low;
    if (value == "normal") return Priority::Normal;
    if (value == "high") return Priority::High;
    if (value == "critical") return Priority::Critical;
    return std::nullopt;
}

inline std::string to_string(RiskLevel value) {
    switch (value) {
        case RiskLevel::Minimal: return "minimal";
        case RiskLevel::Low: return "low";
        case RiskLevel::Medium: return "medium";
        case RiskLevel::High: return "high";
        case RiskLevel::Critical: return "critical";
    }
    return "low";
}

inline std::optional<RiskLevel> risk_from_string(std::string_view value) {
    if (value == "minimal") return RiskLevel::Minimal;
    if (value == "low") return RiskLevel::Low;
    if (value == "medium") return RiskLevel::Medium;
    if (value == "high") return RiskLevel::High;
    if (value == "critical") return RiskLevel::Critical;
    return std::nullopt;
}

inline std::string to_string(ObjectiveStatus value) {
    switch (value) {
        case ObjectiveStatus::Draft: return "draft";
        case ObjectiveStatus::Active: return "active";
        case ObjectiveStatus::Completed: return "completed";
        case ObjectiveStatus::Failed: return "failed";
        case ObjectiveStatus::Cancelled: return "cancelled";
    }
    return "draft";
}

inline std::optional<ObjectiveStatus> objective_status_from_string(std::string_view value) {
    if (value == "draft") return ObjectiveStatus::Draft;
    if (value == "active") return ObjectiveStatus::Active;
    if (value == "completed") return ObjectiveStatus::Completed;
    if (value == "failed") return ObjectiveStatus::Failed;
    if (value == "cancelled") return ObjectiveStatus::Cancelled;
    return std::nullopt;
}

inline std::string to_string(ProposalStatus value) {
    switch (value) {
        case ProposalStatus::Draft: return "draft";
        case ProposalStatus::Submitted: return "submitted";
        case ProposalStatus::Approved: return "approved";
        case ProposalStatus::Rejected: return "rejected";
        case ProposalStatus::Executing: return "executing";
        case ProposalStatus::Completed: return "completed";
        case ProposalStatus::Failed: return "failed";
    }
    return "draft";
}

inline std::optional<ProposalStatus> proposal_status_from_string(std::string_view value) {
    if (value == "draft") return ProposalStatus::Draft;
    if (value == "submitted") return ProposalStatus::Submitted;
    if (value == "approved") return ProposalStatus::Approved;
    if (value == "rejected") return ProposalStatus::Rejected;
    if (value == "executing") return ProposalStatus::Executing;
    if (value == "completed") return ProposalStatus::Completed;
    if (value == "failed") return ProposalStatus::Failed;
    return std::nullopt;
}

inline std::string to_string(OperationStatus value) {
    switch (value) {
        case OperationStatus::Pending: return "pending";
        case OperationStatus::Running: return "running";
        case OperationStatus::Verifying: return "verifying";
        case OperationStatus::Completed: return "completed";
        case OperationStatus::Failed: return "failed";
        case OperationStatus::Paused: return "paused";
        case OperationStatus::Cancelled: return "cancelled";
        case OperationStatus::RolledBack: return "rolled_back";
        case OperationStatus::Interrupted: return "interrupted";
    }
    return "pending";
}

inline std::optional<OperationStatus> operation_status_from_string(std::string_view value) {
    if (value == "pending") return OperationStatus::Pending;
    if (value == "running") return OperationStatus::Running;
    if (value == "verifying") return OperationStatus::Verifying;
    if (value == "completed") return OperationStatus::Completed;
    if (value == "failed") return OperationStatus::Failed;
    if (value == "paused") return OperationStatus::Paused;
    if (value == "cancelled") return OperationStatus::Cancelled;
    if (value == "rolled_back") return OperationStatus::RolledBack;
    if (value == "interrupted") return OperationStatus::Interrupted;
    return std::nullopt;
}

} // namespace exotic::autonomy
