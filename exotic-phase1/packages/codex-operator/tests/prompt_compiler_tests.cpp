#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <cassert>
#include <filesystem>
#include <iostream>

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    try {
        Runtime runtime;
        auto sink = std::make_shared<MemoryLogSink>();
        StructuredLogger logger{LogLevel::Trace};
        logger.add_sink(sink);
        MetricsCollector metrics{"prompt-tests"};
        PromptCompiler compiler{runtime, logger, metrics};
        auto package = std::make_unique<CodexOperatorPackage>(runtime, OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-compiler-state"), sink);
        auto package_compiler = package->create_prompt_compiler();
        assert(package_compiler != nullptr);

        PromptCompilerInput input;
        input.objective = {
            "objective.prompt.compiler",
            "Build prompt compiler",
            "Create deterministic, context-aware prompts",
            "packages/codex-operator",
            PromptTemplateKind::Integration,
            {"objective.foundation"},
            {"remove duplicate canon"},
            true
        };
        input.objective_graph.objectives = {
            input.objective,
            {"objective.foundation", "Foundation", "Complete foundation", "packages/codex-operator", PromptTemplateKind::Architecture, {}, {}, true}
        };
        input.objective_graph.edges.push_back({"objective.foundation", "objective.prompt.compiler"});
        input.repository_state.root = std::filesystem::current_path();
        input.repository_state.current_branch = "codex/prompt-compiler";
        input.repository_state.git_status = {"M packages/codex-operator/include/exotic/codex_operator/operator.hpp"};
        input.repository_state.recent_changes = {
            "packages/codex-operator/src/prompt_compiler/prompt_compiler.cpp",
            "packages/codex-operator/src/render/prompt_renderer.cpp"
        };
        input.repository_state.files = {
            {std::filesystem::path("packages/codex-operator/include/exotic/codex_operator/operator.hpp"), false, false, false, 4096},
            {std::filesystem::path("packages/codex-operator/src/prompt_compiler/prompt_compiler.cpp"), false, false, false, 2048},
            {std::filesystem::path("packages/codex-operator/tests/prompt_compiler_tests.cpp"), true, false, false, 1024},
            {std::filesystem::path("packages/codex-operator/docs/prompt-template-reference.md"), false, true, false, 512}
        };
        input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
        input.repository_state.dependencies = {"cmake", "event-bus", "runtime"};
        input.repository_state.open_todos = {"verify token budget heuristics"};
        input.repository_state.failing_tests = {"prompt_compiler_tests"};
        input.repository_state.technical_debt_indicators = {"unused helper in old compiler prototype"};
        input.repository_state.protected_files = {"exotic-phase1/CMakeLists.txt"};
        input.existing_architecture = "Foundation package owns lifecycle and integration services.";
        input.canon = {
            {"architecture", "Preserve modular package boundaries.", {"always", "packages/codex-operator"}},
            {"testing", "Add tests for deterministic output.", {"testing"}},
            {"documentation", "Update prompt compiler docs with every template change.", {"documentation"}},
            {"security", "Do not cross protected repository boundaries.", {"security"}}
        };
        input.coding_standards = {"Use modern C++20.", "Prefer deterministic ordering."};
        input.active_constraints = {"no unrelated file modifications"};
        input.previous_session = PreviousSessionSummary{"session-1", "Foundation completed", {"packages/codex-operator/src/operator.cpp"}};
        input.previous_evidence = {{"evidence-1", "Previous compiler draft existed", {"packages/codex-operator/src/prompt_compiler/prompt_compiler.cpp"}}};
        input.build_status = {true, "last build passed", {"warning: missing benchmark docs"}};
        input.test_results = {false, {"prompt_compiler_tests"}, "one prompt compiler test failing"};
        input.metrics.active_workers = 3;
        input.available_workers = {{"planner-1", "planner", true}, {"builder-1", "builder", true}};
        input.available_tools = {{"cmake", {"configure", "build"}}, {"ctest", {"run"}}};
        input.constraints.maximum_file_count = 8;
        input.constraints.maximum_token_budget = 5000;
        input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
        input.constraints.required_tests = {"prompt_compiler_tests"};
        input.constraints.required_documentation = {"prompt-template-reference.md"};
        input.constraints.build_required = true;
        input.constraints.review_required = true;

        const auto compiled = compiler.compile(input);
        assert(compiled.prompt.find("Objective") != std::string::npos);
        assert(compiled.prompt.find("Verification Requirements") != std::string::npos);
        assert(!compiled.checksum.empty());
        assert(compiled.context_summary.find("Subsystem") != std::string::npos);
        assert(!compiled.referenced_files.empty());
        assert(std::find(compiled.referenced_objectives.begin(), compiled.referenced_objectives.end(), "objective.prompt.compiler") != compiled.referenced_objectives.end());
        assert(compiled.metadata.at("template") == "integration");
        assert(metrics.snapshot().build_statistics.contains("prompt_tokens"));
        assert(!sink->entries().empty());

        input.objective.complete = false;
        bool rejected = false;
        try {
            (void)compiler.compile(input);
        } catch (const OperatorError&) {
            rejected = true;
        }
        assert(rejected);

        std::cout << "prompt_compiler_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "prompt_compiler_tests failure: " << error.what() << '\n';
        return 1;
    }
}
