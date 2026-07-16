# Phase 7 Implementation

## Persistence and policy

- `20260716100000_phase_7_accountability_schema.sql` extends immutable resolution history with
  server completion time, captured PostGIS location/provenance, distance, work-reference linkage,
  and explicit after-evidence roles. It adds stable/effective-dated resolution policy, citizen
  replay/audit, feedback, private follow-up evidence, reopen, link, and escalation records.
- `20260716101000_phase_7_accountability_security_and_rpc.sql` forces RLS, removes direct grants,
  pins security-definer search paths, validates append-only/version transitions, and exposes narrow
  service-role functions. PostgreSQL freezes policy at completion time, rechecks ownership/current
  workflow, enforces evidence integrity and deadlines, derives resolved/reopened/escalated state,
  and writes history/audit/outbox evidence atomically.
- No operational policy is seeded. Synthetic approved policies exist only in rollback-isolated
  tests; missing, ambiguous, draft, or out-of-period policy data fails closed.

## API and contracts

- Shared types and strict validation define public/government resolution records, policy context,
  all-or-none ratings, private evidence metadata, feedback, reopen requests, and escalation events.
- Authenticated citizen routes provide resolution context, feedback, evidence reservation/
  finalization/access, and reopening. A current-scope government route provides accountability
  history. Stores strictly decode every RPC response and map stable safe errors.
- Signed Storage targets are short-lived and private. Finalization verifies stored size, SHA-256,
  MIME type, and binary signature; terminal/expired reservations cannot mint a new target.

## Clients

- The mobile complaint detail reviews before/after/reopen evidence, renders database policy, accepts
  one outcome and four ratings, captures live follow-up photo/video evidence, and submits exact-
  replay reopen requests. Finalized unlinked evidence recovers after restart.
- Persisted feedback, reopen, and escalation records render as durable citizen receipts. Parent/
  realtime complaint refreshes reload the accountability context, and failed uploads retain one
  retryable pending capture without allowing replacement.
- The government dashboard requires a live browser completion location, optionally links an
  existing work reference, and renders access-scoped resolution, feedback, reopen, and escalation
  history while keeping completion notes government-only.

## Compatibility and scope

- Historical Phase 5 resolutions keep nullable completion fields; applied Phase 5/6 migrations are
  unchanged and their compatibility tests pass.
- Phase 8 public transparency/maps, operational policy activation, provider-backed media scanning,
  managed deployment, Redis, BullMQ, and Sentry are outside this implementation.
