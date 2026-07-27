-- EXOTIC Agent Capability Registry and Work Allocation Runtime v0.6
-- The C++ repository performs the same migration idempotently.
-- Existing tables are never dropped automatically.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_schema_metadata(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents(
    id INTEGER PRIMARY KEY,
    identity_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL,
    availability TEXT NOT NULL,
    health TEXT NOT NULL,
    trust TEXT NOT NULL,
    specialist_title TEXT NOT NULL,
    primary_domain TEXT NOT NULL,
    specialty TEXT NOT NULL,
    description TEXT NOT NULL,
    runtime_kind TEXT NOT NULL,
    runtime_version TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    maximum_context_tokens INTEGER NOT NULL,
    supports_tools INTEGER NOT NULL,
    supports_parallel_work INTEGER NOT NULL,
    fixed_cost_usd REAL NOT NULL,
    hourly_cost_usd REAL NOT NULL,
    input_token_cost REAL NOT NULL,
    output_token_cost REAL NOT NULL,
    api_credits_per_task REAL NOT NULL,
    active_tasks INTEGER NOT NULL,
    maximum_tasks INTEGER NOT NULL,
    utilization REAL NOT NULL,
    workload_updated_ms INTEGER NOT NULL,
    resource_account_id INTEGER,
    registered_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    revoked_at_ms INTEGER,
    last_heartbeat_at_ms INTEGER,
    revocation_reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_roles(
    agent_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY(agent_id, role),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_attributes(
    agent_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY(agent_id, key),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_runtime_attributes(
    agent_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY(agent_id, key),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_domains(
    agent_id INTEGER NOT NULL,
    domain TEXT NOT NULL,
    PRIMARY KEY(agent_id, domain),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_tags(
    agent_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY(agent_id, tag),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS capability_definitions(
    id INTEGER PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    parent_key TEXT,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    active INTEGER NOT NULL,
    created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS capability_required_tools(
    capability_id INTEGER NOT NULL,
    tool_key TEXT NOT NULL,
    PRIMARY KEY(capability_id, tool_key),
    FOREIGN KEY(capability_id) REFERENCES capability_definitions(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_capabilities(
    agent_id INTEGER NOT NULL,
    capability_key TEXT NOT NULL,
    proficiency REAL NOT NULL,
    reliability REAL NOT NULL,
    successful_uses INTEGER NOT NULL,
    failed_uses INTEGER NOT NULL,
    last_validated_at_ms INTEGER NOT NULL,
    PRIMARY KEY(agent_id, capability_key),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_tool_permissions(
    agent_id INTEGER NOT NULL,
    tool_key TEXT NOT NULL,
    scope TEXT NOT NULL,
    allowed INTEGER NOT NULL,
    valid_from_ms INTEGER NOT NULL,
    valid_until_ms INTEGER,
    PRIMARY KEY(agent_id, tool_key, scope),
    FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS agent_tool_operations(
    agent_id INTEGER NOT NULL,
    tool_key TEXT NOT NULL,
    scope TEXT NOT NULL,
    operation TEXT NOT NULL,
    PRIMARY KEY(agent_id, tool_key, scope, operation)
);
CREATE TABLE IF NOT EXISTS capability_evidence(
    id INTEGER PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    capability_key TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    reference TEXT NOT NULL,
    confidence REAL NOT NULL,
    payload_json TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS work_assignments(
    id INTEGER PRIMARY KEY,
    version INTEGER NOT NULL,
    job_id INTEGER NOT NULL UNIQUE,
    proposal_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    action TEXT NOT NULL,
    domain TEXT NOT NULL,
    minimum_trust TEXT NOT NULL,
    minimum_team_size INTEGER NOT NULL,
    preferred_team_size INTEGER NOT NULL,
    maximum_team_size INTEGER NOT NULL,
    plan_mode TEXT NOT NULL,
    supervisor_required INTEGER NOT NULL,
    supervisor_capability TEXT,
    maximum_team_cost_usd REAL NOT NULL,
    estimated_duration_hours REAL NOT NULL,
    resource_account_id INTEGER NOT NULL,
    governance_approval_id INTEGER,
    reservation_ttl_ms INTEGER NOT NULL,
    simulation INTEGER NOT NULL,
    plan_supervisor_id INTEGER,
    plan_estimated_cost_usd REAL NOT NULL,
    plan_score REAL NOT NULL,
    reservation_id INTEGER,
    continuity_key TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    started_at_ms INTEGER,
    completed_at_ms INTEGER,
    failure_reason TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assignment_capabilities(
    assignment_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    capability_key TEXT NOT NULL,
    minimum_proficiency REAL NOT NULL,
    minimum_reliability REAL NOT NULL,
    required INTEGER NOT NULL,
    weight REAL NOT NULL,
    PRIMARY KEY(assignment_id, position),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_tools(
    assignment_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    tool_key TEXT NOT NULL,
    operation TEXT NOT NULL,
    scope TEXT NOT NULL,
    required INTEGER NOT NULL,
    PRIMARY KEY(assignment_id, position),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_excluded_agents(
    assignment_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    PRIMARY KEY(assignment_id, agent_id),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_constraints(
    assignment_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY(assignment_id, key),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_resource_estimates(
    assignment_id INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    amount REAL NOT NULL,
    PRIMARY KEY(assignment_id, dimension),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_agents(
    assignment_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    PRIMARY KEY(assignment_id, position),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_stages(
    assignment_id INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    PRIMARY KEY(assignment_id, stage_index),
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment_stage_agents(
    assignment_id INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    position INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    PRIMARY KEY(assignment_id, stage_index, position)
);
CREATE TABLE IF NOT EXISTS assignment_stage_dependencies(
    assignment_id INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    depends_on INTEGER NOT NULL,
    PRIMARY KEY(assignment_id, stage_index, depends_on)
);

CREATE TABLE IF NOT EXISTS worker_bindings(
    id INTEGER PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    agent_id INTEGER NOT NULL,
    worker_key TEXT NOT NULL,
    bound_at_ms INTEGER NOT NULL,
    heartbeat_at_ms INTEGER NOT NULL,
    expires_at_ms INTEGER NOT NULL,
    released INTEGER NOT NULL,
    released_at_ms INTEGER,
    FOREIGN KEY(assignment_id) REFERENCES work_assignments(id)
);
CREATE TABLE IF NOT EXISTS agent_performance(
    id INTEGER PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    assignment_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    capability_key TEXT NOT NULL,
    outcome TEXT NOT NULL,
    quality_score REAL NOT NULL,
    verification_confidence REAL NOT NULL,
    duration_ms INTEGER NOT NULL,
    actual_cost_usd REAL NOT NULL,
    reason TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    FOREIGN KEY(agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_agents_live
    ON agents(status, availability, health, last_heartbeat_at_ms);
CREATE INDEX IF NOT EXISTS idx_agent_capability
    ON agent_capabilities(capability_key, proficiency, reliability);
CREATE INDEX IF NOT EXISTS idx_assignments_status
    ON work_assignments(status);
CREATE INDEX IF NOT EXISTS idx_bindings_expiry
    ON worker_bindings(released, expires_at_ms);
CREATE INDEX IF NOT EXISTS idx_performance_agent
    ON agent_performance(agent_id, created_at_ms);

INSERT INTO agent_schema_metadata(key, value)
VALUES('schema_version', '6')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
