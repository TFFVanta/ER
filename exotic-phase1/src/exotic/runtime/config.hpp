#pragma once
#include "types.hpp"
#include <chrono>
#include <filesystem>
#include <string>
#include <optional>

namespace exotic::runtime {
struct RuntimeConfig {
    std::filesystem::path workspace;
    RuntimeMode mode{RuntimeMode::Production};
    std::size_t scheduler_workers{4};
    std::chrono::milliseconds health_interval{1000};
    std::chrono::milliseconds control_interval{250};
    std::chrono::milliseconds agent_heartbeat_interval{5000};
    std::chrono::milliseconds shutdown_grace{30000};
    std::string workspace_id;
    bool seed_simulation_identity{true};
    bool write_dashboard{true};
    // Simulation keeps the runtime identity and dashboard in simulation mode
    // while allowing the internal Autonomy pipeline to execute against an
    // isolated workspace. External tool adapters remain disabled.
    bool simulation_execute_internal{false};
    std::optional<std::uint64_t> default_governance_approval_id;
    double default_money_limit_usd{100.0};
    double default_api_credit_limit{10000.0};
    double default_cpu_milliseconds{3600000.0};
    std::uint32_t default_concurrency{4};
    double default_job_budget_usd{10.0};
    void validate() const;
};
RuntimeConfig load_runtime_config(const std::filesystem::path& workspace,const std::optional<std::filesystem::path>& file=std::nullopt);
}
