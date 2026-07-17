# V1 Release Verification and Rollback

## Local Release Evidence

Run from a clean working tree with the repository-pinned Node and pnpm versions:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm security:secrets
corepack pnpm governance:data:check
corepack pnpm database:master:check
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
docker compose --file infrastructure/docker/compose.dev.yml config --quiet
corepack pnpm audit --prod
```

With local Supabase running, also run the clean local reset, schema lint, pgTAP suite, Auth E2E,
and generated-type check documented in `docs/supabase-setup.md`. A local reset must never be pointed
at a hosted project.

After starting the API and realtime process, use GET-only checks:

```bash
corepack pnpm http:smoke -- --url=http://127.0.0.1:3001/health/live --url=http://127.0.0.1:3001/health/ready
corepack pnpm http:smoke -- --url=http://127.0.0.1:3002/health/live --url=http://127.0.0.1:3002/health/ready
corepack pnpm http:load -- --url=http://127.0.0.1:3001/health/live --requests=100 --concurrency=5
```

Remote checks require `--allow-remote`. Use only reviewed staging health or read endpoints; never
load-test a mutating route or production without explicit operational approval.

## Deployment Gate

Before promotion, record the commit and image digests, migration range, generated master checksum,
backup identifier, environment, approver, planned health checks, and prior deployable version.
Apply additive migrations incrementally. `supabase/master.sql` is only for a clean empty database.
The two ordered SQL Editor parts adapt to a coherent earlier Local Wellness migration prefix, skip
completed migrations as units, and apply the missing suffix. Run Part 1 then Part 2 with applications
stopped; stop on any partial/non-contiguous fingerprint error.

Confirm that client applications contain only public keys, server credentials exist only in
trusted runtimes, exact CORS/Auth redirects match the environment, and placeholder/unverified data
remains inactive. Smoke authenticated citizen, government, and administrator access without
recording tokens, OTPs, contact data, media paths, or exact locations.

## Rollback and Forward Fix

1. Stop promotion and preserve request IDs, safe logs, audit rows, image digests, and migration
   evidence.
2. Disable affected schedules or traffic without deleting complaint, assignment, status, routing,
   synchronization, or notification history.
3. Roll API, web, realtime, and workers back to the recorded compatible image/deployment.
4. Prefer an additive database forward-fix. Never make destructive migration rollback the only
   recovery path.
5. Use a reviewed mobile hotfix or feature gate; an installed binary cannot be assumed to roll back
   immediately.
6. Repeat liveness, readiness, authorization, RLS, critical-flow, queue, and data-integrity checks.
7. Record the outcome and link any incident or corrective migration.

If the previous application is incompatible with already-applied additive schema, keep the newer
runtime isolated and deploy a reviewed forward fix instead of forcing an unsafe image rollback.
