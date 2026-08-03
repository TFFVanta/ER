#include "exotic/runtime/autonomous.hpp"
#include "exotic/autonomy/persistence/database.hpp"

#include <cassert>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>

namespace {
std::filesystem::path unique_root(const char* prefix) {
    const auto stamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    return std::filesystem::temp_directory_path() / (std::string{prefix} + "-" + std::to_string(stamp));
}
}

int main() {
    try {
        const auto root = unique_root("exotic-autonomous-recovery-test");
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
                log << "forge test passed after recovery\n";
                return 0;
            }
        };

        machine.init();

        {
            exotic::autonomy::persistence::Database db{root / ".exotic" / "state" / "continuous-operations.db"};
            db.execute(
                "INSERT INTO autonomous_runs(id,status,selected_objective_id,summary,bundle_path,restart_count,started_at_ms,completed_at_ms,error_message) "
                "VALUES('run-interrupted','running','objective-interrupted','','" + (root / ".exotic" / "runs" / "run-interrupted").string() + "',0,1,NULL,'');"
            );
        }

        const auto recovered_run = machine.run_once();
        assert(recovered_run.status == "completed");

        bool saw_recovered = false;
        for (const auto& run : machine.list_runs()) {
            if (run.id == "run-interrupted") {
                saw_recovered = true;
                assert(run.status == "failed");
                assert(run.restart_count == 1);
            }
        }
        assert(saw_recovered);
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "autonomous_recovery_tests failure: " << error.what() << '\n';
        return 1;
    }
}
