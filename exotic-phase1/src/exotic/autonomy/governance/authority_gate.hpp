#pragma once
#include "service.hpp"
namespace exotic::autonomy::governance {
class AuthorityGate{public:explicit AuthorityGate(GovernanceService&s):service_(s){}AuthorityResult revalidate(const AuthorityContext& c){return service_.authorize(c);}private:GovernanceService&service_;};
}
