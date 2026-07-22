#pragma once
#include "evaluator.hpp"
namespace exotic::autonomy::governance {
class GovernanceService{public:explicit GovernanceService(GovernanceRepository&);AuthorityResult authorize(const AuthorityContext&);ApprovalRequestId request_approval(ApprovalRequest);ApprovalStatus decide(ApprovalRequestId,const Subject&,Vote,std::string);bool revoke(ApprovalRequestId,std::string_view,std::string_view);std::size_t expire_requests(TimePoint now);void emergency_stop(std::string_view actor,std::string_view reason);void clear_emergency_stop(std::string_view actor,std::string_view reason);private:GovernanceRepository& repository_;AuthorityEvaluator evaluator_;void evidence(ApprovalRequestId,std::string,std::string,std::string);ApprovalStatus recompute(ApprovalRequest&);};
}
