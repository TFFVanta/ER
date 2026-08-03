#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string generic(const std::filesystem::path& path) {
    return path.generic_string();
}

bool relevant_file(const RepositoryFileSummary& file, const PromptCompilerInput& input) {
    const auto path = generic(file.path);
    if (!input.objective.subsystem.empty() && path.find(input.objective.subsystem) != std::string::npos) {
        return true;
    }
    for (const auto& dependency : input.objective.dependencies) {
        if (path.find(dependency) != std::string::npos) {
            return true;
        }
    }
    return file.is_test || file.is_documentation;
}

} // namespace

CompiledContext ContextCompiler::compile(const PromptCompilerInput& input,
                                         const RepositoryAnalysis& analysis,
                                         const std::vector<CanonRule>& relevant_canon) const {
    CompiledContext context;
    context.current_subsystem = input.objective.subsystem;

    for (const auto& file : input.repository_state.files) {
        if (context.referenced_files.size() >= input.constraints.maximum_file_count) {
            break;
        }
        if (relevant_file(file, input)) {
            context.referenced_files.push_back(generic(file.path));
        }
    }

    context.referenced_files.insert(context.referenced_files.end(),
        input.repository_state.recent_changes.begin(),
        input.repository_state.recent_changes.end());
    std::sort(context.referenced_files.begin(), context.referenced_files.end());
    context.referenced_files.erase(std::unique(context.referenced_files.begin(), context.referenced_files.end()),
                                   context.referenced_files.end());
    if (context.referenced_files.size() > input.constraints.maximum_file_count) {
        context.referenced_files.resize(input.constraints.maximum_file_count);
    }

    context.referenced_objectives.push_back(input.objective.id);
    for (const auto& dependency : input.objective.dependencies) {
        context.referenced_objectives.push_back(dependency);
    }
    std::sort(context.referenced_objectives.begin(), context.referenced_objectives.end());
    context.referenced_objectives.erase(std::unique(context.referenced_objectives.begin(), context.referenced_objectives.end()),
                                        context.referenced_objectives.end());

    context.repository_notes.push_back("branch=" + input.repository_state.current_branch);
    context.repository_notes.push_back("recent_changes=" + std::to_string(input.repository_state.recent_changes.size()));
    for (const auto& todo : input.repository_state.open_todos) {
        context.repository_notes.push_back("todo=" + todo);
    }
    for (const auto& failing : input.repository_state.failing_tests) {
        context.repository_notes.push_back("failing_test=" + failing);
    }
    for (const auto& build_file : analysis.relevant_build_files) {
        context.repository_notes.push_back("build_file=" + build_file);
    }

    for (const auto& rule : relevant_canon) {
        context.architecture_notes.push_back(rule.category + ": " + rule.rule);
    }
    context.architecture_notes.push_back("existing_architecture=" + input.existing_architecture);
    if (input.previous_session) {
        context.repository_notes.push_back("previous_session=" + input.previous_session->summary);
    }
    for (const auto& evidence : input.previous_evidence) {
        context.repository_notes.push_back("evidence=" + evidence.summary);
    }

    std::ostringstream summary;
    summary << "Subsystem " << (context.current_subsystem.empty() ? "unknown" : context.current_subsystem)
            << ", " << context.referenced_files.size() << " files, "
            << input.repository_state.failing_tests.size() << " failing tests, "
            << input.repository_state.open_todos.size() << " open TODOs.";
    context.summary = summary.str();
    return context;
}

} // namespace exotic::codex_operator
