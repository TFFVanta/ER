#include "types.hpp"
namespace exotic::runtime {
std::string to_string(RuntimeMode v){return v==RuntimeMode::Simulation?"simulation":"production";}
std::string to_string(ServiceState v){switch(v){case ServiceState::Registered:return"registered";case ServiceState::Recovering:return"recovering";case ServiceState::Starting:return"starting";case ServiceState::Running:return"running";case ServiceState::Stopping:return"stopping";case ServiceState::Stopped:return"stopped";case ServiceState::Failed:return"failed";}return"failed";}
std::string to_string(HealthLevel v){switch(v){case HealthLevel::Healthy:return"healthy";case HealthLevel::Degraded:return"degraded";case HealthLevel::Unhealthy:return"unhealthy";case HealthLevel::Unknown:return"unknown";}return"unknown";}
std::string to_string(AlertSeverity v){switch(v){case AlertSeverity::Info:return"info";case AlertSeverity::Warning:return"warning";case AlertSeverity::Error:return"error";case AlertSeverity::Critical:return"critical";}return"warning";}
std::optional<RuntimeMode> runtime_mode_from_string(std::string_view v){if(v=="production")return RuntimeMode::Production;if(v=="simulation")return RuntimeMode::Simulation;return std::nullopt;}
}
