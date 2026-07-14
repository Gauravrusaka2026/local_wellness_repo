# CHANGELOG.md

## 2026-07-11 — Phase 0 Project Foundation

### Summary

Implemented and verified the complete user-authorized Phase 0 monorepo foundation without adding product features, APIs, database behavior, authentication, or business logic.

### Feature

- Added pnpm workspaces, Turborepo, strict TypeScript project references, ESLint, Prettier, Husky, lint-staged, and Changesets.
- Initialized Expo mobile, three Next.js web applications, a controller-free NestJS API, a handler-free Socket.IO server, and a behavior-free workers process.
- Initialized all nine documented shared packages.
- Added Supabase directory placeholders, Docker configuration, Terraform and monitoring placeholders, and GitHub Actions.
- Added workspace structure tests and deterministic dependency locking.
- Added explicit dependency build-script controls and patched vulnerable transitive dependencies through narrow overrides.
- Removed live-looking credentials from the previously ignored `.env.example` and replaced them with safe placeholders.

### Files Modified

- Root tooling and workspace configuration.
- `apps/**`
- `packages/**`
- `.github/workflows/ci.yml`
- `infrastructure/**`
- `supabase/**`
- `tests/**`
- `docs/TASKS.md`
- `docs/PROGRESS.md`
- `docs/CHANGELOG.md`
- `docs/DECISIONS.md`
- `docs/KNOWN_ISSUES.md`
- `docs/adr/**`
- `docs/worklogs/phase-0-foundation/**`

### Migrations Created

None. Database schema and Supabase logic were explicitly outside Phase 0.

### Tests Added

- Workspace structure coverage for all documented applications, packages, and platform directories.

### Documentation Updated

- Execution tracker, progress, changelog, implementation decisions, known issues, five ADRs, and the Phase 0 worklog.
- `README.md` was updated only to replace stale pre-monorepo setup and status text with the verified Phase 0 workflow.
- `PROJECT_OVERVIEW.md`, `PLAN.md`, and architecture documents were not changed because product scope, roadmap, and architecture did not change.

### Security

- Removed credentials from `.env.example`; owner rotation remains mandatory.
- Current working source and available Git object history scans found no matching credential patterns.
- Full dependency audit reported no known vulnerabilities after reviewed overrides.

### Breaking Changes

None. This is the first executable project foundation.

## 2026-07-13 — Phase 1 Identity and Access

### Summary

Implemented and locally verified the complete Phase 1 identity and scoped-access exit criteria with Supabase Auth, database-enforced authorization, secure client sessions, audited device registration, and invitation-only government access. Redis, BullMQ, and Sentry remain explicitly deferred beyond V1.

### Feature

- Added passwordless phone/email citizen clients, PKCE and token-hash callbacks, Expo SecureStore sessions, SSR cookie sessions, profile/language setup, and safe sign-out auditing.
- Added `profiles`, `devices`, `roles`, `user_roles`, `authority_memberships`, and `auth_audit_events` with forced RLS, safe column privileges, indexes, expiry rules, immutable audit attribution, and generated types.
- Added atomic service-only government invitation and device register/revoke functions with audit persistence, failure rollback, idempotent revocation, blocked/revoked re-registration protection, and retained lifecycle provenance.
- Added the first-platform-admin bootstrap command and current-state role/membership authorization without trusting client metadata.
- Added versioned NestJS profile, device, access-scope, client-audit, and government-invitation endpoints with bearer verification, exact CORS, request IDs, stable envelopes, and safe errors.
- Added effective-scope government/admin interfaces, a custom delivered invite template, and exact authentication-route proxy boundaries.
- Consolidated identity contracts in `packages/types`, added Zod validation including an exact lowercase SHA-256 device digest, and added current/legacy Supabase environment-key selection.
- Removed Redis from active Compose/environment configuration and added security tests preventing Redis, BullMQ, Sentry, or server Supabase credentials from entering V1 client/topology boundaries.

### Files Modified

- Identity applications and tests under `apps/mobile`, `apps/citizen-web`, `apps/government-dashboard`, `apps/admin-console`, and `apps/api`.
- Shared contracts under `packages/types`, `packages/validation`, `packages/config`, and `packages/database`.
- Local Supabase configuration, invitation template, migrations, pgTAP plans, and generated database types under `supabase/`.
- Environment, CI, Compose, bootstrap, lockfile, root security/Auth tests, and Next.js project-reference configuration.
- All Phase 1-relevant architecture, authentication, API, database, deployment, setup, ADR, worklog, and tracking documents.

