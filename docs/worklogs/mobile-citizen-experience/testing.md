# Testing

## Passed Locally

- Mobile: all 17 test files, ESLint, strict TypeScript, and Expo public-config validation.
- API: 210 tests, strict TypeScript, and build.
- Shared validation: all ten test files and strict TypeScript/build.
- Database: clean application of 42 migrations; 1,513 assertions across 43 pgTAP plans;
  application-schema lint passed.
- Generated artifacts: committed database-type drift and 42-migration master-SQL drift checks
  passed.

Focused coverage includes explicit OTP mode behavior, generic auth feedback, Supabase project
alignment, native loopback rejection, dashboard aggregation, complaint category metadata/draft
attributes, full-versus-operational category catalog comparison, malformed/duplicate catalog
failure, unavailable-category disabling, resumed-draft rejection, governance request/response
decoding, bearer authentication, low accuracy, unsupported and ambiguous matches, official-source
and placeholder exclusion, private-field rejection, RPC grants, safe dependency failures,
permanent-location settings state, and submission-key rotation.
No-route coverage also verifies `COMPLAINT_ROUTE_UNAVAILABLE` remains distinct from a generic
dependency outage.

The added profile tests cover camera versus library dispatch, denied-permission/settings recovery,
the private upload boundary, verified civic-area label derivation, rejection of inaccurate or
ambiguous location results, and observe/enforce Phone MFA copy. No test persists an exact profile
coordinate.

## Not Run or Not Claimed

- Physical Android/iOS Expo Go or development-build smoke.
- Real-device profile camera/library permission and current-area GPS smoke.
- Delivered hosted OTP/callback behavior against the current managed project.
- Managed/staging application of the new directory migration.
- A real positive Nearby result using reviewed official pilot geometry.
- A production-like complaint submission using reviewed categories/routes/assignments.
- OS/background push delivery; the required provider/project/credential/consent configuration does
  not exist.
