#include "execution_context.hpp"
namespace exotic::autonomy::agents {namespace {thread_local const WorkAssignment* current=nullptr;}CurrentAssignmentGuard::CurrentAssignmentGuard(const WorkAssignment&a):previous_(current){current=&a;}CurrentAssignmentGuard::~CurrentAssignmentGuard(){current=previous_;}const WorkAssignment* current_assignment() noexcept{return current;}}
