# CLI integration

## Standalone control executable
The CMake module builds `exotic-runtime-cli` by default. It opens only the durable runtime control and telemetry database; it does not acquire the runtime workspace lease or start background services.

```powershell
exotic-runtime-cli --workspace C:\Projects\Exotic status
exotic-runtime-cli --workspace C:\Projects\Exotic audit
exotic-runtime-cli --workspace C:\Projects\Exotic alerts
exotic-runtime-cli --workspace C:\Projects\Exotic dashboard
exotic-runtime-cli --workspace C:\Projects\Exotic stop "maintenance"
exotic-runtime-cli --workspace C:\Projects\Exotic emergency-stop "operator intervention"
exotic-runtime-cli --workspace C:\Projects\Exotic emergency-clear "incident resolved"
```

## Existing `exotic.exe` dispatcher
To expose the same commands as `exotic runtime ...`, add this branch to the existing root command dispatcher after resolving the workspace path:

```cpp
#include "exotic/runtime/cli.hpp"
#include "exotic/runtime/config.hpp"
#include "exotic/runtime/sqlite_telemetry.hpp"
#include "exotic/runtime/workspace.hpp"

if (command == "runtime") {
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
    return cli.run(remaining_arguments, std::cout);
}
```

The root dispatcher file was not available in the isolated build, so the bundle includes this exact branch rather than guessing its path or argument parser.
