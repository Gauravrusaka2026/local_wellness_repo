# ADR-0011: Use Server-Orchestrated Complaint Submission and Private Signed Media Uploads

## Status

Accepted

## Date

2026-07-14

## Context

Phase 4 introduces citizen drafts, precise location evidence, original photo/video/audio media,
duplicate suggestions, routing, and complaint creation. Clients need resumable direct uploads, but
they must not choose official recipients, publish original media, create an official status, or
turn placeholder routing data into an assignment. Submission retries must not create duplicate
complaints or recompute configuration-sensitive routing evidence.

The governance and routing schemas are already private and service-mediated. Complaint evidence is
at least as sensitive: it contains citizen ownership, exact coordinates, private descriptions,
device/location risk signals, and original media. Public complaint visibility and generalized map
data belong to Phase 8, not the capture phase.

## Decision

Use a server-orchestrated complaint workflow with private, signed direct uploads:

- Store drafts, complaints, exact location evidence, media metadata, status history, assignments,
  duplicate checks, and submission-idempotency evidence in an unexposed, forced-RLS `complaints`
  schema.
- Expose no complaint table directly through PostgREST. Authenticated clients use the NestJS API;
  narrow service-role database functions revalidate actor ownership and lifecycle state.
- Keep every Phase 4 complaint private. Public descriptions, generalized coordinates, processed
  media, moderation, and public visibility are separate reviewed Phase 8 decisions.
- Create a media-intent database row before issuing a short-lived Supabase signed upload token. The
  API chooses the private bucket and opaque object path. A client cannot choose another citizen's
  path or upload directly through a broad Storage policy.
- Upload original media directly to private Supabase Storage with the signed token. Finalization
  verifies the expected object, media type, bounded size, and checksum before media becomes ready
  for submission. Signed tokens and server credentials are never persisted in local SQLite.
- Require a current eligible category, validated location/media evidence, and a stored `routed`
  decision before creating a complaint. The client cannot supply authority, ward, department,
  officer role, officer assignment, routing rule, status, or complaint number.
- Create the complaint, immutable submitted location evidence, initial assignment, and initial
  status-history event in one transaction. Status history and submitted routing/location evidence
  are append-only.
- Use a distinct validated `Idempotency-Key` and request fingerprint. An exact retry returns the
  stored complaint/receipt; reuse with a different payload fails. Request correlation IDs remain
  observational and are not idempotency keys.
- Treat duplicate results as advisory suggestions. Return only a sanitized complaint reference,
  category, approximate distance/age, public-safe status, and aggregate score. Never expose another
  citizen's identity, exact location, private description, media hash, original media, or internal
  factor graph, and never merge automatically.
- Mobile SQLite may retain only the minimum resumable workflow state: server draft/media IDs,
  non-secret local file references, checksums, and upload progress. Bearer tokens, signed-upload
  tokens, exact route evidence, and server secrets are prohibited.
- Do not add Redis, BullMQ, Redis adapters/caching, or Sentry.

## Alternatives Considered

### Let clients write complaint tables through ordinary RLS

Rejected because complaint creation combines routing, immutable history, assignment, media
readiness, and idempotency invariants that must commit as one server-validated operation. RLS
remains defense in depth but is not a substitute for this workflow.

### Proxy original media through the NestJS API

Rejected because large uploads would consume API memory, bandwidth, and request time. Short-lived,
path-scoped signed uploads preserve the private boundary without making the API a media relay.

### Allow authenticated users to upload anywhere in a private bucket

Rejected because a broad object policy would permit path confusion, abandoned untracked objects,
and cross-draft misuse. The server must allocate the path after creating the media intent.

### Publish complaint media immediately after submission

Rejected because originals may contain faces, number plates, homes, or embedded location metadata.
Only a later moderation/processing and public-visibility phase may create public derivatives.

### Use request IDs as idempotency keys

Rejected because request IDs are correlation metadata and may change on transport retry. A distinct
key and stored response are required for safe replay.

## Consequences

- Complaint submission is auditable, replay-safe, and cannot be mass-assigned by a client.
- Original media and exact locations remain private even if a future complaint becomes public.
- The API and database functions are more involved because they coordinate draft, media, routing,
  history, assignment, and replay state.
- Abandoned media intents require a later retention cleanup job; Phase 4 records expiry and state so
  cleanup can be implemented without Redis or BullMQ.
- Real local submission remains blocked until verified pilot categories, boundaries, and routing
  evidence are activated. Engineering tests use rolled-back synthetic verified fixtures.
- Automatic transcription, media moderation, and public derivative generation remain provider or
  later-phase capabilities rather than being implied by upload completion.

## Implementation Notes

- Use server-generated UUID object paths scoped by user, draft, and media ID; never use original
  filenames as authorization identifiers.
- Use lowercase SHA-256 digests and store MIME type, byte size, capture source/time, optional capture
  coordinate, processing state, and moderation state in the media row.
- Validate category media counts and typed requirements again inside the submission transaction.
- Use PostGIS for duplicate-distance filtering and media-to-complaint distance checks.
- Keep object buckets private and test cross-user database and Storage denial.
- Log IDs, outcome, and request correlation only; never log exact coordinates, descriptions,
  signed URLs/tokens, media hashes, or original object paths.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/authentication.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0009-use-database-evidence-for-deterministic-routing.md`
