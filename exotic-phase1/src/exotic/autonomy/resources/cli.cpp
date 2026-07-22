#include "cli.hpp"

namespace exotic::autonomy::resources {

namespace {

void print_vector(std::ostream& output, const ResourceVector& vector) {
    bool first = true;
    for (const auto& [dimension, value] : vector.values()) {
        if (!first) output << ", ";
        output << to_string(dimension) << '=' << value;
        first = false;
    }
    if (first) output << "none";
}

} // namespace

int run_resource_cli(
    const std::vector<std::string_view>& arguments,
    ResourceGovernor& governor,
    ResourceRepository& repository,
    std::ostream& output,
    std::ostream& error
) {
    if (arguments.empty() || arguments.front() == "status") {
        const auto status = governor.status();
        output
            << "EXOTIC RESOURCE GOVERNOR 0.5\n"
            << "emergency_stop=" << (status.emergency_stop ? "active" : "clear") << '\n'
            << "accounts=" << status.accounts << '\n'
            << "active_reservations=" << status.active_reservations << '\n'
            << "open_circuits=" << status.open_circuits << '\n'
            << "anomalies=" << status.anomalies << '\n';
        return 0;
    }

    const auto command = arguments.front();
    if (command == "accounts") {
        for (const auto& account : repository.load_accounts()) {
            output << account.id << ' ' << to_string(account.scope) << ':' << account.scope_id
                   << " status=" << to_string(account.status) << " name=" << account.name << '\n';
            for (const auto& limit : account.limits) {
                output << "  " << to_string(limit.dimension)
                       << " hard=" << limit.hard_limit
                       << " spent=" << limit.spent
                       << " reserved=" << limit.reserved << '\n';
            }
        }
        return 0;
    }
    if (command == "reservations") {
        for (const auto& reservation : repository.load_active_reservations()) {
            output << reservation.id << " job=" << reservation.job_id
                   << " proposal=" << reservation.proposal_id
                   << " workload=" << reservation.workload_key << " reserved=";
            print_vector(output, reservation.reserved);
            output << '\n';
        }
        return 0;
    }
    if (command == "anomalies") {
        for (const auto& anomaly : repository.load_anomalies(100)) {
            output << anomaly.id << " reservation=" << anomaly.reservation_id
                   << " dimension=" << to_string(anomaly.dimension)
                   << " expected=" << anomaly.expected
                   << " observed=" << anomaly.observed
                   << " severity=" << to_string(anomaly.severity) << '\n';
        }
        return 0;
    }
    if (command == "circuits") {
        for (const auto& circuit : repository.load_circuit_breakers()) {
            output << circuit.id << ' ' << circuit.scope_key
                   << " state=" << to_string(circuit.state)
                   << " failures=" << circuit.consecutive_failures
                   << " reason=" << circuit.reason << '\n';
        }
        return 0;
    }
    if (command == "recover") {
        ResourceRecoveryManager recovery{repository};
        const auto report = recovery.recover();
        output << "active_before=" << report.active_before << '\n'
               << "expired_released=" << report.expired_released << '\n';
        return 0;
    }
    if (command == "stop") {
        governor.emergency_stop("exotic.cli", "manual resource emergency stop");
        output << "resource emergency stop activated\n";
        return 0;
    }
    if (command == "resume") {
        governor.clear_emergency_stop("exotic.cli", "manual resource emergency stop cleared");
        output << "resource emergency stop cleared\n";
        return 0;
    }
    if (command == "forecast") {
        if (arguments.size() < 2) {
            error << "usage: exotic resources forecast <workload-key>\n";
            return 2;
        }
        const auto forecast = governor.forecast(arguments[1]);
        output << "workload=" << forecast.workload_key
               << " samples=" << forecast.samples
               << " confidence=" << forecast.confidence << " predicted=";
        print_vector(output, forecast.predicted);
        output << " p95=";
        print_vector(output, forecast.p95);
        output << '\n';
        return 0;
    }

    error << "unknown resources command\n";
    return 2;
}

} // namespace exotic::autonomy::resources