### Migrations Created

- `20260713100000_phase_1_identity_and_access.sql`
- `20260713130000_restrict_device_sensitive_column_access.sql`
- `20260713150000_atomic_device_lifecycle_and_access_provenance.sql`

### Tests Added

- 154 pgTAP assertions for schema/privilege invariants, RLS isolation, expiry/revocation, former-member PII, escalation denial, atomic device/audit lifecycle, and rollback behavior.
- 27 NestJS service/HTTP contract tests.
- 23 mobile/web client authentication, callback, scope, proxy, and sign-out tests.
- Shared configuration and identity-validation tests, including exact device-digest enforcement.
- Local email magic-link and delivered government-invite E2E with authenticated membership/role readback; the phone case is provider-gated.
- Repository security-boundary tests for client secrets, deferred dependencies, and the invite template.

### Documentation Updated

- `README.md`, `PROJECT_OVERVIEW.md`, `PLAN.md`, and every required document under `docs/`.
- ADR-0006 records Supabase Auth and database-enforced access control.
- ADR-0007 records the owner-directed V1 deferral of Redis, BullMQ, and Sentry.
- Added the complete Phase 1 worklog and refreshed TASKS, PROGRESS, DECISIONS, and KNOWN_ISSUES.

### Verification

- Formatting, peer checks, lint across 16 workspaces, all workspace/root TypeScript checks, 65 focused application/package/repository tests, all 154 pgTAP assertions, generated database types, current-key Auth E2E, all 16 workspace builds, Expo Android export, three Next.js builds, and Compose validation passed.
- The aggregate test command encountered the execution sandbox's local-listen restriction in the API HTTP contract file; all 27 API cases passed in the permitted focused runner.
- The production advisory audit was attempted but the sandbox could not resolve the npm registry; the online audit remains mandatory in CI.

### Security

- Secret/service-role keys remain server-only and are covered by a source-boundary test.
- Raw installation identifiers remain in device SecureStore; the API requires a SHA-256 client digest, rehashes it, and stores only the server-side hash.
- Direct authenticated role, membership, audit, and device lifecycle escalation paths are denied.
- Hosted credential rotation, provider activation, MFA, device-session binding, lifecycle expansion, quotas, and hosted/real-device smoke tests remain explicitly tracked.

### Breaking Changes

None. Phase 1 adds new identity APIs and database structures to the Phase 0 foundation.

## 2026-07-13 — Phase 1 Commit Readiness Follow-up

### Summary

Made the pre-commit workflow portable to shells that have Corepack but no global `pnpm` shim, and completed the previously network-blocked production dependency audit.

### Feature

- Changed `.husky/pre-commit` to invoke the repository-pinned pnpm through Corepack.
- Prevented intentionally ignored generated/ambient declaration files from producing false-positive lint-staged warnings while retaining zero tolerance for real ESLint warnings.
- Preserved the existing lint-staged validation without bypassing Git hooks.

### Files Modified

- `.husky/pre-commit`
- `lint-staged.config.mjs`
- `docs/TASKS.md`
- `docs/PROGRESS.md`
- `docs/CHANGELOG.md`
- `docs/DECISIONS.md`
- `docs/worklogs/phase-1-identity-access/testing.md`

### Migrations Created

None.

### Tests Added

None. The existing staged-file checks were executed through the corrected hook.

### Documentation Updated

Updated the execution tracker, progress summary, implementation conventions, changelog, and Phase 1 test record with the final commit-readiness results.

### Verification

- Frozen installation passed across all 17 workspace projects.
- `pnpm audit --prod` reported no known vulnerabilities.
- The corrected pre-commit hook resolved pnpm 11.11.0 through Corepack and completed lint-staged successfully without ignored-file warning failures.

### Breaking Changes

None.

## 2026-07-13 — Phase 2 Maharashtra Governance Engineering Baseline

### Summary

Recovered the interrupted Phase 2 session and completed the locally safe Maharashtra governance engineering baseline. The implementation preserves the canonical source bytes, normalizes only defensible records, quarantines placeholders, enforces governance and access integrity in PostgreSQL, and leaves the real pilot-coordinate exit criterion open until verified external geometry is available.

