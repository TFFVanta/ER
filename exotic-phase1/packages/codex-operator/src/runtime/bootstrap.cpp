#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

std::unique_ptr<CodexOperatorPackage> RuntimeBootstrap::create(Runtime& runtime,
                                                               const runtime::RuntimeConfig& runtime_config) {
    auto config = OperatorConfig::from_runtime(runtime_config, runtime_config.workspace / ".exotic" / "codex-operator");
    auto sink = std::make_shared<JsonLineLogSink>(config.log_path);
    auto package = std::make_unique<CodexOperatorPackage>(runtime, std::move(config), sink);
    package->logger().info("bootstrap", "runtime bootstrap created", {{"workspace_id", runtime_config.workspace_id}});
    return package;
}

} // namespace exotic::codex_operator
