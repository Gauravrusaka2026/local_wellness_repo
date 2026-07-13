# ADR-0005: Use Socket.IO for Realtime Delivery

## Status

Accepted

## Date

2026-07-11

## Context

The platform will later require authenticated realtime status delivery and persistent complaint communication across mobile and web clients. Realtime delivery must remain separate from the PostgreSQL source of truth and support later horizontal scaling.

## Decision

Use Socket.IO in a standalone TypeScript realtime-server application.

Phase 0 initializes the HTTP and Socket.IO server only. It does not add connection handlers, rooms, events, authentication, Redis adapters, persistence, or application behavior.

## Alternatives Considered

- Native WebSockets: reduce protocol abstraction but require more connection, reconnection, acknowledgement, and room infrastructure.
- Server-sent events: work well for server-to-client updates but do not cover the documented bidirectional communication model.
- NestJS gateway inside the API process: reduces the number of runtimes but couples independent realtime scaling and lifecycle to the primary API.
- Database-only realtime subscriptions: do not provide the documented room authorization and messaging architecture by themselves.

## Consequences

- Socket.IO provides established reconnection, acknowledgement, and room primitives.
- A standalone runtime adds a deployment and monitoring boundary.
- Every future event and room join must use validated authorization.
- Persistent events must be committed to PostgreSQL before broadcast.
- Horizontal scaling will require a reviewed Redis-adapter implementation later.

## Implementation Notes

- `apps/realtime-server` builds to `dist/main.js` and listens on port 3002 by default.
- The Phase 0 server has no registered Socket.IO events.
- Redis, room policy, event schemas, and delivery tests are deferred to the realtime phase.

## Related Documents

- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`
