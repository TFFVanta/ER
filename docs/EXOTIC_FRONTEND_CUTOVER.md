# EXOTIC Frontend Cutover

Last updated: July 26, 2026

## Goal

Make `mingo.center` the official public frontend for EXOTIC while keeping hosting on Hostinger and domain registration at GoDaddy.

## Build the frontend

From the workspace root:

```powershell
npm run portal:build
```

This produces the static frontend in `dist/`.

## Recommended DNS path

Recommended: switch `mingo.center` to the Hostinger nameservers shown in your Hostinger hPanel for that site.

Why:

- Hostinger becomes the authoritative DNS host for the frontend.
- Future record changes stay in one place.
- SSL and site ownership flows are usually simpler on the hosting side.

## Cutover sequence

1. In Hostinger, add `mingo.center` to the target website or hosting plan.
2. In Hostinger hPanel, copy the exact nameservers shown for that domain or plan.
3. In GoDaddy, open `mingo.center` and change the domain nameservers to those Hostinger values.
4. Wait for propagation.
5. In Hostinger, publish or upload the built frontend from `dist/`.
6. Confirm `https://mingo.center` and `https://www.mingo.center` both resolve to the EXOTIC portal.

## If you must keep GoDaddy DNS

Use this only if you intentionally want GoDaddy to remain the DNS authority.

1. Keep GoDaddy nameservers in place.
2. In Hostinger, locate the destination IP or connection records for the site.
3. In GoDaddy DNS, point:
   - `@` to the Hostinger IP with an `A` record
   - `www` to the Hostinger target with a `CNAME` or mirrored Hostinger guidance
4. Recreate any required TXT, MX, or verification records.

## Important checks

- If you use non-Hostinger email today, review MX, SPF, DKIM, and DMARC before switching nameservers.
- If DNSSEC is enabled at GoDaddy, review whether Hostinger expects new DS records after the cutover.
- DNS changes usually finish sooner, but allow up to 24 to 48 hours for global propagation.

## Official frontend definition

Treat the root portal in this workspace as the official EXOTIC frontend:

- source: `src/`
- entry: `index.html`
- build output: `dist/`
- local dev: `npm run portal:dev`
- production build: `npm run portal:build`

## Verification checklist

- `mingo.center` loads the EXOTIC portal
- `www.mingo.center` lands on the same frontend or redirects to the root domain
- HTTPS certificate is active
- Core logo and shell render correctly on phone
- No old landing page still appears after propagation
