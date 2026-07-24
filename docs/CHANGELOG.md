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

## 2026-07-14 — Known-Issue Closure and Phase 5 Government Dashboard

### Summary

Closed the locally reproducible citizen-authentication, profile provisioning, routing-validation,
nearby-asset, Expo SDK, and dependency-layout issues, then implemented Phase 5 government complaint
operations. Engineering is complete locally with synthetic verified fixtures; production-like use
remains gated on verified pilot governance/routing data and managed-environment activation.

### Feature

- Added an idempotent Auth-profile/citizen-role backfill and code-only local citizen email OTP
  templates without modifying existing privileged, revoked, or scoped assignments.
- Added service-only routing-configuration conflict reporting, authenticated data-driven nearby
  asset discovery, strict mobile profile decoding, and a verified-location gate in complaint capture.
- Added private forced-RLS government workflow tables, explicit capability/transition rules,
  append-and-close assignment versions, inspections, work records, dependencies, resolution
  versions/evidence, atomic action/audit/idempotency records, and a transactional notification outbox.
- Added authenticated government complaint queue/detail/action APIs and an accessible scoped
  dashboard with filters, pagination, routing/assignment context, internal operations, dependency
  handling, resolution evidence, and privacy-safe textual location context.
- Hardened resolution evidence with pre-download workflow/expiry checks, bounded binary signature,
  size/SHA-256/MIME verification, terminal failure handling, assignment isolation, reservation caps,
  forced-download reads, and immutable linked-evidence history.
- Preserved fail-closed data policy: placeholder/unverified officers, contacts, wards, assets, and
  routes cannot become active or routable automatically. Redis, BullMQ, and Sentry remain absent.

### Files Modified

- Identity, routing, government workflow, Storage evidence, API tests, and Supabase adapters under
  `apps/api`, plus citizen web/mobile authentication, profile, asset, and location behavior.
- Government queue/detail/action UI and tests under `apps/government-dashboard`.
- Shared government complaint/routing/governance contracts and validation under `packages/`.
- Additive migrations, pgTAP plans, local OTP templates, generated database types, CI/workspace and
  Docker development configuration under `supabase/`, `.github/`, and `infrastructure/`.
- ADR-0013, the Phase 5 worklog, required architecture/database/API/authentication/deployment/setup
  documentation, and all project trackers.

### Migrations Created

- `20260714120000_backfill_auth_profiles.sql`
- `20260714121000_routing_configuration_validation.sql`
- `20260714122000_routing_asset_discovery.sql`
- `20260714123000_phase_5_government_workflow_schema.sql`
- `20260714124000_phase_5_government_workflow_security_and_rpc.sql`

### Tests Added and Verification

- Added pgTAP plans 019–023 for profile backfill, routing configuration, asset discovery, workflow
  schema/ACL, and government workflow integration. A clean reset passed all 846 assertions across
  23 plans; focused plan 023 passed 94/94.
- The API suite passed 121 tests, government dashboard 17 tests, shared validation 31 tests across
  five suites, and the complete workspace/root test command passed with no failures.
- Formatting, ESLint, strict TypeScript checks, all 16 workspace builds, database/governance drift
  checks, Docker Compose validation, Expo SDK 54 alignment/Android export, and the production
  dependency audit passed. No known production dependency vulnerabilities were reported.

### Documentation Updated

- Added ADR-0013 and `docs/worklogs/phase-5-government-dashboard/`.
- Updated `README.md`, all required trackers, and the architecture, database, API, authentication,
  deployment, and Supabase setup guides. `PLAN.md` and `PROJECT_OVERVIEW.md` remain unchanged because
  the roadmap and product scope did not change.

### Hosted Environment and Data Status

- No migration, seed, source activation, workflow record, complaint, or media object from this
  session was applied to hosted Supabase.
- Managed Auth templates/providers, credential rotation, an authenticated hosted dashboard smoke,
  and verified Pune/BMC geometry, contacts, assignments, assets, and routing records remain external
  activation work. Canonical CSV/workbook bytes were not changed.

### Breaking Changes

None. Changes are additive; stale or unverified recipients fail closed, and prior history remains
queryable.

## 2026-07-14 — Staging Activation and Demo Access Provisioning

### Summary

Activated the existing schema and reviewed non-production bootstrap in the dedicated staging
Supabase project, provisioned the first audited demo access scopes, aligned privileged sign-in with
the code-only OTP template, and recorded the official BMC/Pune ward-model selections without
promoting placeholder routing data.

### Feature

- Confirmed the hosted target is staging and its privileged/database credentials are newly
  generated replacements stored outside source control.
- Used the IPv4-compatible Supavisor session pool after the direct database hostname proved
  IPv6-only in the development environment; completed a migration/seed dry run before deployment.
- Applied all 23 existing migrations through `20260714124000` and six reviewed non-production seed
  files to the previously empty staging database.
- Verified 23 migration-ledger rows, the canonical Pune authority/local body, 12 categories with
  zero operational rows, and 11 synchronization source definitions with zero active rows.
- Confirmed the existing citizen's application profile/citizen role, bootstrapped the first global
  platform administrator through its audited RPC, and invited one Pune-scoped `municipal_admin`
  through Supabase Auth plus the guarded invitation persistence RPC. Environment identifiers and
  emails were not committed.
- Added explicit code verification to government and platform-administrator email sign-in so the
  clients match the shared code-only OTP template while preserving the token-hash invitation flow.
- Selected BMC administrative wards A–E and Pune's officially current numeric wards 1–5 as pilot
  models. Existing bootstrap/scope rows remain placeholder audit history pending official identity,
  effective-date, provenance, and geometry review.

### Files Modified

- Government-dashboard and admin-console authentication UI/services/tests.
- `README.md` and governance, architecture, database, authentication, deployment, Supabase setup,
  worklog, task, progress, decision, changelog, and known-issue documentation.

### Migrations Created

None. This session deployed the existing reviewed migration set unchanged.

### Tests and Verification

- Supabase migration/seed dry run and deployment completed against the confirmed staging target.
- Post-deploy read-only database checks verified migration, seed, fail-closed routing/source, and
  demo access invariants.
- Administrator and government-dashboard authentication tests, ESLint, strict type-checking, and
  production builds passed. Focused Prettier, canonical-governance artifact drift, secret-diff, and
  repository diff checks also passed.

### Security and Data Status

- No credential, OTP, invitation token, demo email, user UUID, or database connection string was
  committed.
- No source, ward, category, route, officer assignment, complaint, snapshot, media object, Edge
  Function, Cron job, hosted application, or production environment was activated or deployed.
- Historical credential audit/legacy-token cleanup remains tracked; Redis, BullMQ, and Sentry remain
  excluded.

### Breaking Changes

None.

## 2026-07-14 — Staging Demo Identity Reconciliation

### Summary

Confirmed the citizen account and accepted government invitation, then reconciled the two staging
privileged roles from temporary Gmail aliases onto the owner's existing confirmed Auth identities.

### Environment Change

- Preserved the original citizen as an active confirmed profile with only the global citizen role.
- Granted one existing confirmed identity the global `platform_admin` role through the audited
  bootstrap boundary after retiring the temporary administrator assignment.
- Granted one existing confirmed identity an active Pune Municipal Corporation membership and
  authority-scoped `municipal_admin` role through the guarded persistence boundary.
- Revoked, rather than deleted, the temporary administrator role, municipal role, and authority
  membership with actor, revocation time, and effective-period history retained.
- Verified exactly one active global platform administrator and one active Pune municipal
  administrator after commit.

### Files Modified

- Updated the task, progress, decision, known-issue, deployment, Supabase setup, and changelog
  records. No demo email, Auth UUID, token, or credential was committed.

### Migrations and Tests

- No migration, seed, application source, canonical governance data, or ADR was added.
- The staging change ran in one rollback-safe operator transaction. Post-commit Auth/profile/role/
  membership queries verified confirmation, active profiles, intended scopes, revoked temporary
  history, and singleton active privileged-role counts.

### Remaining Work

- Delivered OTP, SSR session, effective-scope, admin-console, and government-dashboard browser
  smoke tests remain open.
- The one-time environment correction does not implement the general existing-user grant/revoke/
  renew lifecycle tracked by `AUTH-001`.

### Breaking Changes

None. The change affects staging-only environment data and preserves prior access history.

## 2026-07-14 — Phase 6 Private Realtime Communication and Durable Notifications

### Summary

Implemented the Phase 6 engineering boundary for private complaint conversations, durable in-app
notifications, PostgreSQL-leased outbox processing, and authenticated single-instance realtime
delivery. Realtime remains an enhancement over persisted REST history; no placeholder governance
or routing record was activated.

### Feature

- Added forced-RLS private conversation rooms, immutable idempotent messages, monotonic read
  receipts, durable notifications/read state, channel-delivery state, append-only attempts, and
  leased materialization/realtime queues.
- Extended complaint submission, workflow, assignment, status, and private-message events through
  the existing source-bound transaction outbox with data-minimized metadata.
- Added service-only current-access/message/notification/outbox/realtime RPCs with database
  reauthorization, bounded leases, five-attempt retry/dead state, and uniqueness-based replay.
- Added authenticated NestJS message/notification routes, a bounded notification worker, and a
  Supabase-JWT-authenticated Socket.IO server with database-authorized user/complaint/authority/
  ward/department rooms, persistence-before-broadcast, stable envelopes, and readiness/liveness.
- Added mobile private conversations and durable notification history/read state plus a government
  dashboard conversation panel. Clients reconcile authenticated REST data after realtime hints.
- Kept push/email explicitly unsupported, public comments non-creatable/non-readable, and V1
  realtime single-instance. Redis, BullMQ, Redis adapters/caching, and Sentry remain absent.

### Files Modified

- Communication/notification migrations and pgTAP plans under `supabase/`.
- API communication module/store/tests, realtime server, notification worker, shared type/
  validation/database packages, mobile client, and government dashboard.
- `.env.example`, development Compose, workspace manifests/lockfile, README, ADR-0014, Phase 6
  worklog, technical guides, and required project trackers.

### Migrations Created

- `20260714130000_phase_6_communication_and_notification_schema.sql`
- `20260714131000_phase_6_communication_notification_security_and_rpc.sql`

### Tests and Verification

- Added pgTAP plans 024–025 plus shared-contract, API/controller/store, worker, realtime, mobile,
  and dashboard coverage.
- A clean reset applied all 25 migrations and reviewed seeds; all 967 assertions passed across 25
  pgTAP plans. Strict application-schema lint reported no errors, and generated types are current.
- Frozen install, formatting, lint, strict type-checking, 28 workspace test tasks, seven root safety
  test files, all 16 workspace builds, Compose validation, Expo checks/Android export, and the
  production dependency audit passed. The audit reported no known vulnerabilities.

### Documentation Updated

- Updated `README.md`, architecture, database, API, authentication, deployment, Supabase setup,
  tasks, progress, decisions, known issues, and the Phase 6 worklog.
- Added ADR-0014 for PostgreSQL-leased V1 notification delivery. `PLAN.md` and
  `PROJECT_OVERVIEW.md` remain unchanged because product scope and roadmap order did not change.

### Security and Operational Status

- Persistent events commit before broadcast; current database scope is rechecked, direct table
  access remains denied, and external payload/log metadata excludes identities, message bodies,
  contacts, exact coordinates, media paths, tokens, and lease capabilities.
- The two Phase 6 migrations and processes were not deployed to managed staging in this session.
  Provider selection, managed/physical-device validation, verified pilot data, and public-comment
  policy remain separate gates.

### Breaking Changes

None. The changes are additive and fail closed when access, routing, recipient, or provider evidence
is unavailable.

## 2026-07-16 — Phase 7 Resolution Accountability, Feedback, and Reopening

### Summary

Implemented the Phase 7 private accountability loop for evidence-backed government completion,
citizen outcome feedback, policy-controlled reopening, and repeated-attempt escalation. The system
remains data-driven and deliberately unavailable when no approved operational policy applies.

### Feature

- Added captured resolution completion time/location provenance, optional current-assignment work
  reference, explicit before/after/reopen evidence roles, effective-dated policy, immutable feedback,
  citizen replay/audit, private follow-up evidence, reopen requests, and escalation history.
- Added service-only, forced-RLS database functions for policy/context resolution, evidence lifecycle
  and access, feedback confirmation, reopening, bounded expired-reservation cleanup, and scoped
  government accountability. Workflow history and Phase 6 notification events commit atomically.
- Added strict authenticated citizen and government API/store contracts with private signed evidence
  handling, exact replay, workflow concurrency, integrity/expiry checks, and safe error mapping.
- Added mobile evidence review, policy-rendered outcomes/four ratings, live follow-up capture,
  restart recovery, durable citizen receipts, and external/realtime refresh. Added government
  completion-location/work-reference input and access-scoped accountability history.
- Seeded no operational policy and changed no canonical governance data. Redis, BullMQ, Redis
  adapters/caching, and Sentry remain absent.

### Files Modified

- Phase 7 migrations and pgTAP plans under `supabase/`, plus regenerated database types.
- Shared resolution types/validation, API resolution module/store/tests, mobile complaint
  accountability, and government-dashboard complaint workflow/history.
- README, ADR-0015, Phase 7 worklog, architecture/database/API/authentication/deployment/Supabase
  guides, and required task/progress/decision/known-issue trackers.

### Migrations Created

- `20260716100000_phase_7_accountability_schema.sql`
- `20260716101000_phase_7_accountability_security_and_rpc.sql`

### Tests and Verification

- Added pgTAP plans 026–027. A clean reset passed and all 1,072 assertions across 27 plans passed;
  Phase 7 contributed 56 schema/ACL and 49 integration assertions.
- Generated database types and their drift check passed. Database lint exited successfully with
  only pre-existing installed PostGIS diagnostics in broad output.
- All 144 API tests, 45 shared-validation tests, 7 mobile test files, 22 government-dashboard tests,
  28 workspace test tasks, repository lint/type-check, root safety tests, application builds, and
  Android Expo export passed.

### Documentation Updated

