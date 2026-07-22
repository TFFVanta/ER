#pragma once
#include "repository.hpp"
#include "../persistence/database.hpp"
#include <filesystem>

namespace exotic::autonomy::scheduler {

class SqliteSchedulerRepository final : public SchedulerRepository {
public:
    explicit SqliteSchedulerRepository(const std::filesystem::path& database_path);
    JobId next_job_id() override; EventId next_event_id() override; LeaseId next_lease_id() override; DeadLetterId next_dead_letter_id() override;
    std::optional<Job> find_job(JobId id) override;
    std::optional<Job> find_job_by_idempotency_key(std::string_view key) override;
    void upsert_job(const Job& job) override;
    std::vector<Job> load_jobs() override;
    std::vector<Job> load_due_jobs(TimePoint now, std::size_t limit) override;
    void append_event(const Event& event) override;
    std::vector<Event> load_available_events(TimePoint now, std::size_t limit) override;
    void mark_event_consumed(EventId id, TimePoint consumed_at) override;
    bool try_acquire_lease(const Lease& lease) override;
    bool heartbeat_lease(LeaseId id, std::string_view worker_id, TimePoint heartbeat_at, TimePoint expires_at) override;
    bool release_lease(LeaseId id, std::string_view worker_id) override;
    std::optional<Lease> find_active_lease_for_job(JobId job_id) override;
    std::vector<Lease> load_expired_leases(TimePoint now) override;
    void append_dead_letter(const DeadLetter& item) override;
    std::vector<DeadLetter> load_dead_letters(std::size_t limit) override;
    SchedulerStats stats() override;
private:
    persistence::Database database_;
    void migrate();
    std::uint64_t next_id(std::string_view table);
    std::optional<Job> load_job_from_id(JobId id);
    void replace_dependencies(const Job& job);
};

} // namespace exotic::autonomy::scheduler
