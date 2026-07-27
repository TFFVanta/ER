#include "exotic/codex_operator/operator.hpp"

namespace exotic::codex_operator {

ConstraintReport ConstraintsEngine::evaluate(const PromptCompilerInput& input,
                                             const CompiledContext& context) const {
    ConstraintReport report;
    for (const auto& file : context.referenced_files) {
        if (!input.constraints.repository_boundary.empty()) {
            const auto boundary = input.constraints.repository_boundary.generic_string();
            if (!boundary.empty() && file.find(boundary) == std::string::npos && file.find("packages/") == std::string::npos) {
                report.valid = false;
                report.violations.push_back("file outside repository boundary: " + file);
            }
        }
        if (input.constraints.protected_files.contains(file)) {
            report.valid = false;
            report.violations.push_back("protected file referenced for modification: " + file);
        }
    }
    if (context.referenced_files.size() > input.constraints.maximum_file_count) {
        report.valid = false;
        report.violations.push_back("maximum file count exceeded");
    }

    report.effective_constraints.push_back("max_files=" + std::to_string(input.constraints.maximum_file_count));
    report.effective_constraints.push_back("token_budget=" + std::to_string(input.constraints.maximum_token_budget));
    report.effective_constraints.push_back(input.constraints.build_required ? "build_required" : "build_optional");
    report.effective_constraints.push_back(input.constraints.review_required ? "review_required" : "review_optional");
    report.effective_constraints.push_back(input.constraints.approval_required ? "approval_required" : "approval_optional");

    for (const auto& test : input.constraints.required_tests) {
        report.effective_constraints.push_back("required_test=" + test);
    }
    for (const auto& doc : input.constraints.required_documentation) {
        report.effective_constraints.push_back("required_doc=" + doc);
    }
    for (const auto& extra : input.active_constraints) {
        report.effective_constraints.push_back(extra);
    }
    return report;
}

} // namespace exotic::codex_operator