- Updated `README.md`, architecture, database, API, authentication, deployment, Supabase setup,
  tasks, progress, decisions, known issues, and the Phase 7 worklog.
- Added ADR-0015 for database-enforced resolution accountability. `PLAN.md` and
  `PROJECT_OVERVIEW.md` remain unchanged because scope and roadmap order did not change.

### Security and Operational Status

- Direct table access remains denied under forced RLS; service functions recheck citizen ownership
  or current government scope and use pinned empty search paths. Buckets remain private.
- Feedback text, ratings, coordinates, media locators, hashes, tokens, and completion notes remain
  excluded from notifications and citizen/public contracts where applicable.
- No managed environment, active policy, public media, placeholder routing/governance record, or
  provider process was activated. Operational policy approval and managed/device smoke testing
  remain explicit gates; government follow-up evidence review/current-reference UX is tracked as
  `RESOLUTION-002`.

### Breaking Changes

None. The migrations and API surfaces are additive; new government resolution submissions require
captured completion location and valid finalized after evidence before entering citizen verification.

## 2026-07-16 — Single-file Supabase Master Migration

### Summary

Added a deterministic single SQL artifact for bootstrapping the complete Local Wellness schema in an
empty Supabase database without replacing the immutable incremental migration history.

### Feature

- Generated `supabase/master.sql` from all 29 ordered migrations through Phase 8.
- Preserved a transaction boundary around each source migration and recorded exact source SHA-256
  digests in the generated header.
- Added `database:master:generate` and `database:master:check` commands for reproducible updates and
  drift detection. Seed data remains separate.

### Files Modified

- Added the master SQL artifact and its Node.js generator.
- Updated the root package scripts, README, database guide, Supabase setup guide, task tracker,
  progress tracker, and changelog.

### Migrations Created

None. The master file is a generated clean-bootstrap artifact and intentionally remains outside
`supabase/migrations/`.

### Tests and Verification

- Verified the committed master file is byte-for-byte reproducible from the ordered migration
  sources and that its 29 manifest hashes match those source files.

### Security and Operational Status

- Existing RLS, grants, private schemas, Storage policies, functions, and triggers are preserved
  exactly from the source migrations. No seed, credential, managed database, or production state was
  changed.

### Breaking Changes

None. Existing environments continue to use incremental migrations.

## 2026-07-16 — Modern Mobile Citizen Experience and Verified Governance Directory

### Summary

Completed the local engineering slice for a modern Expo citizen experience and added a narrow,
authenticated, verified-only governing-body lookup. The application remains data-driven and keeps
complaint submission/Nearby results unavailable when staging lacks reviewed operational routing or
official boundary evidence.

### Feature

- Added a five-destination mobile shell for Home, Complaints, Report, Nearby, and More, with grouped
  profile/language/notification/transparency/help/logout actions and stable existing deep links.
- Added explicit passwordless sign-in, create-account, and account-recovery modes. Sign-in/recovery
  cannot silently create an account and all request feedback remains non-enumerating.
- Added a refreshable owned-complaint dashboard, filtered/paginated history cards, modern empty/error
  states, and navigation into existing detail, message, timeline, accountability, and transparency
  surfaces.
- Reloaded the Home dashboard on route focus and pull-to-refresh, linked permanent camera/
  microphone/location denial to OS settings, delayed derived-media preparation until location
  succeeds, and prevented one completed voice recording URI from being processed twice.
- Preserved database-defined category required attributes, photo/video minimum/maximum counts, and
  recommended media kinds through routing/category responses, complaint drafts, strict validation,
  Supabase adapters, mobile decoding, dynamic fields, readiness, and submission.
- Added an authenticated Nearby screen using Expo Location and an API-owned, service-role-only
  PostGIS projection. It returns only official-source verified entity names/types/dates/source URLs,
  exposes no UUID/contact/geometry/private fields, and reports low-accuracy, unsupported, or
  ambiguous results without hardcoded municipality fallbacks.
- Added mobile Supabase project-alignment and native-loopback diagnostics, removed the stale
  app-local environment override from Expo's load path, and retained the root environment as the
  local configuration source.
- Fixed submission retry identity so exact network retries remain stable while successful draft
  mutations and explicit no-route outcomes rotate stale routing replay keys. Added the distinct
  `COMPLAINT_ROUTE_UNAVAILABLE` API code so unrelated backend outages are no longer presented as
  routing-data failures.
- Kept OS push deliberately unconfigured. Durable in-app notifications and optional Socket.IO
  refresh remain implemented; `expo-notifications`, Expo/EAS/FCM/APNs credentials, and token
  registration were not introduced.

### Files Modified

- Updated the Expo auth, layout, home, complaint list/report, configuration, capture, and shared UI
  modules; added the menu, dashboard helpers, governance directory client/screen, and focused tests.
- Added governance-directory shared types/strict validation, NestJS module/controller/service/store
  boundaries, Supabase adapter, API/store tests, and application-module registration.
- Updated complaint/routing shared contracts and validators plus API/mobile adapters for category
  metadata and draft `customAttributes`.
- Regenerated committed database types and the deterministic 30-migration master SQL artifact.
- Updated README, architecture, API, authentication, database, deployment, Supabase setup, ADR,
  trackers, known issues, decisions, and the mobile implementation worklog.

### Migrations Created

- `20260716104000_verified_governing_body_projection.sql` — adds the narrow official-source,
  verified-only, service-role-executable PostGIS governing-body projection.

### Tests Added and Verification

- Added mobile OTP-mode, environment, dashboard-summary, and governance-service tests; API
  controller/store tests; strict governance-schema tests; and 13 pgTAP assertions in
  `028_verified_governing_body_projection.test.sql`.
- The mobile suite passed all 12 test files with lint, strict type-check, and an SDK 54 Android
  export. The API suite passed 161 tests and type-check/build; shared validation passed all nine test
  files.
- A clean local Supabase run applied all 30 migrations and passed 1,085 assertions across 28 plans;
  application-schema lint, database-type drift, and master-SQL drift checks passed.

### Documentation Updated

- Updated `README.md`, `docs/TASKS.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`,
  `docs/KNOWN_ISSUES.md`, `docs/architecture.md`, `docs/api.md`, `docs/authentication.md`,
  `docs/database.md`, `docs/deployment.md`, `docs/supabase-setup.md`, ADR-0017, and the mobile worklog.

### Security and Operational Status

- Mobile clients still receive only public credentials and bearer-authenticate to NestJS. Direct
  governance RPC execution remains denied to `anon`/`authenticated`, placeholder/unofficial source
  evidence remains excluded, and logs/errors do not disclose configured values or raw coordinates.
- The additive directory migration was not applied to staging, no official pilot geometry was
  activated, and no physical-device Expo Go smoke was claimed. Nearby and complaint submission may
  therefore remain safely unavailable in that environment.
- Redis, BullMQ, Redis adapters/caching, Sentry, OS push registration, hardcoded Pune/BMC routing,
  and automatic placeholder promotion remain absent.

### Breaking Changes

No endpoint or route was removed. Routing-category and complaint-draft response shapes gained
additive metadata; strict external clients that reject unknown fields must update their decoders.

## 2026-07-16 — Phase 8 Transparency, Phase 9 Accountability, and Default Auth Links

### Summary

Completed the locally safe engineering scope for Phase 8 and Phase 9, added reviewed public
transparency projections and organizational SLA/KPI accountability, and made passwordless clients
compatible with Supabase's managed default email links without weakening database authorization.
Operational data, policies, managed schedules, and public records remain deliberately inactive.

### Feature

- Added review-gated, effective-dated transparency policies and immutable sanitized complaint
  publications with PostgreSQL-derived generalized positions, withdrawal history, reviewed
  duplicate groups, and processed-derivative references that do not expose original media.
- Added bounded anonymous nearby, hotspot, ward-boundary, public-detail, and duplicate-group reads;
  strict NestJS/shared contracts; and accessible provider-neutral citizen web/mobile surfaces.
- Added versioned business calendars, SLA policies/category overrides, complaint bindings/clocks/
  deadlines/pauses, escalation rules/events/jobs, and reproducible municipality/ward/department KPI
  definitions/runs/snapshots under forced RLS and narrow service-only RPCs.
- Added atomic policy supersession, verified governance/category/role activation gates,
  transactional status/escalation/outbox changes, PostgreSQL lease/retry/dead handling, and no
  active operational targets or schedules.
- Added authenticated SLA/KPI APIs, strict adapters/contracts, two independent worker loops, a
  government complaint SLA panel, and an organizational KPI dashboard with authorized scope only
  and no individual-officer ranking.
- Replaced server-only web callback handlers with one-shot, credential-scrubbing client bridges for
  PKCE and reviewed token hashes. Only the government invitation callback accepts a complete
  provider-default fragment typed exactly `invite`; citizen, admin, and mobile reject raw fragment
  sessions. Code entry and citizen-create-only registration remain unchanged.
- Regenerated the committed database types and deterministic `supabase/master.sql` from all 34
  ordered migrations.

### Files Modified

- Phase 8/9 Supabase migrations and pgTAP plans under `supabase/migrations` and
  `supabase/tests/database`.
- Accountability, transparency, and governance-directory contracts/adapters/controllers under
  `packages/types`, `packages/validation`, `apps/api`, `apps/workers`, and the citizen/government
  clients.
- Passwordless callback/login modules and focused tests in citizen web, government dashboard, admin
  console, and mobile.
- Generated `packages/database/src/database.types.ts` and `supabase/master.sql`.
- Required technical guides, trackers, ADR-0018/0019, and Phase 8/9 worklogs.

### Migrations Created

- `20260716102000_phase_8_transparency_schema.sql`
- `20260716103000_phase_8_transparency_security_and_rpc.sql`
- `20260716104000_verified_governing_body_projection.sql`
- `20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql`
- `20260716106000_phase_8_duplicate_group_publication.sql`
- `20260716110000_phase_9_sla_escalation_kpi_schema.sql`
- `20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql`

### Tests and Verification

- A clean local reset applied all 34 migrations; all 1,275 assertions across 32 pgTAP plans passed.
  Phase 8 focused plans passed 45/45 and 46/46; Phase 9 focused plans passed 48/48 and 51/51.
- Application-schema database lint had no findings. Generated database types and the 34-migration
  master SQL passed drift checks.
- The API passed 173 tests and workers passed all seven test files; both passed strict type-check,
  lint, and build. Shared validation passed all ten test files.
- Citizen web passed three test files, admin console one, government dashboard 32 tests, and mobile
  12 test files. All passed strict type-check and lint; three Next.js production builds and the Expo
  Android export passed.

### Documentation Updated

- Updated `README.md`, architecture, authentication, API, database, deployment, Supabase setup,
  tasks, progress, decisions, known issues, Phase 8/9 worklogs, and ADR-0018/0019.
- `PLAN.md` and `PROJECT_OVERVIEW.md` were unchanged because phase order and product scope did not
  change.

### Security and Operational Status

- Private complaints, exact coordinates, identities, original media, internal notes, and unreviewed
  text remain outside public responses. Direct table access stays revoked and RLS remains forced.
- Authentication callbacks cannot assign application access. Government/admin requests keep
  `shouldCreateUser: false`; current profile, membership, role, scope, API, and RLS checks remain
  authoritative.
- The managed migration ledger was not changed or verified in this session. No transparency/SLA/KPI
  policy, public complaint, schedule, placeholder route, Redis, BullMQ, Redis adapter/cache, or
  Sentry integration was activated.

### Breaking Changes

The three Next.js `/auth/callback` implementations changed from route handlers to dynamic pages so
the browser can safely process provider-default callbacks. The public callback URL is unchanged.
No API endpoint was removed; new transparency and accountability contracts are additive.

## 2026-07-16 — Phase 10 Citizen Access, Routing Delivery, and Launch Hardening

### Summary

Implemented the locally safe Phase 10 citizen-access and launch-hardening slice: email/password
authentication with staged Phone MFA, private profile images, stricter issue-location evidence,
modern mobile locality views, PostgreSQL-backed API protections, operational health/runbooks, and
explicit complaint queue/contact delivery readiness. Managed provider/data activation remains
deliberately separate.

### Feature

- Replaced citizen passwordless entry on web/mobile with email/password signup/sign-in, generic
  password recovery, logout, and Supabase Phone MFA enrollment/challenge/verification behind
  matching `observe`/`enforce` modes.
- Added privileged TOTP enrollment/challenge and API AAL enforcement modes for government and
  administrator access without enabling lockout-prone managed enforcement prematurely.
- Added owner-private profile-photo upload, signed display, replacement, and removal on citizen
  web/mobile with bounded file size/type/magic-byte checks and no public avatar projection.
- Enforced a maximum 50 m current-location accuracy and media-to-issue distance at mobile, API, and
  PostgreSQL boundaries.
- Added modern reviewed-public locality Feed and provider-neutral aggregate Heatmap mobile views;
  exact coordinates, identity, private media, and unreviewed reports remain excluded.
- Added atomic PostgreSQL API quotas, endpoint-specific limits, security headers, liveness/
  readiness, graceful shutdown, bounded HTTP checks, secret scanning, monitoring signals, and V1
  operator runbooks without Redis or Sentry.
- Added routing-delivery readiness that proves database-driven authority/department/role/current-
  assignment resolution and distinguishes verified government queue placement from optional
  approved officer/governing-body contact readiness. Automatic outbound delivery remains false.

### Files Modified

- Citizen authentication, profile, transparency, and complaint-location modules in
  `apps/citizen-web`, `apps/mobile`, and their focused tests.
- Privileged authentication and MFA modules in `apps/government-dashboard`, `apps/admin-console`,
  and their tests.
- API health, quotas, MFA assurance, identity/profile, complaint, routing-delivery, configuration,
  exception, and Supabase adapter modules plus tests.
- Shared configuration/types/validation/routing contracts, generated database types,
  `supabase/master.sql`, CI/release scripts, monitoring guidance, and operator runbooks.
- Required product, architecture, database, API, authentication, deployment, setup, tracking,
  decision, issue, and ADR documentation.

### Migrations Created

