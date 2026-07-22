#pragma once
#include "types.hpp"
#include <string>
#include <vector>
namespace exotic::autonomy {
struct MetricTarget { std::string name; double target_value{0.0}; std::string unit; };
struct Objective {
    ObjectiveId id{0}; std::string title; std::string desired_outcome;
    Priority priority{Priority::Normal}; ObjectiveStatus status{ObjectiveStatus::Draft};
    std::vector<MetricTarget> success_metrics; std::vector<std::string> constraints;
    std::vector<ObjectiveId> dependencies; TimePoint created_at{Clock::now()};
};
}
