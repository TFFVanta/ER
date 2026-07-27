#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

PromptValidationReport PromptValidator::validate(const PromptCompilerInput& input,
                                                 const CompiledContext& context,
                                                 const ConstraintReport& constraints,
                                                 std::string_view prompt) const {
    PromptValidationReport report;
    if (input.objective.id.empty() || input.objective.title.empty() || input.objective.description.empty()) {
        report.valid = false;
        report.violations.push_back("objective is incomplete");
    }
    if (!input.objective.complete) {
        report.valid = false;
        report.violations.push_back("objective marked incomplete");
    }
    if (input.repository_state.root.empty() || input.repository_state.current_branch.empty()) {
        report.valid = false;
        report.violations.push_back("repository context is incomplete");
    }
    if (!constraints.valid) {
        report.valid = false;
        report.violations.insert(report.violations.end(), constraints.violations.begin(), constraints.violations.end());
    }
    if (context.referenced_files.empty()) {
        report.valid = false;
        report.violations.push_back("no repository files were selected");
    }
    if (input.constraints.maximum_token_budget == 0) {
        report.valid = false;
        report.violations.push_back("token budget must be positive");
    }
    if (input.constraints.approval_required && !input.constraints.review_required) {
        report.valid = false;
        report.violations.push_back("approval requirement conflicts with review requirement");
    }
    report.estimated_tokens = (prompt.size() / 4U) + 1U;
    if (report.estimated_tokens > input.constraints.maximum_token_budget) {
        report.valid = false;
        report.violations.push_back("prompt exceeds token budget");
    }
    return report;
}

} // namespace exotic::codex_operator
