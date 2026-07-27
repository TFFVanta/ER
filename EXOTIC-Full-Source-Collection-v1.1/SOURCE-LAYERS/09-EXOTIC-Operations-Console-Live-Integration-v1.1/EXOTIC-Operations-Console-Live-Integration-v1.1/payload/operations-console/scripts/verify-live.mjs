const endpoint = process.env.EXOTIC_CONSOLE_ENDPOINT || 'http://127.0.0.1:8787/api/v1';
const required = {
  overview: ['summary', 'throughput', 'reliability', 'operations', 'services', 'audit'],
  objectives: ['objectives'],
  proposals: ['proposals'],
  approvals: ['approvals'],
  scheduler: ['jobs'],
  agents: ['agents'],
  resources: ['resources'],
  operations: ['operations'],
  audit: ['audit'],
  traces: ['traces'],
  alerts: ['alerts'],
  health: ['services'],
  emergency: ['summary'],
  settings: ['summary']
};

function fail(message) {
  console.error('[FAIL]', message);
  process.exitCode = 1;
}

const healthResponse = await fetch(endpoint + '/health', { cache: 'no-store' });
const health = await healthResponse.json().catch(() => ({}));
console.log(`[${healthResponse.ok ? 'PASS' : 'WARN'}] API health: ${health.runtime || 'unknown'} ${health.version || ''}`);

const response = await fetch(endpoint + '/console/snapshot', { cache: 'no-store' });
if (!response.ok) throw new Error(`snapshot returned ${response.status}`);
const snapshot = await response.json();

for (const [page, keys] of Object.entries(required)) {
  const missing = keys.filter(key => snapshot[key] === undefined || snapshot[key] === null);
  if (missing.length) fail(`${page}: missing ${missing.join(', ')}`);
  else {
    const counts = keys.map(key => Array.isArray(snapshot[key]) ? `${key}=${snapshot[key].length}` : `${key}=present`).join(' ');
    console.log(`[PASS] ${page}: ${counts}`);
  }
}

const liveChecks = [
  ['workspace', Boolean(snapshot.summary?.workspace)],
  ['runtime mode', Boolean(snapshot.summary?.mode)],
  ['service state', Array.isArray(snapshot.services)],
  ['durable operations', Array.isArray(snapshot.operations)],
  ['system audit', Array.isArray(snapshot.audit)]
];
for (const [name, okay] of liveChecks) {
  if (!okay) fail(name);
  else console.log(`[PASS] ${name}`);
}

if (!process.exitCode) console.log('result=PASS');
