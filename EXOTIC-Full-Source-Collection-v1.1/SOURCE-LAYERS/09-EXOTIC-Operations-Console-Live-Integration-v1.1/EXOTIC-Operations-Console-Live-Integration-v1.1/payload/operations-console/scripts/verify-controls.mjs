const endpoint = process.env.EXOTIC_CONSOLE_ENDPOINT || 'http://127.0.0.1:8787/api/v1';

async function jsonRequest(path, options = {}) {
  const response = await fetch(endpoint + path, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body.message || 'request failed'}`);
  return body;
}

async function snapshot() {
  return jsonRequest('/console/snapshot');
}

const actor = 'console.integration.verifier';
let emergencyActivated = false;
try {
  await jsonRequest('/actions/emergency.activate', {
    method: 'POST',
    body: JSON.stringify({ actor, reason: 'Operations Console live-control verification' })
  });
  emergencyActivated = true;
  const stopped = await snapshot();
  if (!stopped.summary?.emergencyStop) throw new Error('emergency stop did not become visible in the live snapshot');
  console.log('[PASS] emergency activation');

  await jsonRequest('/actions/emergency.clear', {
    method: 'POST',
    body: JSON.stringify({ actor, reason: 'Operations Console verification complete' })
  });
  emergencyActivated = false;
  const cleared = await snapshot();
  if (cleared.summary?.emergencyStop) throw new Error('emergency stop remained active after clear');
  console.log('[PASS] emergency clear');

  if (process.env.EXOTIC_SKIP_SIMULATION !== '1') {
    const result = await jsonRequest('/actions/simulation.run', {
      method: 'POST',
      body: JSON.stringify({ actor })
    });
    console.log(`[PASS] simulation action: ${result.message || 'completed'}`);
  }

  console.log('result=PASS');
} finally {
  if (emergencyActivated) {
    try {
      await jsonRequest('/actions/emergency.clear', {
        method: 'POST',
        body: JSON.stringify({ actor, reason: 'Automatic cleanup after verification failure' })
      });
    } catch (error) {
      console.error('[WARN] emergency cleanup failed:', error.message);
    }
  }
}
