# Phase 6 Implementation

## Database

- Additive migrations create private conversation rooms, effective-dated participation evidence,
  immutable messages, monotonic read receipts, structural public comments, per-user notifications,
  delivery state/attempt history, and notification-outbox jobs.
- Existing complaints receive a private room and citizen participation evidence. New complaint
  insertion creates the room in the same transaction.
- Submission history, non-routing assignment versions, and private messages append one source-bound
  outbox event. Existing eligible submission/assignment records are backfilled idempotently.
- Outbox payload checks reject private text, exact coordinates, user/contact identifiers, object
  locators, signed URLs, and tokens.
- Narrow service-only RPCs authorize room access; create/list private messages; advance read
  receipts; list/read notifications; claim/materialize/fail outbox jobs; and claim/complete/fail
  realtime deliveries.
- Job and delivery claims use `FOR UPDATE SKIP LOCKED`, opaque lease tokens, bounded lease duration,
  five attempts, retry backoff, expired-lease recovery, and retained attempt evidence.
- Materialization creates in-app and realtime rows idempotently. In-app delivery is immediately
  durable; push/email rows are marked `unsupported` when a possible destination exists and contain
  only a user/device reference, not a copied contact value.
- All communication tables enable and force RLS. Direct table, sequence, and private-function
  privileges are revoked from public, anonymous, authenticated, and service roles.

## API and Shared Contracts

- Shared TypeScript contracts and strict Zod schemas define keyset pagination, private-message
  creation, read-through receipts, data-minimized notification history, Socket.IO handshake input,
  typed room operations, typing operations, acknowledgements, and versioned event envelopes.
- Authenticated NestJS endpoints list/create private complaint messages, advance message read state,
  list notifications, and mark one notification read. Every response is `private, no-store`.
- The API derives the actor from the verified bearer token and passes it to database functions;
  request bodies cannot select another sender, recipient, room, or official scope.

## Realtime Server

- The standalone Socket.IO server verifies the access token with Supabase Auth, requires an active
  application profile, joins a private per-user room, and disconnects when the JWT expires.
- Exact-origin checks, a bounded input buffer, disabled compression, per-socket event limits, and a
  maximum subscription count constrain the transport surface.
- `room:join` and `room:leave` support complaint, authority, ward, and department targets after
  database authorization. `message:create` persists before any room emission; `message:read`
  persists a monotonic read position; typing start/stop remains ephemeral.
- The delivery pump claims database-backed realtime rows, emits only to the intended authenticated
  user after a fresh active-account/complaint-access check, then records delivery or retry evidence.
- Liveness and dependency-backed readiness endpoints are exposed separately.

## Worker and Clients

- The worker process continuously claims and materializes outbox batches through service-only RPCs.
  It logs safe aggregate counts/identifiers and supports graceful shutdown without logging lease
  tokens or private payloads.
- Mobile adds persistent notification history/read state and a complaint conversation. The
  optional realtime connection refreshes the REST-backed view; the durable endpoint remains usable
  when realtime is absent.
- The government complaint detail adds the same private conversation boundary. Browser sessions
  supply the bearer token at runtime; it is not serialized into server-rendered markup.
