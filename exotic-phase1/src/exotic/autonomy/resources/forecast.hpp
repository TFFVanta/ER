#pragma once

#include "repository.hpp"

namespace exotic::autonomy::resources {

class CostForecaster {
public:
    explicit CostForecaster(ResourceRepository& repository);

    [[nodiscard]] CostForecast forecast(
        std::string_view workload_key,
        std::size_t sample_limit = 100
    );

private:
    ResourceRepository& repository_;
};

} // namespace exotic::autonomy::resources
