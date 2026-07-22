#pragma once
#include "types.hpp"
#include <optional>
#include <string_view>
namespace exotic::runtime {
class TelemetryRepository {
public:virtual~TelemetryRepository()=default;virtual std::uint64_t next_audit_id()=0;virtual std::uint64_t next_alert_id()=0;virtual void append_audit(const AuditRecord&)=0;virtual std::vector<AuditRecord> load_audit(std::size_t)=0;virtual void save_trace(const TraceSpan&)=0;virtual std::vector<TraceSpan> load_traces(std::size_t)=0;virtual void append_metric(const MetricSample&)=0;virtual std::vector<MetricSample> load_metrics(std::string_view,std::size_t)=0;virtual void save_alert(const AlertRecord&)=0;virtual std::vector<AlertRecord> load_active_alerts()=0;virtual void save_service_health(const ServiceHealth&,std::string_view workspace_id)=0;virtual std::vector<ServiceHealth> load_service_health()=0;virtual void set_control(const ControlRecord&)=0;virtual std::optional<ControlRecord> get_control(std::string_view key)=0;};
}
