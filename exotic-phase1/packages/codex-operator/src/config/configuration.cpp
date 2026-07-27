#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string trim_copy(std::string value) {
    const auto first = value.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) {
        return {};
    }
    const auto last = value.find_last_not_of(" \t\r\n");
    return value.substr(first, last - first + 1);
}

std::string lower_copy(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

bool parse_bool(const std::string& value) {
    const auto lowered = lower_copy(trim_copy(value));
    return lowered == "1" || lowered == "true" || lowered == "yes" || lowered == "on";
}

} // namespace

OperatorError::OperatorError(ErrorCode code, std::string message)
    : std::runtime_error(std::move(message)), code_(code) {}

ErrorCode OperatorError::code() const noexcept {
    return code_;
}

void OperatorConfig::validate() const {
    if (workspace_root.empty()) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "workspace root is required");
    }
    if (state_root.empty()) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "state root is required");
    }
    if (workspace_id.empty()) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "workspace id is required");
    }
    if (scheduler_workers == 0) {
        throw OperatorError(ErrorCode::InvalidConfiguration, "scheduler worker count must be positive");
    }
}

OperatorConfig OperatorConfig::from_runtime(const runtime::RuntimeConfig& runtime_config,
                                            std::filesystem::path state_root) {
    OperatorConfig config;
    config.workspace_root = runtime_config.workspace;
    config.state_root = std::move(state_root);
    config.log_path = config.state_root / "logs" / "codex-operator.jsonl";
    config.workspace_id = runtime_config.workspace_id.empty() ? "codex-operator" : runtime_config.workspace_id;
    config.scheduler_workers = runtime_config.scheduler_workers;
    config.startup_timeout = runtime_config.shutdown_grace;
    config.shutdown_timeout = runtime_config.shutdown_grace;
    return config;
}

ConfigurationStore::ConfigurationStore(OperatorConfig config) : config_(std::move(config)) {}

void ConfigurationStore::load_file(const std::filesystem::path& path) {
    if (!std::filesystem::exists(path)) {
        return;
    }
    std::ifstream input(path, std::ios::binary);
    for (std::string line; std::getline(input, line); ) {
        const auto trimmed = trim_copy(line);
        if (trimmed.empty() || trimmed.starts_with('#')) {
            continue;
        }
        const auto separator = trimmed.find('=');
        if (separator == std::string::npos) {
            continue;
        }
        apply(trim_copy(trimmed.substr(0, separator)), trim_copy(trimmed.substr(separator + 1)));
    }
}

void ConfigurationStore::overlay(const std::map<std::string, std::string>& values) {
    for (const auto& [key, value] : values) {
        apply(key, value);
    }
}

const OperatorConfig& ConfigurationStore::config() const noexcept {
    return config_;
}

std::optional<std::string> ConfigurationStore::raw(std::string_view key) const {
    const auto it = raw_values_.find(std::string(key));
    if (it == raw_values_.end()) {
        return std::nullopt;
    }
    return it->second;
}

void ConfigurationStore::apply(std::string key, std::string value) {
    raw_values_[key] = value;
    if (key == "workspace_id") {
        config_.workspace_id = value;
    } else if (key == "scheduler_workers") {
        config_.scheduler_workers = static_cast<std::size_t>(std::stoull(value));
    } else if (key == "metrics_enabled") {
        config_.metrics_enabled = parse_bool(value);
    } else if (key == "structured_logs_to_file") {
        config_.structured_logs_to_file = parse_bool(value);
    } else if (key == "minimum_log_level") {
        const auto lowered = lower_copy(value);
        if (lowered == "trace") config_.minimum_log_level = LogLevel::Trace;
        else if (lowered == "debug") config_.minimum_log_level = LogLevel::Debug;
        else if (lowered == "info") config_.minimum_log_level = LogLevel::Info;
        else if (lowered == "warning") config_.minimum_log_level = LogLevel::Warning;
        else if (lowered == "error") config_.minimum_log_level = LogLevel::Error;
        else if (lowered == "critical") config_.minimum_log_level = LogLevel::Critical;
    }
}

std::string to_string(ErrorCode value) {
    switch (value) {
    case ErrorCode::InvalidConfiguration: return "invalid_configuration";
    case ErrorCode::DuplicateService: return "duplicate_service";
    case ErrorCode::MissingDependency: return "missing_dependency";
    case ErrorCode::LifecycleFailure: return "lifecycle_failure";
    case ErrorCode::PluginFailure: return "plugin_failure";
    case ErrorCode::DependencyResolutionFailure: return "dependency_resolution_failure";
    }
    return "unknown";
}

std::string to_string(LogLevel value) {
    switch (value) {
    case LogLevel::Trace: return "trace";
    case LogLevel::Debug: return "debug";
    case LogLevel::Info: return "info";
    case LogLevel::Warning: return "warning";
    case LogLevel::Error: return "error";
    case LogLevel::Critical: return "critical";
    }
    return "unknown";
}

std::string to_string(PackageState value) {
    switch (value) {
    case PackageState::Created: return "created";
    case PackageState::Initialized: return "initialized";
    case PackageState::Running: return "running";
    case PackageState::Stopped: return "stopped";
    case PackageState::Failed: return "failed";
    }
    return "unknown";
}

std::string to_iso8601(TimePoint value) {
    const auto raw = Clock::to_time_t(value);
    std::tm tm{};
#if defined(_WIN32)
    gmtime_s(&tm, &raw);
#else
    gmtime_r(&raw, &tm);
#endif
    char buffer[32]{};
    std::strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &tm);
    return buffer;
}

} // namespace exotic::codex_operator
