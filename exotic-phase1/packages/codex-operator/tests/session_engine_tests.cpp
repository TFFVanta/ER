#include "exotic/codex_operator/operator.hpp"

#include <cassert>
#include <filesystem>
#include <iostream>

namespace {

exotic::codex_operator::PromptCompilerInput make_input(std::string objective_id,
                                                       exotic::codex_operator::PromptTemplateKind kind,
                                                       bool approval_required = false) {
    using namespace exotic::codex_operator;

    PromptCompilerInput input;
    input.objective = {
        std::move(objective_id),
        "Build session engine",
        "Coordinate deterministic autonomous sessions",
        "packages/codex-operator",
        kind,
        {},
        {"preserve deterministic order"},
        true
    };
    input.objective_graph.objectives = {input.objective};
    input.repository_state.root = std::filesystem::current_path();
    input.repository_state.current_branch = "codex/session-engine";
    input.repository_state.files = {
        {std::filesystem::path("packages/codex-operator/include/exotic/codex_operator/operator.hpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/src/session_engine/session_engine.cpp"), false, false, false, 4096},
        {std::filesystem::path("packages/codex-operator/tests/session_engine_tests.cpp"), true, false, false, 2048}
    };
    input.repository_state.build_files = {"exotic-phase1/cmake/EXOTIC_CODEX_OPERATOR.cmake"};
    input.repository_state.dependencies = {"runtime", "event-bus", "worker-runtime"};
    input.existing_architecture = "PromptCompiler builds prompts and WorkerRuntime executes assignments.";
    input.canon = {
        {"architecture", "Route coordination through immutable events.", {"always"}},
        {"testing", "Verify session lifecycle end-to-end.", {"testing"}}
    };
    input.coding_standards = {"Use modern C++20.", "Prefer explicit lifecycle states."};
    input.build_status = {true, "build healthy", {}};
    input.test_results = {true, {}, "tests healthy"};
    input.available_workers = {{"builder-1", "builder", true}, {"tester-1", "tester", true}};
    input.available_tools = {{"cmake", {"configure", "build"}}, {"ctest", {"run"}}};
    input.constraints.maximum_file_count = 12;
    input.constraints.maximum_token_budget = 6000;
    input.constraints.repository_boundary = std::filesystem::path("packages/codex-operator");
    input.constraints.required_tests = {"session_engine_tests"};
    input.constraints.required_documentation = {"session-architecture.md"};
    input.constraints.build_required = true;
    input.constraints.review_required = true;
    input.constraints.approval_required = approval_required;
    return input;
}

} // namespace

int main() {
    using namespace exotic;
    using namespace exotic::codex_operator;
    using namespace exotic::runtime;

    try {
        Runtime runtime;
        auto sink = std::make_shared<MemoryLogSink>();
        auto package = std::make_unique<CodexOperatorPackage>(
            runtime,
            OperatorConfig::from_runtime(RuntimeConfig{std::filesystem::current_path()}, std::filesystem::temp_directory_path() / "codex-session-state"),
            sink);
        auto session_engine = package->create_session_engine();
        assert(session_engine != nullptr);

        const auto created = session_engine->create_session(make_input("objective.session.1", PromptTemplateKind::FeatureImplementation));
        assert(created.status == SessionStatus::Ready);
        assert(created.assignment_ids.size() == 1);
        assert(session_engine->api().handle({"GET", "/sessions"}).status == 200);

        const auto results = session_engine->run_session(created.id);
        assert(results.size() == 1);
        assert(results.front().success);

        const auto completed = session_engine->find(created.id);
        assert(completed.has_value());
        assert(completed->status == SessionStatus::Completed);
        assert(!completed->evidence.empty());

        const auto waiting = session_engine->create_session(make_input("objective.session.2", PromptTemplateKind::Testing, true));
        assert(waiting.status == SessionStatus::WaitingApproval);
        bool approval_blocked = false;
        try {
            (void)session_engine->run_session(waiting.id);
        } catch (const OperatorError&) {
            approval_blocked = true;
        }
        assert(approval_blocked);
        session_engine->record_approval(waiting.id, true, "reviewer-1");
        const auto approved_results = session_engine->run_session(waiting.id);
        assert(approved_results.size() == 1);
        assert(approved_results.front().success);

        const auto denied = session_engine->create_session(make_input("objective.session.3", PromptTemplateKind::Documentation));
        session_engine->request_approval(denied.id, "manual release gate");
        session_engine->record_approval(denied.id, false, "reviewer-2");
        assert(session_engine->find(denied.id)->status == SessionStatus::Cancelled);
        session_engine->archive_session(denied.id);
        assert(session_engine->find(denied.id)->status == SessionStatus::Archived);

        const auto snapshot = session_engine->snapshot();
        assert(snapshot.metrics.total_sessions == 3);
        assert(snapshot.metrics.completed_sessions >= 2);
        assert(!snapshot.checkpoints.empty());
        assert(!snapshot.events.empty());
        assert(session_engine->api().handle({"GET", "/session-checkpoints"}).body.find("checkpoint") != std::string::npos);
        assert(session_engine->api().handle({"GET", "/session-metrics"}).body.find("total_sessions") != std::string::npos);
        assert(!sink->entries().empty());

        std::cout << "session_engine_tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "session_engine_tests failure: " << error.what() << '\n';
        return 1;
    }
}
