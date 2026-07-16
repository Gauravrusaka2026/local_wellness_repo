# Phase 6 Decisions

- Keep PostgreSQL as the durable source of truth and use Socket.IO only as a low-latency projection.
- Extend the Phase 5 notification outbox and add leased job/delivery projections rather than create
  a competing queue.
- Use PostgreSQL `FOR UPDATE SKIP LOCKED` claims, bounded leases, claim tokens, five attempts,
  exponential retry, and retained terminal state; do not introduce Redis or BullMQ.
- Materialize one notification per current authorized recipient and exclude the event actor.
- Deliver persistent events to authenticated per-user rooms. Recheck active account and complaint
  access at claim/emission time, not only when the socket first connects.
- Give persistent events stable IDs and require REST reconciliation because transport is
  at-least-once and a socket is not durable storage.
- Authorize complaint, authority, ward, and department subscriptions from database records. Treat
  `room_members` as participation evidence only, never as authorization.
- Keep typing indicators ephemeral and emit them only after a fresh complaint-room authorization.
- Keep private message bodies out of notification/outbox metadata and logs.
- Persist push/email channel intent as explicitly unsupported until provider, consent, preference,
  destination, retry, and privacy requirements are approved and implemented.
- Create the structural public-comment table without a create/read RPC or grant. Public comments
  remain deferred with public visibility and moderation.
- Retain a single realtime instance for the V1 pilot; horizontal scaling requires a later ADR.

The architectural rationale is recorded in ADR-0014.
