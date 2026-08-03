#pragma once
#include "../autonomy/types.hpp"
#include <cstdint>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace exotic::runtime {
using Clock = autonomy::Clock;
using TimePoint = autonomy::TimePoint;

enum class RuntimeMode : std::uint8_t { Production, Simulation };
enum class ServiceState : std::uint8_t { Registered, Recovering, Starting, Running, Stopping, Stopped, Failed };
enum class HealthLevel : std::uint8_t { Healthy, Degraded, Unhealthy, Unknown };
enum class AlertSeverity : std::uint8_t { Info, Warning, Error, Critical };

struct ServiceHealth {
    std::string service;
    ServiceState state{ServiceState::Registered};
    HealthLevel level{HealthLevel::Unknown};
    std::string message;
    std::unordered_map<std::string,double> measurements;
    TimePoint observed_at{Clock::now()};
};

struct AuditRecord {
    std::uint64_t id{0};
    std::string workspace_id;
    std::string category;
    std::string actor;
    std::string entity_type;
    std::string entity_id;
    std::string message;
    std::string payload_json{"{}"};
    TimePoint created_at{Clock::now()};
};

struct TraceSpan {
    std::string trace_id;
    std::string span_id;
    std::optional<std::string> parent_span_id;
    std::string workspace_id;
    std::string service;
    std::string operation;
    std::string status{"running"};
    std::string attributes_json{"{}"};
    TimePoint started_at{Clock::now()};
    std::optional<TimePoint> ended_at;
};

struct MetricSample {
    std::string workspace_id;
    std::string name;
    double value{0.0};
    std::string unit;
    std::string labels_json{"{}"};
    TimePoint created_at{Clock::now()};
};

struct AlertRecord {
    std::uint64_t id{0};
    std::string workspace_id;
    AlertSeverity severity{AlertSeverity::Warning};
    std::string source;
    std::string code;
    std::string message;
    std::string details_json{"{}"};
    bool active{true};
    TimePoint created_at{Clock::now()};
    std::optional<TimePoint> acknowledged_at;
};

struct ControlRecord {
    std::string workspace_id;
    std::string key;
    std::string value;
    std::string actor;
    std::string reason;
    TimePoint updated_at{Clock::now()};
};

struct RuntimeSnapshot {
    std::string workspace_id;
    RuntimeMode mode{RuntimeMode::Production};
    bool running{false};
    bool emergency_stop{false};
    std::vector<ServiceHealth> services;
    std::vector<AlertRecord> alerts;
    TimePoint generated_at{Clock::now()};
};

std::string to_string(RuntimeMode value);
std::string to_string(ServiceState value);
std::string to_string(HealthLevel value);
std::string to_string(AlertSeverity value);
std::optional<RuntimeMode> runtime_mode_from_string(std::string_view value);
}
