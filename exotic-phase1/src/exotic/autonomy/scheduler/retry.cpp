#include "retry.hpp"
#include <algorithm>
#include <cmath>

namespace exotic::autonomy::scheduler {
RetryCalculator::RetryCalculator(std::uint64_t seed): random_(seed) {}
std::chrono::milliseconds RetryCalculator::next_delay(const RetryPolicy& p, std::uint32_t completed_attempts) {
    const double exponent = completed_attempts > 0 ? static_cast<double>(completed_attempts - 1) : 0.0;
    const double raw = static_cast<double>(p.initial_delay.count()) * std::pow(std::max(1.0, p.multiplier), exponent);
    const double capped = std::min(raw, static_cast<double>(p.maximum_delay.count()));
    std::uniform_real_distribution<double> distribution(-p.jitter_fraction, p.jitter_fraction);
    const double with_jitter = capped * (1.0 + distribution(random_));
    return std::chrono::milliseconds{static_cast<std::int64_t>(std::max(0.0, with_jitter))};
}
} // namespace exotic::autonomy::scheduler
