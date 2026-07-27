#include "exotic/codex_operator/operator.hpp"

#if defined(_WIN32)
#include <windows.h>
#include <psapi.h>
#endif

namespace exotic::codex_operator {

namespace {

std::uint64_t current_process_memory_bytes() {
#if defined(_WIN32)
    PROCESS_MEMORY_COUNTERS_EX counters{};
    if (GetProcessMemoryInfo(GetCurrentProcess(),
                             reinterpret_cast<PROCESS_MEMORY_COUNTERS*>(&counters),
                             sizeof(counters)) == 0) {
        return 0;
    }
    return static_cast<std::uint64_t>(counters.WorkingSetSize);
#else
    return 0;
#endif
}

} // namespace

MetricsCollector::MetricsCollector(std::string workspace_id) : workspace_id_(std::move(workspace_id)) {}

void MetricsCollector::note_startup_time(std::chrono::milliseconds duration) {
    std::scoped_lock lock(mutex_);
    snapshot_.startup_time = duration;
}

void MetricsCollector::set_active_services(std::size_t count) {
    std::scoped_lock lock(mutex_);
    snapshot_.active_services = count;
}

void MetricsCollector::set_active_workers(std::size_t count) {
    std::scoped_lock lock(mutex_);
    snapshot_.active_workers = count;
}

void MetricsCollector::increment_event_throughput(std::uint64_t delta) {
    std::scoped_lock lock(mutex_);
    snapshot_.event_throughput += delta;
}

void MetricsCollector::increment_error_count(std::uint64_t delta) {
    std::scoped_lock lock(mutex_);
    snapshot_.error_count += delta;
}

void MetricsCollector::record_build_statistic(std::string key, double value) {
    std::scoped_lock lock(mutex_);
    snapshot_.build_statistics[std::move(key)] = value;
}

void MetricsCollector::refresh_memory_usage() {
    std::scoped_lock lock(mutex_);
    snapshot_.memory_usage_bytes = current_process_memory_bytes();
}

MetricsSnapshot MetricsCollector::snapshot() const {
    std::scoped_lock lock(mutex_);
    return snapshot_;
}

const std::string& MetricsCollector::workspace_id() const noexcept {
    return workspace_id_;
}

} // namespace exotic::codex_operator
