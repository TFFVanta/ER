#pragma once
#include "types.hpp"
#include <stop_token>

namespace exotic::autonomy::scheduler {

struct ExecutionResult {
    bool success{false};
    FailureClass failure_class{FailureClass::Permanent};
    std::string message;
};

class ExecutionBridge {
public:
    virtual ~ExecutionBridge() = default;
    // Must route through Objective -> Proposal -> Decision Gate -> Operation -> Verification.
    virtual ExecutionResult execute(const Job& job, std::stop_token stop_token) = 0;
};

} // namespace exotic::autonomy::scheduler
