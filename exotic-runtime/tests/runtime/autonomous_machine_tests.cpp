#include "exotic/runtime/autonomous.hpp"

#include <cassert>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <thread>

namespace {
std::string read_text(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    std::ostringstream buffer;
    buffer << input.rdbuf();
    return buffer.str();
}

std::filesystem::path unique_root(const char* prefix) {
    const auto stamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return std::filesystem::temp_directory_path() / (std::string{prefix} + "-" + std::to_string(stamp));
}
}

int main() {
    try {
        {
        const auto root = unique_root("exotic-autonomous-machine-test");
        std::filesystem::create_directories(root / "apps" / "forge" / "tests");
        std::filesystem::create_directories(root / ".exotic" / "state");

        {
            std::ofstream out(root / "apps" / "forge" / "package.json");
            out << "{\n  \"scripts\": {\n    \"test\":  \"echo TODO\"\n  }\n}\n";
        }

        exotic::runtime::AutonomousMachine machine{
            root,
            root / ".exotic" / "state" / "continuous-operations.db",
            [](const std::string&, const std::filesystem::path&, const std::filesystem::path& log_path) {
                std::ofstream log(log_path);
                log << "forge test passed\n";
                return 0;
            }
        };

        machine.init();
        const auto run = machine.run_once();

        assert(run.status == "completed");
        assert(read_text(root / "apps" / "forge" / "package.json").find("node --test tests/index.test.js") != std::string::npos);
        assert(std::filesystem::exists(root / "apps" / "forge" / "tests" / "index.test.js"));
        assert(std::filesystem::exists(run.bundle_path / "summary.md"));
        assert(std::filesystem::exists(root / ".exotic" / "dashboards" / "autonomous-status.json"));
        assert(!machine.list_records("idea").empty());
        }

        {
        const auto root = unique_root("exotic-autonomous-package-test");
        std::filesystem::create_directories(root / "apps" / "forge" / "src");
        std::filesystem::create_directories(root / "packages" / "core" / "src");
        std::filesystem::create_directories(root / ".exotic" / "state");

        {
            std::ofstream out(root / "package.json");
            out << "{\n  \"private\": true,\n  \"packageManager\": \"npm@11.17.0\",\n  \"workspaces\": [\"packages/*\"]\n}\n";
        }
        {
            std::ofstream out(root / "apps" / "forge" / "src" / "index.js");
            out << "console.log('EXOTIC Doctor\\nRoot: test\\nPackages: 1\\nPackage manager: npm@11.17.0\\n\\n✓ System healthy.');\n";
        }
        {
            std::ofstream out(root / "packages" / "core" / "package.json");
            out << "{\n    \"name\":  \"@exotic/core\",\n    \"version\":  \"0.1.0\",\n    \"type\":  \"module\",\n    \"main\":  \"src/index.ts\",\n    \"types\":  \"src/index.ts\"\n}\n";
        }
        {
            std::ofstream out(root / "packages" / "core" / "src" / "index.ts");
            out << "export const core = true;\n";
        }

        exotic::runtime::AutonomousMachine machine{
            root,
            root / ".exotic" / "state" / "continuous-operations.db",
            [](const std::string&, const std::filesystem::path&, const std::filesystem::path& log_path) {
                std::ofstream log(log_path);
                log << "doctor healthy\n";
                return 0;
            }
        };

        machine.init();
        const auto run = machine.run_once();
        assert(run.status == "completed");
        assert(std::filesystem::exists(root / "packages" / "core" / "tsconfig.json"));
        assert(read_text(root / "packages" / "core" / "package.json").find("\"build\":  \"tsc -p tsconfig.json\"") != std::string::npos);
        }

        {
        const auto root = unique_root("exotic-autonomous-smoke-test");
        std::filesystem::create_directories(root / "packages" / "core" / "src");
        std::filesystem::create_directories(root / ".exotic" / "state");

        {
            std::ofstream out(root / "packages" / "core" / "package.json");
            out << "{\n"
                   "    \"name\":  \"@exotic/core\",\n"
                   "    \"version\":  \"0.1.0\",\n"
                   "    \"type\":  \"module\",\n"
                   "    \"scripts\":  {\n"
                   "                    \"build\":  \"tsc -p tsconfig.json\"\n"
                   "                },\n"
                   "    \"main\":  \"src/index.ts\",\n"
                   "    \"types\":  \"src/index.ts\"\n"
                   "}\n";
        }
        {
            std::ofstream out(root / "packages" / "core" / "tsconfig.json");
            out << "{\n  \"extends\": \"../../tsconfig.base.json\",\n  \"compilerOptions\": {\"rootDir\": \"src\", \"outDir\": \"dist\"},\n  \"include\": [\"src/**/*.ts\"]\n}\n";
        }
        {
            std::ofstream out(root / "packages" / "core" / "src" / "index.ts");
            out << "export const core = true;\n";
        }

        exotic::runtime::AutonomousMachine machine{
            root,
            root / ".exotic" / "state" / "continuous-operations.db",
            [](const std::string&, const std::filesystem::path&, const std::filesystem::path& log_path) {
                std::ofstream log(log_path);
                log << "package smoke test passed\n";
                return 0;
            }
        };

        machine.init();
        const auto run = machine.run_once();
        assert(run.status == "completed");
        assert(std::filesystem::exists(root / "packages" / "core" / "tests" / "smoke.test.ts"));
        const auto package_json = read_text(root / "packages" / "core" / "package.json");
        assert(package_json.find("\"build\":  \"tsc -p tsconfig.json\",\n                    \"test\":  \"vitest run\"\n                }") != std::string::npos);
        }

        {
        const auto root = unique_root("exotic-autonomous-start-idle");
        std::filesystem::create_directories(root / "apps" / "forge");
        std::filesystem::create_directories(root / ".exotic" / "state");

        {
            std::ofstream out(root / "apps" / "forge" / "package.json");
            out << "{\n  \"name\": \"forge\"\n}\n";
        }

        exotic::runtime::AutonomousMachine machine{
            root,
            root / ".exotic" / "state" / "continuous-operations.db",
            [](const std::string&, const std::filesystem::path&, const std::filesystem::path& log_path) {
                std::ofstream log(log_path);
                log << "idle\n";
                return 0;
            }
        };

        machine.init();
        std::ostringstream output;
        std::atomic<int> exit_code{-1};
        std::jthread worker([&](std::stop_token stop_token) {
            exit_code.store(machine.start(output, stop_token));
        });

        std::this_thread::sleep_for(std::chrono::milliseconds(300));
        const auto current = machine.status();
        assert(current.control_state == "running");
        assert(current.current_mode == "idle");
        assert(current.idle_reason == "waiting for new eligible autonomous work");
        assert(current.next_candidate_id.empty());
        assert(current.next_candidate_title.empty());
        assert(current.latest_run_id.empty());
        assert(!current.uptime_started_at.empty());
        assert(current.last_success_at.empty());
        assert(current.last_failure_at.empty());
        assert(current.stalled_for_seconds >= 0);
        assert(current.stalled_state == "healthy");
        assert(current.stalled_reason == "waiting for new eligible autonomous work");
        assert(!current.attention_required);
        assert(current.attention_level == "none");
        assert(current.attention_category == "healthy");
        assert(current.operator_hint == "Worker is healthy and waiting for new eligible autonomous work.");
        assert(current.runs_last_24h == 0);
        assert(current.success_count_24h == 0);
        assert(current.failure_count_24h == 0);
        assert(!current.last_poll_at.empty());
        assert(!current.last_idle_at.empty());
        assert(!current.recent_activity.empty());
        assert(current.recent_activity.front().event_type == "worker.idle" || current.recent_activity.front().event_type == "worker.started");
        const auto status_json = read_text(root / ".exotic" / "dashboards" / "autonomous-status.json");
        assert(status_json.find("\"current_mode\": \"idle\"") != std::string::npos);
        assert(status_json.find("\"idle_reason\": \"waiting for new eligible autonomous work\"") != std::string::npos);
        assert(status_json.find("\"next_candidate_id\": \"\"") != std::string::npos);
        assert(status_json.find("\"next_candidate_title\": \"\"") != std::string::npos);
        assert(status_json.find("\"uptime_started_at\": \"") != std::string::npos);
        assert(status_json.find("\"last_success_at\": \"\"") != std::string::npos);
        assert(status_json.find("\"last_failure_at\": \"\"") != std::string::npos);
        assert(status_json.find("\"stalled_for_seconds\": ") != std::string::npos);
        assert(status_json.find("\"stalled_state\": \"healthy\"") != std::string::npos);
        assert(status_json.find("\"stalled_reason\": \"waiting for new eligible autonomous work\"") != std::string::npos);
        assert(status_json.find("\"attention_required\": false") != std::string::npos);
        assert(status_json.find("\"attention_level\": \"none\"") != std::string::npos);
        assert(status_json.find("\"attention_category\": \"healthy\"") != std::string::npos);
        assert(status_json.find("\"operator_hint\": \"Worker is healthy and waiting for new eligible autonomous work.\"") != std::string::npos);
        assert(status_json.find("\"runs_last_24h\": 0") != std::string::npos);
        assert(status_json.find("\"success_count_24h\": 0") != std::string::npos);
        assert(status_json.find("\"failure_count_24h\": 0") != std::string::npos);
        assert(status_json.find("\"last_poll_at\": \"") != std::string::npos);
        assert(status_json.find("\"last_idle_at\": \"") != std::string::npos);
        assert(status_json.find("\"recent_activity\": [") != std::string::npos);
        assert(status_json.find("\"event_type\": \"worker.") != std::string::npos);

        worker.request_stop();
        worker.join();
        assert(exit_code.load() == 0);
        assert(machine.status().control_state == "idle");
        }
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "autonomous_machine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
