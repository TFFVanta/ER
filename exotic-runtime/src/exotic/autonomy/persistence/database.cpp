#include "database.hpp"
#include "transaction.hpp"

#include <sqlite3.h>

#include <algorithm>
#include <array>
#include <limits>
#include <optional>

namespace exotic::autonomy::persistence {
namespace {

std::string sqlite_error(sqlite3* database, std::string_view context) {
    return std::string{context} + ": " +
        (database != nullptr ? sqlite3_errmsg(database) : "unknown SQLite error");
}

std::optional<std::string_view> sequence_table(std::string_view name) {
    static constexpr std::array<std::string_view, 28> allowed{
        "objectives",
        "proposals",
        "operations",
        "audit_events",
        "scheduler_jobs",
        "scheduler_events",
        "scheduler_leases",
        "scheduler_dead_letters",
        "governance_requests",
        "governance_decisions",
        "governance_grants",
        "governance_policies",
        "governance_evidence",
        "resource_accounts",
        "resource_reservations",
        "resource_usage_reports",
        "resource_rate_limits",
        "resource_circuit_breakers",
        "resource_anomalies",
        "resource_ledger_events",
        "agents",
        "capability_definitions",
        "capability_evidence",
        "agent_performance",
        "work_assignments",
        "worker_bindings",
        "runtime_audit",
        "runtime_alerts"
    };

    const auto separator = name.rfind('.');
    const auto table = separator == std::string_view::npos
        ? name
        : name.substr(separator + 1);

    if (std::find(allowed.begin(), allowed.end(), table) == allowed.end()) {
        return std::nullopt;
    }
    return table;
}

} // namespace

Database::Database(const std::filesystem::path& path) {
    const auto path_string = path.string();
    if (sqlite3_open_v2(
            path_string.c_str(),
            &handle_,
            SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
            nullptr) != SQLITE_OK) {
        const auto message = sqlite_error(handle_, "Failed to open database");
        if (handle_ != nullptr) {
            sqlite3_close(handle_);
        }
        handle_ = nullptr;
        throw DatabaseError(message);
    }
    configure();
}

Database::~Database() {
    std::scoped_lock lock{mutex_};
    if (handle_ != nullptr) {
        sqlite3_close(handle_);
    }
}

void Database::configure() {
    execute("PRAGMA foreign_keys=ON;");
    execute("PRAGMA journal_mode=WAL;");
    execute("PRAGMA synchronous=FULL;");
    execute("PRAGMA busy_timeout=5000;");
}

void Database::execute(std::string_view sql) {
    std::scoped_lock lock{mutex_};
    char* error_message = nullptr;
    const std::string owned_sql{sql};
    if (sqlite3_exec(handle_, owned_sql.c_str(), nullptr, nullptr, &error_message) != SQLITE_OK) {
        std::string message{"SQLite execution failed"};
        if (error_message != nullptr) {
            message += ": ";
            message += error_message;
            sqlite3_free(error_message);
        }
        throw DatabaseError(message);
    }
}

sqlite3* Database::native_handle() const noexcept {
    return handle_;
}

std::int64_t Database::last_insert_row_id() const noexcept {
    std::scoped_lock lock{mutex_};
    return sqlite3_last_insert_rowid(handle_);
}

std::uint64_t Database::next_sequence(std::string_view name) {
    Transaction transaction{*this};
    execute(
        "CREATE TABLE IF NOT EXISTS exotic_sequences("
        "name TEXT PRIMARY KEY,"
        "next_value INTEGER NOT NULL"
        ");"
    );

    std::uint64_t sequence_value = 1;
    bool sequence_exists = false;
    {
        Statement query{*this, "SELECT next_value FROM exotic_sequences WHERE name=?;"};
        query.bind(1, name);
        if (query.step()) {
            const auto stored = query.column_int64(0);
            if (stored < 1) {
                throw DatabaseError("Durable sequence contains an invalid value");
            }
            sequence_value = static_cast<std::uint64_t>(stored);
            sequence_exists = true;
        }
    }

    // Existing EXOTIC databases may predate durable sequences, or may contain
    // a sequence that fell behind records created by an older cached-ID kernel.
    // Reconcile against the actual table inside the same transaction.
    if (const auto table = sequence_table(name)) {
        Statement maximum{
            *this,
            "SELECT COALESCE(MAX(id),0)+1 FROM " + std::string{*table} + ";"
        };
        if (maximum.step()) {
            const auto table_value = maximum.column_int64(0);
            if (table_value < 1) {
                throw DatabaseError("Identifier table returned an invalid next value");
            }
            sequence_value = std::max(
                sequence_value,
                static_cast<std::uint64_t>(table_value)
            );
        }
    }

    if (sequence_value >= static_cast<std::uint64_t>((std::numeric_limits<std::int64_t>::max)())) {
        throw DatabaseError("Durable sequence exhausted the SQLite integer range");
    }

    if (sequence_exists) {
        Statement update{
            *this,
            "UPDATE exotic_sequences SET next_value=? WHERE name=?;"
        };
        update.bind(1, static_cast<std::int64_t>(sequence_value + 1));
        update.bind(2, name);
        update.execute();
    } else {
        Statement insert{
            *this,
            "INSERT INTO exotic_sequences(name,next_value) VALUES(?,?);"
        };
        insert.bind(1, name);
        insert.bind(2, static_cast<std::int64_t>(sequence_value + 1));
        insert.execute();
    }

    transaction.commit();
    return sequence_value;
}

Statement::Statement(Database& database, std::string_view sql)
    : lock_(database.mutex_),
      database_(database.handle_) {
    const std::string owned_sql{sql};
    if (sqlite3_prepare_v2(
            database.handle_,
            owned_sql.c_str(),
            -1,
            &statement_,
            nullptr) != SQLITE_OK) {
        throw DatabaseError(sqlite_error(database.handle_, "Failed to prepare statement"));
    }
}

Statement::~Statement() {
    if (statement_ != nullptr) {
        sqlite3_finalize(statement_);
    }
}

void Statement::bind(std::size_t index, std::int64_t value) {
    if (sqlite3_bind_int64(statement_, static_cast<int>(index), value) != SQLITE_OK) {
        throw DatabaseError(sqlite_error(database_, "Failed to bind integer"));
    }
}

void Statement::bind(std::size_t index, double value) {
    if (sqlite3_bind_double(statement_, static_cast<int>(index), value) != SQLITE_OK) {
        throw DatabaseError(sqlite_error(database_, "Failed to bind double"));
    }
}

void Statement::bind(std::size_t index, std::string_view value) {
    if (sqlite3_bind_text(
            statement_,
            static_cast<int>(index),
            value.data(),
            static_cast<int>(value.size()),
            SQLITE_TRANSIENT) != SQLITE_OK) {
        throw DatabaseError(sqlite_error(database_, "Failed to bind text"));
    }
}

void Statement::bind_null(std::size_t index) {
    if (sqlite3_bind_null(statement_, static_cast<int>(index)) != SQLITE_OK) {
        throw DatabaseError(sqlite_error(database_, "Failed to bind null"));
    }
}

bool Statement::step() {
    const auto result = sqlite3_step(statement_);
    if (result == SQLITE_ROW) {
        return true;
    }
    if (result == SQLITE_DONE) {
        return false;
    }
    throw DatabaseError(sqlite_error(database_, "SQLite statement step failed"));
}

void Statement::execute() {
    if (step()) {
        throw DatabaseError("Write statement unexpectedly returned a row");
    }
}

std::int64_t Statement::column_int64(int index) const {
    return sqlite3_column_int64(statement_, index);
}

double Statement::column_double(int index) const {
    return sqlite3_column_double(statement_, index);
}

std::string Statement::column_text(int index) const {
    const auto* value = sqlite3_column_text(statement_, index);
    return value != nullptr
        ? reinterpret_cast<const char*>(value)
        : std::string{};
}

bool Statement::column_is_null(int index) const {
    return sqlite3_column_type(statement_, index) == SQLITE_NULL;
}

} // namespace exotic::autonomy::persistence
