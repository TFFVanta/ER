#include "exotic/codex_operator/operator.hpp"

#include <algorithm>

namespace exotic::codex_operator {

namespace {

bool contains_token(std::string_view haystack, std::string_view needle) {
    return haystack.find(needle) != std::string_view::npos;
}

std::string generic(const std::filesystem::path& path) {
    return path.generic_string();
}

} // namespace

RepositoryAnalysis RepositoryAnalyzer::analyze(const PromptCompilerInput& input) const {
    RepositoryAnalysis analysis;

    for (const auto& file : input.repository_state.files) {
        const auto path = generic(file.path);
        analysis.project_structure.push_back(path);
        if (contains_token(path, "CMakeLists.txt") || contains_token(path, ".cmake") || contains_token(path, "package.json")) {
            analysis.relevant_build_files.push_back(path);
        }
        if (contains_token(path, "include/")) {
            analysis.include_graph.push_back(path);
        }
        if (contains_token(path, "src/")) {
            analysis.source_graph.push_back(path);
        }
        if (file.is_documentation || contains_token(path, "/docs/") || contains_token(path, ".md")) {
            analysis.documentation_files.push_back(path);
        }
        if (file.is_generated) {
            analysis.generated_files.push_back(path);
        }
    }

    analysis.relevant_build_files.insert(analysis.relevant_build_files.end(),
        input.repository_state.build_files.begin(),
        input.repository_state.build_files.end());

    for (const auto& todo : input.repository_state.open_todos) {
        analysis.technical_debt_indicators.push_back("todo:" + todo);
    }
    for (const auto& failing : input.repository_state.failing_tests) {
        analysis.technical_debt_indicators.push_back("failing_test:" + failing);
    }
    analysis.technical_debt_indicators.insert(analysis.technical_debt_indicators.end(),
        input.repository_state.technical_debt_indicators.begin(),
        input.repository_state.technical_debt_indicators.end());

    for (const auto& change : input.repository_state.recent_changes) {
        if (contains_token(change, "generated") || contains_token(change, "dist/")) {
            analysis.generated_files.push_back(change);
        }
        if (contains_token(change, "unused") || contains_token(change, "dead")) {
            analysis.unused_code_indicators.push_back(change);
        }
    }

    std::sort(analysis.project_structure.begin(), analysis.project_structure.end());
    std::sort(analysis.relevant_build_files.begin(), analysis.relevant_build_files.end());
    std::sort(analysis.include_graph.begin(), analysis.include_graph.end());
    std::sort(analysis.source_graph.begin(), analysis.source_graph.end());
    std::sort(analysis.documentation_files.begin(), analysis.documentation_files.end());
    std::sort(analysis.generated_files.begin(), analysis.generated_files.end());
    std::sort(analysis.unused_code_indicators.begin(), analysis.unused_code_indicators.end());
    std::sort(analysis.technical_debt_indicators.begin(), analysis.technical_debt_indicators.end());
    return analysis;
}

} // namespace exotic::codex_operator
