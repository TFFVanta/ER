#include "exotic/runtime/cli.hpp"
#include "exotic/runtime/config.hpp"
#include "exotic/runtime/sqlite_telemetry.hpp"
#include "exotic/runtime/workspace.hpp"

#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char** argv) {
    std::filesystem::path workspace = ".";
    std::vector<std::string> command;

    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--workspace" && index + 1 < argc) {
            workspace = argv[++index];
        } else {
            command.push_back(argument);
        }
    }

    try {
        const auto config = exotic::runtime::load_runtime_config(workspace);
        const exotic::runtime::WorkspaceContext context{config.workspace};
        exotic::runtime::SqliteTelemetryRepository telemetry{
            context.paths().runtime_database,
            config.workspace_id
        };
        exotic::runtime::RuntimeCli cli{
            telemetry,
            config.workspace_id,
            context.paths().dashboards
        };
        return cli.run(command, std::cout);
    } catch (const std::exception& error) {
        std::cerr << "EXOTIC runtime CLI error: " << error.what() << '\n';
        return 1;
    }
}
