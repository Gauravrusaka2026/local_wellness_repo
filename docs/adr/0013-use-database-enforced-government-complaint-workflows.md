# ADR-0013: Use Database-Enforced Government Complaint Workflows

## Status

Accepted

## Date

2026-07-14

## Context

Phase 5 allows municipal staff to read private citizen complaints and perform operational actions
such as acknowledgement, assignment, transfer, inspection scheduling, internal notes, status
updates, work references, external-dependency recording, and resolution submission. These actions
cross sensitive citizen data, mutable workflow state, government access scopes, versioned
governance recipients, and immutable audit history.

The NestJS API verifies Supabase Auth bearer tokens, but API-only authorization would leave status,
scope, transition, and history invariants dependent on every route handler. Existing complaint
tables are intentionally unexposed and forced-RLS. Existing government roles can be global,
authority, ward, or authority-department scoped and may expire or be revoked independently of a
request.

## Decision

- Keep complaint operations in the private, forced-RLS `complaints` schema and expose no complaint
  table directly through PostgREST.
- Use authenticated NestJS endpoints backed by narrow service-role database functions. Every
  function independently resolves the acting user's current profile, authority membership, role,
  scope, and permitted capability before reading or mutating a complaint.
- Derive queue visibility from the complaint's current assignment: platform administrators may
  operate globally; municipal administrators and government operators operate within an authority;
  ward and department officers operate only within their assigned ward or authority-department;
  moderators are read-only.
- Store complaint assignments as versioned history with one active row. Reassignment or transfer
  closes the previous row and appends a new row; it never rewrites or deletes historical routing or
  recipient evidence.
- Evaluate complaint access from the stored jurisdiction and current user access rather than
  requiring a historical incumbent version to remain active forever. A stale incumbent is hidden as
  a current recipient, while authority/global operators can recover and reassign the complaint to a
  current verified target. Assignment and transfer remain authority/global capabilities.
- Store allowed status transitions and action/role capabilities as database records. Mutations lock
  the complaint, validate the current transition, append status history and action audit evidence,
  and update the current projection atomically.
- Do not allow transfer or a manual status exit to strand an active scheduled inspection or external
  dependency. The child workflow must be completed or resolved first.
- Append one private, data-minimized notification-outbox event in the same status transaction so
  Phase 6 can deliver it later; Phase 5 does not implement notification transport or retries.
- Require a distinct idempotency key and request fingerprint for every government mutation. Exact
  retries return the stored sanitized result; key reuse with a different request fails.
- Keep internal notes, inspection details, work references, external dependencies, and government
  action metadata private. Only an explicitly supplied bounded public message is added to the
  citizen-visible status timeline.
- Allocate resolution-evidence object paths on the server, upload through short-lived signed tokens
  into the existing private bucket, and verify expiry, size, SHA-256, accepted bounded binary
  signature, current assignment, and prior-use state before evidence can support a resolution
  submission. Signed reads are short-lived, non-cacheable downloads.
- Validate every assignment target against active, verified, non-placeholder governance records.
  Phase 5 engineering may use rollback-isolated synthetic fixtures, but placeholder or unverified
  entities can never become operational recipients.
- Use structured, coordinate-free NestJS logging and database audit records. Do not introduce
  Redis, BullMQ, Redis adapters/caching, or Sentry.

## Alternatives Considered

### Authorize only in NestJS services

Rejected because authorization and workflow invariants could drift between endpoints, and service
credentials would bypass table RLS without a second database-enforced boundary.

### Expose complaint tables directly with client RLS mutations

Rejected because scoped assignment changes, transition validation, idempotency, status history,
and audit evidence must commit together. Clients must never choose arbitrary official recipients or
official status values through ordinary table writes.

### Update the initial routing assignment in place

Rejected because it would erase how a complaint was routed and transferred. Assignment changes are
versioned append-and-close records.

### Put workflow jobs and mutation locks in Redis

Rejected because PostgreSQL row locks, uniqueness constraints, and transactions provide the needed
consistency and Redis/BullMQ remain intentionally deferred for V1.

## Consequences

- Scope isolation, valid transitions, assignment history, action audit, and replay safety have one
  authoritative implementation in PostgreSQL.
- API and database functions are more explicit because each mutation coordinates several private
  records in one transaction.
- Current government access is evaluated at request time; expired or revoked roles immediately stop
  granting queue or action access.
- Operational routing remains data-gated. An empty verified target list is a safe production result,
  not a reason to activate bootstrap placeholders.
- Cross-authority transfer requires an explicit later policy and reviewed inter-authority routing
  evidence; Phase 5 transfer is constrained to eligible targets inside the currently assigned
  authority.
- A basemap provider is not selected by this decision. The dashboard may show a privacy-safe
  coordinate overview without sending complaint coordinates to an external tile service.

## Implementation Notes

- Use partial uniqueness to enforce one active assignment per complaint and retain the immutable
  initial routing-decision link.
- Do not include descriptions, exact coordinates, internal-note text, object paths, signed URLs,
  checksums, phone numbers, emails, or tokens in structured logs or public status metadata.
- Cursor pagination and filters must be applied after scope authorization in the database, not by
  fetching an authority-wide result and filtering in the browser.
- Role hints in the dashboard are usability aids only; the API and database remain authoritative.
- Resolution evidence remains private and is accessible only through bounded signed operations.
- Signature recognition is an integrity gate, not full decoding, malware scanning, or moderation;
  those operational controls and scheduled Storage cleanup remain pre-pilot hardening work.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/authentication.md`
- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0011-use-server-orchestrated-complaint-submission.md`
