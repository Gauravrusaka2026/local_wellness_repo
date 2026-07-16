# ADR-0014: Use PostgreSQL-Leased Outbox Delivery for V1 Notifications

## Status

Accepted

## Date

2026-07-14

## Context

Complaint submission, assignment, status changes, and private messages must create durable
notifications without making a successful domain transaction depend on an online Socket.IO client
or an external delivery provider. Phase 5 already writes a data-minimized notification outbox in
the same PostgreSQL transaction as a workflow change. V1 intentionally excludes Redis, BullMQ,
Redis adapters, and Redis caching under ADR-0007.

The delivery boundary must support concurrent claims, crashed-worker recovery, bounded retries,
deduplication, offline notification history, and auditable outcomes. PostgreSQL remains the source
of truth, while Socket.IO is an optional low-latency projection and not a durable event store.

## Decision

- Extend the existing private `complaints.notification_outbox` instead of creating a second domain
  outbox. Submission, status-history, assignment-version, and private-message triggers append one
  data-minimized event in the same transaction as their source record.
- Create a PostgreSQL job projection for outbox materialization. Workers claim eligible jobs with
  `FOR UPDATE SKIP LOCKED`, a bounded lease, and a claim token. Expired leases are reclaimable until
  the five-attempt limit; failures use bounded exponential backoff and terminal rows are retained.
- Materialize immutable, per-user in-app notifications and channel-specific delivery rows exactly
  once through database uniqueness constraints. Recipient selection is recalculated from the active
  citizen profile and current authorized government scope, excluding the event actor.
- Treat in-app history as the V1 offline source of truth. A separate PostgreSQL-leased delivery pump
  sends eligible realtime rows to authenticated per-user Socket.IO rooms and records claim,
  delivery, lease-expiry, and failure attempts.
- Use at-least-once realtime semantics with stable event identifiers. Clients must treat socket
  events as repeatable invalidations and reconcile through the authenticated REST history
  endpoints; stable identifiers permit explicit duplicate suppression where needed.
- Represent push and email channel intent as `unsupported` until an approved provider, consent and
  preference policy, destination lifecycle, and environment credentials exist. No provider is
  selected by this decision and no unverified destination is contacted.
- Keep all communication and delivery tables in the unexposed, forced-RLS `complaints` schema.
  Runtime processes receive only narrow service-role RPC execution grants; the service credential
  is transport authority, while the database functions reauthorize the actor or recipient.
- Run one realtime-server instance for the V1 pilot. Horizontal Socket.IO delivery remains a later
  architecture decision and must not silently introduce Redis.

## Alternatives Considered

### Redis and BullMQ

Rejected for V1 because they are explicitly deferred by ADR-0007 and are unnecessary for the
current bounded workload. Adding them would expand the operational and secret-management surface.

### Emit directly from API transactions only

Rejected because an API or Socket.IO process can fail after the domain transaction commits. Direct
emission alone cannot provide durable offline history, retry evidence, or crash recovery.

### Supabase Realtime database subscriptions as the durable contract

Rejected because subscriptions do not replace recipient materialization, scoped room
authorization, delivery attempts, read receipts, or a controlled retry/dead-letter lifecycle.

### Exactly-once network delivery

Rejected because exactly-once delivery cannot be guaranteed across a database, network, and client
runtime. Stable IDs, database uniqueness, idempotent materialization, and client reconciliation
provide the practical V1 contract.

## Consequences

- A committed complaint event survives worker, realtime-server, and client outages.
- PostgreSQL owns additional polling, job-state, and attempt-history load; batch size, lease length,
  retry limits, and backlog must be monitored.
- In-app notifications remain available to an offline user after reconnect even when a realtime
  delivery records zero connected sockets.
- A realtime event may be observed more than once, so clients must tolerate repeated hints and
  refresh durable state rather than treating the socket payload as an independent source of truth;
  stable event IDs permit explicit duplicate suppression where needed.
- Push and email are visibly deferred rather than appearing operational. Provider activation will
  require its own security/privacy review and, if it changes architecture, a new ADR.
- Without a cross-instance adapter, only one realtime instance may be deployed for the V1 pilot.

## Implementation Notes

- Never place complaint descriptions, private message bodies, exact coordinates, contact values,
  signed URLs, object paths, bearer tokens, push tokens, or provider credentials in outbox or
  notification metadata.
- Private message bodies remain only in the private message record and authorized message payload;
  structured logs contain identifiers and outcome codes only.
- Recheck recipient complaint access at realtime claim/emission time. Revoked recipients must not
  receive queued events.
- `complaint_comments` is structural only. No public-comment read/create RPC or client route may be
  enabled until public visibility, moderation, and privacy policy are approved.
- Lease tokens are short-lived database capabilities and must never be logged or exposed to a
  client.

## Related Documents

- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/authentication.md`
- `docs/adr/0005-use-socketio-for-realtime-delivery.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0013-use-database-enforced-government-complaint-workflows.md`
