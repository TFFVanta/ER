#include "types.hpp"

namespace exotic::autonomy::scheduler {

#define EXOTIC_ENUM_TO_STRING_CASE(x) case x: return #x

std::string to_string(JobKind value) {
    switch (value) {
        case JobKind::Immediate: return "immediate";
        case JobKind::Scheduled: return "scheduled";
        case JobKind::Recurring: return "recurring";
        case JobKind::Conditional: return "conditional";
    }
    return "immediate";
}
std::string to_string(JobStatus value) {
    switch (value) {
        case JobStatus::Pending: return "pending";
        case JobStatus::Ready: return "ready";
        case JobStatus::Leased: return "leased";
        case JobStatus::Running: return "running";
        case JobStatus::WaitingRetry: return "waiting_retry";
        case JobStatus::Blocked: return "blocked";
        case JobStatus::Completed: return "completed";
        case JobStatus::Cancelled: return "cancelled";
        case JobStatus::DeadLettered: return "dead_lettered";
    }
    return "pending";
}
std::string to_string(TriggerKind value) {
    switch (value) {
        case TriggerKind::None: return "none";
        case TriggerKind::AtTime: return "at_time";
        case TriggerKind::FixedInterval: return "fixed_interval";
        case TriggerKind::EventMatch: return "event_match";
        case TriggerKind::Condition: return "condition";
    }
    return "none";
}
std::string to_string(DependencyPolicy value) {
    switch (value) {
        case DependencyPolicy::AllCompleted: return "all_completed";
        case DependencyPolicy::AllSuccessful: return "all_successful";
        case DependencyPolicy::AnyCompleted: return "any_completed";
        case DependencyPolicy::AnySuccessful: return "any_successful";
    }
    return "all_successful";
}
std::string to_string(FailureClass value) {
    switch (value) {
        case FailureClass::Transient: return "transient";
        case FailureClass::Permanent: return "permanent";
        case FailureClass::Timeout: return "timeout";
        case FailureClass::Cancelled: return "cancelled";
        case FailureClass::PolicyDenied: return "policy_denied";
        case FailureClass::VerificationFailed: return "verification_failed";
    }
    return "permanent";
}

std::optional<JobKind> job_kind_from_string(std::string_view v) {
    if (v=="immediate") return JobKind::Immediate; if(v=="scheduled") return JobKind::Scheduled;
    if(v=="recurring") return JobKind::Recurring; if(v=="conditional") return JobKind::Conditional; return std::nullopt;
}
std::optional<JobStatus> job_status_from_string(std::string_view v) {
    if(v=="pending") return JobStatus::Pending; if(v=="ready") return JobStatus::Ready; if(v=="leased") return JobStatus::Leased;
    if(v=="running") return JobStatus::Running; if(v=="waiting_retry") return JobStatus::WaitingRetry; if(v=="blocked") return JobStatus::Blocked;
    if(v=="completed") return JobStatus::Completed; if(v=="cancelled") return JobStatus::Cancelled; if(v=="dead_lettered") return JobStatus::DeadLettered; return std::nullopt;
}
std::optional<TriggerKind> trigger_kind_from_string(std::string_view v) {
    if(v=="none") return TriggerKind::None; if(v=="at_time") return TriggerKind::AtTime; if(v=="fixed_interval") return TriggerKind::FixedInterval;
    if(v=="event_match") return TriggerKind::EventMatch; if(v=="condition") return TriggerKind::Condition; return std::nullopt;
}
std::optional<DependencyPolicy> dependency_policy_from_string(std::string_view v) {
    if(v=="all_completed") return DependencyPolicy::AllCompleted; if(v=="all_successful") return DependencyPolicy::AllSuccessful;
    if(v=="any_completed") return DependencyPolicy::AnyCompleted; if(v=="any_successful") return DependencyPolicy::AnySuccessful; return std::nullopt;
}
std::optional<FailureClass> failure_class_from_string(std::string_view v) {
    if(v=="transient") return FailureClass::Transient; if(v=="permanent") return FailureClass::Permanent; if(v=="timeout") return FailureClass::Timeout;
    if(v=="cancelled") return FailureClass::Cancelled; if(v=="policy_denied") return FailureClass::PolicyDenied; if(v=="verification_failed") return FailureClass::VerificationFailed; return std::nullopt;
}

} // namespace exotic::autonomy::scheduler
