#include "exotic/codex_operator/operator.hpp"

#include <sstream>

namespace exotic::codex_operator {

PromptCompiler::PromptCompiler(Runtime& runtime,
                               StructuredLogger& logger,
                               MetricsCollector& metrics,
                               RepositoryAnalyzer analyzer,
                               CanonSelector canon_selector,
                               ContextCompiler context_compiler,
                               ConstraintsEngine constraints_engine,
                               PromptTemplateRegistry templates,
                               PromptRenderer renderer,
                               PromptValidator validator)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      analyzer_(std::move(analyzer)),
      canon_selector_(std::move(canon_selector)),
      context_compiler_(std::move(context_compiler)),
      constraints_engine_(std::move(constraints_engine)),
      templates_(std::move(templates)),
      renderer_(std::move(renderer)),
      validator_(std::move(validator)) {}

CompiledPrompt PromptCompiler::compile(const PromptCompilerInput& input) {
    const auto analysis = analyzer_.analyze(input);
    const auto relevant_canon = canon_selector_.select(input, analysis);
    const auto context = context_compiler_.compile(input, analysis, relevant_canon);
    const auto constraints = constraints_engine_.evaluate(input, context);
    const auto prompt = renderer_.render(input, context, constraints, analysis, relevant_canon, templates_);
    const auto validation = validator_.validate(input, context, constraints, prompt);
    if (!validation.valid) {
        logger_.error("prompt-compiler", "prompt validation failed", {{"objective", input.objective.id}});
        metrics_.increment_error_count();
        std::ostringstream message;
        for (const auto& violation : validation.violations) {
            if (!message.str().empty()) {
                message << "; ";
            }
            message << violation;
        }
        throw OperatorError(ErrorCode::InvalidConfiguration, message.str());
    }

    Event event;
    event.type = "codex.prompt.compiled";
    event.payload["objective"] = input.objective.id;
    event.payload["checksum"] = checksum(prompt);
    event.payload["estimated_tokens"] = static_cast<std::int64_t>(validation.estimated_tokens);
    runtime_.events().publish(event);

    metrics_.record_build_statistic("prompt_tokens", static_cast<double>(validation.estimated_tokens));
    logger_.info("prompt-compiler", "compiled prompt", {{"objective", input.objective.id}});

    CompiledPrompt compiled;
    compiled.prompt = prompt;
    compiled.checksum = checksum(prompt);
    compiled.context_summary = context.summary;
    compiled.referenced_files = context.referenced_files;
    compiled.referenced_objectives = context.referenced_objectives;
    compiled.estimated_complexity = estimate_complexity(input, context);
    compiled.estimated_runtime = estimate_runtime(input, context);
    compiled.metadata = {
        {"branch", input.repository_state.current_branch},
        {"objective", input.objective.id},
        {"template", to_string(input.objective.template_kind)},
        {"estimated_tokens", std::to_string(validation.estimated_tokens)}
    };
    return compiled;
}

std::string PromptCompiler::checksum(std::string_view prompt) {
    std::uint64_t hash = 1469598103934665603ULL;
    for (const unsigned char ch : prompt) {
        hash ^= ch;
        hash *= 1099511628211ULL;
    }
    std::ostringstream out;
    out << std::hex << hash;
    return out.str();
}

PromptComplexity PromptCompiler::estimate_complexity(const PromptCompilerInput& input,
                                                     const CompiledContext& context) {
    const auto score = context.referenced_files.size()
        + input.objective.dependencies.size()
        + input.test_results.failing_tests.size();
    if (score >= 18) return PromptComplexity::Critical;
    if (score >= 10) return PromptComplexity::High;
    if (score >= 5) return PromptComplexity::Medium;
    return PromptComplexity::Low;
}

std::chrono::milliseconds PromptCompiler::estimate_runtime(const PromptCompilerInput& input,
                                                           const CompiledContext& context) {
    const auto units = static_cast<std::uint64_t>(
        250 * (1 + context.referenced_files.size() + input.test_results.failing_tests.size()));
    return std::chrono::milliseconds(units);
}

std::string to_string(PromptTemplateKind value) {
    switch (value) {
    case PromptTemplateKind::FeatureImplementation: return "feature_implementation";
    case PromptTemplateKind::BugFix: return "bug_fix";
    case PromptTemplateKind::Refactoring: return "refactoring";
    case PromptTemplateKind::Optimization: return "optimization";
    case PromptTemplateKind::Documentation: return "documentation";
    case PromptTemplateKind::Testing: return "testing";
    case PromptTemplateKind::Architecture: return "architecture";
    case PromptTemplateKind::Integration: return "integration";
    case PromptTemplateKind::Performance: return "performance";
    case PromptTemplateKind::Security: return "security";
    case PromptTemplateKind::Migration: return "migration";
    case PromptTemplateKind::Research: return "research";
    }
    return "unknown";
}

std::string to_string(PromptComplexity value) {
    switch (value) {
    case PromptComplexity::Low: return "low";
    case PromptComplexity::Medium: return "medium";
    case PromptComplexity::High: return "high";
    case PromptComplexity::Critical: return "critical";
    }
    return "unknown";
}

} // namespace exotic::codex_operator
