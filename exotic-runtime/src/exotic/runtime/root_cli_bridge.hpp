#pragma once

#include <limits>

namespace exotic::runtime {

inline constexpr int runtime_cli_not_handled = (std::numeric_limits<int>::min)();

// Generic interception point for an existing argc/argv CLI. The workspace is
// read from --workspace, EXOTIC_WORKSPACE, or the current working directory.
int try_run_runtime_cli(int argc, char** argv);

} // namespace exotic::runtime
