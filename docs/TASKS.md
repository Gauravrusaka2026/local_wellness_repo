# TASKS.md

## Project Status

- Project: Local Wellness
- Current phase: Phase 4 — Citizen complaint capture
- Current sprint: Sprint 5 — Secure complaint capture and governance synchronization operational slice
- Overall implementation progress: 42%
- Phase 0 implementation progress: 100%
- Phase 1 implementation progress: 100%
- Phase 2 implementation progress: 90%
- Phase 3 implementation progress: 85%
- Phase 4 implementation progress: 90%
- Last updated: 2026-07-14

## Phase 0 Scope

Phase 0 establishes only the buildable repository foundation. It does not contain authentication, database schemas or migrations, complaints, routing, maps, Socket.IO events, Supabase logic, APIs, product UI, or business logic.

Phase 0 deferred all feature dependencies. Phase 1 introduced only its required Supabase, SecureStore, SSR, and Zod dependencies; later product libraries remain deferred, while BullMQ is excluded from V1 by ADR-0007.

## Completed Phase 0 Execution Plan

### Repository Foundation

- [x] Initialize the root package manifest and pin pnpm 11 through Corepack.
- [x] Configure pnpm workspaces for `apps/*` and `packages/*`.
- [x] Configure the Turborepo task graph and generated-output caching.
- [x] Add strict shared TypeScript configurations.
- [x] Add root TypeScript project references for every application and package.
- [x] Add workspace structure verification tests.
- [x] Expand `.gitignore` for generated artifacts while keeping safe environment templates trackable.
- [x] Commit a deterministic pnpm lockfile.

### Code Quality and Change Management

- [x] Configure ESLint for TypeScript, React, React Native, and Node sources.
- [x] Configure Prettier and repository-wide format checks.
- [x] Configure Husky and activate the Git hooks path.
- [x] Configure and validate lint-staged.
- [x] Configure and validate Changesets.
- [x] Add an explicit pnpm dependency build-script allowlist.
- [x] Add narrow security overrides for vulnerable transitive dependencies.

### Applications

- [x] Initialize `apps/mobile` as an Expo Router TypeScript application.
- [x] Initialize `apps/citizen-web` as a Next.js TypeScript application.
- [x] Initialize `apps/government-dashboard` as a Next.js TypeScript application.
- [x] Initialize `apps/admin-console` as a Next.js TypeScript application.
- [x] Initialize `apps/api` as a controller-free NestJS TypeScript application.
- [x] Initialize `apps/realtime-server` as a Socket.IO TypeScript server without events.
- [x] Initialize `apps/workers` as a TypeScript process without jobs or business logic.

### Shared Packages

- [x] Initialize `packages/database`.
- [x] Initialize `packages/api-client`.
- [x] Initialize `packages/types`.
- [x] Initialize `packages/validation`.
- [x] Initialize `packages/routing-engine`.
- [x] Initialize `packages/design-system`.
- [x] Initialize `packages/localization`.
- [x] Initialize `packages/config`.
- [x] Initialize `packages/observability`.
- [x] Verify every shared package resolves and builds independently.

### Platform Directories and Containers

- [x] Initialize `supabase/migrations`.
- [x] Initialize `supabase/seed`.
- [x] Initialize `supabase/functions`.
- [x] Initialize `supabase/policies`.
- [x] Initialize `supabase/tests`.
- [x] Initialize `infrastructure/docker`.
- [x] Initialize `infrastructure/terraform` without provider configuration.
- [x] Initialize `infrastructure/monitoring` without vendor configuration.
- [x] Add the Phase 0 development Docker Compose reservation with Redis and the three Node runtimes; Redis was later removed from the V1 topology by ADR-0007.
- [x] Add production container definitions for the API, realtime server, and workers.
- [x] Run successful production builds for all three container definitions.

### Continuous Integration

- [x] Add GitHub Actions checks for frozen installation, peers, dependency audit, formatting, linting, type checking, tests, builds, and Docker Compose validation.
- [x] Pass CI telemetry controls through the Turborepo environment boundary.
- [x] Keep migration validation deferred until the first database migration exists.

### Verification

