# Phase 9 Decisions

- Keep calendars, policies, overrides, escalation rules, clocks, job state, and KPI evidence in the
  unexposed complaint domain with forced RLS and no client table access.
- Publish configuration only through platform-admin, service-role database operations and require
  verified source evidence and non-overlapping effective periods.
- Publish a replacing calendar, policy, or escalation-rule version as one atomic database
  operation: lock and close the one eligible prior approved version at the new `effective_from`,
  mark it `superseded`, and approve the new version. Reject backdated, same/older-version, multiple-
  overlap, and already-superseded conflicts instead of creating two operational versions.
- Bind each complaint cycle to the exact approved policy/calendar/override selected at assignment
  time. Persist `not_configured`, `ambiguous`, and `invalid_configuration` outcomes instead of
  guessing or silently selecting a target.
- Derive completion and eligible external-dependency pause/resume events from committed complaint
  lifecycle rows inside PostgreSQL. Clients cannot choose deadlines, breach state, or escalation
  level.
- Use bounded PostgreSQL leases and `FOR UPDATE SKIP LOCKED` for both escalation and KPI work, with
  expiring lease tokens, idempotent execution, retry backoff, and retained terminal failures.
- Commit the escalation event, any database-derived complaint status/history change, and its data-
  minimized notification outbox row in the same transaction so delivery cannot outrun source state.
- Materialize versioned organizational KPI snapshots at an explicit source cutoff. APIs read the
  completed snapshots rather than recomputing mutable source data.
- Limit KPI scope to municipality, ward, and department and preserve external-dependency segments.
  Do not expose public metrics or rank individual officers.
- Log operational identifiers and outcomes only. Lease tokens, citizen content, exact locations,
  contact data, review notes, evidence references, and authentication secrets remain excluded.
- Seed versioned algorithm definitions only; seed no active operational SLA or escalation policy.

The architecture decision and alternatives are recorded in ADR-0018.
