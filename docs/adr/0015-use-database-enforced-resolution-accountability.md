# ADR-0015: Use database-enforced resolution accountability

## Status

Accepted

## Date

2026-07-16

## Context

Phase 5 records versioned government resolutions and private completion evidence, while Phase 6
delivers database-first status notifications. Phase 7 must let the complaint owner review that
evidence, confirm an outcome, provide auditable feedback, reopen within an approved policy, and
escalate repeated reopening without allowing clients to choose official workflow state.

The roadmap does not approve an operational rating scale, reopen window, attempt limit, evidence
requirement, or repeated-reopen threshold. Those values may vary by authority or category and must
not be embedded in mobile, web, API, or migration logic. Existing resolution evidence is private
government data, so citizen review must not make an object or bucket public.

## Decision

Use private, forced-RLS PostgreSQL tables and service-only functions as the authoritative Phase 7
accountability boundary.

- Store stable resolution policies separately from effective-dated, review-attributed policy
  versions. Policy versions define rating bounds and requirements, feedback/reopen windows,
  eligible statuses, evidence requirements, attempt limits, allowed reason codes, and repeated-
  reopen escalation thresholds.
- Resolve the most specific approved policy from database scope at the exact server-recorded
  resolution completion time. That immutable effective version governs later review actions;
  missing, ambiguous, unapproved, or out-of-period policy data fails closed. No operational policy
  is seeded in Phase 7.
- Keep feedback, citizen action replay/audit records, reopen requests, additional evidence links,
  and escalation events append-only and bound to one exact resolution version and policy version.
- Let citizens submit outcomes and ratings separately from reopening. A confirmed resolved outcome
  advances to `resolved`; an adverse outcome remains auditable but does not silently reopen.
- Let the complaint owner reopen only through a policy-authorized, idempotent database operation.
  PostgreSQL derives `reopened` or `escalated`, appends status history and the data-minimized outbox
  event atomically, and never trusts a client-selected status or threshold.
- Record new government resolution completion time on the server and retain full captured
  completion-location provenance plus an optional existing work-reference link. Original complaint
  evidence is the before record; explicitly linked resolution evidence is the after record.
- Expose only explicitly eligible private evidence to the complaint owner through short-lived,
  server-created signed URLs after a fresh ownership check. Do not add public Storage policies or
  durable object URLs.

## Alternatives Considered

### Hardcode one V1 reopen window and rating scale

Rejected because the required values have not been approved, would become inconsistent across
clients, and could incorrectly activate a product policy merely to unblock engineering.

### Let the API enforce workflow policy without database checks

Rejected because service credentials bypass ordinary row policies, concurrent retries could race,
and the established complaint workflow already treats PostgreSQL as the atomic authorization and
history boundary.

### Make resolution evidence public or copy it into a public bucket

Rejected because complaint and resolution evidence remain private. Public derivatives and public
complaint visibility require the separate Phase 8 privacy and moderation decision.

### Automatically reopen every adverse feedback outcome

Rejected because the roadmap defines feedback and reopening as distinct actions and does not
approve automatic state changes for adverse feedback.

## Consequences

- Resolution feedback, reopening, and escalation remain consistent under concurrency and retries.
- Every accepted action retains the exact resolution and policy version used for the decision.
- Clients remain generic and render the policy context returned by the server.
- Phase 7 engineering can be verified with rollback-isolated synthetic policies without activating
  an unapproved live policy.
- A managed environment cannot accept feedback or reopening until an approved policy version is
  deliberately published.
- Private evidence access requires a trusted API round trip and short-lived signed URL.
- Historical Phase 5 resolutions without captured completion location remain valid history and are
  not backfilled with invented coordinates.

## Implementation Notes

- Use additive forward-fix migrations; do not edit Phase 5 or Phase 6 migrations.
- Preserve exact-replay identities using hashed idempotency keys and request fingerprints.
- Enforce complaint ownership, latest resolution, workflow version, policy applicability, policy
  window, attempt count, evidence readiness, and evidence non-reuse inside one transaction.
- Keep feedback comments, ratings, exact completion/evidence coordinates, object paths, hashes, and
  signed tokens out of notification payloads and structured logs. Logs may retain bounded actor,
  complaint, action, and evidence identifiers for correlation with the durable database audit.
- Reuse Phase 6 status-history outbox materialization for resolution, reopen, and escalation.
- Redis, BullMQ, Redis adapters/caching, and Sentry remain excluded by ADR-0007.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/adr/0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md`
- `docs/adr/0013-use-database-enforced-government-complaint-workflows.md`
- `docs/adr/0014-use-postgresql-leased-outbox-delivery-for-v1-notifications.md`
- `docs/KNOWN_ISSUES.md`