- [x] Run frozen dependency installation.
- [x] Run peer-dependency validation.
- [x] Run Prettier in check mode.
- [x] Run ESLint across all 16 application and package workspaces.
- [x] Run strict TypeScript checks and root project-reference compilation.
- [x] Run the workspace structure tests.
- [x] Build all 16 application and package workspaces.
- [x] Export the Expo Android bundle.
- [x] Build all three Next.js applications.
- [x] Validate Docker Compose configuration.
- [x] Build the API, realtime-server, and workers production images.
- [x] Run a full dependency audit with no known vulnerabilities reported.
- [x] Confirm feature APIs, database logic, Socket.IO events, product UI, and later-phase dependencies are absent.

### Documentation and Traceability

- [x] Read all project documents and confirm the Phase 0 boundaries.
- [x] Record the pre-implementation strategy, state, and blockers.
- [x] Update this execution tracker.
- [x] Append the Phase 0 session to `CHANGELOG.md`.
- [x] Update `PROGRESS.md` with verified implementation progress.
- [x] Update `DECISIONS.md` with foundation conventions.
- [x] Update `KNOWN_ISSUES.md` with unresolved blockers and technical debt.
- [x] Create ADRs for architectural decisions implemented during Phase 0.
- [x] Create the Phase 0 implementation worklog.

## Phase 1 Execution Plan

### Supabase Identity Data

- [x] Initialize and pin the local Supabase CLI configuration.
- [x] Create the additive identity migration series for profiles, devices, roles, user roles, authority memberships, and authentication audit events.
- [x] Provision profiles from Supabase Auth identities without trusting client role metadata.
- [x] Seed the documented system roles idempotently.
- [x] Add indexes, expiry constraints, append-only audit protection, atomic device lifecycle functions, and generated database types.

### Authentication and Sessions

- [x] Implement citizen phone OTP and email OTP or magic-link authentication.
- [x] Persist mobile sessions with Expo SecureStore and web sessions with the Supabase PKCE cookie integration.
- [x] Implement profile setup and preferred-language updates.
- [x] Require a client SHA-256 installation digest, hash it again server-side, and never store the raw installation identifier.
- [x] Implement sign-out and authenticated callback handling without raw access/refresh token callback pairs.

### Government Access

- [x] Implement server-controlled government invitations with a delivered token-hash invite flow.
- [x] Implement authority memberships and time-bound scoped role assignments.
- [x] Expose the authenticated user's effective access scope.
- [x] Prevent cross-authority access and direct client role escalation.
- [x] Record authentication and access-management audit events without secrets, tokens, or OTPs.

### API and Shared Contracts

- [x] Add shared identity types and Zod request validation.
- [x] Add authenticated profile, device, access-scope, audit, and invitation REST endpoints.
- [x] Add request identifiers and the documented API response/error envelope.
- [x] Keep the Supabase secret/service-role credential isolated to the trusted API runtime.

### Security and Verification

- [x] Add migration invariant and atomic lifecycle tests.
- [x] Add pgTAP RLS tests for anonymous, self, cross-user, cross-authority, former-member, expired, revoked, sensitive-column, and escalation cases.
- [x] Add API unit and HTTP contract tests with mocked Supabase boundaries.
- [x] Add local Auth-flow coverage for email magic links and delivered government invitations, with phone E2E explicitly gated on an SMS provider and phone dispatch covered by unit tests.
- [x] Run database reset, database lint, generated-type verification, formatting, lint, type-check, tests, all-workspace builds, Compose validation, and the production dependency audit.

### Documentation and Traceability

- [x] Update every Phase 1-relevant project document and tracker.
- [x] Create the Phase 1 authentication/RLS ADR and implementation worklog.
- [x] Record the owner-directed V1 deferral of Redis, BullMQ, and Sentry in an ADR and active architecture documents.

## Phase 2 Execution Plan

### Canonical Data Audit

- [x] Inspect all 18 governance CSV files without modifying the canonical inputs.
- [x] Record file schemas, counts, checksums, malformed rows, duplicates, missing identifiers, placeholders, provenance gaps, and cross-file import risks.
- [x] Confirm that the CSV directory contains 887 data records plus README metadata and that every data file uses a workbook-title row before its actual header.
- [x] Record the missing requested `resources/governance/csv/seed_data_for_mh/` directory and use the existing read-only `resources/governance/csv/` files as the available CSV source.
- [ ] Cross-check workbook-to-CSV parity when the approved spreadsheet artifact runtime is available; the CSV files remain the machine-readable source of truth.

### Governance Database Model

