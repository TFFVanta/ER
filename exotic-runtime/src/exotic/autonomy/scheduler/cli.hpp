#pragma once
#include "repository.hpp"
#include <span>
#include <string_view>

namespace exotic::autonomy::scheduler {
int run_scheduler_cli(SchedulerRepository& repository, std::span<const std::string_view> args);
}
