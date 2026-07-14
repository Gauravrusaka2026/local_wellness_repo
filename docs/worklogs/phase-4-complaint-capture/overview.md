# Phase 4 Complaint Capture Worklog

## Objective

Implement a secure mobile citizen workflow for drafting, evidencing, checking, routing, submitting,
and tracking a civic complaint. Exact location, private descriptions, original media, duplicate
evidence, and official routing decisions must remain server-controlled and private.

## Delivered Engineering

- private, forced-RLS complaint persistence with resumable drafts, append-only location evidence,
  media intents, submitted complaints, initial assignments, status history, duplicate checks, and
  submission replay records;
- private signed uploads for photo, video, and voice evidence, followed by server-side object size,
  MIME-type, and SHA-256 verification;
- PostGIS-backed jurisdiction, location-freshness, accuracy, spoof-risk, media-distance, and
  duplicate-candidate validation;
- authenticated NestJS draft, media, duplicate, submission, receipt, list, detail, and timeline
  endpoints with strict actor ownership and mass-assignment rejection;
- atomic complaint creation from a stored routed decision, including the initial assignment and
  immutable first status event;
- privacy-safe, advisory duplicate suggestions using the Phase 3 scoring engine, with no automatic
  merging;
- a mobile home and guided capture flow covering database-driven categories, current location,
  live photo/video, private voice recording, upload retry/resume, duplicate review, emergency
  acknowledgement, submission receipt, and owned complaint history;
- shared complaint contracts, validation, a platform-neutral authenticated API client, generated
  database types, and the exact same-origin citizen email callback correction.

## Current Outcome

### Engineering implemented and locally verified

The complaint schema, service-only RPC boundary, API orchestration, private Storage upload boundary,
mobile capture flow, and focused automated coverage are implemented. A clean local database reset,
database lint, all 557 pgTAP assertions, and all 86 API tests passed on 2026-07-14. The positive
database submission scenario uses rollback-isolated synthetic verified evidence; it does not
promote or depend on placeholder bootstrap records.

### Production data and environment validation pending

The repository intentionally exposes zero operational complaint categories because Pune geometry,
routing mappings, and duplicate policies are not verified. A real user therefore cannot complete a
production submission from the current bootstrap, although unsupported and unavailable states fail
safely. Hosted deployment, real-device capture, SMS, automatic transcription/moderation, and final
policy/copy approval also remain pending. No Phase 4 migration or data was applied to hosted
Supabase during this work.

## Explicit Exclusions

- placeholder or unverified categories, boundaries, routing rules, recipients, or policies in
  production routing;
- public complaint visibility, public original media, maps, government workflows, realtime, and
  notifications;
- automatic duplicate adjudication or merging;
- operational transcription or media-moderation providers;
- Redis, BullMQ, Redis adapters/caching, and Sentry.