- [x] Create the `governance` schema and normalized tables for states, districts, talukas, authorities, local bodies, local-body district coverage, wards, departments, offices, officer roles, officers, officer assignments, utilities, emergency contacts, and complaint-routing references.
- [x] Add durable source provenance, verification state, placeholder state, LGD-code fields, lifecycle fields, constraints, foreign keys, and indexes.
- [x] Enable PostGIS and add versioned jurisdiction-boundary storage with spatial indexes.
- [x] Version officer assignments and complaint-routing reference records separately from their durable identities.
- [x] Add the Phase 1 authority foreign keys as an additive forward fix after creating canonical governance authorities (`DB-001`).
- [x] Create an ADR for the normalized, versioned, CSV-driven governance registry and its server-managed access boundary.

### Validation and Seed Pipeline

- [x] Implement deterministic CSV validation for exact headers, malformed rows, duplicate keys, incomplete records, placeholder sentinels, dates, URLs, identifiers, and cross-file references.
- [x] Generate an idempotent Supabase seed from the canonical CSV files without editing them.
- [x] Record source-file, workbook, and generated-seed checksums, raw source rows, normalization dispositions, and validation issue codes for import traceability.
- [x] Import durable structural/reference records with explicit verification status while quarantining template Gram Panchayat/village rows and non-person officer placeholders.
- [x] Preserve incomplete routing rows as non-routable versioned references until department, role, authority, and asset ownership mappings are verified.
- [x] Generate and commit a machine-readable validation report and document the baseline import and reviewed refresh workflow.

### Security, Types, and Verification

- [x] Enable and force RLS on governance tables with least-privilege grants and policies appropriate to verified public-safe versus server-managed data.
- [x] Add a Phase 2 integrity forward fix so historical ward/department scopes, parent reassignments, and verified child visibility cannot bypass canonical governance ownership.
- [x] Enforce structured authority parent types, immutable hierarchy keys, whole-graph cycle rejection, and valid SRID 4326 coordinate envelopes.
- [x] Make the API load effective access through service-only database functions that reject inactive authorities and invalid ward/department scope targets.
- [x] Exclude retained legacy placeholder authorities from effective roles and memberships without deleting their remediation history.
- [x] Add migration, seed, RLS, source-integrity, and synthetic spatial-routing tests.
- [x] Add behavioral governance RLS and version-history suites, including anonymous denial, manager isolation, placeholder filtering, append-only history, and overlap rejection.
- [x] Correct the interrupted seed provenance assertion to use the exact canonical district source URL.
- [x] Verify inactive boundaries do not resolve, historical boundary versions remain queryable, and officer assignments cannot overlap an open assignment for the same scope.
- [x] Regenerate committed database types for `public` and `governance`.
- [x] Wire atomic database-type generation, drift checking, and application-schema database lint into the root scripts and CI.
- [x] Run formatting, lint, type-check, unit tests, local database reset/lint/pgTAP, generated-seed drift checks, all-workspace builds, dependency audit, and Compose validation.
- [x] Start the citizen web, government dashboard, and admin console and verify their public/auth routes and access redirects over HTTP without adding Phase 3+ UI.
- [ ] Complete the owner-requested rendered visual inspection when the approved in-app browser is connected (`ENV-003`).

### Documentation and Traceability

- [x] Update the database, architecture, authentication, API, deployment, Supabase setup, and governance import documentation.
- [x] Update TASKS, CHANGELOG, PROGRESS, DECISIONS, KNOWN_ISSUES, and the Phase 2 worklog with final results and unresolved data gaps.

## Phase 3 Execution Plan

Phase 3 engineering may use synthetic records inside rollback-isolated tests, but operational resolution must reject placeholder, unverified, inactive, expired, or non-routable records. Pune Municipal Corporation is the reference pilot for architecture and test planning only; no Pune municipality, ward, department, officer, or routing branch may be hardcoded in application logic.

### Routing Persistence and Spatial Resolution

- [x] Add additive, versioned routing tables for issue categories, category aliases, assets, asset ownership, routing rules, fallback edges, confidence policies, and decision evidence.
- [x] Seed the 12 owner-approved pilot categories as database records without hardcoding jurisdiction or recipient mappings in application source.
- [x] Implement service-only PostGIS candidate queries that reuse versioned governance boundaries and filter inactive, placeholder, unverified, expired, and non-routable records.
- [x] Add constraints, indexes, immutable/version-history guards, least-privilege grants, forced RLS, and migration/RLS tests for the routing schema.

### Routing Package and API

