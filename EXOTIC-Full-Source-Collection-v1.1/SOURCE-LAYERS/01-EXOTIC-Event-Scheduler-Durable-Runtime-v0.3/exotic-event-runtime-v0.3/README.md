# EXOTIC Event Scheduler and Durable Runtime v0.3

Production-oriented C++20 source bundle for the EXOTIC Autonomy Kernel.

## Integration prerequisites

This bundle expects the v0.2 files to exist:

- `exotic/autonomy/types.hpp`
- `exotic/autonomy/autonomy_kernel.hpp`
- `exotic/autonomy/persistence/database.hpp`
- `exotic/autonomy/persistence/transaction.hpp`
- the `exotic_autonomy` CMake target

Copy `src/`, `tests/`, and `cmake/EXOTIC_SCHEDULER.cmake` into the project. Add:

```cmake
include(cmake/EXOTIC_SCHEDULER.cmake)
```

Then build and test:

```powershell
cmake -S . -B out\build\x64-Debug
cmake --build out\build\x64-Debug --config Debug
ctest --test-dir out\build\x64-Debug -C Debug --output-on-failure
```

## Important production note

The timeout path requests cooperative cancellation. External adapters must honor the stop token and must define their own hard-kill/rollback policy for subprocesses, containers, devices, and remote APIs.
