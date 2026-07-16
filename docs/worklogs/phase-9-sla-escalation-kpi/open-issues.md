# Phase 9 Open Issues

## Operational Policy and Data Pending

- Approve official Pune pilot business calendar, acknowledgement/inspection/resolution targets,
  category overrides, completion statuses, external-dependency pause rules, and effective dates.
- Approve escalation levels, delays, actions, and target roles. Every referenced authority,
  department, ward, and officer-role assignment must be current and verified.
- Decide the authorized admin/operator workflow for publishing new policy versions and handling
  invalid, ambiguous, superseded, or corrected configuration.
- Decide KPI operating cadence, reporting windows, minimum sample interpretation, retention,
  late-data correction, and who may approve versioned algorithm changes.

## Deployment and Operations Pending

- Apply both Phase 9 migrations and regenerate/check in database types against the target project.
- Configure and supervise the trusted worker process with the Phase 9 loop settings; configure
  external scheduling for KPI run creation using Supabase/PostgreSQL facilities where required.
- Add alerts/runbooks for breached clocks, lease backlog, retry/dead jobs, failed KPI runs, stale
  latest snapshots, and notification outbox failures.
- Run rollback-isolated synthetic policy/clock/escalation/KPI verification in staging before any
  operational policy is published.
- Decide whether complaints created before the Phase 9 migration remain explicitly
  `not_materialized` or receive an audited prospective adoption event; never fabricate historical
  deadlines.
- Load-test sequential batch duration against SLA/KPI lease settings and add renewal or smaller
  operational bounds if a batch can outlive its lease.

## Product Boundaries

- Public accountability metrics, officer-level ranking, configurable notification templates, and
  automatic policy inference remain intentionally unimplemented.
- Historical policy/calendar corrections require an explicit audited forward workflow; existing
  materialized clock evidence is immutable by design.
