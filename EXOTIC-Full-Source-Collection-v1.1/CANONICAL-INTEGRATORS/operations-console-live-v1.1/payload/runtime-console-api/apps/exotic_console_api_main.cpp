#include "exotic/operations_console/api_server.hpp"

#include <filesystem>
#include <iostream>
#include <stdexcept>
#include <string>

int main(int argc, char** argv) {
    exotic::operations_console::ServerOptions options;
    options.workspace = std::filesystem::current_path();

    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--workspace" && index + 1 < argc) {
            options.workspace = argv[++index];
        } else if (argument == "--assets" && index + 1 < argc) {
            options.assets_directory = argv[++index];
        } else if (argument == "--smoke" && index + 1 < argc) {
            options.smoke_executable = argv[++index];
        } else if (argument == "--port" && index + 1 < argc) {
            const auto value = std::stoul(argv[++index]);
            if (value == 0 || value > 65535) {
                throw std::invalid_argument("port must be between 1 and 65535");
            }
            options.port = static_cast<std::uint16_t>(value);
        } else if (argument == "--help") {
            std::cout
                << "EXOTIC Operations Console API\n"
                << "  --workspace <path>\n"
                << "  --assets <console-dist-path>\n"
                << "  --smoke <exotic-runtime-smoke.exe>\n"
                << "  --port <1-65535>\n";
            return 0;
        }
    }

    if (options.assets_directory.empty()) {
        options.assets_directory = options.workspace / "console" / "operations-v1.1" / "dist";
    }

    try {
        exotic::operations_console::ApiServer server{std::move(options)};
        return server.run();
    } catch (const std::exception& error) {
        std::cerr << "EXOTIC console API error: " << error.what() << '\n';
        return 1;
    }
}
