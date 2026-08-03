#pragma once

#include "types.hpp"

#include <vector>

namespace exotic::autonomy::resources {

struct AnomalyPolicy {
    double warning_ratio{1.50};
    double critical_ratio{2.50};
    double absolute_epsilon{1e-9};
};

class AnomalyDetector {
public:
    explicit AnomalyDetector(AnomalyPolicy policy = {});

    [[nodiscard]] std::vector<ResourceAnomaly> detect(
        ResourceAccountId account_id,
        ReservationId reservation_id,
        const ResourceVector& expected,
        const ResourceVector& observed,
        TimePoint now = Clock::now()
    ) const;

private:
    AnomalyPolicy policy_;
};

} // namespace exotic::autonomy::resources
