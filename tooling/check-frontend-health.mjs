const target = process.env.HEALTHCHECK_URL || "http://127.0.0.1:4173/healthz.json";

const response = await fetch(target, {
  headers: {
    accept: "application/json",
    "cache-control": "no-cache",
  },
});

if (!response.ok) {
  throw new Error(`Health check failed for ${target}: HTTP ${response.status}`);
}

const payload = await response.json();

if (!payload.ok) {
  throw new Error(`Health payload reported unhealthy state for ${target}`);
}

if (!payload.service || !payload.commitSha || !payload.builtAt) {
  throw new Error(`Health payload missing required fields for ${target}`);
}

console.log(`Health check passed for ${target}`);
