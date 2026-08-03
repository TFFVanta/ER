#pragma once
#include "dashboard.hpp"
#include "config.hpp"
#include "emergency.hpp"
#include "lifecycle.hpp"
#include "telemetry.hpp"
#include <atomic>
#include <thread>
namespace exotic::runtime {
class HealthSupervisor{public:HealthSupervisor(LifecycleManager&,TelemetryRepository&,DashboardWriter&,RuntimeConfig,EmergencyCoordinator&);void start();void request_stop();void join();RuntimeSnapshot snapshot();private:LifecycleManager&lifecycle_;TelemetryRepository&repo_;DashboardWriter&dashboard_;RuntimeConfig config_;EmergencyCoordinator&emergency_;Metrics metrics_;Alerts alerts_;std::jthread thread_;std::atomic<bool>running_{false};void observe();};
}
