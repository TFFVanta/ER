# Build Validation

Validation was performed in a Linux C++20 compatibility harness using the
actual v0.3 scheduler headers and actual v0.4 governance headers from the
prior EXOTIC bundles, plus a compatibility implementation of the v0.2
persistence interfaces.

Passed checks:

- Resource vector compilation and arithmetic test
- Hierarchical governor admission/reconciliation test
- Expired reservation restart recovery test
- Scheduler resource bridge test
- SQLite resource persistence test
- Governance approval + resource admission integration test
- Compilation of all v0.5 `.cpp` translation units with warnings enabled

Compiler flags:

```text
-std=c++20 -Wall -Wextra -Wpedantic
```

The v0.4 compatibility SHA replacement was used for the full governance
integration test. The final Windows/MSVC build must still be run inside the
live EXOTIC repository because its exact v0.2 database wrapper, CLI dispatcher,
and root CMake target layout are not present in this isolated bundle build.
