# ADR-0022: Use PostgreSQL-Backed V1 API Hardening

## Status

Accepted

## Date

2026-07-16

## Context

The V1 API needs shared abuse quotas, readiness evidence, safe operational responses, and launch
checks. Redis, BullMQ, Sentry, and vendor-specific observability remain explicitly deferred, and
per-process counters would not remain consistent across restarts or multiple API instances.

## Decision

- Use a forced-RLS private PostgreSQL quota table and narrow service-only functions for shared,
  deterministic API rate windows. Persist only hashed quota subjects and bounded expiry data.
- Apply route-specific quotas through NestJS decorators/interceptors and return `429` with bounded
  retry metadata. Provider limits and edge controls remain defense in depth.
- Expose versioned liveness and readiness endpoints. Liveness proves the process loop; readiness
  calls a narrow database function that checks required identity data and private Storage buckets.
- Add standard security headers, request correlation, bounded errors, and graceful shutdown.
- Use dependency-free bounded HTTP smoke/load tooling, structured logs, CI secret scanning, and
  operator runbooks. Do not add Redis, BullMQ, Sentry, or a new monitoring vendor.

## Alternatives Considered

### In-memory rate counters

Rejected because they reset on process restart and diverge across replicas.

### Redis-backed quotas

Rejected because Redis is intentionally outside V1 and PostgreSQL is sufficient for the bounded
pilot workload.

### Deep readiness queries across every subsystem

Rejected because probes must be cheap and should not amplify partial failures. Deeper verification
belongs in release smoke tests and platform monitoring.

## Consequences

- PostgreSQL receives additional small writes on protected request paths; load thresholds and
  cleanup cadence must be monitored before scaling.
- Readiness is deliberately narrow and does not prove official routing data, SMS delivery, worker
  health, or every external integration.
- The approach remains portable across the current single-instance and future bounded API topology.

## Implementation Notes

- Never store raw IP addresses, emails, user agents, tokens, or complaint content as quota keys.
- Schedule bounded expired-window cleanup and alert on sustained `429`, dependency, readiness, and
  lease-failure signals.
- Keep destructive load tests local or in an explicitly approved non-production environment.

## Related Documents

- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/runbooks/`
