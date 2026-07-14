# Phase 4 Complaint Capture Implementation

## Status

The current session's local engineering slice is implemented. Production Pune submission remains
blocked by verified data and environment inputs rather than being enabled with bootstrap
placeholders.

## Database Migrations

### `20260714100000_phase_4_complaint_capture.sql`

- adds category-specific location-verification requirements;
- creates `complaint_drafts`, append-only `complaint_location_evidence`, `complaint_media`, submitted
  `complaints`, initial `complaint_assignments`, append-only `complaint_status_history`,
  `complaint_submission_requests`, and append-only duplicate run/match tables;
- adds foreign keys, lifecycle/check constraints, UTC timestamps, spatial and common-path indexes,
  immutable routing/location bindings, private visibility, and complaint-number sequencing.

### `20260714101000_phase_4_complaint_security_and_rpc.sql`

- creates four private Storage buckets: complaint originals, voice recordings, thumbnails, and
  resolution evidence, without a public upload/read policy;
- enables and forces RLS, removes direct client/service-role table access, and grants only narrow
  service-role RPC execution;
- adds owner-scoped draft CRUD, append-only location validation, media reservation/finalization,
  duplicate candidate/recording, submission claim/replay, routing-decision replay, atomic submit,
  and owned complaint list/detail/timeline functions;
- validates active verified non-placeholder categories and routes, PostGIS jurisdiction/media
  distance, media readiness/count, duplicate acknowledgements, emergency acknowledgement, and
  exact routing evidence before complaint creation.

Committed database types now include `public`, `governance`, `routing`, and `complaints` schemas.

## Shared Packages and API

- `@local-wellness/types` defines private-by-default draft, location, media, duplicate, receipt,
  history, and timeline contracts.
- `@local-wellness/validation` strictly rejects malformed UUIDs/timestamps/digests, media
  kind/source mismatches, unsafe pagination/idempotency values, and client-owned official fields.
- `@local-wellness/api-client` provides injected fetch/token boundaries, safe envelope decoding,
  abort support, and `Idempotency-Key` propagation without depending on a browser or React Native.
- The NestJS complaint module implements draft create/read/update/discard, duplicate check, media
  upload-intent/finalize/status, idempotent submit, receipt/list/detail, and timeline paths.
- Supabase adapters strictly decode every RPC row. The media gateway creates signed uploads and
  verifies the stored object before the database can finalize it. CORS permits the explicit
  `Idempotency-Key` header.

## Mobile Application

- Signed-in citizens land on a home screen with report, resume, complaint-history, profile, and
  emergency guidance.
- The guided flow selects only operational categories returned by the database, captures a typed
  description and current location, records live photo/video/voice evidence, compresses photos,
  constrains recordings, computes SHA-256, uploads privately, and supports an interrupted upload
  retry from minimal SQLite state.
- Duplicate suggestions, final review, emergency acknowledgement, server-owned routing, submission
  receipt, owned complaint list, complaint detail, and status timeline are represented.
- Voice evidence requires the citizen to type and confirm the description because automatic
  transcription is not configured. Video thumbnails are generated locally, but derivative upload/
  processing and moderation providers are not operational.
- Categories requiring asset selection remain blocked in the client until a verified asset-picker
  workflow is implemented. Gallery selection is not enabled; the current evidence path is live
  capture only.

## Authentication Follow-up Included

The citizen email magic-link request now uses the exact queryless, same-origin `/auth/callback`
URL rather than adding an allow-list-sensitive `next` query parameter. Unit/type checks passed for
the URL helper; a fresh delivered-link and hosted cookie/deep-link smoke remains environment work.
