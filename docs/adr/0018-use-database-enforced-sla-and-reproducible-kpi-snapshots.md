# ADR-0018: Use Database-Enforced SLA and Reproducible KPI Snapshots

## Status

Accepted

## Date

2026-07-16

## Context

Phase 9 must measure acknowledgement, inspection, and resolution timeliness; pause eligible clocks
for recorded external dependencies; escalate overdue complaints; and produce ward, department, and
municipality KPIs. Operational targets, calendars, category overrides, and escalation chains have
not yet been approved. Clients and workers must not invent those values or make an unreviewed policy
active merely to unblock engineering.

PostgreSQL is already the complaint source of truth and atomically enforces government workflow and
resolution accountability. V1 deliberately excludes Redis, BullMQ, Redis adapters/caching, and
Sentry. KPI results also need to remain explainable and reproducible after source records and policy
versions evolve.

## Decision

- Store SLA calendars, policies, category overrides, and escalation rules as reviewed,
  effective-dated versions in the private complaint domain. Draft, ambiguous, expired, or
  unapproved versions are never selected for operational work.
- Materialize immutable complaint clock inputs and deadline history when an applicable published
  policy exists. Record the exact calendar, policy, category override, assignment scope, target,
  pauses, and completion event used; do not silently recalculate historical targets.
- Derive clock completion and external-dependency pauses from committed complaint lifecycle records
  inside PostgreSQL. API clients cannot select deadlines, breach state, or escalation levels.
- Coordinate due escalation work through bounded PostgreSQL leases using `FOR UPDATE SKIP LOCKED`,
  expiring capability tokens, retry backoff, terminal audit state, and idempotent completion. Extend
  the existing worker process rather than introducing a second queue platform.
- Persist append-only escalation evidence and data-minimized notification outbox events in the same
  transaction as any system workflow change. An escalation rule determines the permitted action;
  absent policy or rules produce no automatic action.
- Define KPI algorithms as versioned, code-owned definitions and persist immutable calculation runs
  and snapshots with their source cutoff, time window, scope, segment, numerator, denominator,
  exclusions, and definition version. APIs read persisted snapshots rather than recomputing
  mutable aggregates on request.
- Restrict KPI access to authorized government scope and platform administrators. Do not create a
  public KPI endpoint or any individual-officer ranking.
- Seed no active SLA policy, calendar, authority override, or escalation rule. Use only
  rollback-isolated synthetic fixtures to verify engineering until reviewed pilot policy data is
  available.

## Alternatives Considered

### Hardcode pilot targets in the API or worker

Rejected because no reviewed targets exist, duplicated client/server values drift, and a deployment
could silently make placeholder policy operational.

### Compute deadlines and KPIs only when an API is requested

Rejected because mutable source data would make historical results difficult to reproduce, overdue
work would depend on user traffic, and concurrent requests could disagree about policy selection.

### Add Redis or BullMQ for scheduled escalation

Rejected because ADR-0007 excludes them from V1 and the established PostgreSQL lease pattern already
supports bounded concurrency, crash recovery, and auditable retries.

### Rank individual officers

Rejected because the roadmap permits organizational accountability only. Individual ranking would
introduce fairness, employment, privacy, and data-quality risks outside the approved scope.

## Consequences

- Deadline and KPI results retain the policy and source evidence needed for later audit.
- Managed environments remain safely inactive until reviewed operational policy versions are
  deliberately published.
- PostgreSQL and the worker process take on scheduled evaluation and snapshot load; bounded batches,
  useful indexes, leases, and backlog monitoring are required.
- Calendar or policy corrections apply prospectively through new versions. Correcting already
  materialized history requires an explicit audited forward operation rather than mutation.
- Dashboard metrics can lag source events until the next successful snapshot run, and must display
  the calculation cutoff.

## Implementation Notes

- Use additive forward migrations and forced RLS on every private table.
- Lease tokens, exact coordinates, complaint descriptions, private comments, contact details,
  evidence paths/hashes, bearer tokens, and policy-review notes must not appear in logs or KPI
  payloads.
- Business-calendar functions operate in each approved calendar's IANA timezone while all stored
  timestamps remain UTC.
- External-dependency segmentation is retained separately from any configured clock pause so KPI
  users can distinguish delay ownership without hiding the underlying backlog.
- Worker retries are idempotent and retain terminal failures for operator review.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0013-use-database-enforced-government-complaint-workflows.md`
- `docs/adr/0014-use-postgresql-leased-outbox-delivery-for-v1-notifications.md`
- `docs/adr/0015-use-database-enforced-resolution-accountability.md`
- `docs/KNOWN_ISSUES.md`
