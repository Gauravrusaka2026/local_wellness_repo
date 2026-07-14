# Phase 5 Testing

The final clean local database run applied all migrations and seeds through Phase 5. The focused
government-workflow integration plan passed 94 assertions, and the complete database suite passed
846 assertions across 23 plans. Database lint exited successfully; its remaining diagnostics are
owned by the installed PostGIS extension rather than project functions.

Required coverage includes migration/ACL/RLS, current-scope isolation, assignment versioning,
transition rejection, idempotent replay/conflict, action/history/audit/outbox atomicity, private
resolution evidence, strict API contracts, and accessible dashboard rendering.

Additional security coverage includes:

- `private, no-store` government-workspace responses;
- pre-download workflow-version, status, expiry, and declared-metadata rejection;
- completed-finalization idempotency replay without a second Storage download;
- the 20 active-unlinked evidence cap and expired reservation replay denial;
- retained linked evidence with `availableForResolution: false`;
- multiple-dependency waiting behavior until the final dependency resolves;
- binary signatures for all eight accepted MIME variants, spoofed metadata, unsupported bytes,
  removal on integrity mismatch, and forced-download signed reads;
- structured evidence-access logging without private locator data.

The focused Storage gateway suite passed 12 tests covering eight accepted signatures, spoofed MIME,
unsupported bytes, an attacker-sized ISO-BMFF brand list, and forced-download signed reads. The API
suite passed all 121 tests, the government dashboard passed all 17 tests, shared validation passed
31 tests across five suites, and the complete workspace/root test command passed with no failures.

Repository formatting, ESLint, strict TypeScript checks, all 16 workspace production builds,
database-type drift, governance-artifact drift, Docker Compose validation, the Expo SDK 54
dependency check/Android export, and the production dependency audit all passed. The dependency
audit reported no known vulnerabilities. Three provider-dependent Auth cases in the generic root
test command were skipped because that command does not start local Supabase; database/Auth-specific
verification remains isolated from hosted projects by the loopback guard.
