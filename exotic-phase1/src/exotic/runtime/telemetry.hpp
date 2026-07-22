#pragma once
#include "telemetry_repository.hpp"
#include <atomic>
namespace exotic::runtime {
class AuditTimeline{public:AuditTimeline(TelemetryRepository&,std::string workspace_id);void emit(std::string category,std::string actor,std::string entity_type,std::string entity_id,std::string message,std::string payload_json="{}");private:TelemetryRepository&repo_;std::string workspace_id_;};
class Metrics{public:Metrics(TelemetryRepository&,std::string workspace_id);void record(std::string name,double value,std::string unit="",std::string labels_json="{}");private:TelemetryRepository&repo_;std::string workspace_id_;};
class Alerts{public:Alerts(TelemetryRepository&,std::string workspace_id);std::uint64_t raise(AlertSeverity,std::string source,std::string code,std::string message,std::string details_json="{}");void clear(std::string_view source,std::string_view code);private:TelemetryRepository&repo_;std::string workspace_id_;};
class TraceScope{public:TraceScope(TelemetryRepository&,std::string workspace_id,std::string service,std::string operation,std::optional<std::string>parent=std::nullopt);~TraceScope();TraceScope(const TraceScope&)=delete;void success(std::string attributes_json="{}");void fail(std::string attributes_json="{}");const std::string&trace_id()const{return span_.trace_id;}private:TelemetryRepository&repo_;TraceSpan span_;bool closed_{false};void close(std::string,std::string);};
}
