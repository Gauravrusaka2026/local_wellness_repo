# Phase 6 Testing

## Coverage Added

- pgTAP plans `024_communication_notification_schema_and_acl.test.sql` and
  `025_communication_notification_integration.test.sql` cover schema/index/constraint invariants,
  forced RLS and direct ACL denial, private room creation, authorization, idempotent messages,
  monotonic read receipts, outbox sources, recipient materialization, channel state, leases,
  retries, delivery attempts, current recipient selection, and public-comment denial.
- Shared validation tests cover strict message, cursor, notification, room, typing, and Socket.IO
  acknowledgement contracts.
- API/controller and Supabase-adapter tests cover authenticated private/no-store routes, validation,
  response decoding, and safe database-error mapping.
- Realtime-server tests cover token/room behavior, persistence-before-broadcast, unauthorized joins,
  typing isolation, event limits, delivery claims, completion, retry, and readiness.
- Worker tests cover configuration bounds, claims, materialization, retry/dead outcomes, failure
  recording, and safe batch behavior.
- Mobile and government-dashboard tests cover REST-backed conversation/notification behavior,
  lifecycle-safe refresh, strict payload decoding, read state, and realtime-driven reconciliation.

## Verification Status

The following checks completed successfully on 2026-07-14:

- a clean local Supabase reset applied all 25 migrations and reviewed seeds;
- all 967 assertions passed across 25 pgTAP plans;
- strict lint of the application-owned `complaints`, `governance`, `private`, `public`, and
  `routing` schemas reported no errors; broad extension lint continued to report only installed
  PostGIS-owned diagnostics;
- generated database types were regenerated after the reset;
- frozen workspace installation completed with the lockfile current;
- Prettier, ESLint, root TypeScript project references, and all workspace type-check tasks passed;
- all 28 workspace test tasks and seven root safety test files passed;
- all 16 workspace builds passed, including the Expo Android export;
- Expo SDK dependency alignment, development Compose validation, and the production dependency
  audit passed; the audit reported no known vulnerabilities.

Focused Phase 6 coverage passed for communication validation, API/controller/store boundaries,
worker configuration and lease/retry/dead behavior, authenticated room authorization,
persistence-before-broadcast, stale authorization removal, delivery-pump state, mobile REST/
realtime reconciliation, and government-dashboard conversation behavior.

Hosted Socket.IO connectivity, offline/reconnect behavior on a physical device, revoked-session
behavior, multi-tab browser behavior, and real notification-provider delivery also remain
environment-dependent validation.