### Feature

- Added an unexposed, forced-RLS `governance` schema with 22 normalized provenance, hierarchy, organization, personnel, service, boundary and routing-reference tables.
- Enabled PostGIS and `btree_gist`; added versioned SRID 4326 `MultiPolygon` boundaries, spatial indexing, coordinate-envelope checks, temporal exclusions and a service-only evidence-returning `ST_Covers` resolver.
- Added canonical authority ownership for Phase 1 access records, safe legacy-placeholder preservation, immutable scope keys, parent-type/cycle enforcement and service-only effective-access RPCs that filter inactive, placeholder and invalid scopes.
- Implemented a manifest-pinned CSV validator/importer for exact files, hashes, titles, headers, widths, malformed/incomplete/duplicate rows, placeholder sentinels, dates, HTTPS sources and cross-file parents.
- Added deterministic stable IDs, raw row provenance, normalization dispositions, a machine-readable report, an idempotent generated baseline seed and a separate checksum companion without changing the canonical CSV or workbook bytes.
- Safely normalized the supplied structural/catalog baseline while creating zero officer people, assignments, administrative units or boundary versions from templates and leaving all routing references unresolved and non-routable.
- Regenerated database types for `public` and `governance`, added atomic generation/drift checking and added application-owned schema lint to CI.
- Started the three web applications and verified public/auth routes and protected redirects over HTTP. Rendered viewport inspection remains environment-gated because the in-app browser was unavailable.

### Files Modified

- Governance sources and manifest under `resources/governance/`.
- Governance types, validation and import pipeline under `packages/types`, `packages/validation` and `packages/database`.
- Phase 2 migrations, generated seeds, generated database types and pgTAP plans under `supabase/`.
- Canonical effective-access persistence boundary and tests under `apps/api`.
- Root scripts, CI, lock/workspace configuration and canonical governance-resource tests.
- ADR-0008, governance documentation, Phase 2 worklog and all required tracking documents.

### Migrations Created

- `20260713160000_phase_2_governance_schema.sql`
- `20260713161000_phase_2_governance_security.sql`
- `20260713162000_phase_2_identity_authority_forward_fix.sql`
- `20260713163000_phase_2_jurisdiction_resolution.sql`
- `20260713164000_phase_2_governance_integrity_forward_fix.sql`
- `20260713165000_enforce_authority_parent_types.sql`
- `20260713166000_harden_governance_access_and_geometry.sql`

### Seeds Created

- `20_phase_2_governance.generated.sql`
- `21_phase_2_governance_checksum.generated.sql`

### Tests Added

- 194 Phase 2 pgTAP assertions across governance schema/migration, seed/provenance, RLS/effective access, PostGIS resolution and temporal/version-history plans; all 348 repository database assertions pass.
- 12 governance import pipeline cases and 4 governance validation helper cases.
- Three canonical governance resource/hash/companion-seed contract cases.
- API persistence-boundary coverage proving roles and memberships are loaded through the canonical service-only RPCs.

### Documentation Updated

- `README.md`, `PLAN.md` and every Phase 2-relevant architecture, database, authentication, API, deployment and Supabase setup document.
- Added ADR-0008, `docs/governance-data.md` and the Phase 2 implementation/testing worklog.
- Reconciled TASKS, PROGRESS, DECISIONS and KNOWN_ISSUES with delivered work and unresolved external data/tooling gaps.

### Verification

- Frozen install, deterministic governance artifact check, formatting, lint, TypeScript checks, aggregate tests, all 16 workspace builds, Expo Android export, three Next.js builds, Compose validation and production dependency audit passed.
- Clean Supabase reset, application-schema database lint, all 348 pgTAP assertions and generated database type drift checks passed.
- Local email magic-link and government invitation E2E passed; the SMS case remains correctly provider-gated.
- The three Next.js surfaces started and their public/auth routes and authorization redirects passed runtime HTTP checks.

### Security

- Governance remains outside the Supabase Data API with forced RLS and no authenticated mutation surface.
- Placeholder officers, contacts, authorities, wards and unresolved routing references are not presented as verified operational data.
- Service-only access functions reject inactive or placeholder authorities and invalid ward/department ownership.
- Redis, BullMQ and Sentry were not introduced.