- [x] Add shared routing contracts and strict request validation for coordinates, category selection, asset evidence, routing results, explanations, and duplicate candidates.
- [x] Implement deterministic jurisdiction, asset-owner, department, officer-role, assignment, fallback, confidence, and explanation evaluation in `packages/routing-engine`.
- [x] Implement GIS and routing repository ports so the package remains database-driven and independent of Supabase/NestJS.
- [x] Implement the duplicate-detection scoring framework without introducing complaint persistence or pretending that an empty complaint store is operational coverage.
- [x] Add authenticated NestJS routing and category APIs backed by service-role database adapters and structured NestJS logging.
- [x] Add unit, integration, API-contract, negative-placeholder, ambiguity, fallback, and duplicate-scoring tests.

### Governance Synchronization Foundation

- [x] Add a review-gated synchronization model for official-source definitions, retrieval runs, immutable raw snapshots, normalized candidates, change sets, review items, and provenance evidence.
- [x] Define retrieval, normalization, matching, validation, change-detection, and publication interfaces without adding a scheduler, external scraper, Redis, or BullMQ.
- [x] Preserve the hash-pinned CSV bundle as the canonical bootstrap input and prevent automated synchronization from overwriting or promoting it.
- [x] Document future scheduled retrieval, officer-assignment/contact/local-body/ward/emergency/utility refresh, conflict review, and verified publication workflows.

### Verification and Traceability

- [x] Regenerate committed database types and verify zero drift.
- [x] Run governance source validation, migration reset/lint, pgTAP, formatting, lint, type-check, aggregate tests, builds, Compose validation, and dependency/security checks.
- [x] Run an application/API smoke test without adding Phase 4 complaint submission, maps, dashboards, media, or realtime features.
- [x] Create ADRs for the database-evidence routing pipeline and review-gated governance synchronization boundary if those decisions are implemented.
- [x] Update all required project documents and clearly separate engineering-complete outcomes from pilot-data-validation gaps.

## Cross-Cutting Governance Synchronization Workstream

This permanent workstream extends the Phase 2 registry and Phase 3 review-gated foundation. It is
not a one-time import and does not change the current Phase 4 product-phase percentage. Official
source retrieval, parsing, matching, review, and publication remain separate gates; retrieving an
official page never verifies or activates a governance record automatically.

### Scheduling, Retrieval, and Raw Evidence

- [x] Add PostgreSQL due-source claiming with `FOR UPDATE SKIP LOCKED`, short leases, expired-run
      failure/backoff without immediate reclamation, bounded retry state, and append-only
      synchronization events; claim exactly one source per dispatch.
- [x] Add service-role-only claim, snapshot/freshness, and failure RPCs with exact lease ownership,
      180–900 second trusted lease limits, conditional-request metadata, HTTP 304 reuse, exact
      Storage size/MIME validation, and safe error records.
- [x] Add the `governance-sync-fetch` Edge Function with a dedicated dispatch secret, exact HTTPS
      host allowlists, manual redirect checks, timeouts, response-size/MIME limits, content hashing,
      300–900 second heartbeat-protected leases, private content-addressed Storage writes,
      safe byte retention after ambiguous finalization, and structured secret-free logs.
- [x] Pin source activation to a deterministic contract SHA-256 approved by an active global
      platform administrator; reject unsupported MIME contracts, URL fragments, and non-443 remote
      endpoints.
- [x] Make the contract-hash schema addition safe for populated upgrades by adding it nullable,
      deterministically backfilling through the trigger, then applying `NOT NULL`; add a root
      migration-safety regression that confirms a 64-character hash on an existing endpoint.
- [x] Register ten official PMC/BMC pilot endpoints as draft, unverified, inactive source records;
      no source was activated, fetched on a schedule, or applied to a hosted environment.
- [x] Add the generic service-only, forced-RLS `sync_scope_targets` registry with immutable
      authority/local-body/ward hierarchy, active-global-platform-admin review for activation, and a
      routing gate independent from synchronization selection.
- [x] Seed five Pune and five Brihanmumbai canonical ward targets by source ward code, all draft,
      unverified, unapproved, placeholder-backed, and non-routable.
- [ ] Deploy the Edge Function in each approved environment, configure its dispatch/service
      secrets, review and activate selected source records, and create the environment-owned Supabase
      Cron invocation (`GOVSYNC-001`, `ENV-002`, `SEC-001`).
- [ ] Resolve and reject private/reserved DNS results before and after connection to harden the
      exact-host fetch boundary against DNS rebinding (`GOVSYNC-002`).
