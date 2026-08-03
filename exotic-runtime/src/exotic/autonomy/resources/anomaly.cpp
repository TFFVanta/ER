#include "anomaly.hpp"

#include <algorithm>
#include <cmath>
#include <set>

namespace exotic::autonomy::resources {

AnomalyDetector::AnomalyDetector(AnomalyPolicy policy)
    : policy_(policy) {}

std::vector<ResourceAnomaly> AnomalyDetector::detect(
    ResourceAccountId account_id,
    ReservationId reservation_id,
    const ResourceVector& expected,
    const ResourceVector& observed,
    TimePoint now
) const {
    std::set<ResourceDimension> dimensions;
    for (const auto& [dimension, value] : expected.values()) {
        (void)value;
        dimensions.insert(dimension);
    }
    for (const auto& [dimension, value] : observed.values()) {
        (void)value;
        dimensions.insert(dimension);
    }

    std::vector<ResourceAnomaly> anomalies;
    for (const auto dimension : dimensions) {
        const auto expected_value = expected.get(dimension);
        const auto observed_value = observed.get(dimension);
        if (observed_value <= expected_value + policy_.absolute_epsilon) {
            continue;
        }

        const auto denominator = std::max(expected_value, policy_.absolute_epsilon);
        const auto ratio = observed_value / denominator;
        if (ratio < policy_.warning_ratio) {
            continue;
        }

        ResourceAnomaly anomaly;
        anomaly.account_id = account_id;
        anomaly.reservation_id = reservation_id;
        anomaly.dimension = dimension;
        anomaly.expected = expected_value;
        anomaly.observed = observed_value;
        anomaly.ratio = ratio;
        anomaly.severity = ratio >= policy_.critical_ratio
            ? AnomalySeverity::Critical
            : AnomalySeverity::Warning;
        anomaly.reason = "actual resource consumption exceeded the admitted estimate";
        anomaly.created_at = now;
        anomalies.push_back(std::move(anomaly));
    }
    return anomalies;
}

} // namespace exotic::autonomy::resources