### Breaking Changes

None. Additive forward migrations preserve prior access history; invalid or placeholder legacy scopes are retained for remediation but excluded from effective access.

## 2026-07-13 — Citizen Email Callback Diagnostic

### Summary

Manually exercised local citizen email sign-in and confirmed that Mailpit delivery succeeds but the generated magic link falls back to the landing page because its query-bearing callback is not an exact Supabase allow-list match.

### Feature

- Recorded `AUTH-006` as a blocking citizen browser-sign-in defect.
- Documented that the static landing page does not exchange the PKCE authorization code and that `localhost`/`127.0.0.1` fallback differences can also separate the flow from its host-scoped verifier.
- Added the minimal same-origin callback fix and delivered-link/SSR-cookie regression coverage to the execution backlog.

### Files Modified

- `docs/TASKS.md`
- `docs/PROGRESS.md`
- `docs/CHANGELOG.md`
- `docs/KNOWN_ISSUES.md`

### Migrations Created

None.

### Tests Added

None. This diagnostic recorded the failing manual browser path for the next implementation task.

### Documentation Updated

Updated the execution backlog, progress blockers, changelog, and known-issue register with the observed callback failure and required regression coverage.

### Breaking Changes

None.

## 2026-07-13 — Phase 3 Data-Driven Routing Engineering

### Summary

Implemented and locally verified the generic Phase 3 routing engine, PostGIS/database boundary,
authenticated routing APIs, duplicate-detection framework, and review-gated governance
synchronization foundation. The implementation remains deliberately non-operational with the
current bootstrap: every pilot category is unverified and non-routable, and no Pune-specific logic
or placeholder production route was introduced.

### Feature

- Added versioned routing taxonomy, aliases, assets, ownership, confidence policies, direct and
  fallback rules, duplicate policies, and append-only routing decision evidence in a private,
  forced-RLS schema.
- Added accuracy-aware PostGIS jurisdiction and candidate resolution using complete governance
  hierarchy, exact boundary versions, asset ownership, department, durable role, optional current
  assignment, and deterministic fallback evidence.
- Added strict shared contracts, request validation, deterministic confidence/ranking/ambiguity
  logic, citizen-safe explanations, and configurable duplicate scoring.
- Added authenticated category, jurisdiction, and route-resolution APIs with narrow service-only
  RPCs, runtime response decoding, coordinate-free structured logging, and duplicate-safe audit
  recording.
- Added governance synchronization contracts and persistence for official sources, retrieval runs,
  immutable raw snapshots, normalized candidates, matching, change sets, review events, and
  explicit publication gates. Network retrieval, scheduling, review UI, and transactional
  publishers remain tracked operational work.
- Seeded the 12 approved pilot category labels as deterministic draft, unverified, non-routable
  engineering records. No municipality, ward, department, officer, assignment, ownership, policy,
  or route was hardcoded.
- Added a fail-closed Auth E2E guard and regression so `REQUIRE_LOCAL_SUPABASE=true` refuses hosted
  API URLs before creating fixtures.

### Files Modified

- Routing contracts and validation under `packages/types` and `packages/validation`.
- Routing engine, GIS/data-provider abstractions, confidence, fallback, eligibility, ambiguity, and
  duplicate scoring under `packages/routing-engine`.
- Governance synchronization lifecycle and publication eligibility under `packages/database`.
- Routing controllers, services, Supabase repository boundary, exception mapping, and API tests
  under `apps/api`.
- Phase 3 migrations, seed, database types, and pgTAP plans under `supabase/`.
- Auth E2E harness and local-target safety regression under `tests/`.
- Phase 3 ADRs, worklog, governance synchronization guide, architecture/database/API/authentication/
  deployment/Supabase documentation, and all required tracking documents.

### Migrations Created

- `20260713200000_phase_3_routing_schema.sql`
- `20260713201000_governance_synchronization_foundation.sql`
- `20260713202000_phase_3_routing_security_and_rpc.sql`

### Seeds Created

- `30_phase_3_pilot_categories.sql`

### Tests Added and Verification

- Added routing-engine unit coverage, governance synchronization lifecycle/publication coverage,
  API/controller/store coverage, and three Phase 3 pgTAP plans.
- Clean local Supabase reset and database lint passed; all 450 pgTAP assertions passed across 11
  plans, including 102 Phase 3 assertions. Generated `public`, `governance`, and `routing` types are
  drift-clean.
