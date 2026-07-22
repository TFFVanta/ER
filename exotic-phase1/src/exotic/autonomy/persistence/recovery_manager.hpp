#pragma once
#include "repository.hpp"
#include <vector>
namespace exotic::autonomy::persistence {
struct RecoveryReport{std::size_t objectives_loaded{};std::size_t proposals_loaded{};std::size_t operations_loaded{};std::size_t interrupted_operations{};std::vector<OperationId>interrupted_operation_ids;};
class RecoveryManager{public:explicit RecoveryManager(AutonomyRepository& repository):repository_(repository){}RecoveryReport recover();private:AutonomyRepository&repository_;};
}
