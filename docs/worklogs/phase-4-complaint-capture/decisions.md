# Phase 4 Complaint Capture Decisions

## Architectural Decision

ADR-0011 selects server-orchestrated complaint submission and private, signed direct media uploads.
ADR-0009 continues to make database evidence and a deterministic evaluator authoritative for
routing. ADR-0007 continues to exclude Redis, BullMQ, and Sentry from V1.

## Privacy and Access Boundary

- Complaint state lives in an unexposed `complaints` schema. All nine tables have RLS enabled and
  forced, while anonymous, authenticated, and service roles receive no direct schema/table access.
- Narrow `public` RPCs are executable only by the service role and revalidate the authenticated
  actor identifier, record ownership, lifecycle, and evidence relationships.
- Every Phase 4 complaint is private. Exact coordinates, descriptions, original media, hashes,
  signed tokens, spoof signals, and internal duplicate/routing evidence are not public contracts.
- Clients cannot choose a complaint number, official status, authority, ward, department, officer
  role or assignment, routing rule, visibility, bucket, or object path.

## Media Boundary

- The API reserves an opaque user/draft/media object path before returning a transient signed-upload
  token. Originals and voice files use private buckets; Phase 4 creates no public media bucket.
- Finalization succeeds only after the API inspects the stored object and verifies its size,
  content type, and SHA-256 digest against both the reservation and client finalization evidence.
- Signed-upload tokens are transient. Mobile resume storage retains no bearer token or signed token.
- Processing and moderation states are modeled, but provider-backed processing, moderation, public
  derivatives, and retention cleanup are not implied by successful upload finalization.

## Location, Routing, and Submission

- The database derives location verification from category requirements and eligible PostGIS
  jurisdiction evidence. Mock, stale, inaccurate, ambiguous, and unsupported evidence cannot be
  silently treated as verified.
- Mobile performs an additional conservative preflight for freshness, mock-location indication,
  and accuracy. Final acceptance remains the database decision; pilot thresholds still require
  product and data review.
- Submission binds the actor-owned draft to the exact stored routed decision and location/category/
  asset evidence. Complaint, initial assignment, status history, terminal draft transition, and
  stored response commit atomically.
- A distinct `Idempotency-Key` is hashed with a canonical request fingerprint. Exact retries replay
  stored results; conflicting key reuse fails closed. Request correlation IDs are not used as
  idempotency keys.

## Duplicate Semantics

- PostgreSQL supplies capped, policy-scoped candidate evidence and PostGIS distance; the Phase 3
  pure engine produces deterministic scores.
- Results are advisory and privacy-safe: complaint reference, category, coarse distance, status,
  timestamp, and aggregate score only. Every shown suggestion must be acknowledged before a
  separate complaint is submitted, but no record is merged automatically.

## Mobile Resume Boundary

SQLite stores only the owner ID, server draft/media identifiers, workflow step, non-secret
idempotency keys, local file reference, declared metadata, and checksum. Media-capture location is
kept separately in device-only SecureStore for an interrupted upload. Offline state can be resumed,
but network operations do not run in the background and require connectivity.
