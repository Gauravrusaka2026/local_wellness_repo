# Testing

## Passed Locally

- Mobile: all 12 test files, ESLint, strict TypeScript, and Expo SDK 54 Android export.
- API: 161 tests, strict TypeScript, and build.
- Shared validation: all nine test files and strict TypeScript/build.
- Database: clean application of 30 migrations; 1,085 assertions across 28 pgTAP plans;
  application-schema lint passed.
- Generated artifacts: committed database-type drift and 30-migration master-SQL drift checks
  passed.

Focused coverage includes explicit OTP mode behavior, generic auth feedback, Supabase project
alignment, native loopback rejection, dashboard aggregation, complaint category metadata/draft
attributes, governance request/response decoding, bearer authentication, low accuracy, unsupported
and ambiguous matches, official-source and placeholder exclusion, private-field rejection, RPC
grants, safe dependency failures, permanent-location settings state, and submission-key rotation.
No-route coverage also verifies `COMPLAINT_ROUTE_UNAVAILABLE` remains distinct from a generic
dependency outage.

## Not Run or Not Claimed

- Physical Android/iOS Expo Go or development-build smoke.
- Delivered hosted OTP/callback behavior against the current managed project.
- Managed/staging application of the new directory migration.
- A real positive Nearby result using reviewed official pilot geometry.
- A production-like complaint submission using reviewed categories/routes/assignments.
- OS/background push delivery; the required provider/project/credential/consent configuration does
  not exist.
