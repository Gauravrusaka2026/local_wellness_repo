# ADR-0031: Prune Deferred Database Subsystems for V1

## Status

Accepted

## Date

2026-07-23

## Context

The application schema reached 129 custom tables while the current BMC V1 runtime uses only a
subset of the planned statewide platform. The review-gated governance synchronization pipeline,
versioned contact publication pipeline, and public-comment table were implemented structurally but
were never activated by the mobile app, API, Admin Console, Government Dashboard, workers, or
realtime server.

ADR-0027 simplified BMC routing through `routing.ward_issue_contacts`, but deliberately retained the
older physical tables. That preserved future options while leaving avoidable functions, triggers,
seeds, Edge code, metadata and operational failure modes in the V1 database.

The database remains small in bytes. Earlier high CPU was caused by a client/PostgREST request loop,
not by the number of relations. Physical pruning is still warranted for maintainability and a
smaller operational surface, but it is not presented as the CPU fix.

## Decision

- Apply a forward-only migration that physically removes 15 unused tables:
  - the 14-table governance synchronization and versioned-contact subsystem;
  - `complaints.complaint_comments`, which has no runtime reader or writer.
- Remove the corresponding synchronization RPCs, table triggers, Storage guards, pilot seeds,
  Edge Function registration and source code, plus the unused
  `@local-wellness/database/governance-sync` export and implementation.
- Preserve all canonical imported governance records, PostGIS ward boundaries, V1 categories,
  complaint capture/history/media, BMC ward routing, ward-email outbox, Community, government
  workflows, private messages, notifications, accountability, SLA and KPI behavior.
- Preserve the Government Dashboard delivery-readiness contract by resolving it from the active,
  private `routing.ward_issue_contacts` matrix instead of the removed versioned-contact view.
- Keep historical migrations immutable. The forward migration installs
  `private.v1_deferred_subsystems_pruned()` as a non-executable adaptive-bundle marker so subsequent
  SQL Editor master-bundle runs do not mistake intentionally removed historical relations for an
  incomplete migration.
- Keep the now-unused private `governance-raw-snapshots` Storage bucket in existing projects. SQL
  migrations must not delete Storage catalog rows directly; operators may remove an empty bucket
  later through the Storage API after checking for retained objects.
- Treat further collapse of routing, complaint workflow, notifications, transparency, SLA or KPI
  tables as separate migrations. Those clusters currently back visible behavior and must first
  receive compact replacements and compatibility validation.

This decision supersedes ADR-0010 and ADR-0012 for V1 execution. A future governance synchronization
capability requires a new decision and migration rather than silently restoring the retired schema.
ADR-0008 remains accepted for the canonical governance registry that V1 still uses.

## Alternatives Considered

### Keep all tables and document a smaller facade

Rejected because ADR-0027 already provides that outcome and does not reduce the physical schema or
retire unused runtime surfaces.

### Collapse directly from 129 tables to a new 26-table schema

Rejected as a single migration because active complaint, Community, government, messaging, SLA and
email paths depend on the current IDs, history and RPC contracts. A one-step rewrite would create a
high risk of data loss and prolonged application downtime.

### Drop SLA, KPI, messaging or transparency now

Rejected because those modules have visible dashboard or mobile behavior. Removing them would not
satisfy the requirement that current features continue to work.

### Archive the old tables in another schema

Rejected because moving relations does not reduce physical relation count or storage and leaves the
same trigger and dependency graph.

## Consequences

- Custom application tables fall from 129 to 114 after the migration.
- V1 no longer has an in-repository scheduled governance fetcher or versioned contact-review
  pipeline. Canonical offline imports continue through
  `@local-wellness/database/governance-import`.
- BMC delivery readiness and ward-email routing use the same compact ward/category matrix.
- A deployed synchronization Edge Function or external Cron invocation must be removed before the
  hosted migration; otherwise it will call retired RPCs and fail.
- Existing raw snapshot objects, if any, are not deleted by SQL.
- Future database reductions remain possible, but each active cluster requires a compatibility
  cutover and data-preservation plan first.

## Implementation Notes

- Apply `20260723110000_prune_deferred_v1_subsystems.sql` only after the V1 ward-routing migrations.
- The migration locks the lease table and refuses to run while an active, unexpired governance
  synchronization lease exists.
- The migration refuses to delete non-empty complaint-comment history. When the retired governance
  subsystem contains data, it also requires a complete, owner-approved V1 ward/category matrix
  before any destructive drop; clean bootstraps may prune empty legacy tables before seeds run.
- Retired relations use dependency-restricted drops so unexpected hosted-only dependencies abort
  the migration instead of being removed transitively.
- Take a hosted Supabase backup/PITR checkpoint and inspect synchronization row counts before
  applying the destructive migration.
- Run the focused pgTAP pruning test plus the complete database, API, mobile, web and dashboard
  suites before hosted rollout.
- Do not expose the prune marker or ward recipient values to citizen roles.

## Related Documents

- [ADR-0008](./0008-use-a-normalized-provenance-aware-governance-registry.md)
- [ADR-0010](./0010-use-review-gated-governance-synchronization.md)
- [ADR-0012](./0012-use-supabase-cron-edge-functions-and-postgresql-leases-for-governance-retrieval.md)
- [ADR-0027](./0027-use-a-simple-ward-contact-routing-facade-for-the-v1-bmc-pilot.md)
- `docs/database.md`
- `docs/architecture.md`
- `docs/worklogs/v1-database-pruning/overview.md`
