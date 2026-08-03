BEGIN IMMEDIATE TRANSACTION;

CREATE TABLE IF NOT EXISTS resource_schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_accounts (
    id INTEGER PRIMARY KEY,
    parent_id INTEGER,
    scope TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    approval_threshold_usd REAL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    UNIQUE(scope, scope_id),
    FOREIGN KEY(parent_id) REFERENCES resource_accounts(id)
);

CREATE TABLE IF NOT EXISTS resource_account_limits (
    account_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    hard_limit REAL NOT NULL CHECK(hard_limit >= 0),
    soft_limit REAL NOT NULL CHECK(soft_limit >= 0),
    spent REAL NOT NULL DEFAULT 0 CHECK(spent >= 0),
    reserved REAL NOT NULL DEFAULT 0 CHECK(reserved >= 0),
    PRIMARY KEY(account_id, dimension),
    FOREIGN KEY(account_id) REFERENCES resource_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_rate_limits (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    capacity REAL NOT NULL CHECK(capacity > 0),
    available_tokens REAL NOT NULL CHECK(available_tokens >= 0),
    refill_per_second REAL NOT NULL CHECK(refill_per_second >= 0),
    cost_per_admission REAL NOT NULL CHECK(cost_per_admission > 0),
    last_refill_at_ms INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    UNIQUE(account_id, key),
    FOREIGN KEY(account_id) REFERENCES resource_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_reservations (
    id INTEGER PRIMARY KEY,
    job_id INTEGER NOT NULL,
    proposal_id INTEGER NOT NULL,
    operation_id INTEGER,
    leaf_account_id INTEGER NOT NULL,
    workload_key TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    expires_at_ms INTEGER NOT NULL,
    reconciled_at_ms INTEGER,
    released_at_ms INTEGER,
    release_reason TEXT NOT NULL DEFAULT '',
    FOREIGN KEY(leaf_account_id) REFERENCES resource_accounts(id)
);

CREATE TABLE IF NOT EXISTS resource_reservation_accounts (
    reservation_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY(reservation_id, account_id),
    FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES resource_accounts(id)
);

CREATE TABLE IF NOT EXISTS resource_reservation_amounts (
    reservation_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    requested REAL NOT NULL,
    reserved REAL NOT NULL,
    actual REAL NOT NULL DEFAULT 0,
    PRIMARY KEY(reservation_id, dimension),
    FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_usage_reports (
    id INTEGER PRIMARY KEY,
    reservation_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    proposal_id INTEGER NOT NULL,
    workload_key TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    FOREIGN KEY(reservation_id) REFERENCES resource_reservations(id)
);

CREATE TABLE IF NOT EXISTS resource_usage_amounts (
    report_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    amount REAL NOT NULL,
    PRIMARY KEY(report_id, dimension),
    FOREIGN KEY(report_id) REFERENCES resource_usage_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_circuit_breakers (
    id INTEGER PRIMARY KEY,
    scope_key TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    consecutive_failures INTEGER NOT NULL,
    consecutive_successes INTEGER NOT NULL,
    failure_threshold INTEGER NOT NULL,
    recovery_success_threshold INTEGER NOT NULL,
    cooldown_ms INTEGER NOT NULL,
    opened_at_ms INTEGER,
    reason TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_anomalies (
    id INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL,
    reservation_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    expected REAL NOT NULL,
    observed REAL NOT NULL,
    ratio REAL NOT NULL,
    severity TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_ledger_events (
    id INTEGER PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    actor TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_control (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    emergency_stop INTEGER NOT NULL DEFAULT 0,
    actor TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    updated_at_ms INTEGER NOT NULL
);

INSERT OR IGNORE INTO resource_control(id, emergency_stop, actor, reason, updated_at_ms)
VALUES(1, 0, '', '', 0);

INSERT INTO resource_schema_metadata(key, value)
VALUES('schema_version', '5')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;

CREATE INDEX IF NOT EXISTS idx_resource_accounts_parent
ON resource_accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_resource_reservations_active
ON resource_reservations(status, expires_at_ms);

CREATE INDEX IF NOT EXISTS idx_resource_usage_workload
ON resource_usage_reports(workload_key, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_resource_anomalies_created
ON resource_anomalies(created_at_ms DESC);

COMMIT;
