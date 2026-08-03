# EXOTIC Runtime API Adapter Contract

The console is usable without a backend in Demo mode. Live mode expects a small HTTP adapter in front of the C++ runtime.

## Snapshot

`GET /api/v1/console/snapshot`

Returns the complete console snapshot using the shape in `dist/demo-data.js`:

- `summary`
- `throughput`
- `reliability`
- `objectives`
- `proposals`
- `approvals`
- `jobs`
- `agents`
- `resources`
- `operations`
- `audit`
- `traces`
- `alerts`
- `services`

## Actions

`POST /api/v1/actions/:action`

Current console actions include:

- `approval.approve`
- `approval.reject`
- `alert.acknowledge`
- `emergency.activate`
- `emergency.clear`

The response should be:

```json
{ "ok": true, "message": "Action completed" }
```

## Health

`GET /api/v1/health`

```json
{
  "ok": true,
  "runtime": "EXOTIC Continuous Operations",
  "version": "1.0.0"
}
```

## Deployment and security

For local development, the default endpoint is `http://127.0.0.1:8787/api/v1`. Production should use authenticated HTTPS, narrow CORS rules, CSRF protection, request IDs, current-authority revalidation, and append-only audit evidence for every mutating action.
