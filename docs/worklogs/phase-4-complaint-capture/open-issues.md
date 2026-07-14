# Phase 4 Complaint Capture Open Issues

## Engineering Implemented vs Operational Submission Pending

The private complaint model, API orchestration, duplicate integration, idempotent routing/submission,
and mobile capture flow are implemented. A production complaint must still fail closed because no
verified operational Pune category, polygon, route, or duplicate policy is available. Synthetic
positive tests are transactionally rolled back and never activate bootstrap placeholders.

## Verified Pune Pilot Evidence

Acquire and review the selected Pune Municipal Corporation/local-body and ward polygons, official
identifiers, operational category ownership, authority-department and durable role mappings,
current assignments where available, asset ownership for asset-dependent categories, confidence
policy, direct/fallback rules, and duplicate policy. Until then, zero categories in the mobile flow
is the required safe result.

## Hosted Environment and Credentials

Owner action remains required to rotate and audit the previously exposed Supabase/database
credentials before hosted integration. Apply migrations and validate RLS/Storage first in managed
development, then staging. No Phase 4 migration, seed, or media was uploaded to hosted Supabase.
Real SMS delivery still requires a configured Indian SMS provider.

## Device Validation

Run a physical-device development build covering camera, 15-second video, microphone, foreground
location accuracy and mock indication, denied permissions, image/file APIs, private signed upload,
network interruption/retry, SQLite/SecureStore restoration, and Expo/email deep links. A physical
device must use a reachable LAN/tunnel API URL rather than `localhost`.

## Providers and Processing

- Select and integrate approved transcription and media-moderation/processing providers before
  describing those capabilities as operational.
- Upload/process the generated video thumbnail and define derivative retention/publication rules in
  the appropriate later phase.
- Implement durable expiry cleanup for abandoned media intents and local pending files without
  introducing Redis or BullMQ.

## Product and Policy Review

Obtain approval for category-specific capture thresholds, media counts/durations/sizes, acceptable
location age/accuracy/distance, spoof-review behavior, privacy consent, retention, emergency wording,
duplicate acknowledgement, and any future public visibility. The current private/fail-closed
defaults are engineering safeguards, not final legal or operational approval.

## Remaining Client Gaps

- Asset-dependent categories need a verified, database-driven asset selection workflow.
- Automatic voice transcription and normalized-description confirmation are unavailable; citizens
  must type and explicitly confirm the description.
- Offline resume is implemented, but background upload/synchronization is not; network operations
  require the app to be active and online.
- Gallery media is intentionally disabled pending an approved evidence policy; the implemented
  path captures live evidence only.
