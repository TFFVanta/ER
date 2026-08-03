#include "recovery.hpp"

namespace exotic::autonomy::resources {

ResourceRecoveryManager::ResourceRecoveryManager(ResourceRepository& repository)
    : repository_(repository) {}

ResourceRecoveryReport ResourceRecoveryManager::recover(TimePoint now) {
    ResourceRecoveryReport report;
    report.active_before = repository_.load_active_reservations().size();

    for (const auto& reservation : repository_.load_expired_reservations(now)) {
        if (repository_.release_reservation(
            reservation.id,
            ReservationStatus::Expired,
            now,
            "reservation expired during restart recovery"
        )) {
            ++report.expired_released;
            report.released_reservations.push_back(reservation.id);

            LedgerEvent event;
            event.id = repository_.next_ledger_event_id();
            event.event_type = "reservation.recovered_expired";
            event.entity_type = "resource_reservation";
            event.entity_id = reservation.id;
            event.actor = "exotic.resource_recovery";
            event.payload = reservation.workload_key;
            event.created_at = now;
            repository_.append_ledger_event(event);
        }
    }
    return report;
}

} // namespace exotic::autonomy::resources