- [ ] Add a retention/reconciliation job for immutable Storage objects whose database finalization
      did not complete (`GOVSYNC-003`).

### Normalization, Versioning, Review, and Publication

- [x] Add durable governance contact channels plus immutable effective-dated versions, source
      evidence, visibility classification, verification metadata, and distinct manual publication and
      complaint-delivery approvals.
- [x] Bind each contact publication to one single-use approved review and the exact owner UUID,
      normalized value, source URL, evidence-value hash, and complaint-delivery decision.
- [x] Add a pure contact normalizer for email, phone, HTTPS URL, and address records that detects
      malformed, duplicate, incomplete, placeholder, cardinality, and parser-layout failures and can
      claim no more than `source_verified`; require current source-contract approval and approved
      source hosts for official-source trust.
- [ ] Implement source-specific, fixture-backed PMC HTML/API and BMC HTML/PDF parsers with expected
      layout/cardinality contracts and repeated-empty/disappearance safeguards.
- [ ] Implement canonical entity matching, change detection, review API/UI, and transactional
      append/close publishers for officers, assignments, offices, wards, departments, utilities,
      emergency contacts, and contact versions.
- [ ] Validate every candidate against record-specific official evidence; manually approve only
      current values, and keep conflicting, stale, placeholder, or unverified records non-routable and
      ineligible for complaint delivery.

### Verification and Traceability

- [x] Add 11 Edge fetch/authorization/redirect/limit/finalization tests, 9 contact-normalizer tests,
      the root migration-safety regression, and pgTAP scheduling/lease/RLS/contact-version/
      publication tests.
- [x] Apply the additive synchronization migrations and pilot source/scope seeds in a clean reset;
      all 657 pgTAP assertions passed across 18 plans. Plans 016–018 contribute 100 assertions
      (`44 + 26 + 30`); database lint reported only extension-owned PostGIS diagnostics.
- [x] Record the scheduler/runtime decision in ADR-0012 and document engineering completion
      separately from source activation, parser coverage, verified production data, and hosted rollout.

## Phase 4 Execution Plan

Phase 4 implements the mobile citizen complaint-capture workflow and its trusted persistence/API
boundary. Complaints must remain private by default, exact locations and original media must never
be public, clients cannot select official recipients, and submission must fail safely when the
database cannot produce a verified route. The current non-routable bootstrap may support UI and
negative-path engineering, but it cannot produce a production complaint assignment.

### Prerequisites and Architecture

- [x] Fix the citizen email magic-link callback to use the exact allow-listed same-origin route and
      add regression coverage (`AUTH-006`).
- [x] Record the Phase 4 complaint persistence, private signed-upload, immutable history, and
      server-owned submission decision in an ADR.
- [x] Define shared complaint, location, media, duplicate-suggestion, submission, receipt, and
      timeline contracts plus strict validation schemas.

### Complaint and Media Persistence

- [x] Add an unexposed, forced-RLS `complaints` schema for citizen drafts, complaints, location
      evidence, media, status history, initial assignments, supporters, and idempotency evidence.
- [x] Create private original-media, voice, thumbnail, and resolution-evidence Storage buckets with
      narrow signed-upload paths; do not create public media in Phase 4.
- [x] Add server-only draft CRUD, media-intent/finalization, duplicate-candidate, submission, and
      complaint-read functions with ownership, lifecycle, checksum, size, type, count, routing, and
      idempotency enforcement.
- [x] Make complaint status history and submitted location/routing evidence immutable, preserve UTC
      timestamps, and prevent clients from choosing authority, ward, department, role, assignment, or
      official status.
- [x] Add indexes, foreign keys, append-only guards, least-privilege grants, Storage policies, and
      migration/RLS/idempotency/concurrency tests.

### API and Duplicate Integration

- [x] Implement authenticated complaint draft CRUD, media upload intent/finalize/status, duplicate
      suggestions, idempotent submission, receipt, list/detail, and timeline endpoints.
- [x] Connect privacy-safe complaint candidate retrieval to the Phase 3 duplicate-scoring package
      without automatic merging or exposing another citizen's private description, identity, exact
      location, or original media (`ROUTING-002`).
- [x] Add true routing/submission replay semantics using a distinct `Idempotency-Key` so retries
      return the stored result instead of recomputing configuration-sensitive evidence (`ROUTING-004`).
- [x] Require a verified routed result for submission and return explicit unsupported-area,
      low-accuracy, media-not-ready, duplicate-suggestion, and routing-unavailable outcomes.
