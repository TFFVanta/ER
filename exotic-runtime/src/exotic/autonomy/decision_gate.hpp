#pragma once
#include "proposal.hpp"
#include <string>
namespace exotic::autonomy {
struct DecisionResult { DecisionType decision{DecisionType::Deny}; std::string reason; [[nodiscard]] bool approved() const noexcept { return decision==DecisionType::Approve; } };
class DecisionGate { public: [[nodiscard]] DecisionResult evaluate(const Proposal& proposal) const; };
}