- Focused suites passed 28 of 28 routing-engine tests, 28 of 28 database-package tests, and 59 of 59
  API tests, including 14 of 14 routing API cases. All 25 Turbo test tasks and all five root test
  files passed.
- Governance validation passed over 19 source files with 0 errors, 2,343 explicit warnings, 789
  operational/reference records, and 98 quarantined records. Canonical CSV and workbook bytes were
  unchanged.
- Frozen install, formatting, all 16 workspace lint/type-check/build tasks, Compose validation,
  production dependency audit, local Auth E2E, and authenticated routing HTTP smoke passed.
- Rendered viewport inspection remains an environment follow-up because no in-app browser target
  was connected; Phase 3 adds no routing UI.

### Documentation Updated

- Updated `README.md`, `PLAN.md`, `PROJECT_OVERVIEW.md`, and the architecture, database,
  authentication, API, deployment, governance-data, Supabase setup, tracking, and Phase 3 worklog
  documents.
- Added ADR-0009 for database-evidence deterministic routing, ADR-0010 for review-gated governance
  synchronization, and `docs/governance-synchronization.md`.

### Data and Hosted Environment Status

- Engineering is complete; verified Pune pilot geometry, official identifiers, ownership and
  recipient mappings, current assignments, operational confidence/rule versions, and complete
  fallback paths remain data-validation work.
- No Phase 3 migration, seed, governance, or routing data was applied to hosted Supabase. During
  verification, a mis-targeted Auth E2E briefly created disposable hosted Auth users; its `finally`
  cleanup removed them. The new loopback guard prevents that local-test configuration mistake from
  recurring.
- Redis, BullMQ, Redis adapters/caching, and Sentry were not introduced.

### Breaking Changes

None. All database changes are additive, and current bootstrap data remains non-routable.

## 2026-07-14 — Phase 4 Complaint Capture and Governance Synchronization Retrieval

### Summary

Implemented the local Phase 4 citizen complaint-capture path and the first operational engineering
slice of the permanent governance synchronization subsystem. Complaint submission remains gated by
verified routing evidence. Governance retrieval remains inactive until source-specific parsers,
review/publication, security hardening, environment secrets, and Cron deployment are complete.

### Feature

- Added private, forced-RLS complaint drafts, exact-location evidence, media reservations,
  submitted complaints, initial assignments, status history, duplicate evidence, and replay-safe
  routing/submission persistence.
- Added authenticated complaint draft/media/duplicate/submission/receipt/history APIs and an Expo
  citizen workflow for live photo/video/voice evidence, GPS validation, private signed uploads,
  retry/resume, duplicate review, emergency acknowledgement, receipt, and owned history.
- Fixed citizen email callback construction and account rendering: OTP completion now performs a
  reliable full-page transition, while `/account` validates profile responses and shows explicit
  signed-in identity, onboarding, provisioning, API-error, and profile-complete states.
- Extended governance synchronization with PostgreSQL due-source claims, short leases, bounded
  retry/freshness state, HTTP 304 reuse, append-only audit/evidence, and service-only lifecycle RPCs.
  Each dispatch claims one source; Edge leases are heartbeat-protected and expired work backs off
  without immediate reclamation.
- Added deterministic SHA-256 source contracts. Activation requires exact current-hash approval by
  an active global platform administrator and rejects unsupported MIME contracts, fragments, and
  non-443 remote endpoints.
- Added a dispatch-secret-protected Edge fetcher with exact HTTPS host allowlists, manual redirects,
  time/size/MIME bounds, private content-addressed snapshot Storage, conditional requests, and safe
  structured logging. Snapshot finalization validates exact Storage size/MIME metadata, referenced
  objects are immutable, and failed or ambiguous finalization retains content-addressed bytes for
  grace-period reconciliation instead of risking an eager-delete race with a late commit.
- Made the required source-contract hash safe for populated upgrades by adding it nullable,
  deterministically backfilling existing endpoints through the trigger, and then applying
  `NOT NULL`; added a root migration-safety regression.
- Added durable contact channels and immutable effective-dated contact versions with source/manual
  verification, visibility, publication review, and separate complaint-delivery approval. Each
  publication consumes one review and binds its owner UUID, value, URL, evidence hash, and delivery
  decision.
