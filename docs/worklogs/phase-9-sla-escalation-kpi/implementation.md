# Phase 9 Implementation

## Database

Two additive migrations introduce 19 forced-RLS tables in the private `complaints` schema:

- calendars, calendar versions, working periods, and exceptions;
- policies, policy versions, category overrides, escalation rules, and escalation-rule versions;
- complaint bindings, clocks, pause intervals, deadline history, escalation jobs, and escalation
  events;
- KPI definitions, definition versions, calculation runs, and immutable snapshots.

Publication functions validate reviewer authority, verification evidence, effective periods,
calendar structure, targets, and escalation configuration. Assignment/status/dependency triggers
materialize the selected policy evidence and evolve clocks from committed lifecycle records. Any
missing or ambiguous configuration remains visible as a fail-closed binding rather than an active
clock.

When one approved version is being replaced, publication locks that row and the candidate in the
same transaction, truncates the prior effective interval at the candidate's `effective_from`, marks
the prior row `superseded`, and then approves the candidate. Conflicting/backdated overlaps,
multiple prior overlaps, or attempts to reuse superseded intervals are rejected atomically for
calendar, policy, and escalation-rule versions.

Escalation and KPI RPCs claim bounded work under expiring capability leases, execute idempotently,
and retain retry/dead state for operators. Escalation changes and their minimal notification outbox
events are committed atomically with status history and the append-only escalation event. A retry
cannot publish notification delivery before its source workflow commit. KPI runs retain the
calculation window, source cutoff, algorithm version, fingerprint, exclusions, and organizational/
segment dimensions needed for reproduction.

Narrow government-read RPCs re-authorize access scope on every request. All direct table grants are
revoked; application clients cannot call publication, lease, or mutation functions.

## API and Shared Contracts

- `GET /api/v1/government/accountability/complaints/:complaintId/sla` returns the authorized
  complaint's materialized SLA state or an explicit fail-closed availability reason.
- `GET /api/v1/government/accountability/kpis` returns the latest authorized completed snapshot run
  with bounded scope, segment, and metric filters.
- Shared TypeScript and strict Zod contracts reject extra/private fields at both store and client
  boundaries.

Both routes are authenticated, government scoped, and `private, no-store`. There is no public KPI
or SLA route.

## Government Dashboard

Complaint detail renders policy-derived clocks, pauses, deadlines, and escalation evidence while
distinguishing `no_approved_policy`, `ambiguous_policy`, `invalid_configuration`, and
`not_materialized` from a healthy clock. The accountability page filters the latest persisted
organizational snapshots by authorized municipality, ward, department, segment, and metric and
shows calculation window/source-cutoff metadata. It provides no officer ranking.

## Workers

The existing trusted worker process runs independent notification-outbox, SLA-escalation, and KPI-
calculation loops against one service-role Supabase client. Each loop has its own worker ID, batch
size, lease duration, and poll interval. SIGINT/SIGTERM stops polling and lets active batches settle.
Structured logs contain safe job/run identifiers and outcomes, not lease tokens or complaint data.

Configuration:

- `SLA_ESCALATION_WORKER_ID`, `SLA_ESCALATION_BATCH_SIZE`,
  `SLA_ESCALATION_LEASE_SECONDS`, `SLA_ESCALATION_POLL_INTERVAL_MS`;
- `KPI_CALCULATION_WORKER_ID`, `KPI_CALCULATION_BATCH_SIZE`,
  `KPI_CALCULATION_LEASE_SECONDS`, `KPI_CALCULATION_POLL_INTERVAL_MS`;
- existing `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (or the legacy server-only
  `SUPABASE_SERVICE_ROLE_KEY`).

These are server-only values. They must never use an anon/publishable key or be exposed to a
browser/mobile bundle.