- [x] Add structured, coordinate-free logs and API unit/integration/security tests.

### Mobile Complaint Capture

- [x] Add SDK-compatible camera, location, image-processing, video-thumbnail, audio, file, SQLite,
      and network-state dependencies only where the implemented flow requires them.
- [x] Align mobile with Expo SDK 54.0.33, React Native 0.81.5, React 19.1, SDK 54 native modules,
      and TypeScript 5.9.3; pass `expo install --check`, mobile type-check, and Android export.
- [x] Replace the profile-only signed-in landing route with an accessible citizen home, report
      action, draft resume state, and profile access.
- [x] Implement live photo/video capture, private voice recording, typed/confirmed description, and
      media constraints without exposing originals. Gallery import remains intentionally excluded from
      the live-evidence V1 flow.
- [x] Implement foreground location permission, fresh GPS capture, accuracy/mismatch/spoof-risk
      signals, media-to-complaint distance, and supported-boundary checks.
- [x] Implement database-driven category selection, duplicate suggestions, final review, emergency
      disclaimer, idempotent submission, and complaint receipt.
- [x] Persist local draft/upload state in SQLite and resume interrupted signed uploads safely without
      persisting bearer tokens or signed-upload secrets.
- [x] Add focused mobile unit tests and verify the Expo Android export.

### Verification and Traceability

- [x] Regenerate committed database types and verify zero drift.
- [x] Run clean migration reset/lint, pgTAP, formatting, lint, type-check, package/API/mobile tests,
      all workspace builds, Compose validation, and production dependency audit.
- [x] Run the citizen mobile/web and authenticated complaint API smoke paths available in the local
      environment, recording provider/device/data-gated checks honestly.
- [x] Update README, PLAN, architecture, database, authentication, API, deployment, Supabase setup,
      TASKS, PROGRESS, CHANGELOG, DECISIONS, KNOWN_ISSUES, and the Phase 4 worklog.

## Automatically Discovered Tasks

- [ ] Rotate the exposed Supabase privileged credential, database credential, and Redis token before any environment integration.
- [ ] Review the affected provider audit logs and run remote repository secret scanning before using those services.
- [x] Install and validate the repository-pinned Supabase CLI.
- [x] Initialize and validate local Supabase configuration and invite template.
- [ ] Activate separate hosted identity environments, providers, exact redirects, invite templates, rate limits, backups, and secret storage after `SEC-001` is complete.
- [ ] Add audited existing-user government assignment plus expire, revoke, renew, and additional-scope lifecycle operations before broader government onboarding (`AUTH-001`).
- [ ] Enforce privileged MFA/AAL with enrollment and recovery UX before pilot launch (`AUTH-002`).
- [ ] Bind device revocation to provider sessions before representing revocation as forced logout (`AUTH-003`).
- [ ] Add PostgreSQL/platform-backed audit, invitation, and device quotas without Redis (`AUTH-004`).
- [ ] Run hosted callback, real SMS, Expo development-build deep-link, OS SecureStore, and SSR-cookie smoke tests (`AUTH-005`).
- [x] Use the exact allow-listed same-origin citizen callback and cover URL construction; delivered hosted-link and SSR-cookie smoke remains under `AUTH-005`/`ENV-002` (`AUTH-006`).
- [ ] Verify citizen web Auth and the NestJS API use the same fully migrated Supabase environment,
      then smoke account onboarding/profile reads in local and hosted configurations (`ENV-004`).
- [x] Add the authority foreign key after Phase 2 creates the canonical governance entity (`DB-001`).
- [ ] Obtain official LGD codes for all districts, talukas, local bodies, Gram Panchayats, villages, and wards before promoting affected records to verified routing data (`DATA-002`).
- [ ] Replace template Gram Panchayat/village records and synthetic ward rows with complete official datasets (`DATA-002`, `DATA-003`).
- [ ] Import verified pilot municipality and ward polygons so a real pilot coordinate can satisfy the Phase 2 spatial exit criterion (`DATA-004`).
- [ ] Resolve the Vasai-Virar ward/local-body name mismatch and all composite routing department/role/agency labels through an explicit reviewed crosswalk (`DATA-005`).
- [ ] Obtain record-specific sources and current verification for local-body, office, ward, utility, department, role, and officer contact data (`DATA-003`, `DATA-006`).
- [ ] Reconcile the selected `BRIH-W01`–`BRIH-W05` numeric bootstrap placeholders to BMC's official
      lettered ward structure before activating any Brihanmumbai synchronization scope (`DATA-003`,
      `DATA-005`).
