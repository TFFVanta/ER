#pragma once
#include "control_plane.hpp"
#include "config.hpp"
#include "emergency.hpp"
#include "failure_injection.hpp"
#include "health_supervisor.hpp"
#include "workspace.hpp"
#include <memory>
#include <stop_token>
namespace exotic::runtime {
class ContinuousOperationsRuntime{
public:ContinuousOperationsRuntime(RuntimeConfig,TelemetryRepository&,EmergencyCoordinator&,FailureInjector* injector=nullptr);void add_service(std::shared_ptr<RuntimeService>);void start();void request_stop();void join();void run(std::stop_token external_stop={});RuntimeSnapshot snapshot();LifecycleManager&lifecycle(){return lifecycle_;}ControlPlane&control(){return control_;}
private:RuntimeConfig config_;WorkspaceContext workspace_;std::unique_ptr<WorkspaceLease>lease_;TelemetryRepository&repo_;AuditTimeline audit_;Metrics metrics_;DashboardWriter dashboard_;EmergencyCoordinator&emergency_;LifecycleManager lifecycle_;HealthSupervisor supervisor_;ControlPlane control_;FailureInjector*injector_;std::atomic<bool>started_{false};void process_controls();};
}