- Added a pure contact normalizer and registered ten official PMC/BMC endpoints only as draft,
  unverified, inactive source definitions. No source data is automatically verified, published,
  routable, or approved for complaint delivery.
- Added a generic service-only, forced-RLS synchronization-scope registry with immutable canonical
  hierarchy, global-platform-admin review-gated activation, and routing eligibility independently
  gated by the referenced entity. Seeded five Pune and five Brihanmumbai ward targets only as draft,
  unverified, unapproved, placeholder-backed, and non-routable engineering scope.
- Aligned mobile dependencies with Expo SDK 54.0.33, React Native 0.81.5, React 19.1, compatible SDK
  54 modules, and TypeScript 5.9.3 so the current Android Expo Go SDK 54 client can load the app.

### Files Modified

- Complaint contracts, validation, API client, NestJS modules/adapters, mobile capture workflow, and
  citizen-web authentication/account behavior under `packages/` and `apps/`.
- Complaint and governance synchronization migrations, draft-only source seed, Edge Function,
  private Storage configuration, database tests, and regenerated database types under `supabase/`.
- Governance synchronization lifecycle/contact normalization and tests under
  `packages/database/src/governance-sync/`.
- ADR-0011, ADR-0012, complaint/governance worklogs, architecture/database/API/authentication/
  deployment/Supabase documentation, and all required project trackers.

### Migrations Created

- `20260714100000_phase_4_complaint_capture.sql`
- `20260714101000_phase_4_complaint_security_and_rpc.sql`
- `20260714110000_governance_sync_scheduling_and_contacts.sql`
- `20260714111000_governance_sync_service_rpc.sql`
- `20260714112000_governance_sync_scope.sql`

### Seeds Created

- `40_governance_sync_pilot_sources.sql` — four PMC and six BMC endpoint definitions, all draft,
  unverified, and inactive.
- `41_governance_sync_pilot_wards.sql` — five Pune and five Brihanmumbai canonical ward selections,
  all draft, unverified, unapproved, placeholder-backed, and non-routable.

### Tests Added and Verification

- Added four Phase 4 complaint pgTAP plans and three governance synchronization pgTAP plans. A clean
  local reset applied all migrations/seeds, and all 657 assertions passed across 18 plans; plans
  016–018 contribute 100 assertions (`44 + 26 + 30`).
- Added eleven Edge fetch/helper tests and nine contact-normalizer tests; all passed, along with all
  three database-package test files and the root migration-safety regression. The populated upgrade
  fixture backfilled its existing source endpoint with a 64-character contract SHA-256.
- Added citizen account/profile regression coverage plus complaint API, adapter, validation,
  API-client, mobile capture/resume, and callback coverage. The API suite passed 86 tests, and the
  Expo Android export completed.
- `expo install --check`, mobile strict type-check, and the SDK 54 Android export passed (1,202
  modules).
- Database lint reported only diagnostics owned by the installed PostGIS extension. Canonical CSV
  and workbook bytes were unchanged.

### Documentation Updated

- Updated `README.md`, `PROJECT_OVERVIEW.md`, `PLAN.md`, all required tracking documents, and the
  applicable architecture, database, API, authentication, deployment, and Supabase setup guides.
- Added ADR-0012 and `docs/worklogs/governance-synchronization/`; retained the ADR-0010 human-review
  gate and ADR-0007 exclusion of Redis, BullMQ, and Sentry.

### Hosted Environment and Data Status

- No new migration, seed, source activation, raw snapshot, contact, routing, complaint, or media
  data was applied to hosted Supabase.
- All ten pilot source endpoints remain inactive. Source-specific PMC/BMC parsers, matching,
  review API/UI, transactional publishers, Cron/secrets, DNS-resolution hardening, orphan snapshot
  grace-period reconciliation after ambiguous finalization, and record-specific verification remain
  pending.
- All ten pilot ward scope targets remain inactive and non-routable. Their canonical wards are
  placeholders without verified geometry; `BRIH-W01`–`BRIH-W05` must be reconciled to BMC's official
  lettered ward structure before any production scope activation.
- Verified Pune geometry and complete reviewed routing evidence are still required before a real
  complaint can be routed or submitted.

### Breaking Changes

None. Database changes are additive, prior versions remain queryable, and unverified data continues
to fail closed.