- [ ] Implement a reviewed delta-refresh operator workflow before importing a replacement governance bundle; the current generator intentionally supports the pinned baseline only (`DATA-008`).
- [ ] Extend governance reporting with complete per-file outcome matrices and strengthen official LGD/contact/source-specificity review checks before pilot promotion (`DATA-006`).
- [ ] Add an audited mapping/revocation workflow for any retained legacy placeholder authority scopes before existing-account onboarding (`AUTH-001`, `DATA-008`).
- [x] Re-run `pnpm audit --prod` with registry connectivity; no known vulnerabilities were reported.
- [x] Make the Husky pre-commit hook invoke the repository-pinned pnpm through Corepack so it works without a global `pnpm` shim.
- [x] Make local-required Supabase Auth E2E reject non-loopback API URLs before creating test users.
- [ ] Reconcile the documentation lifecycle's root-level tracker names with the current `docs/` locations in a documentation-only change.
- [ ] Remove the empty stray file `docs/architecture.md,` after the owner confirms it is unintentional.
- [ ] Optimize production container contents after the runtime dependency graph is implemented.
- [ ] Acquire, review, and publish the verified Pune pilot polygons, authority/department/role mappings, asset ownership, confidence policy, routing rules, and fallbacks required for operational routing (`ROUTING-001`).
- [x] Implement the PostgreSQL lease, scheduled Edge retrieval, immutable snapshot, audit, and
      contact-version persistence slice without Redis or BullMQ (`GOVSYNC-001`).
- [ ] Implement and operate approved source-specific parsers, entity matchers, change detection,
      review surfaces, and transactional publishers (`GOVSYNC-001`).
- [ ] Add DNS resolution/rebinding protection and orphaned snapshot reconciliation before any
      source is activated (`GOVSYNC-002`, `GOVSYNC-003`).
- [x] Connect the duplicate-detection framework to privacy-safe complaint candidate persistence and explicit, non-merging citizen review semantics (`ROUTING-002`).
- [ ] Add an activation-time validation report that rejects simultaneously applicable routing rules using conflicting confidence-policy versions; the runtime currently fails closed (`ROUTING-003`).
- [x] Add a distinct routing idempotency key and stored-result replay before Phase 4 clients use automatic retries (`ROUTING-004`).
- [ ] Configure approved speech-to-text and media moderation/processing providers, then add normalized-description confirmation and processing lifecycle tests without exposing original media (`COMPLAINT-001`).
- [ ] Run complete camera/video/voice/location, interrupted-upload, protected-storage, deep-link, and callback smoke tests on representative physical Android/iOS devices (`COMPLAINT-002`, `AUTH-005`).
- [ ] Add a PostgreSQL/platform-scheduled cleanup path for expired upload reservations and orphaned private Storage objects without Redis or BullMQ (`COMPLAINT-003`).

## Current Blockers

- The citizen callback now uses the exact queryless same-origin route with regression coverage; hosted delivered-link/SSR-cookie validation remains environment-gated under `AUTH-005`/`ENV-002`.
- Citizen account failures now render explicitly, but a working profile still requires the citizen
  web Auth client and API to target the same fully migrated Supabase environment (`ENV-004`).
- Hosted identity activation remains blocked on owner credential rotation/audit (`SEC-001`) and operator-managed provider/environment configuration (`ENV-002`).
- Phone OTP E2E requires an explicitly configured SMS provider; the code path and dispatch behavior are otherwise covered.
- Phase 2 schema, validation, safe baseline import, security, generated types, and local verification are complete.
- The `PLAN.md` Phase 2 pilot-coordinate exit criterion remains blocked by pilot selection and absent verified boundary geometry (`DATA-004`).
- Workbook-to-CSV visual/cell parity remains blocked by the unavailable approved spreadsheet runtime (`DATA-007`).
- Rendered application inspection remains blocked by the unavailable in-app browser; route-level runtime smoke checks passed (`ENV-003`).
- Phase 3 engineering has no implementation blocker, but production routing remains intentionally disabled until verified Pune geometry and complete reviewed routing evidence are available (`ROUTING-001`).
- Governance synchronization now has locally verified PostgreSQL claiming/leasing, Edge retrieval,
  immutable snapshot/audit, contact-version, normalization, and generic pilot-scope primitives. It
  is not deployed or active: all ten ward targets remain draft/unverified/non-routable; BMC ward
  identity reconciliation, source-specific parsers, entity matching, review/publishing, environment
  Cron/secrets, DNS-resolution hardening, and grace-period snapshot reconciliation remain open
  (`DATA-003`, `DATA-005`, `GOVSYNC-001` through `GOVSYNC-003`).
