#include "exotic/autonomy/autonomy_kernel.hpp"
#include "exotic/autonomy/persistence/sqlite_repository.hpp"

#include <cassert>
#include <filesystem>

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::persistence;

    const auto path = std::filesystem::temp_directory_path() / "exotic-autonomy-v02-test.db";
    std::filesystem::remove(path);

    {
        SqliteAutonomyRepository repository{path};
        AutonomyKernel kernel{repository};

        Objective objective;
        objective.title = "test";
        objective.desired_outcome = "pass";
        const auto objective_id = kernel.create_objective(objective);

        Proposal proposal;
        proposal.objective_id = objective_id;
        proposal.proposed_by = "test";
        proposal.plan.name = "plan";
        proposal.plan.steps.push_back({"step", "execute", true});
        proposal.confidence = 0.99;

        const auto proposal_id = kernel.submit_proposal(proposal);
        assert(kernel.evaluate_proposal(proposal_id).approved());
        const auto operation_id = kernel.execute_proposal(proposal_id, "test.agent");
        assert(operation_id.has_value());
        assert(kernel.verify_operation(*operation_id).passed);
    }

    // Construct a second kernel against the same database. This catches
    // cached-ID regressions that can otherwise collide with durable audit IDs.
    {
        SqliteAutonomyRepository repository{path};
        AutonomyKernel kernel{repository};

        Objective objective;
        objective.title = "restart test";
        objective.desired_outcome = "allocate fresh durable IDs";
        const auto objective_id = kernel.create_objective(objective);
        assert(objective_id == 2);

        assert(repository.load_objectives().size() == 2);
        assert(repository.load_proposals().size() == 1);
        assert(repository.load_operations().size() == 1);
        assert(repository.load_audit_events(20).size() >= 6);
    }

    // Simulate a legacy or damaged sequence that is behind durable rows.
    // The next allocation must reconcile with MAX(id)+1 atomically.
    {
        Database database{path};
        database.execute(
            "UPDATE exotic_sequences SET next_value=1 "
            "WHERE name='autonomy.objectives';"
        );
    }
    {
        SqliteAutonomyRepository repository{path};
        AutonomyKernel kernel{repository};
        Objective objective;
        objective.title = "sequence repair";
        objective.desired_outcome = "avoid legacy ID collision";
        assert(kernel.create_objective(objective) == 3);
    }

    std::filesystem::remove(path);
    std::filesystem::remove(path.string() + "-wal");
    std::filesystem::remove(path.string() + "-shm");
}
