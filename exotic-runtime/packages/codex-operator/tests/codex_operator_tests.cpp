#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <cassert>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <vector>

namespace {

std::filesystem::path unique_root() {
    const auto ticks = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return std::filesystem::temp_directory_path() / ("exotic-codex-foundation-" + std::to_string(ticks));
}

class PluginFixture final : public exotic::codex_operator::OperatorPlugin {
public:
    explicit PluginFixture(std::vector<std::string>& calls) : calls_(calls) {}

    [[nodiscard]] exotic::codex_operator::PluginDescriptor descriptor() const override {
        return {"foundation-plugin", "Foundation Plugin", "1.0.0", "Registers a plugin-provided service"};
    }

    void install(exotic::codex_operator::CodexOperatorPackage& package) override {
        using namespace exotic::codex_operator;
        using namespace exotic::runtime;

        package.register_service(std::make_shared<OperatorRuntimeService>(ServiceRegistration{
            "plugin-service",
            {"graph-runtime"},
            [&] { calls_.push_back("plugin:recover"); },
            [&] { calls_.push_back("plugin:start"); },
            [&] { calls_.push_back("plugin:stop"); },
            [&] { calls_.push_back("plugin:join"); },
            [] {
                ServiceHealth health;
                health.service = "plugin-service";
                health.state = ServiceState::Running;
                health.level = HealthLevel::Healthy;
                health.message = "plugin operational";
                return health;
            }
        }));
    }
private:
    std::vector<std::string>& calls_;
};

} // namespace

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    try {
        const auto root = unique_root();
        std::filesystem::create_directories(root / "workspace");
        std::filesystem::create_directories(root / "workspace" / ".exotic" / "codex-operator" / "config");
        {
            std::ofstream config_out(root / "workspace" / ".exotic" / "codex-operator" / "config" / "codex-operator.conf");
            config_out << "workspace_id=test-workspace\n";
            config_out << "scheduler_workers=6\n";
            config_out << "metrics_enabled=true\n";
        }

        Runtime kernel;
        RuntimeConfig runtime_config;
        runtime_config.workspace = root / "workspace";
        runtime_config.workspace_id = "kernel-workspace";
        runtime_config.scheduler_workers = 3;
        runtime_config.shutdown_grace = std::chrono::milliseconds(1000);

        auto package = RuntimeBootstrap::create(kernel, runtime_config);
        auto memory_sink = std::make_shared<MemoryLogSink>();
        package->logger().add_sink(memory_sink);

        std::vector<std::string> calls;
        package->register_service(std::make_shared<OperatorRuntimeService>(ServiceRegistration{
            "foundation-service",
            {"event-bus"},
            [&] { calls.push_back("foundation:recover"); },
            [&] { calls.push_back("foundation:start"); },
            [&] { calls.push_back("foundation:stop"); },
            [&] { calls.push_back("foundation:join"); },
            [] {
                ServiceHealth health;
                health.service = "foundation-service";
                health.state = ServiceState::Running;
                health.level = HealthLevel::Healthy;
                health.message = "foundation ready";
                return health;
            }
        }));
        package->register_plugin(std::make_shared<PluginFixture>(calls));

        package->initialize();
        assert(package->state() == PackageState::Initialized);
        assert(package->services().contains("runtime-kernel"));
        assert(package->services().contains("event-bus"));
        assert(package->services().contains("graph-runtime"));
        assert(package->services().contains("plugin-service"));

        package->start();
        assert(package->state() == PackageState::Running);

        Event event;
        event.type = "codex.operator.test";
        event.payload["source"] = std::string{"unit-test"};
        kernel.events().publish(event);

        const auto snapshot = package->snapshot();
        assert(snapshot.metrics.active_workers == 6);
        assert(snapshot.metrics.active_services >= 5);
        assert(snapshot.metrics.event_throughput >= 1);
        assert(snapshot.health.healthy);
        assert(snapshot.health.ready);
        assert(snapshot.registered_plugins == 1);
        assert(package->container().contains<Runtime>());
        assert(!memory_sink->entries().empty());

        {
            ConfigurationStore store{OperatorConfig::from_runtime(runtime_config, root / "state")};
            store.load_file(root / "workspace" / ".exotic" / "codex-operator" / "config" / "codex-operator.conf");
            assert(store.config().workspace_id == "test-workspace");
            assert(store.config().scheduler_workers == 6);
        }

        package->shutdown();
        assert(package->state() == PackageState::Stopped);
        assert(!calls.empty());
        const auto has_call = [&](const char* expected) {
            return std::find(calls.begin(), calls.end(), expected) != calls.end();
        };
        assert(has_call("foundation:recover"));
        assert(has_call("plugin:recover"));
        assert(has_call("foundation:join"));
        assert(has_call("plugin:join"));

        std::cout << "codex_operator_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "codex_operator_tests failure: " << error.what() << '\n';
        return 1;
    }
}