- `20260716112000_phase_10_api_hardening.sql`
- `20260716113000_phase_10_privileged_mfa.sql`
- `20260716114000_phase_10_citizen_phone_mfa.sql`
- `20260716115000_phase_10_profile_images.sql`
- `20260716116000_phase_10_complaint_location_proximity.sql`
- `20260716117000_phase_10_routing_delivery_readiness.sql`

### Tests and Verification

- Added pgTAP plans 033–039 for quotas/readiness, privileged and citizen MFA, profile images,
  50 m location/media enforcement, and routing-delivery readiness.
- Focused routing/database verification passed 175 assertions; profile-image and location plans
  passed 31 and 15 assertions respectively. Routing API passed 17/17, government complaint API
  passed 11/11, and the government dashboard passed 46/46 tests.
- A clean local reset applied all 40 migrations and reviewed seeds; all 1,405 assertions across 39
  pgTAP plans passed after legacy complaint fixtures were aligned with the new 50 m guard.
- The aggregate application/package test command passed; the API passed 196 tests, mobile passed all
  15 test files, and the government dashboard passed 46/46 focused tests. All 16 workspaces passed
  lint, strict type-check, and production builds; the final Android Expo export bundled 1,275
  modules.
- Generated database types and the deterministic 40-migration master SQL passed drift checks;
  governance artifacts remained byte-current, application-schema database lint reported no errors,
  Expo dependency compatibility passed, Docker Compose validation passed, the tracked/full-local-
  history secret scan passed, and the production dependency audit found no known vulnerabilities.

### Documentation Updated

