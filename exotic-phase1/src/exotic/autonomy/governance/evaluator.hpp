#pragma once
#include "repository.hpp"
namespace exotic::autonomy::governance {
class AuthorityEvaluator{public:explicit AuthorityEvaluator(GovernanceRepository& r):repository_(r){} AuthorityResult evaluate(const AuthorityContext&);private:GovernanceRepository& repository_; bool rule_matches(const PolicyRule&,const AuthorityContext&)const;};
}
