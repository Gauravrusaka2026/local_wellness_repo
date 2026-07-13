# ADR-0007: Defer Redis, BullMQ, and Sentry Beyond V1

## Status

Accepted

## Date

2026-07-13

## Context

The foundation documentation and development Compose file anticipated Redis, BullMQ, and Sentry before any feature required them. The product owner has explicitly deferred all three technologies for V1. Keeping unused operational dependencies in the active V1 topology would increase configuration, secret-management, deployment, and maintenance work without supporting the current identity milestone.

## Decision

Redis, BullMQ, and Sentry are outside the V1 implementation and deployment topology unless the product owner explicitly reintroduces them.

- Remove Redis from the active development Compose dependency graph and environment template.
- Do not add BullMQ queues or Redis adapters during V1 phases.
- Keep observability vendor-neutral through structured logs, request identifiers, health checks, and platform metrics; do not add a Sentry SDK or DSN.
- Revisit horizontal realtime scaling, durable job execution, and an error-reporting vendor only through a future approved ADR.

## Alternatives Considered

- Keep dormant Redis and Sentry configuration: rejected because unused secrets and services imply an unsupported V1 dependency and create avoidable operational burden.
- Introduce Redis and BullMQ during Phase 1 for future readiness: rejected because identity and access require neither technology.
- Replace them immediately with another queue or monitoring vendor: rejected because V1 requirements do not yet justify a new major dependency decision.

## Consequences

- V1 has fewer runtime services and secrets.
- Realtime horizontal scaling and BullMQ-style background processing remain unavailable until a later design is approved.
- Later notification, escalation, and analytics phases must choose a PostgreSQL-backed or platform-native V1 mechanism within their documented scope, or request a revised architecture decision.
- Existing standalone realtime and worker boundaries remain available but gain no Redis- or BullMQ-dependent behavior.

## Implementation Notes

- Documentation must distinguish the V1 topology from possible post-V1 scaling options.
- CI and local development must not require Redis or a Sentry credential.
- The previously exposed Redis credential remains subject to revocation even though Redis is no longer an active V1 dependency.

## Related Documents

- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/KNOWN_ISSUES.md`
- ADR-0005
