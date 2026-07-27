#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

PluginRegistry::PluginRegistry(StructuredLogger& logger) : logger_(logger) {}

void PluginRegistry::register_plugin(std::shared_ptr<OperatorPlugin> plugin) {
    if (!plugin) {
        throw OperatorError(ErrorCode::PluginFailure, "cannot register null plugin");
    }
    logger_.info("plugins", "registered plugin", {{"plugin", plugin->descriptor().id}});
    plugins_.push_back(std::move(plugin));
}

void PluginRegistry::install_all(CodexOperatorPackage& package) {
    for (const auto& plugin : plugins_) {
        logger_.info("plugins", "installing plugin", {{"plugin", plugin->descriptor().id}});
        plugin->install(package);
    }
}

std::vector<PluginDescriptor> PluginRegistry::descriptors() const {
    std::vector<PluginDescriptor> result;
    result.reserve(plugins_.size());
    for (const auto& plugin : plugins_) {
        result.push_back(plugin->descriptor());
    }
    return result;
}

} // namespace exotic::codex_operator