- Updated `README.md`, `PROJECT_OVERVIEW.md`, `PLAN.md`, `docs/TASKS.md`, `docs/PROGRESS.md`,
  `docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, and the architecture/authentication/API/database/
  deployment/Supabase setup guides.
- Added ADR-0020 through ADR-0023 and V1 operational runbooks.

### Security and Operational Status

- Passwords, OTPs, TOTP secrets, recovery material, bearer tokens, private object paths, exact
  public coordinates, and contact values are not logged or exposed in public/citizen responses.
- Phone MFA and privileged AAL enforcement default to observe mode until delivery/recovery and
  managed smoke pass. Placeholder/unverified governance and contacts remain non-routable.
- A live local API process passed liveness on 2026-07-16, but the configured managed project's
  readiness probe returned 503. Its 40-migration ledger must be reconciled before API-backed demo
  flows are considered available.
- Redis, BullMQ, Redis adapters/caching, Sentry, a homemade OTP store, external map tiles, and
  automatic outbound complaint delivery were not introduced.

### Breaking Changes

Citizen entry now uses email/password rather than passwordless email as the primary flow. Phone
verification remains additive and unenforced in observe mode. API profile and government-assignment
responses gained additive avatar and delivery-readiness fields; no existing endpoint was removed.

## 2026-07-17 — Dashboard-Sized Supabase Master Bootstrap

### Summary

Added two deterministic SQL Editor-sized parts for clean Supabase bootstraps while retaining the
complete master file and immutable incremental migration history.

### Feature

- Extended the master generator to split all 40 ordered migrations at the reviewed end-of-Phase-5
  boundary without dividing a source migration or separating Phase 5 schema from its RLS/RPC layer.
- Added `supabase/master.part-1.sql` with 23 migrations and `supabase/master.part-2.sql` with the
  remaining 17 migrations; Part 1 must complete before Part 2.
- Extended `database:master:check` to compare the complete master and both split files byte-for-byte
  against the migration sources and exact SHA-256 manifests.
- Preserved the clean-empty-database-only boundary, separate seed files, and explicit warning that
  Dashboard execution does not create the source migration ledger.

### Files Modified

- `scripts/generate-master-migration.mjs`
- `supabase/master.sql`
- `supabase/master.part-1.sql`
- `supabase/master.part-2.sql`
- `tests/master-migration.test.mjs`
- Database workflow, Supabase setup, release runbook, decision, issue, task, progress, and changelog
  documentation.

### Migrations Created

None. The split files are generated bootstrap artifacts outside `supabase/migrations/`.

### Tests and Verification

- `database:master:check` passed for the complete master and both split parts.
- The independent master-artifact test passed, proving exact ordered 40-migration coverage, matching
  begin/end markers and manifests, no split overlap, and the reviewed Phase 5 cutoff.
- Focused ESLint, Prettier, and Git whitespace validation passed.

### Breaking Changes

None. Existing environments continue to use incremental migrations.

## 2026-07-17 — Guarded Phase 10 Dashboard Upgrade

### Summary

Replaced the clean-bootstrap SQL Editor split with two small, fail-closed upgrade files for the
existing Phase 9 Supabase project after its existing `public.profiles` table correctly rejected a
full-history bootstrap.

### Feature

- Part 1 now contains only Phase 10 API hardening, privileged MFA, and citizen Phone MFA migrations.
- Part 2 now contains only Phase 10 private profile images, 50 m complaint proximity enforcement,
  and routing-delivery readiness migrations.
- Each part uses one transaction, validates representative prerequisite and partial-state catalog
  markers, verifies its target state before commit, and rejects unsafe re-execution.
- Retained `supabase/master.sql` as the separate 40-migration clean-database bootstrap and preserved
  exact source SHA-256 manifests. Seeds and migration-ledger repair remain outside the artifacts.

### Files Modified

- `scripts/generate-master-migration.mjs`
- `supabase/master.sql`
- `supabase/master.part-1.sql`
- `supabase/master.part-2.sql`
- `tests/master-migration.test.mjs`
- Database workflow, Supabase setup, release runbook, decision, issue, task, progress, README, and
  changelog documentation.

### Migrations Created

None. The two files package six existing immutable Phase 10 migrations outside
`supabase/migrations/`.

### Tests and Verification

- The deterministic master drift check, independent artifact test, focused ESLint, formatting, and
  whitespace checks passed.
- A local Supabase reset to `20260716111000` applied Part 1 and Part 2 successfully; final readiness
  and all representative Phase 10 markers were true.
- A second Part 2 execution failed closed with
  `LOCAL_WELLNESS_PHASE_10_PART_2_ALREADY_PRESENT`, and the raw-SQL rehearsal left the migration
  ledger at the expected 34-row Phase 9 cutoff.
- The local development database was restored successfully through all 40 migrations and reviewed
  seed files; all 1,405 assertions across 39 pgTAP plans passed afterward.

### Breaking Changes

`master.part-1.sql` and `master.part-2.sql` are no longer clean-bootstrap slices. They now require
the documented Phase 9 existing-database baseline. `master.sql` remains the clean bootstrap.

## 2026-07-17 — Adaptive Full-History Dashboard Migrations

### Summary

Removed the unsuccessful fixed Phase 9 assumption and rebuilt both Dashboard files from all 40
master migrations so an earlier coherent Local Wellness database can converge without replaying
already-complete migrations.

### Feature

- Part 1 contains migrations 1–23; Part 2 contains migrations 24–40.
- Added per-migration catalog fingerprints, coherent-prefix detection, whole-migration conditional
  execution, postconditions, advisory transaction locking, and explicit partial-history failures.
- Preserved exact immutable SQL and SHA-256 manifests. Native definition-safe `IF NOT EXISTS`
  remains intact, while unsupported policies/triggers/functions/constraints are never blindly
  suppressed.

### Migrations Created

None. Existing source migrations remain immutable; only generated Dashboard artifacts changed.

### Tests and Verification

- Both parts detected migration 40 and completed as no-op reruns on a current local database.
- From the 3-migration Phase 1 cutoff—the `profiles` collision case—Part 1 skipped the existing
  identity migrations and both parts converged successfully through migration 40.
- From the 23-migration Phase 5 cutoff, Part 1 skipped migrations 1–23 and Part 2 applied migrations
  24–40 successfully with final readiness.
- Generator drift, artifact coverage, lint, formatting, full reset, and pgTAP verification are
  recorded in the session verification results.

### Breaking Changes

The fixed Phase 9-only interpretation of `master.part-1.sql` and `master.part-2.sql` is superseded.
The files now adapt across the full coherent migration history and still do not repair the official
Supabase migration ledger.

## 2026-07-17 — BMC Official-Source Internal Demo Bootstrap

### Summary

Added a deterministic, provenance-preserving BMC staging data pack and versioned ward relationships
so Mumbai complaints can be exercised through an internal Local Wellness queue without claiming
official external submission.

### Feature

- Generated ten machine-readable CSVs, a human-reference workbook, geometry, manifest, validation
  output, and an idempotent SQL seed from official BMC sources without changing the canonical
  Maharashtra CSV/workbook inputs.
- Added source-backed BMC authority, seven zones, 26 operational wards, offices, departments,
  durable roles, officers, assignments, contacts, legacy boundaries, pilot categories, and routing
  evidence. Twenty-two one-to-one ward crosswalks are internally routable; split K/P units retain
  review-safe parent handling.
- Preserved six validation warnings and explicitly kept automatic/external production delivery
  false. Internal queue verification does not mean a complaint was lodged in BMC's official system.

### Files Modified

- BMC generator, tests, workbook/CSV/geometry/manifests under `resources/governance/`.
- Generated BMC seed/checksum, master artifacts, database types, and governance database tests.
- Required architecture/database/setup/tracking documentation.

### Migrations Created

- `20260716118000_bmc_ward_relationship_versions.sql`.

### Tests and Verification

- BMC generation drift check validated 114 source records across ten tables with six preserved
  warnings.
- Clean local reset and the complete 42-plan database suite passed 1,493 assertions.

### Breaking Changes

None. The optional BMC seed is not applied automatically to an existing managed project, and
external delivery remains disabled.

## 2026-07-17 — Clear Portal Authentication and Official Onboarding

### Summary

Made the current account, privileged MFA state, and government authorization path explicit across
Citizen Web, Government Dashboard, and Admin Console, and replaced raw scope entry with named,
data-driven invitation choices.

### Feature

- Showed the exact signed-in email or citizen identity label with explicit sign-out/account-switch
  actions across authenticated, MFA, authorized, denied, empty, and dependency-error states.
- Separated first-time authenticator QR enrollment from returning six-digit challenges, documented
  the Auth/TOTP/database-role gates, and added reviewed recovery guidance without a bypass.
- Added `GET /api/v1/admin/government-invitations/options`, strict shared/store/API contracts, and a
  service-role-only database projection of active, verified, non-placeholder, routing-eligible
  authority, ward, and department choices. Municipal administrators remain authority-scoped.
- Added administrator help/onboarding guidance and made clear that each official needs a unique
  invited account and their own authenticator enrollment.

### Files Modified

- Authentication/account surfaces and tests in Citizen Web, Government Dashboard, and Admin
  Console.
- Government invitation controller/service/store/contracts and API tests.
- Generated database types/master artifacts and required authentication, API, architecture,
  database, deployment, setup, worklog, decision, issue, task, progress, and changelog documents.

### Migrations Created

- `20260716119000_government_invitation_scope_options.sql`.

### Tests and Verification

- API 207/207, Government Dashboard 51/51, Citizen Web 5 test files, and Admin Console 3 test files
  passed; all four passed production builds, and all 16 workspaces passed lint and strict
  type-check.
- Invitation-options pgTAP plan passed 9/9 inside the 1,493-assertion database run. Generated
  database/master artifacts and the tracked/local-history secret scan passed.
- Interactive browser QA remains open because no in-app browser target was connected (`ENV-003`).

### Breaking Changes

None. The options endpoint is additive. Existing Auth emails still require the future audited
government-access lifecycle under `AUTH-001`.

## 2026-07-17 — Aligned Local Authentication Environment

### Summary

Removed a stale ignored Citizen Web Supabase override and made every authentication-facing local
runtime load the repository-root `.env`, preventing Auth and API calls from silently targeting
different projects.

### Feature

- Added a dependency-free root-environment command runner that preserves shell/deployment
  precedence, rejects app-local overrides, uses portable Node entry points, and permits
  CI/deployments without a local file.
- Applied it to API, mobile, Citizen Web, Government Dashboard, and Admin Console build/runtime
  commands; app-local `.env.local` files are no longer part of the supported workflow, and Turbo
  invalidates builds when root/public client configuration changes.
- Added regression coverage and updated setup, authentication, deployment, tracking, and worklog
  documentation.

### Files Modified

- Authentication-facing application package scripts, `scripts/run-with-root-env.mjs`, its root
  test, and relevant repository documentation.

### Migrations Created

None.

### Breaking Changes

Local app-specific environment overrides are intentionally unsupported. Use the root `.env` or
explicitly injected shell/deployment variables.

## 2026-07-17 — Mobile/Citizen Complaint Usability and BMC Internal Routing Activation

### Summary

Completed a safe citizen usability slice on mobile and Citizen Web, and added optional,
data-driven BMC internal routing for the three pilot categories that do not require missing asset
ownership inventories.

### Feature

- Added Expo profile-photo camera capture alongside gallery selection, using the existing private
  profile-image validation/upload/signed-read boundary and explicit permission/settings recovery.
- Added a one-time mobile profile civic-area lookup through fresh foreground location and the
  verified governance projection. Only derived civic labels are retained in component memory;
  exact coordinates and a street address are not persisted.
- Corrected Phone MFA presentation so observe mode remains optional until Twilio/Supabase delivery,
  recovery, abuse controls, and real-device behavior are verified.
- Added protected Citizen Web complaint history, detail, and timeline pages with owner account
  context, safe routing/location summaries, and government action/resolution information.
- Added Citizen Web feedback/confirmation and policy-aware reopen actions that reload server-owned
  workflow context and direct location-bound follow-up evidence to mobile capture.
- Added generated BMC routing seeds `52`/`53`: one confidence policy, three duplicate policies, and
  66 deterministic rules for `garbage_dump`, `missed_sweeping`, and `mosquito_breeding` across the
  22 exact one-to-one wards. Nine asset-dependent categories and split K/P child wards remain fail
  closed; external/official-system delivery remains false.

### Files Modified

- Mobile profile/Auth presentation, Expo configuration, focused profile/MFA helpers, and tests.
- Citizen Web complaint routes, API/presentation/action helpers, navigation, styles, validation,
  proxy protection, and tests.
- BMC governance generator, generated routing/verification seeds, generator tests, and pgTAP routing
  coverage.
- `docs/TASKS.md`, `docs/PROGRESS.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`, and
  `docs/KNOWN_ISSUES.md`, plus the relevant architecture/API/database/setup/worklog documentation.

### Migrations Created

None. Seeds `52`/`53` are optional non-production data artifacts and do not change the 42-migration
ledger.

### Tests and Verification

- A clean local reset applied all 42 migrations and reviewed seeds; 1,513 assertions passed across
  43 pgTAP plans, including the new 20-assertion BMC activation plan.
- Citizen Web passed 7 test files, mobile passed 16 test files, and shared validation passed 10 test
  files. The new Citizen Web/mobile slices passed lint and strict type-check, and the Citizen Web
  production build passed.
- BMC generation drift/testing passed with exact three-category, 22-ward, 66-rule output. No hosted
  seed application, physical-device validation, or official BMC external submission is claimed.

### Documentation Updated

Updated execution/progress tracking, implementation conventions, known data/privacy/product gaps,
and operational guidance. No ADR was required because the work applies the existing routing,
complaint, accountability, transparency, governance-directory, private-profile-image, and delivery
separation decisions.

### Breaking Changes

None. Hosted staging remains unchanged until an operator applies migrations and BMC seeds `50`–`53`
in the documented order.

## 2026-07-17 — Data-Driven Complaint Category Catalog

### Summary

Made the complete non-placeholder complaint taxonomy visible in the authenticated mobile capture
flow without weakening verified routing or submission controls.

### Feature

- Added a protected routing-category catalog projection that compares the bounded full database
  taxonomy with the independently filtered verified operational projection.
- Marked unavailable categories explicitly, omitted placeholders, rejected malformed or
  inconsistent snapshots, and kept the existing verified-only category lookup authoritative.
- Updated mobile capture to list every returned category while disabling unavailable entries and
  preventing resumed or client-selected unavailable categories from loading assets or becoming
  submission-ready.
- Clarified that catalog availability is global presentation state; the later PostGIS routing check
  still determines whether an available category is supported at a specific coordinate.

### Files Modified

- Routing types, API category/store modules, mobile complaint capture/decoding, and focused tests.
- README, architecture, API, decision, issue, task, progress, and citizen-experience documentation.

### Migrations Created

None. The catalog reuses the existing service-only category projection and does not change the
42-migration ledger.

### Tests and Verification

- API passed 210 tests; mobile passed 17 test files; Citizen Web passed 7 test files; Government
  Dashboard passed 51 tests; Admin Console passed 3 test files; shared validation passed 10 test
  files.
- A clean local reset applied all 42 migrations and reviewed seeds; all 1,513 assertions across 43
  pgTAP plans passed.
- All 16 workspaces passed formatting, lint, strict type-check, and production builds. The Expo SDK
  54 Android export bundled 1,278 modules. Generated database types, master artifacts, BMC artifacts,
  secret scanning, and whitespace checks passed.

### Documentation and Architecture

No ADR was required. The additive presentation contract applies the existing database-evidence,
private complaint, and fail-closed routing decisions without changing routing or privacy policy.

### Breaking Changes

None. Hosted staging remains unchanged until its migration ledger is reconciled and the optional BMC
seeds are deliberately applied.

## 2026-07-17 — Compact Mobile Community and BMC SQL Editor Deployment

### Summary

Refined the Expo mobile information hierarchy and added a privacy-preserving reviewed-public
community slice with Local, Trending, and Heat views. Added a four-part SQL Editor deployment bundle
for loading the bounded BMC mobile demo into an existing Supabase project.

### Feature

- Reduced repeated explanatory copy across mobile navigation, Home, complaints, report, profile,
  governance, Auth, and menu surfaces while retaining state-specific help and accessible labels.
- Made Community a primary mobile destination with Local, Trending, and minimum-cohort Heat views.
- Guarded asynchronous Community loads so rapid tab changes cannot render stale ranking data, and
  added visible Back/Sign in actions for anonymous visitors when the native header is hidden.
- Added one support per active authenticated account, private star/follow state, aggregate-only
  public support counts, current-projection withdrawal behavior, and live `recent|trending` order.
- Added bounded authenticated lookup/mutation APIs and PostgreSQL-backed quotas. Engagement cannot
  change official routing, assignment, status, escalation, SLA, or KPI records.
- Added four transaction-atomic BMC SQL Editor parts for baseline categories/core, official
  boundaries, ward/governance crosswalk, and three-category routing activation/verification. The
  bundle leaves K/P split wards, the other nine categories, and external delivery fail closed.
- Added a 77,849-byte adaptive current-session SQL Editor artifact that installs exact migrations
  39–43 from a verified migration-38 baseline before the BMC bundle, with safe coherent-prefix
  skipping and fail-closed baseline/partial/non-contiguous guards.

### Files Modified

- Mobile navigation and citizen screens, transparency query/service/client code, and focused tests.
- Transparency API/service/store/rate-limit code, shared types/validation, and focused tests.
- BMC deployment generator, generated `supabase/deploy/bmc-mobile-demo/` bundle, and static test.
- Current-session upgrade generator, `supabase/deploy/current-session/` artifact/guide, package
  generate/check commands, and deterministic/runtime tests.
- Architecture, database, API, deployment, Supabase setup, project trackers, implementation
  decisions, known issues, ADR-0024, and Phase 8/mobile worklogs.

### Migrations Created

- `20260717100000_public_complaint_engagements.sql` adds the private forced-RLS engagement model,
  aggregate support projection, service-only engagement functions, and reviewed-public sorting.
  It is also the small replay-safe SQL Editor delta for a target confirmed at the exact previous
  migration cutoff and ends with explicit catalog, foreign-key, constraint, grant, and RLS
  verification.

The repository migration cutoff is now 43; the adaptive SQL Editor split is 23/20.

### Tests Added

- API engagement contract/store cases, shared validation cases, mobile query/service cases, pgTAP
  plan `044_public_complaint_engagements.test.sql`, expanded Phase 8 integration coverage, and a BMC
  deployment-bundle static test.
- A clean local reset applied all 43 migrations and reviewed seeds; all 1,542 assertions across 44
  pgTAP plans passed, application-schema lint reported no errors, and generated database types are
  current.
- The four BMC SQL Editor parts passed first-run and safe-rerun execution against a clean local
  database, ending with 12 category records, three operational categories, and 22 routable wards.
- The compact current-session artifact applied migrations 39–43 from a local migration-38 baseline
  and safely skipped all five on immediate rerun. Focused pgTAP plans 038, 039, 040, 042, and 044
  passed 90 assertions on that upgraded state.
- All 16 workspaces passed lint and strict type-check. The full repository test/build pipeline,
  Android Expo export, formatting, master/BMC artifact drift checks, and tracked/history secret scan
  passed. Physical-device and managed-hosted smoke remain pending.

### Hosted Data and Security

- A credential-safe read audit found API readiness healthy and all five expected private Storage
  buckets present, superseding the earlier readiness `503`/`PGRST202` symptom.
- The owner subsequently reported successfully running the guarded migrations 39–43 SQL Editor
  artifact on staging. Independent schema/ledger verification and the BMC data bundle remain
  pending; no hosted data activation is claimed yet.
- The same audit returned zero category projections and no tested BMC jurisdiction rows. No hosted
  category, routing, public projection, or engagement data activation is claimed.
- A read-only RPC cutoff probe found the Phase 10 MFA functions present but migrations 42 and 43
  absent (`PGRST202`). Because migrations 38–41 cannot be fully catalog-verified through the exposed
  API, the recommended first path is the compact adaptive migrations 39–43 bundle when its
  migration-38 preflight passes. If it reports a baseline, partial, or non-contiguous error, stop
  and reconcile or use adaptive master Part 1 then Part 2 as appropriate. Run BMC parts 01–04 only
  after migration 43 is verified; SQL Editor execution still does not repair the official ledger.
- Direct Data API access remains revoked; supporter identities, avatars, exact locations, private
  media, and private complaint details are excluded. Comments remain disabled. Redis, BullMQ, Redis
  adapters/caching, and Sentry were not introduced.

### Breaking Changes

None. The public complaint projection gains additive `supportCount` and `sort=recent|trending`
behavior; existing `recent` ordering remains the default.

## 2026-07-18 — One-Page Mobile Complaint Reporting

### Summary

Replaced the mobile complaint wizard presentation with one scrollable form, made every local
submission blocker visible, changed notification affordances to a bell, and shortened remaining
mobile option copy without weakening the verified routing or private evidence boundary.

### Feature

- Rendered category/details, location/asset, live evidence, duplicate review, and final confirmation
  together on one page while retaining the existing resumable server lifecycle internally.
- Added a pure submission-blocker projection for category, saved details, location, required asset,
  media limits/upload, duplicate review, voice/emergency acknowledgement, and connectivity.
- Explained that successful ward lookup is independent from category-specific verified routing;
  unavailable catalog entries remain disabled and final routing still runs server-side.
- Disabled draft-mutating controls during in-flight requests while preserving safe stop behavior
  for an active native recording.
- Replaced the notification dot on Home and More with a bell and reduced remaining visible helper
  copy while preserving accessibility hints and safety guidance.

### Files Modified

- Mobile complaint form, capture-state helpers/tests, Home, complaints, notifications, profile, and
  menu surfaces under `apps/mobile/`.
- README, architecture guide, task/progress/decision/known-issue trackers, changelog, and mobile
  citizen-experience worklog.

### Migrations Created

None. This is a client presentation/readiness change and does not alter database or API contracts.

### Tests Added and Verification

- Added focused pure-state cases for saved-detail normalization, complete blocker projection,
  required assets, duplicate acknowledgement, voice confirmation, emergency acknowledgement,
  pending uploads, offline state, and the ready path.
- Mobile lint, strict TypeScript, all 17 mobile test files, and the Android Expo export pass. The
  export bundled 1,278 modules into `apps/mobile/dist/app`.

### Security and Operational Status

- Server-owned recipient selection, private signed uploads, duplicate evidence, idempotency, 50 m
  evidence checks, and database routing remain unchanged.
- The change does not activate any category or managed seed. The optional BMC pack still enables
  only garbage dump, missed sweeping, and mosquito breeding in its 22 supported wards; the other
  nine categories and unsupported/split wards remain fail closed.
- Redis, BullMQ, Sentry, OS push registration, and external complaint delivery were not introduced.

### ADR

No ADR was required because the accepted complaint, routing, notification, and privacy architecture
did not change.

### Breaking Changes

None. Existing draft/resume records continue to load; their persisted step is now internal state
rather than a requirement to navigate separate form screens.

## 2026-07-18 — BMC Complaint Submission Repair and Routing-Asset Discovery

### Summary

Diagnosed the hosted K/W complaint failure through the complete capture/routing path, repaired the
API's redundant boundary-evidence expectation, added an additive complaint-completion forward fix,
and prepared official-source discovery contracts for the nine BMC categories that remain
ownership-gated.

### Feature

- Kept PostGIS jurisdiction provenance authoritative and required routing candidates to match its
  exact boundary-version vector without duplicating boundary entries in explanation metadata.
- Added safe dependency-operation diagnostics and granular allow-listed routing-evidence conflicts
  without logging coordinates, descriptions, media paths, contacts, tokens, or provider details.
- Serialized mobile complaint mutations and made repeated submit taps share one in-flight request.
- Pinned nine official MCGM ArcGIS layer contracts for potholes, drains, sewer/manholes, water,
  streetlights, buildings/encroachment, and trees. No feature import, route activation, production
  delivery, or verification promotion was performed.

### Files Modified

- API routing/complaint stores, safe error diagnostics, routing audit logging, and focused tests.
- Mobile complaint state/service/mutation guard and focused tests.
- BMC source manifest, validator, deployment diagnostics, master migration artifacts, generated
  database types, and project/technical documentation.

### Migration Created

- `20260718100000_complaint_routing_evidence_diagnostics.sql` installs a protected exact mismatch
  classifier, a canonical V2 atomic completion implementation, and a service-role-only public
  wrapper. It is rerunnable for SQL Editor recovery and preserves prerequisite-validation order.

### Tests Added and Verification

- Added BMC complaint-submission pgTAP coverage, API failure-diagnostic/routing-store cases, mobile
  race/single-flight cases, and static BMC asset-manifest/master-migration tests.
- A clean reset applied all 44 migrations. All 1,577 assertions across 45 pgTAP plans, all 219 API
  tests, and all 18 mobile test files passed; database lint, API/mobile lint and strict type-check,
  generated-type drift, and master/manifest checks also passed.
- Hosted staging was not modified. Its existing 12-category/three-operational-category K/W route
  still requires this migration and a receipt-producing authenticated smoke before submission is
  declared operational.

### Security and Data Status

- Only garbage dump, missed sweeping, and mosquito breeding remain operational through 66 internal
  rules across 22 unambiguous BMC wards. The other nine categories, K/S, K/N, P/E, P/W, and external
  BMC delivery remain fail closed pending reviewed ownership, geometry, role, and delivery evidence.
- Redis, BullMQ, Redis adapters/caching, and Sentry were not introduced.

### ADR

No ADR was required. The repair implements the accepted jurisdiction, routing, complaint,
governance-synchronization, and delivery-readiness decisions without changing their architecture.

### Breaking Changes

None.

## 2026-07-18 — Email-Free Privileged Staging Access

### Summary

Added password entry for existing Government Dashboard and Admin Console identities and created a
guarded, expiring synthetic BMC account matrix for staging demonstrations that cannot depend on
email delivery.

### Feature

- Both privileged portals now accept an existing email/password pair as an alternative Auth entry
  method and immediately continue through the existing personal TOTP/AAL2 and current database
  membership/role/scope gates.
- Added a trusted operator helper with exact project-host, reviewed-scope, expiry, partial-state,
  platform-admin-conflict, and managed-password-rotation guards. It never exposes a provisioning
  route to clients and never derives authorization from Auth metadata.
- Provisioned seven distinct confirmed staging identities for global platform administration, BMC
  municipal administration, BMC operations, A Ward, K/W Ward, Solid Waste Management, and Public
  Health. Every generated password and active profile was verified; privileged assignments expire
  at `2026-08-17T07:14:01.280Z`.
- Stored generated credentials only in the gitignored local operator artifact forced to mode
  `0600`. No password, service key, OTP, or authenticator secret was printed or committed.

### Files Modified

- Admin Console and Government Dashboard authentication forms, services, styles, and focused tests.
- Root package command, staging provisioner, CLI/security tests, and local-artifact ignore rule.
- Authentication, architecture, API, database, deployment, Supabase, decision, issue, task,
  progress, and staging-access worklog documentation.

### Migrations Created

None. Existing Supabase Auth administration plus the accepted platform bootstrap and government
access persistence functions are reused.

### Tests Added and Verification

- The staging helper's seven tests, ESLint, Prettier, secret scan, and diff checks pass.
- All three Admin Console test files plus lint, strict type-check, and production build pass.
- All 53 Government Dashboard tests plus lint, strict type-check, and production build pass.
- The hosted staging helper completed and password-verified all seven identities. Interactive TOTP,
  AAL1/AAL2, and cross-scope queue smoke remains operator work because authenticator enrollment is
  intentionally personal.

### Security and Operational Status

- Password sign-in creates no account, role, membership, scope, or MFA exemption. Production
  onboarding remains invitation-first with unique official-controlled identities.
- Assignment expiry is automatic; synthetic Auth-user disable/removal and local credential-artifact
  deletion remain explicit teardown under `AUTH-012`.
- Redis, BullMQ, Redis adapters/caching, and Sentry were not introduced.

### ADR

- ADR-0025 accepts password sign-in for pre-provisioned privileged identities while preserving
  personal TOTP/AAL2 and database-enforced authorization.

### Breaking Changes

None.

## 2026-07-18 — Maharashtra Batch 0 Immutable Source-Bundle Intake

### Summary

Audited and integrated the supplied Maharashtra Batch 0 ZIP as review-gated source/hierarchy
evidence. The implementation preserves every supplied record, enriches only unambiguous existing
LGD identifiers, and activates no operational governance or routing data.

### Feature

- Added a deterministic safe-ZIP/CSV validator with archive/member/header/count/key/hash checks,
  canonical district reconciliation, sensitive-query redaction, immutable original row hashes, and
  generated validation/seed/checksum artifacts.
- Recorded 29 import files, all 160 CSV rows, and 38 canonical official-source URLs. Applied LGD
  `27` to Maharashtra and LGD codes to 35 exact existing district matches while preserving current
  verification, provenance, placeholder, and routing state.
- Kept `Mumbai`/LGD `482`, six discrepancy groups, 21 data issues, the stale PMC booklet, empty
  GeoJSON, and all header-only operational datasets quarantined/non-operational.
- Added a three-file, guarded SQL Editor deployment under
  `supabase/deploy/maharashtra-batch0/`. Hosted Supabase was not modified.
- Changed canonical Phase 2 seed conflict handling so a later non-null LGD enrichment is not erased
  when the baseline seed is rerun.

### Files Modified

- Batch 0 archive manifest/validation report, generator, generated seeds, SQL Editor package, and
  root governance commands.
- Governance import SQL renderer, generated database types, and 45-migration master artifacts.
- Governance database/architecture/import/synchronization/deployment/Supabase documentation,
  tracking documents, and the dedicated Batch 0 worklog.

### Migration Created

- `20260718110000_governance_source_bundle_imports.sql` adds an optional exact
  `source_bundle_sha256`, makes the workbook hash optional for bundle-only imports, and requires at
  least one exact source artifact while retaining compatibility with existing workbook imports.

### Tests Added and Verification

- Added six Node generator/safety tests plus pgTAP plans 046 and 047 for source-bundle schema,
  import ledger, LGD enrichment, quarantine, redaction, negative routing promotion, and RLS/ACL.
- A clean local reset applied all 45 migrations and ordered seeds. All 47 pgTAP files/1,612
  assertions passed; the 37 governance-import package tests, database lint, generated type/master
  drift checks, and SQL Editor package rerun also passed.

### Security and Data Status

- Four transient CSRF query observations are absent from generated JSON/SQL; each original row hash
  and explicit redaction diagnostic remains. No secret, contact, officer, route, schedule, public
  projection, or delivery approval was introduced.
- The batch is not statewide operational coverage. It contains zero populated municipality, ward,
  boundary, officer, contact, asset, ownership, or routing rows.
- Redis, BullMQ, Redis adapters/caching, and Sentry were not introduced.

### ADR

No ADR was required. The change extends ADR-0008's immutable bootstrap and review-gated publication
boundary without changing the accepted architecture.

### Breaking Changes

None. Workbook-backed import batches remain valid.

## 2026-07-18 — Privileged Authenticator Enrollment Rendering Repair

### Summary

Repaired the Admin Console and Government Dashboard first-login TOTP flow after staging proved that
Supabase enrollment succeeded but its newline-terminated SVG QR crashed Next Image rendering.

### Feature

- Trimmed provider-generated QR data URLs and rendered the private, short-lived SVG through a
  fixed-size native image without optimization or inline SVG injection.
- Added an explicit restart state for each portal's own unfinished unverified TOTP factors while
  preserving verified and unrelated factors.
- Added actionable safe messages for factor-name conflicts and environments where TOTP enrollment
  is disabled.

### Files Modified

- Admin Console and Government Dashboard MFA helpers, enrollment forms, and focused tests.
- README, authentication guide, task/progress/decision/known-issue tracking, and this changelog.

### Migrations Created

None.

### Tests Added and Verification

- Added provider-shaped trailing-newline QR regression coverage, deterministic same-portal factor
  recovery, unrelated-factor isolation, and safe provider-error mapping.
- Admin Console passed 27 tests and Government Dashboard passed 54 tests. Both portals passed lint,
  strict type-check, and production build; repository formatting and secret checks passed.
- Staging confirmed one verified TOTP on both the platform-administrator and BMC
  municipal-administrator identities, followed by HTTP `200` portal-root requests.

### Security

No QR source, setup secret, authenticator code, password, token, or service credential is logged or
persisted. MFA and database authorization gates are unchanged.

### ADR

No ADR was required; the repair implements the existing privileged TOTP/AAL2 architecture.

### Breaking Changes

None.

## 2026-07-18 — Hosted Database Load and API Fan-out Hardening

### Summary

Reduced concrete sources of avoidable hosted Supabase work without collapsing the normalized
schema, caching authorization/routing decisions, or introducing Redis. Added a read-only diagnostic
for identifying the actual highest-cost hosted statements before applying indexes or resizing
compute.

### Feature

- Replaced one-second fixed idle polling with bounded adaptive backoff for realtime delivery and
  notification, SLA, and KPI workers; active work resets each loop to its configured base delay.
- Replaced redundant remote user verification plus claims parsing with one locally verified
  asymmetric-JWT claims operation while retaining current database-backed profile, role,
  membership, and MFA authorization.
- Coalesced only identical concurrent actor-context reads and added a 30-second process-local cache
  for the non-user-specific complaint-category catalog. Exact location, routing, drafts,
  complaints, and security decisions remain uncached and submission revalidates its route.
- Added a private, read-only hosted performance audit covering `pg_stat_statements`, waits, table
  churn, index use, and storage size. No speculative index or schema migration was added.

### Files Modified

- API authentication guard/gateway, category service, and focused tests.
- Realtime delivery pump, notification/SLA/KPI workers, shared polling helper, and focused tests.
- Hosted diagnostic SQL/guide, ADR-0026, README, architecture/API/authentication/database/
  deployment/Supabase guides, and project tracking documents.

### Migrations Created

None. `supabase/deploy/diagnostics/database_performance_audit.sql` is a read-only operator query,
not a migration.

### Tests Added and Verification

- Added strict verified-claim rejection, actor-context in-flight coalescing/no-completed-cache,
  category-cache/failure, claimed-work reset, and adaptive-delay cap/reset coverage.
- API passed 221 tests, strict type-check, lint, and build; realtime passed 12 tests, strict
  type-check, lint, and build; workers passed 26 tests, strict type-check, lint, and build; config
  passed 7 tests, lint, and build. The concurrently retained portal repair also passed 27 Admin
  Console and 54 Government Dashboard tests plus lint and strict type-check.
- The diagnostic SQL passed a local Supabase execution with stop-on-error. Hosted query output and
  CPU/complaint-latency improvement remain intentionally unclaimed pending an operator run.

### Security

Verified JWT signature/audience/role/subject/AAL validation remains mandatory. Current database
profiles, assignments, memberships, privileged MFA policy, and citizen Phone MFA policy continue
to authorize requests; no completed security decision is cached. The category cache contains no
user data, coordinates, routes, or complaint state.

### ADR

ADR-0026 records verified JWT claims for API authentication and the decision to retain current
database authorization without a completed security cache.

### Breaking Changes

None. Redis, BullMQ, Redis adapters, and Sentry remain absent.

## 2026-07-18 — Mobile Report Restore Busy-State Repair

### Summary

Fixed a mobile-only infinite Report-button spinner caused by an Auth session refresh interrupting
saved-draft restoration before its busy-state decrement ran.

### Feature

- Every complaint-restore busy increment now has a matching decrement even when a newer Auth session
  replaces the restore effect while network work is still settling.
- Refreshed Expo Metro with the current LAN API URL for physical-device testing.

### Files Modified

- `apps/mobile/src/complaints/complaint-context.tsx`
- Mobile verification and project tracking documents.

### Migrations Created

None.

## 2026-07-18 — Stale Routing Retry Repair

### Summary

Made mobile complaint submission recover from an explicit pre-insert routing-evidence mismatch
without reusing the stale submission idempotency key.

### Feature

- Rotates the submission key for allow-listed routing evidence mismatch markers before the next
  attempt; the server still resolves and validates the current draft, location, category, asset,
  and routing evidence.
- Preserves ambiguous network/dependency outcomes, which remain non-rotating to avoid duplicate
  complaints after an unknown commit state.

### Files Modified

- `apps/mobile/src/complaints/complaint-service.ts`
- `apps/mobile/test/resolution-client.test.ts`

### Migrations Created

None.

### Tests and Verification

- Mobile lint, strict type-check, and all 97 mobile tests pass.

### Breaking Changes

None.

### Tests and Verification

- Mobile lint, strict type-check, and all 97 mobile tests pass.
- API live/readiness checks return HTTP 200.

### Breaking Changes

None.

## 2026-07-18 — Routing Evidence Precision Forward Fix

### Summary

Submission routing validation now tolerates harmless GPS and timestamp precision differences
between the mobile capture, routing decision, and persisted evidence while retaining strict
actor, request, category, asset, and routed-status checks.

### Files Modified

- `supabase/migrations/20260718123000_relax_routing_evidence_precision.sql`

### Migrations Created

- `20260718123000_relax_routing_evidence_precision.sql`

### Breaking Changes

None.

## 2026-07-18 — Complaint Receipt Response Contract Fix

Removed an internal routing `categoryId` field from complaint receipt and detail responses. The
mobile strict decoders now receive the documented `ComplaintRoutingSummary` shape, allowing
submitted complaints and their details to render normally.

Files modified: `apps/api/src/supabase/supabase-complaint.store.ts`.

## 2026-07-18 — Mobile Civic Visual Refresh

Added a reusable civic color theme and distinct saffron, navy, teal, and green navigation icon
accents. Existing profile language preferences already support English, Marathi, and Hindi; the
visual refresh preserves that setting while localization coverage continues to expand.

### Files Modified

- `apps/mobile/src/ui/theme.ts`
- `apps/mobile/src/ui/app-bottom-navigation.tsx`

## 2026-07-18 — Worker Polling CPU Reduction

Raised default idle polling intervals for notification, SLA, KPI, and realtime delivery workers
from 1 second to 10 seconds. Existing adaptive backoff remains in place, reducing empty Supabase
RPC traffic while preserving prompt processing when work exists.

Files modified: `apps/workers/src/worker-configuration.ts`, `.env.example`, and worker configuration
tests.

## 2026-07-20 — Simplified BMC V1 Ward Routing and Contact Intake

### Summary

Replaced the current BMC citizen-submission critical path with a smaller database-driven PostGIS
ward/contact facade while preserving the existing complaint ledger, assignments, history, RLS and
Government Dashboard scope. All 12 pilot categories now have 26-ward contact coverage in the
generated V1 staging seed.

### Feature

- Validated the immutable Mumbai ward/contact ZIP as 26 wards, 12 categories and 312 unique routes.
- Stored private recipient email, primary/secondary phone, `1916`, WhatsApp, durable role and source
  metadata without exposing them to citizen clients.
- Added service-only ward resolution and replay, plus an idempotent private ward-email outbox with
  lease/retry/sent/dead transitions.
- Made duplicate discovery optional when no suggestions exist and fixed replay timestamp comparison
  across equivalent `Z`/`+00:00` PostgREST representations.
- Generated a focused hosted SQL Editor deployment file. No hosted database or email provider was
  changed by repository generation.

### Files Modified

- `scripts/generate-bmc-v1-ward-contacts.mjs`
- `scripts/generate-v1-simple-ward-routing-deployment.mjs`
- `supabase/migrations/20260720100000_v1_simple_ward_routing.sql`
- `supabase/seed/54_bmc_v1_ward_issue_contacts.generated.sql`
- `supabase/deploy/v1-simple-ward-routing.sql`
- API routing store/service/tests, mobile complaint context/service/tests, generated database types,
  routing/database tests and required project documentation.

### Migration and Tests

- Added migration `20260720100000_v1_simple_ward_routing.sql` and pgTAP plan
  `048_v1_simple_ward_routing.test.sql`.
- Clean reset and all 48 database plans pass 1,637 assertions.
- API passes 225 tests, lint and strict type-check; mobile passes all 18 test files, lint and strict
  type-check; archive and deployment drift checks pass.

### Security and Operational Status

Both new tables force RLS; citizen roles have no direct access and contact values do not enter
citizen responses. Queue creation does not claim external delivery. Provider activation, hosted
deployment/smoke and exact K/P child geometry remain open. Redis, BullMQ and Sentry remain absent.

### ADR

ADR-0027 accepted; ADR-0009 is superseded for the current BMC V1 path only.

### Breaking Changes

No public HTTP shape changed. The BMC V1 routing implementation now uses the ward facade instead of
the advanced candidate evaluator, and duplicate checking is no longer mandatory when no duplicate
suggestions were requested.

## 2026-07-20 — BMC Ward Email Directory Merge and Provenance

### Summary

Extended the private BMC V1 routing matrix to derive recipient mailboxes from the separate immutable
ward-directory archive while retaining the existing immutable issue-contact archive for category,
phone and WhatsApp data. The deterministic merge covers all 26 configured operational wards and 12
categories (312 rows) without putting contact data in application source.

### Feature

- Added `resources/local_wellness_bmc_ward_directory_2026-07-20.zip` as the ward-email/office input;
  `resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` remains the phone/WhatsApp/category input.
- Resolved direct K/N and P/E emails and the K/S→K/E plus P/W→P/N parent-office mappings during
  seed generation.
- Retained raw email-source URL, dates, record locator and reported status separately from explicit
  owner-approved staging activation.
- Kept all contact and source detail private; no citizen response, hosted deployment or outbound
  provider activation was introduced.

### Files Modified

- `scripts/generate-bmc-v1-ward-contacts.mjs`
- `scripts/generate-v1-simple-ward-routing-deployment.mjs`
- `supabase/migrations/20260720103000_v1_ward_email_provenance.sql`
- `supabase/seed/54_bmc_v1_ward_issue_contacts.generated.sql`
- `supabase/deploy/v1-simple-ward-routing.sql`
- generated database/master artifacts, pgTAP coverage, ADR-0027, the V1 routing worklog, and required
  architecture/database/API/deployment/governance/project-tracking documentation.

### Migration and Tests

- Added forward migration `20260720103000_v1_ward_email_provenance.sql`.
- A clean local reset applied all 48 migrations and seeds; all 48 pgTAP files passed 1,645
  assertions.
- Repository-wide tests passed all 28 Turbo tasks; the root suite passed 72 tests and skipped only
  three environment-gated local Auth E2E cases.
- The contact generator verified 26 email-resolved wards, 12 categories and 312 routes.
- The 286,915-byte focused deployment artifact passed drift validation with ordered payload
  SHA-256 `bf3f3ee8a902160ab726484468f0996639816dece02ef47ec8b6ac6ee1d1bb72`.
- The full master artifacts cover all 48 migrations with the reviewed 23/25 split.

### Documentation Updated

Updated repository setup, architecture, database, API, authentication, deployment, governance,
tracking, ADR and worklog documentation for the two-source merge and delivery boundary.

### Breaking Changes

None. The change is additive and private. Hosted staging remains unchanged until the focused SQL
Editor artifact is applied, and `pending` outbox rows remain unsent until an approved provider
runtime records delivery.

## 2026-07-20 — JagrukSetu Civic UI Benchmark Foundation

### Summary

Started the benchmark-driven UI/UX implementation inside the existing Local Wellness clients.

### Feature

- Added shared civic design tokens, status labels, typed report/map/timeline/contact contracts,
  token JSON/CSS, and reduced-motion support in `packages/design-system`.
- Added typed English copy with Marathi/Hindi fallback resources and `en-GB`/`hi-IN`/`mr-IN`
  locale formatting helpers in `packages/localization`.
- Added an accessible progress summary to the existing one-page mobile report form.
- Added a responsive citizen-web navigation/feed shell with report launcher, search affordance,
  reviewed public issue entry, trust explanation, and explicit no-data states.

### Tests and verification

The changed source and tests pass ESLint and the shared packages pass direct TypeScript build. The
workspace package test command could not run in this environment because pnpm attempted to repair
an incomplete node_modules state and its SQLite store was unavailable; no test pass is claimed for
that command. Full dependency installation and rendered/device/browser QA remain open.

### Documentation

Updated TASKS, PROGRESS, DECISIONS, KNOWN_ISSUES, and this changelog. No ADR was required: this
extends existing UI boundaries and does not change routing, privacy, storage, authentication, map,
or notification architecture.

# 2026-07-22

- Added a server-only SMTP ward-email sender and data-minimized JagrukSetu complaint template.
- Wired the sender to the existing leased `ward_email_outbox` RPCs with completion and retry
  recording; no client bundle receives SMTP credentials.
- Decode the snake_case claim RPC contract and explicitly map it into the email-template model so
  complaint number, ward, category, timestamp, and description cannot silently render undefined.
- Added `nodemailer` to the workers package, documented blank server-only SMTP configuration, and
  covered successful send/completion plus sanitized failure recording in focused worker tests.

## Mobile Home and Nearby UI refinement

- Authenticated Home now uses the current private profile avatar with an initial fallback, shows a
  device-time greeting and display name, and presents report, status, and Nearby quick actions in
  one row with a View all path.
- Nearby governance now presents current-location context, a first-party schematic area/count
  surface, and compact governing-body cards backed by the existing safe governance response. It
  does not invent contacts, distances, opening hours, directions, or an external basemap.
- The five-destination bottom navigation now uses filled dependency-free React Native icon shapes
  in a rounded detached capsule. Home and Nearby use the same code-native icon language, and the
  unrelated Community tab is no longer selected on the governance screen.
- Added focused device-time greeting coverage. All 19 mobile test files, mobile TypeScript, focused
  ESLint, changed-file whitespace validation, and a live Android Metro bundle pass.
- Migrations: none. ADR: none; this extends the existing JagrukSetu UI conventions. Breaking
  changes: none.

## 2026-07-23 — Enforced citizen Phone MFA and protected password lifecycle

### Summary

Completed the first application-finalization authentication milestone: citizen email/password
remains the core credential, mobile/private API access now requires verified Supabase Phone MFA and
AAL2, every supported password change requires a fresh SMS challenge, Citizen Web is fail-closed
to reviewed public routes, and mobile HTTPS references open through Expo's in-app browser.

### Feature

- Added mobile signed-in password change and provider-owned recovery flows with fresh phone OTP,
  a five-minute user/factor-bound in-memory proof, immediate AAL2/current-user revalidation, resend
  cooldowns, duplicate-submit guards, non-blocking OTP audit delivery, global sign-out with local
  fallback, and explicit partial-success handling.
- Preserved a bounded email-only recovery path only for legacy accounts with zero verified phone
  factors. Existing-factor loss requires an attributed administrator reset and never falls back to
  email alone.
- Made mobile/API citizen Phone MFA enforcement the default and made production API startup reject
  missing or weaker citizen policy.
- Put Citizen Web in `public-only` mode: home, reviewed transparency, and directory remain
  available; auth, callbacks, accounts, reporting, owned complaints, and unknown routes fail before
  protected session/network work.
- Added one validated Expo in-app-browser adapter for user-initiated HTTPS references while keeping
  settings, `tel:112`, Auth/deep links, and internal navigation native.
- Added the client-reportable `password_changed` audit contract. Its only AAL1 API exception is an
  exact one-field request from a valid non-privileged citizen whose server-confirmed account has
  zero verified phone factors; normal validation and PostgreSQL quotas still apply.
- Added the citizen lost-phone factor-reset runbook with separation of duties, identity and factor
  checks, supported Supabase Admin deletion, audit evidence, old-session denial, replacement
  enrollment, failure handling, and safe user communication.

### Files Modified

- Mobile authentication routes/services/tests, external-link consumers, environment contract, and
  Expo dependency metadata.
- API authentication guard/configuration/audit contract and focused tests.
- Citizen Web proxy, access policy, protected clients, unavailable page, environment contract, and
  tests.
- Shared type/validation contracts, root environment example, generated master SQL artifacts, and
  project documentation/tracking.

### Migration and Tests

- Added forward migration `20260723100000_password_change_audit_event.sql`.
- Added pgTAP plan `049_password_change_audit_event.test.sql`.
- A clean local reset applied all 49 migrations and seeds; all 49 pgTAP files passed 1,649
  assertions. Database lint reported only installed PostGIS extension diagnostics.
- Workspace lint, strict type-check, production builds, formatting, generated master/type drift,
  secret scanning, all 30 Turbo test tasks, and 72 root tests passed. Three provider-gated local
  Auth E2E cases remained skipped in the default root run. A separate required-local run passed
  citizen email-code and government-invitation flows and skipped only phone SMS because no local
  provider is configured.
- The API passed 232 tests, mobile passed 117 tests across 20 files, and the Android Expo export
  bundled successfully.

### Documentation Updated

Updated README, product overview, plan, architecture, API, authentication, database, deployment,
Supabase setup, tasks, progress, decisions, known issues, the citizen-MFA worklog, ADR-0020, and new
ADR-0028. Added the citizen lost-phone factor-reset operator runbook and linked it from the runbook
index and authentication setup guidance.

### Breaking Changes

- Authenticated mobile/API citizen access now fails closed without a verified phone factor and AAL2.
- Citizen Web protected routes are intentionally unavailable until equivalent protected-flow
  parity is implemented.
- A managed release must apply migration 49 and explicitly configure the production enforcement
  modes. Hosted migration, Twilio/device delivery, exact recovery redirects, India DLT/provider
  controls, and lost-phone operator rehearsal remain release gates.

## 2026-07-23 — Purpose-scoped mobile location coordination

### Summary

Removed redundant location acquisition across mobile locality screens without weakening complaint
evidence. Community, Nearby, and Profile now share a bounded memory-only current-area result;
complaint issue and media captures remain fresh, high-accuracy, and independently validated.

### Feature

- Added one injectable mobile location coordinator with a five-minute current-area TTL,
  100-metre accuracy ceiling, non-mocked input, operating-system last-known reuse, and in-flight
  request coalescing.
- Made explicit Refresh bypass reusable memory and last-known results.
- Checked existing foreground permission before requesting it and retained distinct recovery copy
  for askable denial, permanent denial, and disabled services.
- Kept sequential complaint issue/photo/video/voice evidence on fresh high-accuracy acquisition
  with the existing five-minute age, 50-metre accuracy, mock-location, and media-proximity rules.
- Cleared current-area state across Auth identity changes and invalidated late completions.
- Added no watcher, timer, background permission, persisted coordinate cache, API contract, or
  database change.

### Files Modified

- Mobile location coordinator/Expo adapter, Auth lifecycle, Community/Profile/Nearby callers,
  complaint issue/media capture callers, governance request typing, and focused tests.
- Required architecture, API, authentication, database, deployment, Supabase setup, planning,
  progress, decision, known-issue, ADR, and worklog documentation.

### Migration and Tests

- Migrations: none.
- The focused coordinator suite passed 14/14 subtests.
- Mobile strict type-check and lint passed; all 21 mobile test files passed.
- Workspace formatting, lint, strict type-check, tests, production builds, secret scan, and
  whitespace validation passed. The root Node suite passed 72 tests with three provider-gated
  skips, and the 1,289-module Android Expo export completed.
- Representative physical-device validation remains open.

### Documentation Updated

Updated README, PROJECT_OVERVIEW, PLAN, architecture, API, authentication, database, deployment,
Supabase setup, TASKS, PROGRESS, DECISIONS, KNOWN_ISSUES, and this changelog. Added ADR-0029 and the
mobile-location-coordination worklog.

### Security and Breaking Changes

Exact current-area coordinates remain in process memory only and cannot satisfy complaint evidence.
No public/private data contract, RLS policy, Storage rule, or server-side routing decision changed.
There are no breaking changes.

## 2026-07-23 — Owner reports in mobile Community

### Summary

Added a privacy-safe signed-in **Your reports** section to mobile Community so a citizen can find a
newly submitted complaint immediately without waiting for reviewed public publication.

### Feature

- Loaded the existing owner-scoped complaint list whenever Community gains focus and derived a
  three-item newest-first preview.
- Kept owner loading/error/empty state independent of location acquisition and reviewed-public
  Local, Trending, and Heat state.
- Reused the authenticated complaint card/detail route without adding support or star controls.
- Preserved the publication boundary: private owner items are never adapted into public map,
  hotspot, ranking, or engagement data.

### Files Modified

- Mobile Community presentation, owner-preview projection helper, and focused tests.
- Required product, architecture, API, authentication, database, deployment, Supabase, planning,
  progress, decisions, known-issues, ADR, worklog, and changelog documentation.

### Migration and Tests

- Migrations: none.
- Mobile lint and strict type-check passed.
- All 22 mobile test files passed, including two focused owner-preview cases.
- Full workspace release-gate verification is recorded after the final documentation pass.

### Security and Breaking Changes

The feature reuses the existing bearer-authenticated actor-scoped complaint API and forced-RLS
database boundary. It does not expose another citizen's reports, publish private data, or change an
API/RLS/Storage contract. There are no breaking changes.

## 2026-07-23 — Physical V1 database and synchronization-prototype prune

### Summary

Reduced the application-owned database from 129 to 114 physical tables by removing only
never-deployed governance synchronization/versioned-contact structures and the unused public
comment table. Current complaint, Community, government workflow and ward-email capabilities remain
installed and locally verified.

### Feature

- Added forward migration `20260723110000_prune_deferred_v1_subsystems.sql`, removing fourteen
  governance source/run/snapshot/candidate/review/contact tables and
  `complaints.complaint_comments`.
- Rebound government delivery readiness to the active private
  `routing.ward_issue_contacts` matrix, retaining all 312 BMC ward/category rows and existing
  complaint assignment behavior.
- Removed the undeployed governance-sync Edge Function, configuration, draft seeds, generated
  integration tests and the zero-consumer `@local-wellness/database` governance-sync export/source/
  tests. The governance-import package remains.
- Updated the BMC submission runtime diagnostic to validate the 312-row V1 matrix instead of retired
  contact tables. Marked the legacy BMC mobile-demo verification artifact as historical and
  explicitly unsafe to run after the V1/prune path.
- Updated legacy pgTAP schema/contact assertions to validate the compact schema rather than
  referencing retired relations.

### Files Modified

- V1 prune migration, master/bootstrap generation artifacts, Supabase configuration and focused
  pruning/legacy pgTAP coverage.
- Governance-sync Edge/runtime/seed/package surfaces removed; governance import retained.
- Performance diagnostics and historical BMC mobile-demo verification guidance.
- Architecture/database/API/deployment/Supabase guidance, ADR-0031, V1 pruning worklog and required
  tracking documents.

### Migration and Tests

- Migration: `20260723110000_prune_deferred_v1_subsystems.sql`.
- A clean local reset completed on the compact schema.
- Database lint passed.
- All 46 pgTAP files passed 1,548 tests after legacy assertions were updated.

### Security and Operational Status

No complaint history, authorization evidence, active workflow, Community projection/engagement or
ward-email state is removed. Public comments and automated governance synchronization remain
unavailable. Hosted Supabase was not modified and still requires an operator backup/preflight,
ordinary migration application and post-migration smoke tests.

The 129→114 reduction is a maintainability and operational-surface improvement. It is not presented
as the root cause or fix for the earlier high-CPU/PostgREST request storm; hosted performance work
still requires query/request evidence. Any later physical reduction must wait for an approved
replacement, backfill, compatibility period, cutover/rollback plan and complete regression
coverage.

## 2026-07-23 — Physical V1 prune safety and final verification follow-up

### Summary

Hardened the forward prune so it fails closed on retained complaint history, incomplete replacement
contact coverage, active synchronization work, and unknown hosted-only dependencies. Completed the
full repository verification after regenerating all deployment artifacts.

### Safety hardening

- The migration now refuses to remove a non-empty `complaints.complaint_comments` table.
- Populated retired governance tables can be removed only when the owner-approved active
  replacement contains all 312 rows across 26 wards and 12 categories.
- The retired lease table is locked before checking for an active unexpired synchronization lease.
- Table and view drops use dependency-restricted behavior; no cascading drop can silently remove a
  hosted-only dependent object.
- Focused static and pgTAP coverage now checks these guards, retained readiness execution, and
  least-privilege function access.

### Verification

- A clean local reset applied all 50 migrations and current seeds.
- All 46 pgTAP files passed 1,550 tests; application-schema database lint passed.
- Formatting, lint, strict type-check, all 30 package test tasks, all 16 root test files, all 16
  production builds, generated database/master/current-session/BMC artifact checks, canonical
  governance checks, and secret scanning passed.
- Hosted Supabase was not modified. Backup, preflight, application, post-migration smoke testing,
  and optional Storage-bucket retirement remain operator actions.

### Breaking changes

The fourteen historical governance synchronization/versioned-contact tables and unused public
comment table are removed only after the forward migration is applied. Existing complaint,
Community, government workflow, private messaging, notification, accountability, SLA/KPI, and
ward-email contracts remain installed.

## 2026-07-23 — JagrukSetu detailed complaint taxonomy and exact Phone MFA diagnostics

### Summary

Implemented the reviewed JagrukSetu complaint hierarchy as a data-driven mobile classification
flow without replacing stable operational routing identifiers. Added Corruption, Bribery & Public
Integrity as a protected primary category and replaced the flat mobile category choice with two
dropdowns. Phone-verification errors now distinguish managed Advanced MFA setup from Twilio
delivery failure.

### Feature

- Generated 17 primary categories, 340 subcategories and 19 workflows from
  `resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md`.
- Mapped 13 taxonomy leaves to the 12 stable operational profiles and kept 327 leaves
  discoverable/resumable but unavailable for submission.
- Kept all 20 `COR` leaves private, `protected_pending`, unmapped and excluded from ordinary
  ward-email, public visibility, comments and Community support.
- Added authenticated `GET /api/v1/routing/categories/taxonomy`, strict public-safe RPC decoding,
  concurrent-miss coalescing and a 30-second successful-result cache.
- Added primary-category and **Subcategory / issue type** mobile dropdowns plus derived workflow,
  sensitivity and route-readiness feedback.
- Stored only the canonical taxonomy codes/workflow in draft custom attributes and revalidated the
  database-owned operational mapping on draft and complaint insertion.
- Added exact user guidance for `mfa_phone_enroll_not_enabled`,
  `mfa_phone_verify_not_enabled` and `sms_send_failed`.

### Files Modified

- Mobile complaint capture, taxonomy selection/dropdown, service decoders and tests.
- API routing controller/service/store, shared types/validation and tests.
- Taxonomy generator, migration, generated seed, SQL Editor artifact, database types/master
  artifacts and pgTAP coverage.
- Authentication error mapping/tests and the required project documentation/worklogs.

### Migration and Seed

- `supabase/migrations/20260723120000_jagruksetu_complaint_taxonomy.sql`
- `supabase/seed/55_jagruksetu_complaint_taxonomy.generated.sql`
- `supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql`

### Tests and Verification

- A clean local database run applied the current history; all 47 pgTAP files passed 1,589
  assertions.
- Focused taxonomy API verification passed 50 tests.
- Focused mobile taxonomy/client verification passed all four selected test files.
- Focused Phone MFA authentication verification passed 23 tests.
- Generated taxonomy, database-type and master/deployment drift checks passed.

### Documentation Updated

README, project overview, plan, architecture, API, authentication, database, deployment, Supabase
setup, trackers, ADR-0032 references and both implementation worklogs were aligned.

### Security and Hosted Status

The mobile never selects an official authority or recipient. Corruption has no unsafe generic
fallback, and submission revalidates current server-owned taxonomy mapping. Twilio credentials
under the ordinary Phone provider do not activate Advanced MFA Phone Enrollment/Verification; a
hosted project administrator must enable those settings. No hosted Supabase schema, seed or Auth
setting was changed by this local implementation.

### Breaking Changes

No existing operational category identifier or complaint route was replaced. The matching API and
migration/seed must be deployed before releasing the new mobile taxonomy client.

## 2026-07-24 — Citizen confirmed-phone OTP without Advanced Phone MFA

### Summary

Replaced the superseded citizen Advanced Phone MFA/AAL2 design with ordinary Supabase
confirmed-phone OTP while retaining email/password as JagrukSetu's primary presented sign-in.
Privileged Government Dashboard and Admin Console accounts continue to use their independent
TOTP/AAL2 policy.

### Feature

- Phone linking and confirmation use `phone_change` OTP and fail closed unless the initiating Auth
  user, normalized phone and `phone_confirmed_at` all match.
- The API checks current server-owned confirmed-phone state through the service-role-only
  `public.user_has_verified_phone` function; editable profile metadata and JWT phone claims do not
  satisfy the citizen gate.
- Supported password change and recovery send an ordinary SMS OTP with
  `shouldCreateUser: false` through an isolated, non-persistent Supabase client, bind the returned
  identity and phone, update the password immediately, and then revoke/clear sessions.
- Accounts without an already confirmed phone fail closed to reviewed support recovery; the
  superseded email-only zero-factor fallback and MFA-factor reset procedure are not current.
- Preferred configuration names are `API_CITIZEN_PHONE_VERIFICATION_MODE`,
  `EXPO_PUBLIC_PHONE_VERIFICATION_MODE`, and
  `NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE`. Former `*_PHONE_MFA_MODE` values remain deprecated
  compatibility fallbacks.

### Migration and Deployment Artifact

- Added `supabase/migrations/20260723130000_citizen_phone_verification_without_mfa.sql`.
- Added the complete SQL Editor alternative
  `supabase/deploy/citizen-phone-verification-without-mfa.sql`; running it does not reconcile the
  Supabase migration ledger automatically.

### Tests and Verification

- A clean local Supabase reset applied the current migration and seed history.
- All 48 pgTAP files passed 1,599 assertions.
- Application-schema database lint passed.
- Deterministic master-SQL generation/drift verification passed.
- Mobile/client validation remains pending and is not claimed by this entry.

### Documentation Updated

Updated README, project overview, plan, architecture, API, authentication, database, deployment,
Supabase setup, tasks, progress, decisions, known issues, the ADR-0033 worklog, historical
ADR/worklog supersession notes, and the obsolete lost-phone factor-reset warning.

### Security and Hosted Status

Ordinary Phone Auth makes a linked phone an alternate Supabase AAL1 login identity; JagrukSetu can
omit phone-only sign-in but cannot claim email/password is the only provider-level path. The fresh
phone password rule is enforced by supported application flows, not a provider-wide password hook.
Stale `phone_change` handling and lost-phone recovery remain managed release risks.

Hosted Supabase was not changed. Operators must apply migration 52, enable the ordinary Phone
provider/Twilio Verify and phone confirmations, disable phone signups, set the preferred enforcement
variables, and complete the installed-device/recovery matrix. Advanced Phone MFA may remain
disabled for citizens.

### Breaking Changes

Citizen access no longer requires an Advanced Phone MFA factor or AAL2 session. Existing accounts
that only enrolled a Phone MFA factor must link and confirm `auth.users.phone` through the new
ordinary Phone Auth flow before private citizen access. Privileged TOTP/AAL2 behavior is unchanged.

## 2026-07-24 — Phone Auth provider-gate correction and email-required signup hook

### Summary

Corrected the immediately preceding citizen-phone setup after a real local Auth E2E proved that
Supabase rejects `signInWithOtp({ phone, shouldCreateUser: false })` with
`phone_provider_disabled` when Phone Auth signup capability is off. The provider gate must remain
enabled for existing linked-phone SMS OTP. A Before User Created Auth Hook now rejects actual
phone-only user creation by requiring every new Auth user to carry an email.

This entry supersedes only the preceding instruction to disable phone signups. The ordinary
confirmed-phone design, email/password primary UI, alternate AAL1 linked-phone limitation,
isolated password-change client, and privileged TOTP/AAL2 boundary remain unchanged.

### Feature and Security

- Added `public.hook_require_email_identity(jsonb)`, executable only by
  `supabase_auth_admin`.
- Email-bearing Auth creation events are allowed; missing/blank-email creation returns a
  provider-compatible `email_required`/`403` error.
- Local Supabase enables Phone Auth, phone confirmations, deterministic test OTPs, and a non-secret
  placeholder Twilio Verify provider block so GoTrue exercises the phone path without sending SMS.
  Hosted environments must use real Twilio Verify credentials.
- Supported password flows still send `shouldCreateUser: false`; that is defense in depth and does
  not replace the server-owned creation hook.
- Hosted operators must activate `public.hook_require_email_identity` as the Before User Created
  Auth Hook. Creating the function through SQL does not activate the hosted hook automatically.

### Migration and Deployment Artifact

- Added `supabase/migrations/20260724100000_require_email_identity_for_auth_signup.sql`.
- Extended `supabase/deploy/citizen-phone-verification-without-mfa.sql` to contain both migrations
  52 and 53. SQL Editor execution still requires separate migration-ledger reconciliation.
- Regenerated the 53-migration master SQL and its 1–23/24–53 adaptive parts.

### Tests and Verification

- A clean local start applied all 53 migrations and current seeds.
- All 49 pgTAP files passed 1,607 assertions.
- Application-schema database lint passed; generated database types and master artifacts are
  current.
- Auth E2E passed 5/5: email OTP, phone link/confirmation, existing-phone SMS OTP password change,
  phone-only-signup denial through the hook, and government invitation.
- Mobile tests/type-check/lint/diff validation passed.
- Citizen Web passed all eight test files, type-check, lint and production build.
- Focused API/config tests, type-check, build and lint passed.

### Hosted Status

Hosted Supabase was not changed. Enable the ordinary Phone provider with real Twilio Verify, phone
confirmations and Phone Auth signup capability; apply migrations 52–53; activate the Before User
Created hook; then prove both existing-linked-phone OTP success and new phone-only-user denial.
Advanced Phone MFA may remain disabled for citizens.

## 2026-07-24 — Citizen recovery-session lifecycle hardening and integrated validation

### Summary

Hardened the mobile reset-password lifecycle so navigation cannot leave a newly established,
isolated recovery session alive, then completed the current citizen-auth client and workspace
integration checks.

### Feature and Security

- If the reset-password screen unmounts after email recovery exchange creates an isolated session
  but before phone inspection or password completion finishes, cleanup locally signs that
  isolated session out.
- No citizen `auth.mfa.*` or AAL2 path remains; privileged TOTP/AAL2 behavior is unchanged.

### Tests and Verification

- All 23 mobile test suites, mobile type-check/lint and the Expo Android export (1,293 modules)
  passed.
- Citizen Web's eight test files, type-check/lint and production build passed.
- Repository-wide tests, type-check and lint passed.
- Repository-wide formatting, secret scanning and the managed Supabase/Twilio device matrix remain
  separate gates and are not claimed by this entry.

### Hosted Status

Hosted Supabase was not changed. Migrations 52–53, the real Twilio Verify provider, phone
confirmations, Phone Auth signup capability and Before User Created hook activation still require
managed deployment and device verification.

## 2026-07-24 — Citizen-auth verification completion addendum

### Summary

Completed the remaining local repository checks for the citizen-auth change. This supersedes only
the preceding statement that repository formatting and secret scanning were still pending.

### Tests and Verification

- Targeted Prettier passed.
- Tracked/current-history secret scanning passed.
- Repository diff checks passed.

The managed Supabase/Twilio device matrix remains pending; hosted Supabase was not changed.

## 2026-07-24 — Hosted phone-verification diagnosis and mobile OTP-state repair

### Summary

Diagnosed the current managed OTP failure with a read-only hosted probe and repaired a separate
mobile Auth lifecycle race. Hosted Phone Auth is enabled with Twilio Verify and phone confirmation,
but migration 52 is absent from PostgREST, so protected citizen API access fails closed before any
hosted account can complete the intended confirmed-phone path.

### Feature and Fix

- Keyed the mobile phone-verification screen's initial inspection by stable authenticated user ID.
  Supabase's expected same-user `USER_UPDATED` event after `updateUser({ phone })` can no longer
  reset OTP code entry back to phone entry.
- Added focused initial-user, repeated-same-user and changed-user regression coverage.
- Extended `supabase/deploy/citizen-phone-verification-without-mfa.sql` to request an immediate
  PostgREST schema reload and return five explicit installation/grant checks.
- Added the preferred local API and Expo phone-verification mode names while preserving the
  deprecated compatibility inputs.

### Managed Diagnostic

- Hosted Auth settings report the ordinary Phone provider enabled, phone auto-confirmation
  disabled and `twilio_verify` selected.
- `public.user_has_verified_phone(uuid)` returns `PGRST202`; the current API therefore reports
  `DEPENDENCY_UNAVAILABLE` while determining citizen verified-phone state.
- All fifteen hosted Auth users are email-bearing and none currently has a confirmed phone.
- The direct database hostname is IPv6-only from this environment, the available pooler credential
  was rejected, and no authenticated browser/management session was available. Hosted schema and
  Auth-hook activation were therefore not changed.

### Tests and Documentation

- The focused mobile password/phone suite passes all 18 cases, including the new Auth-event
  regression.
- Updated authentication, Supabase setup, tasks, progress, decisions, known issues and the
  citizen-phone worklog.

### Remaining Operator Step

Run `supabase/deploy/citizen-phone-verification-without-mfa.sql` in hosted SQL Editor and require all
five returned checks to be `true`, then activate `public.hook_require_email_identity` as the Before
User Created Auth Hook. Re-test initial phone confirmation before investigating Twilio carrier
delivery.

## 2026-07-24 — Mobile Supabase Auth-lock repair

### Summary

Removed a second mobile OTP/session failure mode by dropping the pinned Auth SDK's deprecated
custom process lock and keeping authoritative phone-state follow-up outside the immediate Auth
callback.

### Feature and Fix

- Removed `processLock` from the persistent React Native client. The pinned SDK coordinates refresh
  concurrency internally, while its legacy custom-lock auto-refresh branch produced the observed
  zero-millisecond acquisition warnings.
- Deferred `getUser()` follow-up until the Auth callback returns.
- Assigned each session resolution a monotonic ID and cancelled stale scheduled work after a newer
  event, sign-out or provider unmount.
- Added regression coverage for deferred execution and cancellation.

### Tests and Documentation

- All 23 mobile test suites pass.
- Mobile type-check and lint pass.
- Updated authentication, decisions, tasks, progress, known issues and the confirmed-phone worklog.

### Hosted Status

Hosted Supabase was not modified. The missing `public.user_has_verified_phone(uuid)` function and
Before User Created hook activation remain the managed blocker tracked by `AUTH-010`.

## 2026-07-24 — Existing-authenticator phone-change compatibility

### Summary

Attributed the managed `PUT /auth/v1/user` HTTP `401` and added a narrow compatibility path for a
citizen account that already has a verified TOTP factor. Supabase was rejecting the phone mutation
with `insufficient_aal` before Twilio Verify because the current session was AAL1 while the account
could reach AAL2.

### Feature and Security

- Ordinary citizens without a verified factor continue directly to the existing `phone_change`
  SMS flow.
- An account with a pre-existing verified TOTP factor now receives an authenticator challenge
  first. The client requires a normalized six-digit code, successful `challengeAndVerify`, the
  expected user identity and current AAL2 before allowing phone entry.
- No factor is enrolled, deleted, persisted or logged, and no service-role phone update bypass was
  introduced.
- Privileged Government Dashboard and Admin Console TOTP/AAL2 policy is unchanged.

### Files and Documentation

- Updated the mobile phone-verification assurance helper, screen and focused password/phone tests.
- Added ADR-0034 and cross-linked ADR-0033.
- Updated authentication, tasks, progress, decisions, known issues and the citizen confirmed-phone
  implementation/testing worklog.
- No migration was created and there is no breaking public API change.

### Tests and Verification

- Focused mobile Auth-state and password/phone tests pass.
- Mobile type-check and lint pass.
- All 23 mobile suites and the 1,293-module offline Android export pass.
- A live temporary email-backed Auth identity received an accepted exact `phone_change` provider
  request for the user-supplied number, and test-identity cleanup completed. Handset receipt and
  code verification were not asserted.
- The managed inspection was read-only. The existing TOTP factor and hosted Auth user were not
  modified.

### Remaining Managed Step

Reload the updated mobile build and complete the existing authenticator challenge before requesting
the phone SMS. If the authenticator is unavailable, use attributed administrator factor recovery
or a separate citizen account; do not bypass or automatically delete the factor. Hosted migrations
52–53 and the Before User Created hook remain independently required under `AUTH-010`.

## 2026-07-24 — Authenticator and SMS step clarification

### Summary

Clarified the mobile compatibility screen after a citizen mistook the pre-existing TOTP challenge
for an SMS OTP.

### User Experience

- The screen now states that no SMS is sent during the authenticator step.
- It directs the user to the rotating six-digit code in the app that scanned the earlier QR code
  and surfaces the factor label when available.
- It explains that the mobile-number field and SMS challenge appear only after successful TOTP
  verification.
- It identifies attributed administrator factor reset as the recovery path when that authenticator
  is no longer accessible.

### Security and Compatibility

- No factor, Auth policy or provider behavior changed.
- TOTP remains non-resendable; the existing resend cooldown remains limited to the subsequent SMS
  challenge.

### Hosted Follow-up

- The operator reported applying the combined citizen-phone SQL and activating the Before User
  Created hook.
- A service-role probe now resolves `public.user_has_verified_phone(uuid)` successfully and returns
  `false` for the affected citizen, closing the former hosted RPC blocker.
- The affected account still has one verified TOTP factor labelled `Local Wellness government
dashboard`; factor reset remains an explicit administrator action because it signs out active
  sessions.

## 2026-07-24 — Authorized legacy citizen authenticator reset

### Summary

Removed the affected citizen's inaccessible legacy Government Dashboard TOTP factor after the user
explicitly authorized that destructive security action.

### Hosted Result

- Matched exactly one verified TOTP factor by type, status and expected friendly label before
  deletion.
- Deleted only that factor through the Supabase Auth administrator MFA API.
- Verified that the Auth user still exists, zero verified factors remain and no phone is yet
  verified.
- Supabase invalidated the account's active sessions as expected for deletion of a verified factor.

### Next Verification

Sign in again with email and password. The mobile app should now skip the authenticator step, show
the phone-number field, and proceed to the ordinary `phone_change` SMS flow.

## 2026-07-24 — Complaint result repair and isolated ward-email delivery

### Summary

Fixed the recurring false “Report not submitted” result after a complaint had already committed,
and activated a low-frequency email-only worker without restarting unrelated background pollers.

### Complaint Contract

- The API now returns the declared `ComplaintReceipt` shape and no longer duplicates `categoryId`
  inside the nested routing summary.
- Mobile remains compatible with the earlier first-submit response, validates that the duplicate
  category matches, normalizes it away, and continues to reject undeclared/private fields.
- Added API and mobile regression coverage for first submission, replay, mismatched categories, and
  private-field rejection.

### Ward Email

- Added a dedicated 60-second ward-email process, bounded continuous batches, clean shutdown, and a
  one-row smoke command.
- Worker scripts now load the ignored repository-root environment without exposing SMTP values.
- Verified SMTP authentication, processed the bounded hosted-staging backlog, and persisted
  provider message IDs including the current K/W complaint.
- Provider acceptance is recorded; recipient-mailbox arrival, bounce behavior, and government
  acknowledgement remain unverified.

### Files and Architecture

- Updated mobile response decoding/tests, API complaint response construction/tests, worker
  entrypoints/tests/scripts, and the relevant setup, API, architecture, deployment, database, task,
  progress, decision, and known-issue documentation.
- Added ADR-0035 for isolated ward-email operation.
- No database migration or breaking public API was introduced; the API output now matches its
  existing declared contract.

### Verification

- API tests passed.
- Mobile tests passed 141/141; mobile type-check and lint passed.
- Worker tests passed 30/30; worker type-check, lint, and build passed.
- SMTP transport verification and two bounded provider-accepted sends completed without logging
  credentials, recipient values, descriptions, or coordinates.

## 2026-07-24 — Ambiguous complaint-submission recovery

### Summary

Prevented a network or successful-response decoding problem from being presented as a definite
complaint failure when the server may already have committed the report.

### Mobile

- Classifies only `NETWORK_ERROR` and `INVALID_RESPONSE` as unknown submission outcomes.
- Shows “Submission status unknown,” explains that the report may have been received, and
  prioritizes opening owned complaints before retrying.
- Keeps attributed validation, routing, dependency, cancellation and local errors on the ordinary
  failure path with sanitized copy.

### Verification

- Mobile tests passed 141/141.
- Mobile type-check, lint and diff validation passed.
- No migration or public API change was introduced.

## 2026-07-24 — Complete JagrukSetu BMC V1 intake and protected handoffs

### Summary

Classified every one of the 340 complaint leaves for Mumbai V1 without creating a ward/category
cross-product. Preserved 13 specialised mappings, mapped 243 public/restricted leaves to one
general ward profile, and gave all 84 private/emergency-private leaves official protected
handoffs.

### Database and Generated Data

- Added migration `20260724110000_v1_bmc_general_intake_and_handoffs.sql`.
- Added the private, forced-RLS `routing.complaint_handoff_actions` registry with digits-only call
  and credential-free HTTPS browser targets.
- Added fail-closed taxonomy readiness requiring a verified profile/domain/rule and complete
  owner-approved ward-contact coverage.
- Added taxonomy-aware complaint labels to owner list/detail, government list/detail and ward-email
  claims.
- Added the versioned intake source overlay, deterministic generator, 340-row route worklist,
  import-ready data, validation reports/manifests and seed
  `56_jagruksetu_bmc_intake.generated.sql`.
- Added `supabase/deploy/jagruksetu-bmc-intake-v1.sql`, which embeds the exact migration and seed
  bytes with SHA-256 metadata.
- Final local counts are 256 submittable leaves, 84 protected handoffs, 13 operational profiles,
  338 private ward/profile contacts, 29 approved actions and 115 application-owned tables.

### API and Mobile

- Extended the strict shared/API/mobile taxonomy contract with `protected_handoff` and camel-case
  `handoffActions`.
- Protected selections now show official help and suppress description, location, media,
  duplicate-check, submission, email and Community side effects.
- Telephone actions open the native dialler; browser actions use the existing Expo in-app browser.

### Tests and Documentation

- Added generator regression tests and pgTAP plan 054; updated final-state database assertions.
- Clean Supabase reset passed. All 50 pgTAP files passed 1,640 assertions; focused plan 054 passed
  33/33.
- Application-schema database lint passed without errors; an all-schema inspection found only
  pre-existing PostGIS extension-body false positives.
- The generator passed 6/6 tests plus drift/lint/format checks. Focused API verification passed 51
  tests and focused mobile verification passed 16.
- Full API and mobile suites passed 234/234 and 143/143 respectively; shared types, API and mobile
  type-check/lint passed.
- Regenerated the 54-migration master artifacts and database types.
- Updated README, roadmap, architecture, API/database/deployment/Supabase/governance guides,
  tracking documents and the feature worklog.
- Added ADR-0036. No hosted Supabase project was changed; applying the generated SQL Editor
  artifact remains an operator step.

## 2026-07-24 — Compact localised mobile experience and civic-area offices

### Summary

Completed the current mobile-polish plan with smaller typography, restrained green/saffron/white/
blue surfaces, filled code-native icons, contextual automatic location, owner-private Community
reports, and a sanitized nearby-office directory. The visible mobile product name remains
JagrukSetu.

### Mobile Experience

- Added a compact shared React Native theme, reusable civic icons, and a rounded detached
  five-destination bottom navigation.
- Localised the authenticated shell, Auth, Home, complaints, one-page report form and result,
  evidence, accountability, Community, Civic Area, notifications, menu, and Profile in English,
  Hindi, and Marathi with typed key and placeholder parity.
- Reused a valid current-area fix in process memory for five minutes, coalesced concurrent
  requests, limited automatic permission prompting to once per process, and retained explicit
  recovery. Complaint and media evidence still require a fresh high-accuracy fix.
- Added the newest three owner-private complaints to Community independently of location or public
  review, virtualised long feeds, and deferred Heat requests until Heat is selected.
- Kept complaint capture on one autosaving page with automatic location/duplicate progression, a
  visible blocker list, one final action, and dedicated success, failure, and unknown result
  routes.

### Civic-Area Office Contract

- Added migration `20260724120000_verified_civic_area_office_contacts.sql` and the byte-identical
  `supabase/deploy/civic-area-office-contacts.sql` SQL Editor artifact.
- Extended the verified governance projection with at most 25 exact-ward and explicitly
  municipality-scoped offices.
- Exposed only public name, type, optional address/phone/email, verification date, and official
  HTTPS source. Operational routing recipients, WhatsApp contacts, officer mobiles, internal
  identifiers, geometry, and unpublished records remain private.
- Added strict shared validation, API/mobile decoding, safe dialler/mail/in-app-browser actions,
  stale-response suppression, and rolling-deployment compatibility.

### Verification

- Clean local Supabase reset passed all 55 migrations; all 51 pgTAP plans passed 1,655 assertions.
- Database lint, generated types, 55-migration master/current-session drift, SQL artifact byte
  identity, and the new master-migration fingerprint test passed.
- Shared validation passed 61 tests; API passed 235 tests plus strict type-check, lint, and build.
- Localisation passed 3 tests, strict type-check, lint, and build.
- Mobile passed 156 tests, strict type-check, lint, and a fresh 1,305-module Android export.
- Targeted formatting, source/diff checks, and visible-brand/legacy-shadow scans passed.

### Documentation and Architecture

- Updated product, roadmap, architecture, Auth, API, database, deployment, Supabase setup,
  decision, issue, task, progress, and mobile worklog documentation.
- Amended ADR-0029 for the purpose-scoped location behavior and added ADR-0037 for the public-safe
  civic-area office projection.
- No breaking API change and no hosted Supabase or production infrastructure change was made.
