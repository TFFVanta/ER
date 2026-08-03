#pragma once
#include "types.hpp"
#include <random>

namespace exotic::autonomy::scheduler {

class RetryCalculator {
public:
    explicit RetryCalculator(std::uint64_t seed = std::random_device{}());
    std::chrono::milliseconds next_delay(const RetryPolicy& policy, std::uint32_t completed_attempts);
private:
    std::mt19937_64 random_;
};

} // namespace exotic::autonomy::scheduler
