#pragma once
#include "telemetry_repository.hpp"
#include "../autonomy/persistence/database.hpp"
#include <filesystem>
namespace exotic::runtime {
class SqliteTelemetryRepository final:public TelemetryRepository{
public:SqliteTelemetryRepository(const std::filesystem::path&,std::string workspace_id);std::uint64_t next_audit_id()override;std::uint64_t next_alert_id()override;void append_audit(const AuditRecord&)override;std::vector<AuditRecord>load_audit(std::size_t)override;void save_trace(const TraceSpan&)override;std::vector<TraceSpan>load_traces(std::size_t)override;void append_metric(const MetricSample&)override;std::vector<MetricSample>load_metrics(std::string_view,std::size_t)override;void save_alert(const AlertRecord&)override;std::vector<AlertRecord>load_active_alerts()override;void save_service_health(const ServiceHealth&,std::string_view)override;std::vector<ServiceHealth>load_service_health()override;void set_control(const ControlRecord&)override;std::optional<ControlRecord>get_control(std::string_view)override;
private:autonomy::persistence::Database db_;std::string workspace_id_;void migrate();std::uint64_t next(std::string_view table);};}