- Phase 4 engineering is locally complete, but the canonical bootstrap exposes zero verified routable categories, so a production complaint cannot submit until reviewed Pune geometry and routing evidence are activated (`ROUTING-001`).
- Automatic voice transcription/media moderation and physical-device capture/resume validation require approved providers and devices (`COMPLAINT-001`, `COMPLAINT-002`).

## Technical Debt

- Production Node images currently copy the verified workspace from the build stage, including development dependencies and source. This favors a correct Phase 0 build; pruning and image-size optimization are tracked for a later infrastructure task.
- Documentation trackers currently live under `docs/` while `AGENTS.md` refers to root-level tracker names.
- Existing-account government access lifecycle, privileged MFA, device-session binding, append-path quotas, and hosted/real-device validation remain explicitly tracked pre-launch work.
- Expired private upload reservations and orphaned Storage objects need a PostgreSQL/platform-scheduled cleanup path before public operation (`COMPLAINT-003`).
- Raw governance snapshot Storage needs orphan reconciliation after partial upload/finalization
  failures (`GOVSYNC-003`).

## ADRs Created

- ADR-0001 — Use pnpm and Turborepo for the monorepo.
- ADR-0002 — Use Expo for the mobile application.
- ADR-0003 — Use Next.js for web applications.
- ADR-0004 — Use NestJS for the API.
- ADR-0005 — Use Socket.IO for realtime delivery.
- ADR-0006 — Use Supabase Auth and database-enforced access control.
- ADR-0007 — Defer Redis, BullMQ, and Sentry beyond V1.
- ADR-0008 — Use a normalized, provenance-aware Maharashtra governance registry.
- ADR-0009 — Use database evidence for deterministic routing.
- ADR-0010 — Use review-gated governance synchronization.
- ADR-0011 — Use server-orchestrated complaint submission and private signed media uploads.
- ADR-0012 — Use Supabase Cron, Edge Functions, and PostgreSQL leases for governance retrieval.

## Files Modified This Session

- Shared complaint contracts/validation and the reusable typed API client under `packages/types`,
  `packages/validation`, and `packages/api-client`.
- Complaint draft, media, duplicate, submission, history, replay, and strict Supabase adapters under
  `apps/api`, plus the exact citizen email callback fix under `apps/citizen-web`.
- Accessible citizen mobile home, live photo/video/voice capture, location evidence, private upload,
  duplicate review, emergency warning, receipt/history, protected resume state, and focused tests
  under `apps/mobile`.
- Mobile dependency alignment to Expo SDK 54.0.33, React Native 0.81.5, React 19.1, compatible SDK
  54 modules, and TypeScript 5.9.3; `expo install --check`, type-check, and Android export passed.
- Two additive Phase 4 complaint migrations, four Phase 4 pgTAP plans, regenerated four-schema
  database types, ADR-0011, and the Phase 4 complaint-capture worklog.
- Three additive governance synchronization migrations, the draft-only PMC/BMC source and ward
  scope seeds, Edge fetch/snapshot runtime, contact normalizer/versioning, three pgTAP plans,
  ADR-0012, and the governance synchronization worklog.
- Citizen account rendering now distinguishes authenticated identity, missing/provisioning profile,
  API/environment failure, onboarding, and complete profile states; OTP completion uses a full-page
  transition and has regression coverage.
- Canonical CSV/workbook bytes and hosted Supabase were not changed. Redis, BullMQ, Redis adapters,
  caching, and Sentry remain absent.

## Next Recommended Task

Implement fixture-backed parsers for one reviewed PMC HTML source and one BMC HTML/PDF source, then
connect their staged output to canonical entity matching and an audited review API without automatic
publication. In parallel, obtain the official BMC lettered-ward crosswalk, begin Phase 5
access-scoped queue/detail engineering with synthetic fixtures, and acquire reviewed Pune routing
evidence. Keep source/scope activation, Cron deployment, and all hosted changes blocked until the
source contracts, ward identities, and `SEC-001`/`ENV-002` gates are complete.
