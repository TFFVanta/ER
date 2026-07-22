#pragma once
#include "control_plane.hpp"
#include "dashboard.hpp"
#include <ostream>
namespace exotic::runtime {class RuntimeCli{public:RuntimeCli(TelemetryRepository&,std::string workspace_id,std::filesystem::path dashboard_dir);int run(const std::vector<std::string>&args,std::ostream&out);private:TelemetryRepository&repo_;std::string workspace_id_;DashboardWriter dashboard_;ControlPlane control_;};}
