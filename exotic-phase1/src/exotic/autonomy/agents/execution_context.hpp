#pragma once
#include "types.hpp"
namespace exotic::autonomy::agents {
class CurrentAssignmentGuard{
public:explicit CurrentAssignmentGuard(const WorkAssignment&);~CurrentAssignmentGuard();CurrentAssignmentGuard(const CurrentAssignmentGuard&)=delete;CurrentAssignmentGuard& operator=(const CurrentAssignmentGuard&)=delete;
private:const WorkAssignment* previous_{nullptr};
};
[[nodiscard]] const WorkAssignment* current_assignment() noexcept;
}
