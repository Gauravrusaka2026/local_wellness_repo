# Testing

## Prior Passed Baseline

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

The one-page form follow-up adds pure-state coverage for trimmed/sorted saved details, the complete
visible blocker order, required-asset validation, duplicate acknowledgement, voice confirmation,
emergency acknowledgement, pending upload, offline state, and the fully ready path. Mobile lint,
strict TypeScript, all 17 test files, and the Android Expo export pass after the presentation
change. The export bundled 1,278 modules into `apps/mobile/dist/app`.

The added profile tests cover camera versus library dispatch, denied-permission/settings recovery,
the private upload boundary, verified civic-area label derivation, rejection of inaccurate or
ambiguous location results, and observe/enforce Phone MFA copy. No test persists an exact profile
coordinate.

## Current Community Coverage Added

Focused tests now cover recent/trending query construction, support/private-star response decoding,
withdrawn/unavailable engagement handling, safe empty/error states, and compact Community mode
behavior. API/shared/database companion tests cover the server and privacy boundary. The clean
43-migration reset and reviewed seeds passed all 1,542 assertions across 44 pgTAP plans; database
lint and generated-type/master-artifact checks passed. Mobile passed all 17 test files, lint, strict
type-check, and an Android Expo export, while the full repository test/build pipeline passed.

## Not Run or Not Claimed

- Physical Android/iOS Expo Go or development-build smoke.
- Real-device profile camera/library permission and current-area GPS smoke.
- Delivered hosted OTP/callback behavior against the current managed project.
- Managed/staging application of the new directory migration.
- A real positive Nearby result using reviewed official pilot geometry.
- A production-like complaint submission using reviewed categories/routes/assignments.
- Managed application of the engagement migration, public visibility policy/projections, and
  Local/Trending/Heat support/star smoke.
- OS/background push delivery; the required provider/project/credential/consent configuration does
  not exist.

## 2026-07-24 Mobile Polish Verification

- Focused location and Community-owner suites cover memory/last-known reuse, TTL expiry, explicit
  refresh, concurrent coalescing, one automatic permission prompt, explicit recovery, Auth cache
  invalidation, fresh 50-metre complaint evidence, newest-three owner selection, privacy
  separation, and unavailable public feeds.
- Governance-directory coverage validates exact ward plus municipality-wide office scope,
  rolling compatibility, strict optional-field decoding, safe phone/mail/source actions, stale
  response suppression, and exclusion of private routing/contact fields.
- Core localisation coverage verifies complete English/Marathi/Hindi key parity and persisted
  locale selection. The final localisation package passes all three catalogue/key/placeholder
  tests, strict type-check, lint, and build. Mobile passes all 156 tests, strict type-check, lint,
  and a fresh Android export of 1,305 modules.
- Static audits find no legacy React Native `elevation` or shadow properties in mobile source and
  no visible Local Wellness copy. The remaining `localwellness` value is the internal Expo URI
  scheme retained for deep-link compatibility.
- Database plan 055 covers function grants, office eligibility, scope, source provenance, null
  omission, result bounds, private-table separation, and the partial office index.
- A clean local reset applied all 55 migrations and reviewed seeds. All 51 pgTAP plans passed 1,655
  assertions; application-schema lint returned no errors; generated database types, the
  55-migration master/adaptive artifacts, and the current-session bundle passed drift checks.
- Shared validation passed 61/61 tests and the API passed 235/235 tests; both also passed strict
  type-check and lint, and the API production build passed.
