#include "exotic/autonomy/resources/governor.hpp"
#include "exotic/autonomy/resources/sqlite_repository.hpp"

#include <cassert>
#include <filesystem>

int main() {
    using namespace exotic::autonomy;
    using namespace exotic::autonomy::resources;

    const auto path = std::filesystem::temp_directory_path() / "exotic-resource-v05-test.db";
    std::filesystem::remove(path);
    std::filesystem::remove(path.string() + "-wal");
    std::filesystem::remove(path.string() + "-shm");

    DenyBudgetApprovalVerifier approvals;
    {
        SqliteResourceRepository repository{path};
        ResourceGovernor governor{repository, approvals};
        ResourceAccount account;
        account.scope = AccountScope::Workspace;
        account.scope_id = "sqlite";
        account.name = "SQLite test";
        account.limits = {
            {ResourceDimension::MoneyUsd, 10.0, 8.0, 0.0, 0.0}
        };
        const auto id = governor.create_account(account);
        assert(id == 1);
    }
    {
        SqliteResourceRepository repository{path};
        const auto account = repository.find_account(AccountScope::Workspace, "sqlite");
        assert(account);
        assert(account->limits.size() == 1);
    }

    std::filesystem::remove(path);
    std::filesystem::remove(path.string() + "-wal");
    std::filesystem::remove(path.string() + "-shm");
    return 0;
}
