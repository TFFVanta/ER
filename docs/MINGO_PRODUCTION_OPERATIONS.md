# Mingo Production Operations

Last updated: July 26, 2026

## Purpose

This repo now treats `mingo.center` as the official public frontend, while preserving distinct product identities:

- `Mingo` is the public system and domain surface
- `EXOTIC` remains the platform identity
- `VENUS` remains the intelligence system
- `Lucian` remains the intelligence operating through VENUS

## Surface map

- `https://mingo.center`
  Public home and primary canonical frontend
- `https://www.mingo.center`
  Alias or redirect to the canonical public home
- `https://portal.mingo.center`
  Authenticated EXOTIC and VENUS portal
- `https://ops.mingo.center`
  Operations console
- `https://api.mingo.center`
  Production API
- `https://status.mingo.center`
  Public status and incident reporting
- `https://docs.mingo.center`
  Documentation

## Git path

- feature work lands through branches and pull requests
- `production` is the production deployment branch
- pushes to `production` trigger the production deployment workflow

## What was added

- GitHub Actions CI: `.github/workflows/ci.yml`
- production deployment workflow: `.github/workflows/deploy-production.yml`
- manual rollback workflow: `.github/workflows/rollback-production.yml`
- build artifact generation: `tooling/build-portal-artifacts.mjs`
- health check runner: `tooling/check-frontend-health.mjs`
- Hostinger deploy runner: `tooling/deploy/hostinger-deploy.mjs`
- Hostinger rollback runner: `tooling/deploy/hostinger-rollback.mjs`
- host-aware surface mapping in the frontend: `src/portalConfig.js`

## Required repo configuration

GitHub repository variable:

- `HOSTINGER_DEPLOYMENT_MODE`

Supported values:

- `ssh-atomic`
- `vps-atomic`
- `ssh-static`
- `manual-hold`

Recommended value:

- `ssh-atomic`

GitHub repository secrets:

- `HOSTINGER_SSH_HOST`
- `HOSTINGER_SSH_PORT`
- `HOSTINGER_SSH_USER`
- `HOSTINGER_SSH_PRIVATE_KEY`
- `HOSTINGER_DEPLOYMENT_ROOT`
- `HOSTINGER_WEB_ROOT`

## Hostinger inspection checklist

Before enabling production deploys, inspect the Hostinger account and confirm which environment you actually have:

1. Shared or Business Web Hosting
2. Cloud Hosting
3. VPS
4. Hostinger Website Builder

Then confirm these details:

1. Does the plan provide SSH access?
2. What directory serves the public site?
3. Can the web root safely point at a symlinked `current` release?
4. Is the domain already attached inside Hostinger?
5. Is SSL active for `mingo.center` and `www.mingo.center`?
6. Are there existing email records that would break if nameservers move?

## Deployment mode decision

Use `ssh-atomic` when:

- SSH access exists
- the frontend is served from a filesystem path you control
- symlink-based release switching is allowed

Use `vps-atomic` when:

- the site is on VPS
- you want the same release-switching behavior as `ssh-atomic`

Use `ssh-static` only as a temporary compromise when:

- SSH exists
- the web root can be written directly
- symlinked releases are not available

Keep `manual-hold` when:

- the Hostinger account has not yet been inspected
- the plan is still unknown
- the account is using Website Builder with no approved automated deployment path

## Important caution about Website Builder

If the confirmed Hostinger product is `Hostinger Website Builder`, this repo should not treat manual builder publishing as the permanent production architecture.

That setup conflicts with the desired Git-based auto-deploy model. In that case, the recommended next move is to place `mingo.center` on a hosting plan that supports branch-driven deployment through SSH or a controlled CI target.

## Health and rollback

Every portal build now emits:

- `dist/healthz.json`
- `dist/deployment-manifest.json`

Production deploy flow now expects:

1. tests to pass
2. the frontend build to succeed
3. deployment to Hostinger to complete
4. `https://mingo.center/healthz.json` to report healthy

If smoke verification fails after deployment, the workflow attempts an automatic rollback for atomic deployment modes.

## Current blockers

- no Git remote is configured in this workspace right now
- no direct Hostinger connector is available in this task
- the exact Hostinger plan has not yet been confirmed

Because of that, the repo is now deployment-ready in structure, but production cannot be safely switched on until those three external pieces are confirmed.
