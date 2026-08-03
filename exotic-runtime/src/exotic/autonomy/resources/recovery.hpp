#pragma once

#include "governor.hpp"

#include <vector>

namespace exotic::autonomy::resources {

struct ResourceRecoveryReport {
    std::size_t active_before{0};
    std::size_t expired_released{0};
    std::vector<ReservationId> released_reservations;
};

class ResourceRecoveryManager {
public:
    explicit ResourceRecoveryManager(ResourceRepository& repository);

    ResourceRecoveryReport recover(TimePoint now = Clock::now());

private:
    ResourceRepository& repository_;
};

} // namespace exotic::autonomy::resources
