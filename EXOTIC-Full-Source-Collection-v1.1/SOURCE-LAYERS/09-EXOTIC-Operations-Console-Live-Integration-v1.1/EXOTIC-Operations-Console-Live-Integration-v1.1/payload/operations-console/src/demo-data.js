
window.demoData = {
  summary: {
    workspace: 'C:\\Projects\\Exotic',
    version: '1.0.0',
    mode: 'simulation',
    uptime: '06d 14h 22m',
    health: 97,
    activeOperations: 8,
    queuedJobs: 14,
    pendingApprovals: 3,
    activeAgents: 11,
    openAlerts: 2,
    emergencyStop: false,
    lastSync: 'just now'
  },
  throughput: [
    { label: '00', value: 28 }, { label: '02', value: 31 }, { label: '04', value: 24 },
    { label: '06', value: 42 }, { label: '08', value: 58 }, { label: '10', value: 49 },
    { label: '12', value: 71 }, { label: '14', value: 64 }, { label: '16', value: 77 },
    { label: '18', value: 83 }, { label: '20', value: 76 }, { label: '22', value: 91 }
  ],
  reliability: [
    { label: 'Mon', value: 95 }, { label: 'Tue', value: 97 }, { label: 'Wed', value: 94 },
    { label: 'Thu', value: 98 }, { label: 'Fri', value: 97 }, { label: 'Sat', value: 99 }, { label: 'Sun', value: 98 }
  ],
  objectives: [
    { id: 'OBJ-1042', title: 'Release Operations Console', owner: 'Platform', priority: 'Critical', progress: 74, status: 'running', updated: '2m ago', outcome: 'Ship a verified control surface for the continuous runtime.' },
    { id: 'OBJ-1038', title: 'Reduce scheduler recovery time', owner: 'Runtime', priority: 'High', progress: 88, status: 'running', updated: '9m ago', outcome: 'Recover all expired worker leases within 10 seconds.' },
    { id: 'OBJ-1031', title: 'Establish agent trust baselines', owner: 'Trust', priority: 'High', progress: 100, status: 'completed', updated: '1h ago', outcome: 'Record evidence-backed trust levels for every active specialist.' },
    { id: 'OBJ-1024', title: 'Resource anomaly controls', owner: 'Resources', priority: 'Normal', progress: 61, status: 'warning', updated: '3h ago', outcome: 'Detect and contain unexpected API-credit consumption.' },
    { id: 'OBJ-1019', title: 'Public research archive sync', owner: 'Research', priority: 'Normal', progress: 42, status: 'paused', updated: '1d ago', outcome: 'Continuously mirror approved research artifacts to the public archive.' }
  ],
  proposals: [
    { id: 'PRP-882', objectiveId: 'OBJ-1042', title: 'Build responsive runtime console', agent: 'UI Systems Specialist', risk: 'Medium', confidence: 94, cost: 7.2, status: 'running', created: '8m ago' },
    { id: 'PRP-879', objectiveId: 'OBJ-1038', title: 'Shorten lease recovery scan', agent: 'Scheduler Engineer', risk: 'Low', confidence: 97, cost: 2.4, status: 'completed', created: '43m ago' },
    { id: 'PRP-875', objectiveId: 'OBJ-1024', title: 'Raise API anomaly sensitivity', agent: 'Resource Analyst', risk: 'High', confidence: 82, cost: 18.6, status: 'pending', created: '1h ago' },
    { id: 'PRP-871', objectiveId: 'OBJ-1042', title: 'Expose live runtime adapter', agent: 'Platform Integrator', risk: 'Medium', confidence: 91, cost: 5.7, status: 'pending', created: '2h ago' }
  ],
  approvals: [
    { id: 'APR-221', proposal: 'PRP-875 · API anomaly sensitivity', requester: 'Resource Analyst', quorum: '1 / 2', roles: ['Security', 'Finance'], expires: '47m', risk: 'High', budget: 18.6, status: 'pending' },
    { id: 'APR-219', proposal: 'PRP-871 · Live runtime adapter', requester: 'Platform Integrator', quorum: '1 / 1', roles: ['Platform Lead'], expires: '2h', risk: 'Medium', budget: 5.7, status: 'pending' },
    { id: 'APR-214', proposal: 'PRP-866 · Agent model upgrade', requester: 'Agent Supervisor', quorum: '2 / 3', roles: ['AI', 'Trust', 'Finance'], expires: '6h', risk: 'High', budget: 31.2, status: 'pending' },
    { id: 'APR-209', proposal: 'PRP-862 · Recovery test', requester: 'Runtime Tester', quorum: '2 / 2', roles: ['Runtime', 'Trust'], expires: 'closed', risk: 'Medium', budget: 3.1, status: 'completed' }
  ],
  jobs: [
    { id: 'JOB-5102', name: 'Runtime health sweep', trigger: 'Every 60 seconds', nextRun: '18s', priority: 90, worker: 'Supervisor-01', attempts: 0, status: 'running' },
    { id: 'JOB-5099', name: 'Agent heartbeat audit', trigger: 'Every 2 minutes', nextRun: '44s', priority: 80, worker: 'Trust-02', attempts: 0, status: 'running' },
    { id: 'JOB-5094', name: 'Resource reconciliation', trigger: 'On operation completion', nextRun: 'event', priority: 85, worker: 'Resource-01', attempts: 0, status: 'pending' },
    { id: 'JOB-5088', name: 'Research archive sync', trigger: 'Daily at 02:30', nextRun: '13h 08m', priority: 40, worker: 'Archive-01', attempts: 1, status: 'warning' },
    { id: 'JOB-5081', name: 'Audit evidence checkpoint', trigger: 'Every 15 minutes', nextRun: '6m', priority: 70, worker: 'Trust-01', attempts: 0, status: 'pending' }
  ],
  agents: [
    { id: 'AGT-01', name: 'Operator Prime', role: 'Operations Supervisor', model: 'Hybrid / local', trust: 98, reliability: 99, load: 62, cost: '$0.41/h', capabilities: ['supervision', 'routing', 'recovery'], status: 'healthy', lastHeartbeat: '4s' },
    { id: 'AGT-03', name: 'Vector', role: 'Scheduler Engineer', model: 'Exo-7B', trust: 93, reliability: 97, load: 48, cost: '$0.18/h', capabilities: ['scheduler', 'C++', 'SQLite'], status: 'healthy', lastHeartbeat: '8s' },
    { id: 'AGT-05', name: 'Aegis', role: 'Governance Specialist', model: 'Policy-3B', trust: 99, reliability: 98, load: 36, cost: '$0.23/h', capabilities: ['RBAC', 'ABAC', 'evidence'], status: 'healthy', lastHeartbeat: '3s' },
    { id: 'AGT-06', name: 'Ledger', role: 'Resource Analyst', model: 'Quant-3B', trust: 95, reliability: 94, load: 71, cost: '$0.16/h', capabilities: ['budgets', 'forecasting', 'anomaly'], status: 'warning', lastHeartbeat: '19s' },
    { id: 'AGT-08', name: 'Canvas', role: 'UI Systems Specialist', model: 'Design-7B', trust: 91, reliability: 96, load: 83, cost: '$0.29/h', capabilities: ['React', 'UX', 'visual systems'], status: 'healthy', lastHeartbeat: '6s' },
    { id: 'AGT-11', name: 'Proof', role: 'Verification Specialist', model: 'Test-3B', trust: 97, reliability: 99, load: 42, cost: '$0.14/h', capabilities: ['testing', 'evidence', 'QA'], status: 'healthy', lastHeartbeat: '5s' }
  ],
  resources: [
    { name: 'Operating budget', used: 172, limit: 300, unit: 'USD / month', forecast: 254, status: 'healthy' },
    { name: 'API credits', used: 68400, limit: 100000, unit: 'credits / day', forecast: 92100, status: 'warning' },
    { name: 'CPU time', used: 391, limit: 720, unit: 'core-hours', forecast: 588, status: 'healthy' },
    { name: 'GPU time', used: 84, limit: 160, unit: 'GPU-hours', forecast: 137, status: 'healthy' },
    { name: 'Memory capacity', used: 17.2, limit: 24, unit: 'GB', forecast: 19.8, status: 'warning' },
    { name: 'Persistent storage', used: 481, limit: 1024, unit: 'GB', forecast: 612, status: 'healthy' },
    { name: 'Network transfer', used: 1.8, limit: 5, unit: 'TB', forecast: 3.2, status: 'healthy' },
    { name: 'Concurrent operations', used: 8, limit: 16, unit: 'slots', forecast: 11, status: 'healthy' }
  ],
  operations: [
    { id: 'OP-9008', objective: 'Release Operations Console', agent: 'Canvas + Proof', started: '4m ago', duration: '04:18', verification: 87, traceId: 'TR-77A2', status: 'running' },
    { id: 'OP-9005', objective: 'Reduce scheduler recovery time', agent: 'Vector', started: '39m ago', duration: '07:42', verification: 98, traceId: 'TR-7791', status: 'completed' },
    { id: 'OP-8997', objective: 'Agent trust baselines', agent: 'Aegis', started: '1h ago', duration: '12:04', verification: 99, traceId: 'TR-76F0', status: 'completed' },
    { id: 'OP-8981', objective: 'Resource anomaly controls', agent: 'Ledger', started: '3h ago', duration: '03:18', verification: 62, traceId: 'TR-75B4', status: 'warning' },
    { id: 'OP-8972', objective: 'Archive sync', agent: 'Archive-01', started: '6h ago', duration: '01:06', verification: 0, traceId: 'TR-74E8', status: 'paused' }
  ],
  audit: [
    { id: 'AUD-7018', time: '12:06:22', actor: 'exotic.scheduler', event: 'job.leased', entity: 'JOB-5102', message: 'Runtime health sweep leased to Supervisor-01.', accent: 'blue' },
    { id: 'AUD-7017', time: '12:06:17', actor: 'exotic.resources', event: 'reservation.created', entity: 'RSV-3302', message: 'Capacity reserved across workspace, project, agent, and task accounts.', accent: 'yellow' },
    { id: 'AUD-7016', time: '12:06:15', actor: 'exotic.governance', event: 'authority.validated', entity: 'PRP-882', message: 'Canvas and Proof passed current policy and grant checks.', accent: 'pink' },
    { id: 'AUD-7015', time: '12:06:13', actor: 'exotic.agents', event: 'assignment.created', entity: 'ASN-1204', message: 'Parallel team formed with Canvas and Proof.', accent: 'pink' },
    { id: 'AUD-7014', time: '12:06:10', actor: 'exotic.kernel', event: 'proposal.approved', entity: 'PRP-882', message: 'Proposal passed the Decision Gate.', accent: 'green' },
    { id: 'AUD-7013', time: '12:05:51', actor: 'exotic.health', event: 'service.warning', entity: 'resource-governor', message: 'API-credit utilization crossed 65%.', accent: 'orange' },
    { id: 'AUD-7012', time: '12:05:11', actor: 'exotic.verification', event: 'operation.verified', entity: 'OP-9005', message: 'Scheduler recovery optimization passed all checks.', accent: 'green' }
  ],
  traces: [
    { id: 'SP-01', service: 'scheduler', operation: 'lease job', start: 0, duration: 10, status: 'completed' },
    { id: 'SP-02', service: 'agents', operation: 'select team', start: 10, duration: 19, status: 'completed' },
    { id: 'SP-03', service: 'governance', operation: 'validate authority', start: 29, duration: 13, status: 'completed' },
    { id: 'SP-04', service: 'resources', operation: 'reserve capacity', start: 42, duration: 16, status: 'completed' },
    { id: 'SP-05', service: 'autonomy', operation: 'execute proposal', start: 58, duration: 31, status: 'running' },
    { id: 'SP-06', service: 'verification', operation: 'verify output', start: 89, duration: 11, status: 'pending' }
  ],
  alerts: [
    { id: 'ALT-61', severity: 'warning', title: 'API-credit forecast elevated', source: 'resource-governor', time: '12m ago', acknowledged: false, detail: 'Daily forecast is 92.1% of the approved API-credit limit.' },
    { id: 'ALT-58', severity: 'critical', title: 'Archive worker missed heartbeat', source: 'agent-registry', time: '39m ago', acknowledged: false, detail: 'Archive-01 missed two heartbeat intervals. Replacement is available.' },
    { id: 'ALT-53', severity: 'info', title: 'Recovery simulation completed', source: 'continuous-runtime', time: '2h ago', acknowledged: true, detail: 'All interrupted jobs and reservations were recovered successfully.' }
  ],
  services: [
    { name: 'autonomy-kernel', version: '0.1', status: 'healthy', latency: 4, heartbeat: '2s', message: 'Decision and verification path ready.' },
    { name: 'persistence', version: '0.2', status: 'healthy', latency: 3, heartbeat: '2s', message: 'SQLite WAL database healthy.' },
    { name: 'event-scheduler', version: '0.3', status: 'healthy', latency: 7, heartbeat: '1s', message: 'Four workers active.' },
    { name: 'governance', version: '0.4', status: 'healthy', latency: 6, heartbeat: '2s', message: 'Emergency stop clear.' },
    { name: 'resource-governor', version: '0.5', status: 'warning', latency: 9, heartbeat: '3s', message: 'API-credit forecast elevated.' },
    { name: 'agent-runtime', version: '0.6', status: 'healthy', latency: 8, heartbeat: '1s', message: 'Eleven agents available.' },
    { name: 'continuous-runtime', version: '1.0', status: 'healthy', latency: 5, heartbeat: '1s', message: '24/7 supervision active.' }
  ]
};