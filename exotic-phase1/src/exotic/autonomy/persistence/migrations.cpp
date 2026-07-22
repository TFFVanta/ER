#include "migrations.hpp"
#include "transaction.hpp"
namespace exotic::autonomy::persistence {
void MigrationRunner::migrate(Database&d){Transaction tx{d};d.execute(
"CREATE TABLE IF NOT EXISTS autonomy_schema_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);"
"CREATE TABLE IF NOT EXISTS objectives(id INTEGER PRIMARY KEY,title TEXT NOT NULL,desired_outcome TEXT NOT NULL,priority TEXT NOT NULL,status TEXT NOT NULL,created_at_ms INTEGER NOT NULL);"
"CREATE TABLE IF NOT EXISTS objective_metrics(objective_id INTEGER NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,target_value REAL NOT NULL,unit TEXT NOT NULL,PRIMARY KEY(objective_id,position),FOREIGN KEY(objective_id)REFERENCES objectives(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS objective_constraints(objective_id INTEGER NOT NULL,position INTEGER NOT NULL,value TEXT NOT NULL,PRIMARY KEY(objective_id,position),FOREIGN KEY(objective_id)REFERENCES objectives(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS objective_dependencies(objective_id INTEGER NOT NULL,dependency_id INTEGER NOT NULL,PRIMARY KEY(objective_id,dependency_id),FOREIGN KEY(objective_id)REFERENCES objectives(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS proposals(id INTEGER PRIMARY KEY,objective_id INTEGER NOT NULL,proposed_by TEXT NOT NULL,plan_name TEXT NOT NULL,risk TEXT NOT NULL,estimated_usd REAL NOT NULL,estimated_compute_seconds REAL NOT NULL,estimated_duration_seconds REAL NOT NULL,expected_value REAL NOT NULL,confidence REAL NOT NULL,human_approval_required INTEGER NOT NULL,status TEXT NOT NULL,created_at_ms INTEGER NOT NULL,FOREIGN KEY(objective_id)REFERENCES objectives(id));"
"CREATE TABLE IF NOT EXISTS proposal_steps(proposal_id INTEGER NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,description TEXT NOT NULL,reversible INTEGER NOT NULL,PRIMARY KEY(proposal_id,position),FOREIGN KEY(proposal_id)REFERENCES proposals(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS operations(id INTEGER PRIMARY KEY,objective_id INTEGER NOT NULL,proposal_id INTEGER NOT NULL,agent_id TEXT NOT NULL,status TEXT NOT NULL,created_at_ms INTEGER NOT NULL,started_at_ms INTEGER,completed_at_ms INTEGER,verification_passed INTEGER NOT NULL DEFAULT 0,verification_confidence REAL NOT NULL DEFAULT 0,failure_reason TEXT NOT NULL DEFAULT '',FOREIGN KEY(objective_id)REFERENCES objectives(id),FOREIGN KEY(proposal_id)REFERENCES proposals(id));"
"CREATE TABLE IF NOT EXISTS execution_traces(operation_id INTEGER NOT NULL,position INTEGER NOT NULL,message TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(operation_id,position),FOREIGN KEY(operation_id)REFERENCES operations(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS verification_findings(operation_id INTEGER NOT NULL,position INTEGER NOT NULL,message TEXT NOT NULL,PRIMARY KEY(operation_id,position),FOREIGN KEY(operation_id)REFERENCES operations(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS verification_corrections(operation_id INTEGER NOT NULL,position INTEGER NOT NULL,message TEXT NOT NULL,PRIMARY KEY(operation_id,position),FOREIGN KEY(operation_id)REFERENCES operations(id)ON DELETE CASCADE);"
"CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,event_type TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id INTEGER NOT NULL,actor TEXT NOT NULL,message TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at_ms INTEGER NOT NULL);"
"CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type,entity_id);"
"INSERT INTO autonomy_schema_metadata(key,value)VALUES('schema_version','2')ON CONFLICT(key)DO UPDATE SET value=excluded.value;"
);tx.commit();}
}
