-- EXOTIC Continuous Operations Runtime v1.0 telemetry/control migration.
-- The C++ repository applies the same idempotent CREATE TABLE statements.
CREATE TABLE IF NOT EXISTS runtime_schema_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_audit(id INTEGER PRIMARY KEY,workspace_id TEXT NOT NULL,category TEXT NOT NULL,actor TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,message TEXT NOT NULL,payload_json TEXT NOT NULL,created_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_traces(span_id TEXT PRIMARY KEY,trace_id TEXT NOT NULL,parent_span_id TEXT,workspace_id TEXT NOT NULL,service TEXT NOT NULL,operation TEXT NOT NULL,status TEXT NOT NULL,attributes_json TEXT NOT NULL,started_at_ms INTEGER NOT NULL,ended_at_ms INTEGER);
CREATE TABLE IF NOT EXISTS runtime_metrics(id INTEGER PRIMARY KEY AUTOINCREMENT,workspace_id TEXT NOT NULL,name TEXT NOT NULL,value REAL NOT NULL,unit TEXT NOT NULL,labels_json TEXT NOT NULL,created_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_alerts(id INTEGER PRIMARY KEY,workspace_id TEXT NOT NULL,severity TEXT NOT NULL,source TEXT NOT NULL,code TEXT NOT NULL,message TEXT NOT NULL,details_json TEXT NOT NULL,active INTEGER NOT NULL,created_at_ms INTEGER NOT NULL,acknowledged_at_ms INTEGER);
CREATE TABLE IF NOT EXISTS runtime_service_health(workspace_id TEXT NOT NULL,service TEXT NOT NULL,state TEXT NOT NULL,level TEXT NOT NULL,message TEXT NOT NULL,observed_at_ms INTEGER NOT NULL,PRIMARY KEY(workspace_id,service));
CREATE TABLE IF NOT EXISTS runtime_controls(workspace_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT NOT NULL,updated_at_ms INTEGER NOT NULL,PRIMARY KEY(workspace_id,key));
INSERT INTO runtime_schema_metadata(key,value)VALUES('schema_version','10')ON CONFLICT(key)DO UPDATE SET value=excluded.value;
