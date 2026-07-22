#include "root_cli_bridge.hpp"

#include "cli.hpp"
#include "config.hpp"
#include "sqlite_telemetry.hpp"
#include "workspace.hpp"

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

namespace exotic::runtime {
namespace {
std::optional<std::string> read_env(const char* key) {
#ifdef _WIN32
    char* value = nullptr;
    std::size_t size = 0;
    if (_dupenv_s(&value, &size, key) != 0 || value == nullptr) {
        return std::nullopt;
    }
    std::string out{value};
    std::free(value);
    return out;
#else
    if (const char* value = std::getenv(key)) {
        return std::string{value};
    }
    return std::nullopt;
#endif
}
}

int try_run_runtime_cli(int argc, char** argv) {
    if (argc < 2 || std::string{argv[1]} != "runtime") {
        return runtime_cli_not_handled;
    }

    std::filesystem::path workspace;
    if (const auto configured = read_env("EXOTIC_WORKSPACE")) {
        workspace = *configured;
    } else {
        workspace = std::filesystem::current_path();
    }

    std::vector<std::string> arguments;
    for (int index = 2; index < argc; ++index) {
        const std::string value{argv[index]};
        if (value == "--workspace" && index + 1 < argc) {
            workspace = argv[++index];
            continue;
        }
        arguments.push_back(value);
    }

    const auto config = load_runtime_config(workspace);
    const WorkspaceContext context{config.workspace};
    SqliteTelemetryRepository telemetry{
        context.paths().runtime_database,
        config.workspace_id
    };
    RuntimeCli cli{
        telemetry,
        config.workspace_id,
        context.paths().dashboards
    };
    return cli.run(arguments, std::cout);
}

} // namespace exotic::runtime
