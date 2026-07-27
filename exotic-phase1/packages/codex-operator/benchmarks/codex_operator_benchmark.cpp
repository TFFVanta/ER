#include "exotic/codex_operator/operator.hpp"

#include <chrono>
#include <filesystem>
#include <iostream>

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    Runtime runtime;
    RuntimeConfig config;
    config.workspace = std::filesystem::current_path();
    config.workspace_id = "benchmark-workspace";
    config.scheduler_workers = 8;

    auto package = RuntimeBootstrap::create(runtime, config);
    package->initialize();
    package->start();

    const auto started = std::chrono::steady_clock::now();
    for (int index = 0; index < 10000; ++index) {
        Event event;
        event.type = "benchmark.event";
        event.payload["index"] = static_cast<double>(index);
        runtime.events().publish(event);
    }
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started);
    const auto snapshot = package->snapshot();

    std::cout << "duration_ms=" << elapsed.count() << '\n';
    std::cout << "event_throughput=" << snapshot.metrics.event_throughput << '\n';

    package->shutdown();
    return snapshot.metrics.event_throughput >= 10000 ? 0 : 1;
}
