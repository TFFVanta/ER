#pragma once
#include "types.hpp"
#include <optional>
#include <vector>

namespace exotic::autonomy::scheduler {

class SchedulerRepository {
public:
    virtual ~SchedulerRepository() = default;
    virtual JobId next_job_id() = 0;
    virtual EventId next_event_id() = 0;
    virtual LeaseId next_lease_id() = 0;
    virtual DeadLetterId next_dead_letter_id() = 0;

    virtual std::optional<Job> find_job(JobId id) = 0;
    virtual std::optional<Job> find_job_by_idempotency_key(std::string_view key) = 0;
    virtual void upsert_job(const Job& job) = 0;
    virtual std::vector<Job> load_jobs() = 0;
    virtual std::vector<Job> load_due_jobs(TimePoint now, std::size_t limit) = 0;

    virtual void append_event(const Event& event) = 0;
    virtual std::vector<Event> load_available_events(TimePoint now, std::size_t limit) = 0;
    virtual void mark_event_consumed(EventId id, TimePoint consumed_at) = 0;

    virtual bool try_acquire_lease(const Lease& lease) = 0;
    virtual bool heartbeat_lease(LeaseId id, std::string_view worker_id, TimePoint heartbeat_at, TimePoint expires_at) = 0;
    virtual bool release_lease(LeaseId id, std::string_view worker_id) = 0;
    virtual std::optional<Lease> find_active_lease_for_job(JobId job_id) = 0;
    virtual std::vector<Lease> load_expired_leases(TimePoint now) = 0;

    virtual void append_dead_letter(const DeadLetter& item) = 0;
    virtual std::vector<DeadLetter> load_dead_letters(std::size_t limit) = 0;
    virtual SchedulerStats stats() = 0;
};

} // namespace exotic::autonomy::scheduler
