#include "types.hpp"
namespace exotic::autonomy::governance {
std::string to_string(ApprovalStatus v){switch(v){case ApprovalStatus::Pending:return"pending";case ApprovalStatus::Approved:return"approved";case ApprovalStatus::Rejected:return"rejected";case ApprovalStatus::Expired:return"expired";case ApprovalStatus::Revoked:return"revoked";}return"pending";}
std::string to_string(Vote v){switch(v){case Vote::Approve:return"approve";case Vote::Reject:return"reject";case Vote::Abstain:return"abstain";}return"abstain";}
std::string to_string(Effect v){switch(v){case Effect::Allow:return"allow";case Effect::Deny:return"deny";case Effect::Escalate:return"escalate";}return"deny";}
std::optional<ApprovalStatus> approval_status_from_string(std::string_view v){if(v=="pending")return ApprovalStatus::Pending;if(v=="approved")return ApprovalStatus::Approved;if(v=="rejected")return ApprovalStatus::Rejected;if(v=="expired")return ApprovalStatus::Expired;if(v=="revoked")return ApprovalStatus::Revoked;return std::nullopt;}
std::optional<Vote> vote_from_string(std::string_view v){if(v=="approve")return Vote::Approve;if(v=="reject")return Vote::Reject;if(v=="abstain")return Vote::Abstain;return std::nullopt;}
}
