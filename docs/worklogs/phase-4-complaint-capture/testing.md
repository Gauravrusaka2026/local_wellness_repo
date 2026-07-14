# Phase 4 Complaint Capture Testing

## Coverage Added

### Database

The four new pgTAP plans cover:

- schema shape, indexes, private buckets, forced RLS, grants, and service-only RPCs;
- anonymous/authenticated direct-access denial, append-only evidence/history, and cross-user scope;
- rollback-isolated synthetic PostGIS location verification, media finalization, routed submission,
  atomic assignment/history, and exact idempotent replay;
- malformed, stale, inaccurate, mocked, unsupported, placeholder, emergency, duplicate-policy,
  acknowledgement, and media/routing-evidence rejection paths.

### Contracts, API, and Mobile

- strict complaint input validation and mass-assignment rejection;
- authenticated draft/media/duplicate/submission/history endpoint behavior;
- raw-key hashing, exact replay, conflicting lifecycle handling, runtime RPC decoding, opaque
  pagination cursors, and privacy-safe output composition;
- upload reservation/finalization integrity and mismatched-object removal;
- capture reducer/readiness, location risk and distance, resume allow-list, idempotency formatting,
  upload-intent construction, and strict mobile response decoding.

## Observed Local Results — 2026-07-14

- clean Supabase reset passed and applied both Phase 4 migrations after every earlier migration,
  then loaded the existing Phase 2 and Phase 3 seeds;
- database lint across `public`, `governance`, `routing`, and `complaints` reported no schema errors;
- all 557 pgTAP assertions passed across 15 plans; the four Phase 4 plans contribute 107 assertions
  (`37 + 24 + 29 + 17`);
- all 86 API tests passed, including 14 complaint HTTP contract cases and the Supabase complaint
  adapter/idempotency coverage;
- the mobile test command passed all three discovered test files, including complaint capture and
  complaint decoder suites;
- the API-client test file passed, and the Phase 4 complaint validation test file passed when run
  directly;
- the exact citizen email callback helper test and citizen-web type generation/type-check passed.

## Validation Not Yet Performed

- a real-device Expo development-build run for camera, microphone, foreground GPS, SecureStore,
  SQLite resume, direct signed upload, and deep-link return;
- a true valid citizen submission against verified Pune categories, boundaries, duplicate policy,
  and routing evidence (the current operational category list is correctly empty);
- hosted Supabase migration/RLS/Storage smoke, hosted email/SSR-cookie behavior, and real SMS;
- provider-backed transcription, media moderation/processing, thumbnail publication, retention
  cleanup, or public media behavior;
- full end-of-session repository formatting, lint, type-check, build, dependency audit, and runtime
  device smoke were not claimed by this worklog until their final orchestration run is recorded.
