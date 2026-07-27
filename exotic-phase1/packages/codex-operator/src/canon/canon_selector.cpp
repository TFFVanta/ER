#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <tuple>

namespace exotic::codex_operator {

namespace {

bool relevant_rule(const CanonRule& rule,
                   const PromptCompilerInput& input,
                   const RepositoryAnalysis& analysis) {
    for (const auto& tag : rule.tags) {
        if (tag == "always") {
            return true;
        }
        if (!input.objective.subsystem.empty() && input.objective.subsystem.find(tag) != std::string::npos) {
            return true;
        }
        if (std::find(input.repository_state.dependencies.begin(), input.repository_state.dependencies.end(), tag) != input.repository_state.dependencies.end()) {
            return true;
        }
        if (tag == "testing" && !input.test_results.failing_tests.empty()) {
            return true;
        }
        if (tag == "build" && !analysis.relevant_build_files.empty()) {
            return true;
        }
    }
    return rule.category == "security" || rule.category == "documentation";
}

} // namespace

std::vector<CanonRule> CanonSelector::select(const PromptCompilerInput& input,
                                             const RepositoryAnalysis& analysis) const {
    std::vector<CanonRule> selected;
    std::set<std::string> seen;
    for (const auto& rule : input.canon) {
        if (!relevant_rule(rule, input, analysis)) {
            continue;
        }
        const auto key = rule.category + ":" + rule.rule;
        if (seen.insert(key).second) {
            selected.push_back(rule);
        }
    }
    std::sort(selected.begin(), selected.end(), [](const CanonRule& left, const CanonRule& right) {
        return std::tie(left.category, left.rule) < std::tie(right.category, right.rule);
    });
    return selected;
}

} // namespace exotic::codex_operator
