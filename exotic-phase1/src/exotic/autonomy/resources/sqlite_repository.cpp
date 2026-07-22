#include "sqlite_repository.hpp"

#include "../persistence/transaction.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <limits>

namespace exotic::autonomy::resources {

using persistence::DatabaseError;
using persistence::Statement;
using persistence::Transaction;

namespace {

std::int64_t i64(std::uint64_t value) {
    if (value > static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max())) {
        throw DatabaseError("resource identifier exceeds SQLite integer range");
    }
    return static_cast<std::int64_t>(value);
}

std::optional<TimePoint> optional_time(const Statement& statement, int column) {
    if (statement.column_is_null(column)) {
        return std::nullopt;
    }
    return from_unix_milliseconds(statement.column_int64(column));
}

} // namespace

SqliteResourceRepository::SqliteResourceRepository(
    const std::filesystem::path& database_path
) : database_(database_path) {
    migrate();
}

void SqliteResourceRepository::migrate() {
    database_.execute(
        "CREATE TABLE IF NOT EXISTS resource_schema_metadata("
        "key TEXT PRIMARY KEY,value TEXT NOT NULL);"
    );
    int version = 0;
    {
        Statement statement{database_,
            "SELECT value FROM resource_schema_metadata WHERE key='schema_version';"};
        if (statement.step()) {
            version = std::stoi(statement.column_text(0));
        }
    }
    if (version > 5) {
        throw DatabaseError("resource database schema is newer than this EXOTIC build");
    }
    if (version == 5) {
        return;
    }

    Transaction transaction{database_};
    database_.execute(R"SQL(
CREATE TABLE IF NOT EXISTS resource_schema_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resource_accounts(
 id INTEGER PRIMARY KEY,parent_id INTEGER,scope TEXT NOT NULL,scope_id TEXT NOT NULL,
 name TEXT NOT NULL,status TEXT NOT NULL,approval_threshold_usd REAL,
 created_at_ms INTEGER NOT NULL,updated_at_ms INTEGER NOT NULL,
 UNIQUE(scope,scope_id),FOREIGN KEY(parent_id) REFERENCES resource_accounts(id));
CREATE TABLE IF NOT EXISTS resource_account_limits(
 account_id INTEGER NOT NULL,dimension TEXT NOT NULL,hard_limit REAL NOT NULL,
 soft_limit REAL NOT NULL,spent REAL NOT NULL DEFAULT 0,reserved REAL NOT NULL DEFAULT 0,
 PRIMARY KEY(account_id,dimension),FOREIGN KEY(account_id) REFERENCES resource_accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS resource_rate_limits(
 id INTEGER PRIMARY KEY,account_id INTEGER NOT NULL,key TEXT NOT NULL,capacity REAL NOT NULL,
 available_tokens REAL NOT NULL,refill_per_second REAL NOT NULL,cost_per_admission REAL NOT NULL,
 last_refill_at_ms INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(account_id,key),
 FOREIGN KEY(account_id) REFERENCES resource_accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS resource_reservations(
 id INTEGER PRIMARY KEY,job_id INTEGER NOT NULL,proposal_id INTEGER NOT NULL,operation_id INTEGER,
 leaf_account_id INTEGER NOT NULL,workload_key TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL,created_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,
 reconciled_at_ms INTEGER,released_at_ms INTEGER,release_reason TEXT NOT NULL DEFAULT '',
 FOREIGN KEY(leaf_account_id) REFERENCES resource_accounts(id));
CREATE TABLE IF NOT EXISTS resource_reservation_accounts(
 reservation_id INTEGER NOT NULL,account_id INTEGER NOT NULL,position INTEGER NOT NULL,
 PRIMARY KEY(reservation_id,account_id),FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id) ON DELETE CASCADE,
 FOREIGN KEY(account_id) REFERENCES resource_accounts(id));
CREATE TABLE IF NOT EXISTS resource_reservation_amounts(
 reservation_id INTEGER NOT NULL,dimension TEXT NOT NULL,requested REAL NOT NULL,reserved REAL NOT NULL,
 actual REAL NOT NULL DEFAULT 0,PRIMARY KEY(reservation_id,dimension),
 FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS resource_usage_reports(
 id INTEGER PRIMARY KEY,reservation_id INTEGER NOT NULL,job_id INTEGER NOT NULL,proposal_id INTEGER NOT NULL,
 workload_key TEXT NOT NULL,source TEXT NOT NULL,created_at_ms INTEGER NOT NULL,
 FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id));
CREATE TABLE IF NOT EXISTS resource_usage_amounts(
 report_id INTEGER NOT NULL,dimension TEXT NOT NULL,amount REAL NOT NULL,
 PRIMARY KEY(report_id,dimension),FOREIGN KEY(report_id) REFERENCES resource_usage_reports(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS resource_circuit_breakers(
 id INTEGER PRIMARY KEY,scope_key TEXT NOT NULL UNIQUE,state TEXT NOT NULL,consecutive_failures INTEGER NOT NULL,
 consecutive_successes INTEGER NOT NULL,failure_threshold INTEGER NOT NULL,recovery_success_threshold INTEGER NOT NULL,
 cooldown_ms INTEGER NOT NULL,opened_at_ms INTEGER,reason TEXT NOT NULL,updated_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS resource_anomalies(
 id INTEGER PRIMARY KEY,account_id INTEGER NOT NULL,reservation_id INTEGER NOT NULL,dimension TEXT NOT NULL,
 expected REAL NOT NULL,observed REAL NOT NULL,ratio REAL NOT NULL,severity TEXT NOT NULL,reason TEXT NOT NULL,
 created_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS resource_ledger_events(
 id INTEGER PRIMARY KEY,event_type TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id INTEGER NOT NULL,
 actor TEXT NOT NULL,payload TEXT NOT NULL,created_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS resource_control(
 id INTEGER PRIMARY KEY CHECK(id=1),emergency_stop INTEGER NOT NULL DEFAULT 0,actor TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL DEFAULT '',updated_at_ms INTEGER NOT NULL);
INSERT OR IGNORE INTO resource_control(id,emergency_stop,actor,reason,updated_at_ms) VALUES(1,0,'','',0);
INSERT INTO resource_schema_metadata(key,value) VALUES('schema_version','5')
 ON CONFLICT(key) DO UPDATE SET value=excluded.value;
CREATE INDEX IF NOT EXISTS idx_resource_accounts_parent ON resource_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_reservations_active ON resource_reservations(status,expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_resource_usage_workload ON resource_usage_reports(workload_key,created_at_ms DESC);
CREATE INDEX IF NOT EXISTS idx_resource_anomalies_created ON resource_anomalies(created_at_ms DESC);
)SQL");
    transaction.commit();
}

std::uint64_t SqliteResourceRepository::next_id(std::string_view table) {
    static const std::vector<std::string_view> allowed = {
        "resource_accounts", "resource_reservations", "resource_usage_reports",
        "resource_rate_limits", "resource_circuit_breakers", "resource_anomalies",
        "resource_ledger_events"
    };
    if (std::find(allowed.begin(), allowed.end(), table) == allowed.end()) {
        throw std::invalid_argument("invalid resource id table");
    }
    return database_.next_sequence("resources." + std::string{table});
}

ResourceAccountId SqliteResourceRepository::next_account_id() { return next_id("resource_accounts"); }
ReservationId SqliteResourceRepository::next_reservation_id() { return next_id("resource_reservations"); }
UsageReportId SqliteResourceRepository::next_usage_report_id() { return next_id("resource_usage_reports"); }
RateLimitId SqliteResourceRepository::next_rate_limit_id() { return next_id("resource_rate_limits"); }
CircuitBreakerId SqliteResourceRepository::next_circuit_breaker_id() { return next_id("resource_circuit_breakers"); }
AnomalyId SqliteResourceRepository::next_anomaly_id() { return next_id("resource_anomalies"); }
LedgerEventId SqliteResourceRepository::next_ledger_event_id() { return next_id("resource_ledger_events"); }

void SqliteResourceRepository::save_account(const ResourceAccount& account) {
    Transaction transaction{database_};
    Statement statement{database_, R"SQL(
INSERT INTO resource_accounts(id,parent_id,scope,scope_id,name,status,approval_threshold_usd,created_at_ms,updated_at_ms)
VALUES(?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id,scope=excluded.scope,scope_id=excluded.scope_id,
name=excluded.name,status=excluded.status,approval_threshold_usd=excluded.approval_threshold_usd,
updated_at_ms=excluded.updated_at_ms;
)SQL"};
    statement.bind(1, i64(account.id));
    if (account.parent_id) statement.bind(2, i64(*account.parent_id)); else statement.bind_null(2);
    statement.bind(3, to_string(account.scope));
    statement.bind(4, account.scope_id);
    statement.bind(5, account.name);
    statement.bind(6, to_string(account.status));
    if (account.approval_threshold_usd) statement.bind(7, *account.approval_threshold_usd); else statement.bind_null(7);
    statement.bind(8, to_unix_milliseconds(account.created_at));
    statement.bind(9, to_unix_milliseconds(account.updated_at));
    statement.execute();

    for (const auto& limit : account.limits) {
        Statement row{database_, R"SQL(
INSERT INTO resource_account_limits(account_id,dimension,hard_limit,soft_limit,spent,reserved)
VALUES(?,?,?,?,?,?)
ON CONFLICT(account_id,dimension) DO UPDATE SET
hard_limit=excluded.hard_limit,soft_limit=excluded.soft_limit;
)SQL"};
        row.bind(1, i64(account.id));
        row.bind(2, to_string(limit.dimension));
        row.bind(3, limit.hard_limit);
        row.bind(4, limit.soft_limit);
        row.bind(5, limit.spent);
        row.bind(6, limit.reserved);
        row.execute();
    }
    transaction.commit();
}

std::optional<ResourceAccount> SqliteResourceRepository::load_account(ResourceAccountId id) {
    Statement statement{database_, R"SQL(
SELECT parent_id,scope,scope_id,name,status,approval_threshold_usd,created_at_ms,updated_at_ms
FROM resource_accounts WHERE id=?;
)SQL"};
    statement.bind(1, i64(id));
    if (!statement.step()) return std::nullopt;
    const auto scope = account_scope_from_string(statement.column_text(1));
    const auto status_value = account_status_from_string(statement.column_text(4));
    if (!scope || !status_value) throw DatabaseError("invalid resource account enum value");

    ResourceAccount account;
    account.id = id;
    if (!statement.column_is_null(0)) account.parent_id = static_cast<ResourceAccountId>(statement.column_int64(0));
    account.scope = *scope;
    account.scope_id = statement.column_text(2);
    account.name = statement.column_text(3);
    account.status = *status_value;
    if (!statement.column_is_null(5)) account.approval_threshold_usd = statement.column_double(5);
    account.created_at = from_unix_milliseconds(statement.column_int64(6));
    account.updated_at = from_unix_milliseconds(statement.column_int64(7));

    Statement limits{database_, R"SQL(
SELECT dimension,hard_limit,soft_limit,spent,reserved FROM resource_account_limits
WHERE account_id=? ORDER BY dimension;
)SQL"};
    limits.bind(1, i64(id));
    while (limits.step()) {
        const auto dimension = resource_dimension_from_string(limits.column_text(0));
        if (!dimension) throw DatabaseError("invalid resource dimension");
        account.limits.push_back({
            *dimension,
            limits.column_double(1),
            limits.column_double(2),
            limits.column_double(3),
            limits.column_double(4)
        });
    }
    return account;
}

std::optional<ResourceAccount> SqliteResourceRepository::find_account(
    AccountScope scope,
    std::string_view scope_id
) {
    Statement statement{database_, "SELECT id FROM resource_accounts WHERE scope=? AND scope_id=?;"};
    statement.bind(1, to_string(scope));
    statement.bind(2, scope_id);
    return statement.step()
        ? load_account(static_cast<ResourceAccountId>(statement.column_int64(0)))
        : std::nullopt;
}

std::vector<ResourceAccount> SqliteResourceRepository::load_accounts() {
    std::vector<ResourceAccount> result;
    Statement statement{database_, "SELECT id FROM resource_accounts ORDER BY id;"};
    while (statement.step()) {
        if (auto account = load_account(static_cast<ResourceAccountId>(statement.column_int64(0)))) {
            result.push_back(std::move(*account));
        }
    }
    return result;
}

void SqliteResourceRepository::save_rate_limit(const RateLimit& limit) {
    Statement statement{database_, R"SQL(
INSERT INTO resource_rate_limits(id,account_id,key,capacity,available_tokens,refill_per_second,cost_per_admission,last_refill_at_ms,active)
VALUES(?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,key=excluded.key,capacity=excluded.capacity,
available_tokens=excluded.available_tokens,refill_per_second=excluded.refill_per_second,
cost_per_admission=excluded.cost_per_admission,last_refill_at_ms=excluded.last_refill_at_ms,active=excluded.active;
)SQL"};
    statement.bind(1, i64(limit.id));
    statement.bind(2, i64(limit.account_id));
    statement.bind(3, limit.key);
    statement.bind(4, limit.capacity);
    statement.bind(5, limit.available_tokens);
    statement.bind(6, limit.refill_per_second);
    statement.bind(7, limit.cost_per_admission);
    statement.bind(8, to_unix_milliseconds(limit.last_refill_at));
    statement.bind(9, static_cast<std::int64_t>(limit.active ? 1 : 0));
    statement.execute();
}

std::vector<RateLimit> SqliteResourceRepository::load_rate_limits(ResourceAccountId account_id) {
    std::vector<RateLimit> result;
    Statement statement{database_, R"SQL(
SELECT id,key,capacity,available_tokens,refill_per_second,cost_per_admission,last_refill_at_ms,active
FROM resource_rate_limits WHERE account_id=? ORDER BY id;
)SQL"};
    statement.bind(1, i64(account_id));
    while (statement.step()) {
        RateLimit limit;
        limit.id = static_cast<RateLimitId>(statement.column_int64(0));
        limit.account_id = account_id;
        limit.key = statement.column_text(1);
        limit.capacity = statement.column_double(2);
        limit.available_tokens = statement.column_double(3);
        limit.refill_per_second = statement.column_double(4);
        limit.cost_per_admission = statement.column_double(5);
        limit.last_refill_at = from_unix_milliseconds(statement.column_int64(6));
        limit.active = statement.column_int64(7) != 0;
        result.push_back(std::move(limit));
    }
    return result;
}

ReservationAttempt SqliteResourceRepository::try_create_reservation(
    const Reservation& reservation
) {
    Transaction transaction{database_};
    ReservationAttempt outcome;

    Statement stop{database_, "SELECT emergency_stop FROM resource_control WHERE id=1;"};
    if (stop.step() && stop.column_int64(0) != 0) {
        outcome.failure = AdmissionFailure::EmergencyStop;
        outcome.reason = "resource emergency stop is active";
        transaction.rollback();
        return outcome;
    }

    Statement duplicate{database_, "SELECT id,job_id,proposal_id FROM resource_reservations WHERE idempotency_key=?;"};
    duplicate.bind(1, reservation.idempotency_key);
    if (duplicate.step()) {
        const auto existing_id = static_cast<ReservationId>(duplicate.column_int64(0));
        outcome.duplicate = true;
        outcome.reservation = load_reservation_by_id(existing_id);
        if (
            duplicate.column_int64(1) == i64(reservation.job_id) &&
            duplicate.column_int64(2) == i64(reservation.proposal_id) &&
            outcome.reservation &&
            outcome.reservation->requested.values() == reservation.requested.values()
        ) {
            outcome.reason = "existing idempotent reservation returned";
        } else {
            outcome.failure = AdmissionFailure::DuplicateConflict;
            outcome.reason = "idempotency key is already bound to a different request";
        }
        transaction.rollback();
        return outcome;
    }

    for (const auto account_id : reservation.account_chain) {
        Statement account{database_, "SELECT status FROM resource_accounts WHERE id=?;"};
        account.bind(1, i64(account_id));
        if (!account.step() || account.column_text(0) != "active") {
            outcome.failure = AdmissionFailure::AccountUnavailable;
            outcome.reason = "one or more resource accounts are unavailable";
            transaction.rollback();
            return outcome;
        }

        for (const auto& [dimension, amount] : reservation.requested.values()) {
            Statement balance{database_, R"SQL(
SELECT hard_limit,spent,reserved FROM resource_account_limits
WHERE account_id=? AND dimension=?;
)SQL"};
            balance.bind(1, i64(account_id));
            balance.bind(2, to_string(dimension));
            if (
                balance.step() &&
                balance.column_double(1) + balance.column_double(2) + amount > balance.column_double(0) + 1e-9
            ) {
                outcome.failure = AdmissionFailure::BudgetExceeded;
                outcome.reason = "hierarchical hard limit exceeded for " + to_string(dimension);
                transaction.rollback();
                return outcome;
            }
        }

        Statement rates{database_, R"SQL(
SELECT id,key,capacity,available_tokens,refill_per_second,cost_per_admission,last_refill_at_ms
FROM resource_rate_limits WHERE account_id=? AND active=1;
)SQL"};
        rates.bind(1, i64(account_id));
        while (rates.step()) {
            const auto rate_id = static_cast<RateLimitId>(rates.column_int64(0));
            const auto key = rates.column_text(1);
            const auto capacity = rates.column_double(2);
            auto available = rates.column_double(3);
            const auto refill = rates.column_double(4);
            const auto cost = rates.column_double(5);
            const auto last_refill = from_unix_milliseconds(rates.column_int64(6));
            const auto elapsed = std::chrono::duration<double>(reservation.created_at - last_refill).count();
            if (elapsed > 0.0) available = std::min(capacity, available + elapsed * refill);
            if (available + 1e-9 < cost) {
                outcome.failure = AdmissionFailure::RateLimited;
                outcome.reason = "rate limit denied admission: " + key;
                transaction.rollback();
                return outcome;
            }
            Statement update{database_, R"SQL(
UPDATE resource_rate_limits SET available_tokens=?,last_refill_at_ms=? WHERE id=?;
)SQL"};
            update.bind(1, available - cost);
            update.bind(2, to_unix_milliseconds(reservation.created_at));
            update.bind(3, i64(rate_id));
            update.execute();
        }
    }

    Statement insert{database_, R"SQL(
INSERT INTO resource_reservations(id,job_id,proposal_id,operation_id,leaf_account_id,workload_key,idempotency_key,status,
created_at_ms,expires_at_ms,reconciled_at_ms,released_at_ms,release_reason)
VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?);
)SQL"};
    insert.bind(1, i64(reservation.id));
    insert.bind(2, i64(reservation.job_id));
    insert.bind(3, i64(reservation.proposal_id));
    if (reservation.operation_id) insert.bind(4, i64(*reservation.operation_id)); else insert.bind_null(4);
    insert.bind(5, i64(reservation.leaf_account_id));
    insert.bind(6, reservation.workload_key);
    insert.bind(7, reservation.idempotency_key);
    insert.bind(8, to_string(reservation.status));
    insert.bind(9, to_unix_milliseconds(reservation.created_at));
    insert.bind(10, to_unix_milliseconds(reservation.expires_at));
    insert.bind_null(11);
    insert.bind_null(12);
    insert.bind(13, reservation.release_reason);
    insert.execute();

    for (std::size_t index = 0; index < reservation.account_chain.size(); ++index) {
        const auto account_id = reservation.account_chain[index];
        Statement chain{database_, R"SQL(
INSERT INTO resource_reservation_accounts(reservation_id,account_id,position) VALUES(?,?,?);
)SQL"};
        chain.bind(1, i64(reservation.id));
        chain.bind(2, i64(account_id));
        chain.bind(3, static_cast<std::int64_t>(index));
        chain.execute();

        for (const auto& [dimension, amount] : reservation.reserved.values()) {
            Statement balance{database_, R"SQL(
UPDATE resource_account_limits SET reserved=reserved+?
WHERE account_id=? AND dimension=?;
)SQL"};
            balance.bind(1, amount);
            balance.bind(2, i64(account_id));
            balance.bind(3, to_string(dimension));
            balance.execute();
        }
    }

    for (const auto& [dimension, amount] : reservation.requested.values()) {
        Statement amount_row{database_, R"SQL(
INSERT INTO resource_reservation_amounts(reservation_id,dimension,requested,reserved,actual)
VALUES(?,?,?,?,0);
)SQL"};
        amount_row.bind(1, i64(reservation.id));
        amount_row.bind(2, to_string(dimension));
        amount_row.bind(3, amount);
        amount_row.bind(4, reservation.reserved.get(dimension));
        amount_row.execute();
    }

    transaction.commit();
    outcome.created = true;
    outcome.reason = "resource reservation created";
    outcome.reservation = reservation;
    return outcome;
}

std::optional<Reservation> SqliteResourceRepository::load_reservation_by_id(ReservationId id) {
    Statement statement{database_, R"SQL(
SELECT job_id,proposal_id,operation_id,leaf_account_id,workload_key,idempotency_key,status,
created_at_ms,expires_at_ms,reconciled_at_ms,released_at_ms,release_reason
FROM resource_reservations WHERE id=?;
)SQL"};
    statement.bind(1, i64(id));
    if (!statement.step()) return std::nullopt;
    const auto status_value = reservation_status_from_string(statement.column_text(6));
    if (!status_value) throw DatabaseError("invalid resource reservation status");

    Reservation reservation;
    reservation.id = id;
    reservation.job_id = static_cast<scheduler::JobId>(statement.column_int64(0));
    reservation.proposal_id = static_cast<ProposalId>(statement.column_int64(1));
    if (!statement.column_is_null(2)) reservation.operation_id = static_cast<OperationId>(statement.column_int64(2));
    reservation.leaf_account_id = static_cast<ResourceAccountId>(statement.column_int64(3));
    reservation.workload_key = statement.column_text(4);
    reservation.idempotency_key = statement.column_text(5);
    reservation.status = *status_value;
    reservation.created_at = from_unix_milliseconds(statement.column_int64(7));
    reservation.expires_at = from_unix_milliseconds(statement.column_int64(8));
    reservation.reconciled_at = optional_time(statement, 9);
    reservation.released_at = optional_time(statement, 10);
    reservation.release_reason = statement.column_text(11);

    Statement chain{database_, R"SQL(
SELECT account_id FROM resource_reservation_accounts WHERE reservation_id=? ORDER BY position;
)SQL"};
    chain.bind(1, i64(id));
    while (chain.step()) reservation.account_chain.push_back(static_cast<ResourceAccountId>(chain.column_int64(0)));

    Statement amounts{database_, R"SQL(
SELECT dimension,requested,reserved,actual FROM resource_reservation_amounts WHERE reservation_id=?;
)SQL"};
    amounts.bind(1, i64(id));
    while (amounts.step()) {
        const auto dimension = resource_dimension_from_string(amounts.column_text(0));
        if (!dimension) throw DatabaseError("invalid reservation resource dimension");
        reservation.requested.set(*dimension, amounts.column_double(1));
        reservation.reserved.set(*dimension, amounts.column_double(2));
        reservation.actual.set(*dimension, amounts.column_double(3));
    }
    return reservation;
}

std::optional<Reservation> SqliteResourceRepository::find_reservation(ReservationId id) {
    return load_reservation_by_id(id);
}

std::optional<Reservation> SqliteResourceRepository::find_reservation_by_idempotency_key(std::string_view key) {
    Statement statement{database_, "SELECT id FROM resource_reservations WHERE idempotency_key=?;"};
    statement.bind(1, key);
    return statement.step()
        ? load_reservation_by_id(static_cast<ReservationId>(statement.column_int64(0)))
        : std::nullopt;
}

std::vector<Reservation> SqliteResourceRepository::load_active_reservations() {
    std::vector<Reservation> result;
    Statement statement{database_, "SELECT id FROM resource_reservations WHERE status='active' ORDER BY id;"};
    while (statement.step()) if (auto value = load_reservation_by_id(static_cast<ReservationId>(statement.column_int64(0)))) result.push_back(std::move(*value));
    return result;
}

std::vector<Reservation> SqliteResourceRepository::load_expired_reservations(TimePoint now) {
    std::vector<Reservation> result;
    Statement statement{database_, R"SQL(
SELECT id FROM resource_reservations WHERE status='active' AND expires_at_ms<=? ORDER BY expires_at_ms;
)SQL"};
    statement.bind(1, to_unix_milliseconds(now));
    while (statement.step()) if (auto value = load_reservation_by_id(static_cast<ReservationId>(statement.column_int64(0)))) result.push_back(std::move(*value));
    return result;
}

bool SqliteResourceRepository::heartbeat_reservation(ReservationId id, TimePoint expires_at) {
    Statement update{database_, "UPDATE resource_reservations SET expires_at_ms=? WHERE id=? AND status='active';"};
    update.bind(1, to_unix_milliseconds(expires_at));
    update.bind(2, i64(id));
    update.execute();
    Statement query{database_, "SELECT expires_at_ms FROM resource_reservations WHERE id=? AND status='active';"};
    query.bind(1, i64(id));
    return query.step() && query.column_int64(0) == to_unix_milliseconds(expires_at);
}

bool SqliteResourceRepository::release_reservation(
    ReservationId id,
    ReservationStatus status_value,
    TimePoint released_at,
    std::string_view reason
) {
    Transaction transaction{database_};
    const auto reservation = load_reservation_by_id(id);
    if (!reservation || reservation->status != ReservationStatus::Active) {
        transaction.rollback();
        return false;
    }
    for (const auto account_id : reservation->account_chain) {
        for (const auto& [dimension, amount] : reservation->reserved.values()) {
            Statement balance{database_, R"SQL(
UPDATE resource_account_limits SET reserved=MAX(0,reserved-?) WHERE account_id=? AND dimension=?;
)SQL"};
            balance.bind(1, amount);
            balance.bind(2, i64(account_id));
            balance.bind(3, to_string(dimension));
            balance.execute();
        }
    }
    Statement update{database_, R"SQL(
UPDATE resource_reservations SET status=?,released_at_ms=?,release_reason=? WHERE id=? AND status='active';
)SQL"};
    update.bind(1, to_string(status_value));
    update.bind(2, to_unix_milliseconds(released_at));
    update.bind(3, reason);
    update.bind(4, i64(id));
    update.execute();
    transaction.commit();
    return true;
}

bool SqliteResourceRepository::reconcile_reservation(
    ReservationId id,
    const ResourceVector& actual,
    TimePoint reconciled_at
) {
    Transaction transaction{database_};
    const auto reservation = load_reservation_by_id(id);
    if (!reservation || reservation->status != ReservationStatus::Active) {
        transaction.rollback();
        return false;
    }

    for (const auto account_id : reservation->account_chain) {
        for (const auto& [dimension, amount] : reservation->reserved.values()) {
            Statement release{database_, R"SQL(
UPDATE resource_account_limits SET reserved=MAX(0,reserved-?) WHERE account_id=? AND dimension=?;
)SQL"};
            release.bind(1, amount);
            release.bind(2, i64(account_id));
            release.bind(3, to_string(dimension));
            release.execute();
        }
        for (const auto& [dimension, amount] : actual.values()) {
            if (!is_consumptive(dimension)) continue;
            Statement spend{database_, R"SQL(
UPDATE resource_account_limits SET spent=spent+? WHERE account_id=? AND dimension=?;
)SQL"};
            spend.bind(1, amount);
            spend.bind(2, i64(account_id));
            spend.bind(3, to_string(dimension));
            spend.execute();
        }
    }

    for (const auto& [dimension, amount] : actual.values()) {
        Statement row{database_, R"SQL(
INSERT INTO resource_reservation_amounts(reservation_id,dimension,requested,reserved,actual)
VALUES(?,?,0,0,?)
ON CONFLICT(reservation_id,dimension) DO UPDATE SET actual=excluded.actual;
)SQL"};
        row.bind(1, i64(id));
        row.bind(2, to_string(dimension));
        row.bind(3, amount);
        row.execute();
    }

    Statement update{database_, R"SQL(
UPDATE resource_reservations SET status='reconciled',reconciled_at_ms=? WHERE id=? AND status='active';
)SQL"};
    update.bind(1, to_unix_milliseconds(reconciled_at));
    update.bind(2, i64(id));
    update.execute();
    transaction.commit();
    return true;
}

bool SqliteResourceRepository::adjust_spent(
    ResourceAccountId account_id,
    ResourceDimension dimension,
    double delta,
    TimePoint at
) {
    Transaction transaction{database_};
    Statement query{database_, "SELECT spent FROM resource_account_limits WHERE account_id=? AND dimension=?;"};
    query.bind(1, i64(account_id));
    query.bind(2, to_string(dimension));
    if (!query.step() || query.column_double(0) + delta < -1e-9) {
        transaction.rollback();
        return false;
    }
    Statement update{database_, R"SQL(
UPDATE resource_account_limits SET spent=MAX(0,spent+?) WHERE account_id=? AND dimension=?;
)SQL"};
    update.bind(1, delta);
    update.bind(2, i64(account_id));
    update.bind(3, to_string(dimension));
    update.execute();
    Statement touch{database_, "UPDATE resource_accounts SET updated_at_ms=? WHERE id=?;"};
    touch.bind(1, to_unix_milliseconds(at));
    touch.bind(2, i64(account_id));
    touch.execute();
    transaction.commit();
    return true;
}

void SqliteResourceRepository::append_usage_report(const UsageReport& report) {
    Transaction transaction{database_};
    Statement statement{database_, R"SQL(
INSERT INTO resource_usage_reports(id,reservation_id,job_id,proposal_id,workload_key,source,created_at_ms)
VALUES(?,?,?,?,?,?,?);
)SQL"};
    statement.bind(1, i64(report.id));
    statement.bind(2, i64(report.reservation_id));
    statement.bind(3, i64(report.job_id));
    statement.bind(4, i64(report.proposal_id));
    statement.bind(5, report.workload_key);
    statement.bind(6, report.source);
    statement.bind(7, to_unix_milliseconds(report.created_at));
    statement.execute();
    for (const auto& [dimension, amount] : report.actual.values()) {
        Statement row{database_, "INSERT INTO resource_usage_amounts(report_id,dimension,amount) VALUES(?,?,?);"};
        row.bind(1, i64(report.id));
        row.bind(2, to_string(dimension));
        row.bind(3, amount);
        row.execute();
    }
    transaction.commit();
}

std::vector<UsageReport> SqliteResourceRepository::load_usage_reports(
    std::string_view workload_key,
    std::size_t limit
) {
    std::vector<UsageReport> result;
    Statement statement{database_, R"SQL(
SELECT id,reservation_id,job_id,proposal_id,source,created_at_ms FROM resource_usage_reports
WHERE workload_key=? ORDER BY created_at_ms DESC,id DESC LIMIT ?;
)SQL"};
    statement.bind(1, workload_key);
    statement.bind(2, static_cast<std::int64_t>(limit));
    while (statement.step()) {
        UsageReport report;
        report.id = static_cast<UsageReportId>(statement.column_int64(0));
        report.reservation_id = static_cast<ReservationId>(statement.column_int64(1));
        report.job_id = static_cast<scheduler::JobId>(statement.column_int64(2));
        report.proposal_id = static_cast<ProposalId>(statement.column_int64(3));
        report.workload_key = std::string(workload_key);
        report.source = statement.column_text(4);
        report.created_at = from_unix_milliseconds(statement.column_int64(5));
        Statement amounts{database_, "SELECT dimension,amount FROM resource_usage_amounts WHERE report_id=?;"};
        amounts.bind(1, i64(report.id));
        while (amounts.step()) {
            const auto dimension = resource_dimension_from_string(amounts.column_text(0));
            if (!dimension) throw DatabaseError("invalid usage resource dimension");
            report.actual.set(*dimension, amounts.column_double(1));
        }
        result.push_back(std::move(report));
    }
    return result;
}

void SqliteResourceRepository::save_circuit_breaker(const CircuitBreaker& breaker) {
    Statement statement{database_, R"SQL(
INSERT INTO resource_circuit_breakers(id,scope_key,state,consecutive_failures,consecutive_successes,failure_threshold,
recovery_success_threshold,cooldown_ms,opened_at_ms,reason,updated_at_ms)
VALUES(?,?,?,?,?,?,?,?,?,?,?)
ON CONFLICT(id) DO UPDATE SET scope_key=excluded.scope_key,state=excluded.state,
consecutive_failures=excluded.consecutive_failures,consecutive_successes=excluded.consecutive_successes,
failure_threshold=excluded.failure_threshold,recovery_success_threshold=excluded.recovery_success_threshold,
cooldown_ms=excluded.cooldown_ms,opened_at_ms=excluded.opened_at_ms,reason=excluded.reason,updated_at_ms=excluded.updated_at_ms;
)SQL"};
    statement.bind(1, i64(breaker.id));
    statement.bind(2, breaker.scope_key);
    statement.bind(3, to_string(breaker.state));
    statement.bind(4, static_cast<std::int64_t>(breaker.consecutive_failures));
    statement.bind(5, static_cast<std::int64_t>(breaker.consecutive_successes));
    statement.bind(6, static_cast<std::int64_t>(breaker.failure_threshold));
    statement.bind(7, static_cast<std::int64_t>(breaker.recovery_success_threshold));
    statement.bind(8, static_cast<std::int64_t>(breaker.cooldown.count()));
    if (breaker.opened_at) statement.bind(9, to_unix_milliseconds(*breaker.opened_at)); else statement.bind_null(9);
    statement.bind(10, breaker.reason);
    statement.bind(11, to_unix_milliseconds(breaker.updated_at));
    statement.execute();
}

std::optional<CircuitBreaker> SqliteResourceRepository::load_circuit_breaker(std::string_view scope_key) {
    Statement statement{database_, R"SQL(
SELECT id,state,consecutive_failures,consecutive_successes,failure_threshold,recovery_success_threshold,
cooldown_ms,opened_at_ms,reason,updated_at_ms FROM resource_circuit_breakers WHERE scope_key=?;
)SQL"};
    statement.bind(1, scope_key);
    if (!statement.step()) return std::nullopt;
    const auto state = circuit_state_from_string(statement.column_text(1));
    if (!state) throw DatabaseError("invalid circuit state");
    CircuitBreaker breaker;
    breaker.id = static_cast<CircuitBreakerId>(statement.column_int64(0));
    breaker.scope_key = std::string(scope_key);
    breaker.state = *state;
    breaker.consecutive_failures = static_cast<std::uint32_t>(statement.column_int64(2));
    breaker.consecutive_successes = static_cast<std::uint32_t>(statement.column_int64(3));
    breaker.failure_threshold = static_cast<std::uint32_t>(statement.column_int64(4));
    breaker.recovery_success_threshold = static_cast<std::uint32_t>(statement.column_int64(5));
    breaker.cooldown = std::chrono::milliseconds(statement.column_int64(6));
    breaker.opened_at = optional_time(statement, 7);
    breaker.reason = statement.column_text(8);
    breaker.updated_at = from_unix_milliseconds(statement.column_int64(9));
    return breaker;
}

std::vector<CircuitBreaker> SqliteResourceRepository::load_circuit_breakers() {
    std::vector<CircuitBreaker> result;
    Statement statement{database_, "SELECT scope_key FROM resource_circuit_breakers ORDER BY id;"};
    while (statement.step()) if (auto value = load_circuit_breaker(statement.column_text(0))) result.push_back(std::move(*value));
    return result;
}

void SqliteResourceRepository::append_anomaly(const ResourceAnomaly& anomaly) {
    Statement statement{database_, R"SQL(
INSERT INTO resource_anomalies(id,account_id,reservation_id,dimension,expected,observed,ratio,severity,reason,created_at_ms)
VALUES(?,?,?,?,?,?,?,?,?,?);
)SQL"};
    statement.bind(1, i64(anomaly.id));
    statement.bind(2, i64(anomaly.account_id));
    statement.bind(3, i64(anomaly.reservation_id));
    statement.bind(4, to_string(anomaly.dimension));
    statement.bind(5, anomaly.expected);
    statement.bind(6, anomaly.observed);
    statement.bind(7, anomaly.ratio);
    statement.bind(8, to_string(anomaly.severity));
    statement.bind(9, anomaly.reason);
    statement.bind(10, to_unix_milliseconds(anomaly.created_at));
    statement.execute();
}

std::vector<ResourceAnomaly> SqliteResourceRepository::load_anomalies(std::size_t limit) {
    std::vector<ResourceAnomaly> result;
    Statement statement{database_, R"SQL(
SELECT id,account_id,reservation_id,dimension,expected,observed,ratio,severity,reason,created_at_ms
FROM resource_anomalies ORDER BY created_at_ms DESC,id DESC LIMIT ?;
)SQL"};
    statement.bind(1, static_cast<std::int64_t>(limit));
    while (statement.step()) {
        const auto dimension = resource_dimension_from_string(statement.column_text(3));
        const auto severity = anomaly_severity_from_string(statement.column_text(7));
        if (!dimension || !severity) throw DatabaseError("invalid anomaly enum value");
        ResourceAnomaly anomaly;
        anomaly.id = static_cast<AnomalyId>(statement.column_int64(0));
        anomaly.account_id = static_cast<ResourceAccountId>(statement.column_int64(1));
        anomaly.reservation_id = static_cast<ReservationId>(statement.column_int64(2));
        anomaly.dimension = *dimension;
        anomaly.expected = statement.column_double(4);
        anomaly.observed = statement.column_double(5);
        anomaly.ratio = statement.column_double(6);
        anomaly.severity = *severity;
        anomaly.reason = statement.column_text(8);
        anomaly.created_at = from_unix_milliseconds(statement.column_int64(9));
        result.push_back(std::move(anomaly));
    }
    return result;
}

void SqliteResourceRepository::append_ledger_event(const LedgerEvent& event) {
    Statement statement{database_, R"SQL(
INSERT INTO resource_ledger_events(id,event_type,entity_type,entity_id,actor,payload,created_at_ms)
VALUES(?,?,?,?,?,?,?);
)SQL"};
    statement.bind(1, i64(event.id));
    statement.bind(2, event.event_type);
    statement.bind(3, event.entity_type);
    statement.bind(4, i64(event.entity_id));
    statement.bind(5, event.actor);
    statement.bind(6, event.payload);
    statement.bind(7, to_unix_milliseconds(event.created_at));
    statement.execute();
}

void SqliteResourceRepository::set_emergency_stop(
    bool active,
    std::string_view actor,
    std::string_view reason
) {
    Statement statement{database_, R"SQL(
UPDATE resource_control SET emergency_stop=?,actor=?,reason=?,updated_at_ms=? WHERE id=1;
)SQL"};
    statement.bind(1, static_cast<std::int64_t>(active ? 1 : 0));
    statement.bind(2, actor);
    statement.bind(3, reason);
    statement.bind(4, to_unix_milliseconds(Clock::now()));
    statement.execute();
}

bool SqliteResourceRepository::emergency_stop_active() {
    Statement statement{database_, "SELECT emergency_stop FROM resource_control WHERE id=1;"};
    return statement.step() && statement.column_int64(0) != 0;
}

ResourceStatus SqliteResourceRepository::status() {
    ResourceStatus result;
    result.emergency_stop = emergency_stop_active();
    Statement accounts{database_, "SELECT COUNT(*) FROM resource_accounts;"};
    if (accounts.step()) result.accounts = static_cast<std::uint64_t>(accounts.column_int64(0));
    Statement reservations{database_, "SELECT COUNT(*) FROM resource_reservations WHERE status='active';"};
    if (reservations.step()) result.active_reservations = static_cast<std::uint64_t>(reservations.column_int64(0));
    Statement circuits{database_, "SELECT COUNT(*) FROM resource_circuit_breakers WHERE state='open';"};
    if (circuits.step()) result.open_circuits = static_cast<std::uint64_t>(circuits.column_int64(0));
    Statement anomalies{database_, "SELECT COUNT(*) FROM resource_anomalies;"};
    if (anomalies.step()) result.anomalies = static_cast<std::uint64_t>(anomalies.column_int64(0));
    return result;
}

} // namespace exotic::autonomy::resources
