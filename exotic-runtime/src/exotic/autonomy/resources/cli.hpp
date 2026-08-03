#pragma once

#include "governor.hpp"
#include "recovery.hpp"

#include <ostream>
#include <string_view>
#include <vector>

namespace exotic::autonomy::resources {

int run_resource_cli(
    const std::vector<std::string_view>& arguments,
    ResourceGovernor& governor,
    ResourceRepository& repository,
    std::ostream& output,
    std::ostream& error
);

} // namespace exotic::autonomy::resources
