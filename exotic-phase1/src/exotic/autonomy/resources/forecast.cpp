#include "forecast.hpp"

#include <algorithm>
#include <cmath>
#include <vector>

namespace exotic::autonomy::resources {

CostForecaster::CostForecaster(ResourceRepository& repository)
    : repository_(repository) {}

CostForecast CostForecaster::forecast(
    std::string_view workload_key,
    std::size_t sample_limit
) {
    CostForecast result;
    result.workload_key = std::string(workload_key);

    const auto reports = repository_.load_usage_reports(workload_key, sample_limit);
    result.samples = reports.size();
    if (reports.empty()) {
        return result;
    }

    std::map<ResourceDimension, std::vector<double>> samples;
    for (const auto& report : reports) {
        for (const auto& [dimension, value] : report.actual.values()) {
            samples[dimension].push_back(value);
        }
    }

    for (auto& [dimension, values] : samples) {
        if (values.empty()) {
            continue;
        }
        double total = 0.0;
        for (const auto value : values) {
            total += value;
        }
        result.predicted.set(dimension, total / static_cast<double>(values.size()));

        std::sort(values.begin(), values.end());
        const auto index = static_cast<std::size_t>(
            std::ceil(0.95 * static_cast<double>(values.size())) - 1.0
        );
        result.p95.set(dimension, values[std::min(index, values.size() - 1)]);
    }

    result.confidence = std::min(
        1.0,
        std::sqrt(static_cast<double>(reports.size()) / 25.0)
    );
    return result;
}

} // namespace exotic::autonomy::resources
