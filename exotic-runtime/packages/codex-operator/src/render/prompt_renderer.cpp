#include "exotic/codex_operator/operator.hpp"

#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string join_lines(const std::vector<std::string>& values, std::string_view prefix = "- ") {
    std::ostringstream out;
    for (const auto& value : values) {
        out << prefix << value << '\n';
    }
    return out.str();
}

std::string canon_lines(const std::vector<CanonRule>& rules) {
    std::ostringstream out;
    for (const auto& rule : rules) {
        out << "- [" << rule.category << "] " << rule.rule << '\n';
    }
    return out.str();
}

std::string section_map_value(const std::map<std::string, std::string>& sections, const std::string& key) {
    const auto it = sections.find(key);
    return it == sections.end() ? std::string{} : it->second;
}

} // namespace

PromptTemplateRegistry::PromptTemplateRegistry() {
    const std::string template_text =
        "Objective\n{{objective}}\n\n"
        "Context\n{{context}}\n\n"
        "Constraints\n{{constraints}}\n\n"
        "Repository State\n{{repository_state}}\n\n"
        "Architecture Notes\n{{architecture_notes}}\n\n"
        "Implementation Requirements\n{{implementation_requirements}}\n\n"
        "Verification Requirements\n{{verification_requirements}}\n\n"
        "Definition of Done\n{{definition_of_done}}\n\n"
        "Final Review\n{{final_review}}\n\n"
        "Next Objective Guidance\n{{next_objective_guidance}}\n";
    templates_[PromptTemplateKind::FeatureImplementation] = template_text;
    templates_[PromptTemplateKind::BugFix] = template_text;
    templates_[PromptTemplateKind::Refactoring] = template_text;
    templates_[PromptTemplateKind::Optimization] = template_text;
    templates_[PromptTemplateKind::Documentation] = template_text;
    templates_[PromptTemplateKind::Testing] = template_text;
    templates_[PromptTemplateKind::Architecture] = template_text;
    templates_[PromptTemplateKind::Integration] = template_text;
    templates_[PromptTemplateKind::Performance] = template_text;
    templates_[PromptTemplateKind::Security] = template_text;
    templates_[PromptTemplateKind::Migration] = template_text;
    templates_[PromptTemplateKind::Research] = template_text;
}

std::string PromptTemplateRegistry::render(PromptTemplateKind kind,
                                           const std::map<std::string, std::string>& sections) const {
    auto result = templates_.at(kind);
    for (const auto& [key, value] : sections) {
        const auto token = "{{" + key + "}}";
        std::size_t position = 0;
        while ((position = result.find(token, position)) != std::string::npos) {
            result.replace(position, token.size(), value);
            position += value.size();
        }
    }
    return result;
}

std::string PromptRenderer::render(const PromptCompilerInput& input,
                                   const CompiledContext& context,
                                   const ConstraintReport& constraints,
                                   const RepositoryAnalysis& analysis,
                                   const std::vector<CanonRule>& relevant_canon,
                                   const PromptTemplateRegistry& templates) const {
    std::map<std::string, std::string> sections;
    sections["objective"] =
        "ID: " + input.objective.id + "\n"
        "Title: " + input.objective.title + "\n"
        "Description: " + input.objective.description + "\n"
        "Subsystem: " + input.objective.subsystem + "\n";
    sections["context"] = context.summary + "\nReferenced files:\n" + join_lines(context.referenced_files);
    sections["constraints"] = join_lines(constraints.effective_constraints);
    sections["repository_state"] =
        "Branch: " + input.repository_state.current_branch + "\n"
        "Git status:\n" + join_lines(input.repository_state.git_status) +
        "Recent changes:\n" + join_lines(input.repository_state.recent_changes);
    sections["architecture_notes"] = canon_lines(relevant_canon) + join_lines(context.architecture_notes);
    sections["implementation_requirements"] =
        "Build files:\n" + join_lines(analysis.relevant_build_files) +
        "Dependencies:\n" + join_lines(input.repository_state.dependencies) +
        "Available workers:\n";
    for (const auto& worker : input.available_workers) {
        sections["implementation_requirements"] +=
            "- " + worker.worker_id + " (" + worker.role + ", " + (worker.available ? "available" : "busy") + ")\n";
    }
    sections["implementation_requirements"] += "Available tools:\n";
    for (const auto& tool : input.available_tools) {
        sections["implementation_requirements"] += "- " + tool.name + ": " + join_lines(tool.operations, "");
    }
    sections["verification_requirements"] =
        "Build status: " + input.build_status.summary + "\n"
        "Test status: " + input.test_results.summary + "\n"
        "Required tests:\n" + join_lines(input.constraints.required_tests) +
        "Required documentation:\n" + join_lines(input.constraints.required_documentation) +
        "Build warnings:\n" + join_lines(input.build_status.warnings) +
        "Previous evidence:\n";
    for (const auto& evidence : input.previous_evidence) {
        sections["verification_requirements"] += "- " + evidence.id + ": " + evidence.summary + '\n';
    }
    if (input.previous_session) {
        sections["verification_requirements"] += "Previous session: " + input.previous_session->session_id + " - " + input.previous_session->summary + '\n';
    }
    sections["verification_requirements"] +=
        "Metrics:\n"
        "- active_services=" + std::to_string(input.metrics.active_services) + '\n' +
        "- active_workers=" + std::to_string(input.metrics.active_workers) + '\n' +
        "- event_throughput=" + std::to_string(input.metrics.event_throughput) + '\n';
    sections["definition_of_done"] =
        "Deterministic prompt output.\n"
        "Relevant repository context only.\n"
        "Validation passes.\n"
        "Existing EXOTIC functionality remains intact.\n";
    sections["final_review"] =
        "Review every created file.\nRefactor duplicated logic.\nImprove maintainability.\nValidate integration.\n";
    sections["next_objective_guidance"] =
        "Recommend the next smallest verified step after this objective completes.";
    return templates.render(input.objective.template_kind, sections);
}

} // namespace exotic::codex_operator
