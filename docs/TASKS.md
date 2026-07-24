# TASKS.md

## Project Status

- Project: Local Wellness
- Current phase: Phase 10 — Hardening and launch
- Current sprint: Sprint 13 — JagrukSetu citizen experience and design system
- Current sprint implementation progress: 82%
- Overall implementation progress: 95%
- Phase 0 implementation progress: 100%
- Phase 1 implementation progress: 100%
- Phase 2 implementation progress: 90%
- Phase 3 implementation progress: 99%
- Phase 4 implementation progress: 99%
- Phase 5 implementation progress: 95%
- Phase 6 implementation progress: 85%
- Phase 7 implementation progress: 92%
- Phase 8 implementation progress: 92%
- Phase 9 implementation progress: 85%
- Phase 10 implementation progress: 88%
- Last updated: 2026-07-24

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

### Maharashtra Batch 0 Intake — 2026-07-18

- [x] Audit `resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip`
      without modifying it; verify safe archive paths, bounded expansion, all 28 member CRCs, and
      the complete internal SHA-256 manifest.
- [x] Reconcile the supplied schemas and row counts: 38 source observations, 17 conflicting count
      observations, 1 state, 36 districts, 21 data issues, 23 refresh-plan rows, 24 validation rows,
      and zero taluka/local-body/ward/boundary/department/office/person/assignment/contact/utility/
      emergency/routing/asset/ownership records.
- [x] Add a hash-pinned, deterministic Batch 0 validator/generator that reads the immutable ZIP,
      rejects member/header/count/hash drift, preserves every source observation and issue, and
      emits a review-gated additive seed without rewriting the canonical Phase 2 CSV/workbook.
- [x] Extend governance import-batch metadata for a ZIP source bundle without misusing the existing
      workbook checksum field; retain backward compatibility for the canonical and BMC imports.
- [x] Seed the official source registry and only the non-routable hierarchy identifiers that match
      existing canonical entities unambiguously; retain the `Mumbai` versus `Mumbai City` row as a
      quarantined review item and activate no route, boundary, assignment, contact, or delivery.
- [x] Add migration/seed/RLS/routing-negative tests, generate an SQL Editor deployment artifact,
      run focused/full verification, and document the exact refresh and human-review path.

## Phase 3 Execution Plan

Phase 3 engineering may use synthetic records inside rollback-isolated tests, but operational resolution must reject placeholder, unverified, inactive, expired, or non-routable records. Pune Municipal Corporation is the reference pilot for architecture and test planning only; no Pune municipality, ward, department, officer, or routing branch may be hardcoded in application logic.

### Routing Persistence and Spatial Resolution

- [x] Add additive, versioned routing tables for issue categories, category aliases, assets, asset ownership, routing rules, fallback edges, confidence policies, and decision evidence.
- [x] Seed the 12 owner-approved pilot categories as database records without hardcoding jurisdiction or recipient mappings in application source.
- [x] Implement service-only PostGIS candidate queries that reuse versioned governance boundaries and filter inactive, placeholder, unverified, expired, and non-routable records.
- [x] Add constraints, indexes, immutable/version-history guards, least-privilege grants, forced RLS, and migration/RLS tests for the routing schema.
- [x] Add optional, data-driven BMC internal-routing seeds for three asset-independent categories,
      exactly 22 one-to-one wards, and 66 deterministic rules; fail closed for the other nine
      categories (six explicitly asset-dependent), split child wards, hosted activation, and
      external delivery.

### Routing Package and API

- [x] Add shared routing contracts and strict request validation for coordinates, category selection, asset evidence, routing results, explanations, and duplicate candidates.
- [x] Implement deterministic jurisdiction, asset-owner, department, officer-role, assignment, fallback, confidence, and explanation evaluation in `packages/routing-engine`.
- [x] Implement GIS and routing repository ports so the package remains database-driven and independent of Supabase/NestJS.
- [x] Implement the duplicate-detection scoring framework without introducing complaint persistence or pretending that an empty complaint store is operational coverage.
- [x] Add authenticated NestJS routing and category APIs backed by service-role database adapters and structured NestJS logging.
- [x] Add unit, integration, API-contract, negative-placeholder, ambiguity, fallback, and duplicate-scoring tests.

### Governance Synchronization Foundation

Historical note: the completed items below record the prototype that was built and verified. The
undeployed synchronization/contact runtime and its fourteen tables were physically removed from
the current V1 schema by `20260723110000_prune_deferred_v1_subsystems.sql`; reintroducing source
synchronization is now a future, separately reviewed feature.

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

This section is historical evidence of the prototype that was built and tested. The prototype was
never deployed, and its database/Edge/package surfaces were removed from V1 on 2026-07-23. Any
future official-source refresh is a new reviewed workstream; retrieval, parsing, matching, review
and publication must remain separate gates, and retrieving an official page can never verify or
activate a governance record automatically.

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
- [ ] Design a replacement official-source refresh system before any deployment; do not deploy the
      retired Edge Function or recreate its removed tables piecemeal (`GOVSYNC-001`).
- [ ] Require private/reserved DNS rejection and rebinding protection in any replacement fetch
      boundary (`GOVSYNC-002`).
- [ ] Include retention and late-commit-safe orphan reconciliation in any replacement snapshot
      Storage lifecycle (`GOVSYNC-003`).

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
database cannot produce a verified route. The canonical Maharashtra bootstrap may support UI and
negative-path engineering but cannot produce a production complaint assignment; the separately
generated BMC routing seeds enable only the documented bounded non-production internal demo.

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
- [x] Add protected Citizen Web complaint history, detail, and timeline pages with strict response
      decoding, pagination, owner-only access, safe routing/location summaries, government action
      context, and explicit loading/empty/error/not-found states.
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
- [x] Align mobile with Expo SDK 54.0.36, React Native 0.81.5, React 19.1, SDK 54 native modules,
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
- [x] Add an authenticated, data-driven category catalog that shows every non-placeholder category,
      marks unavailable routing explicitly, disables unsafe selection, and preserves the existing
      verified-only category lookup/submission boundary.
- [x] Replace the six-screen complaint wizard presentation with one scrollable form while retaining
      resumable server state, private uploads, duplicate review, idempotent submission, and verified
      routing; show all client-visible submit blockers explicitly and use a bell for notifications.
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

## Phase 5 Execution Plan

Phase 5 gives authorized municipal staff an access-scoped complaint queue and audited operational
workflow. Supabase PostgreSQL remains the source of truth: the API may use service credentials only
to invoke database functions that independently validate the acting Auth user, effective role,
authority membership, ward/department scope, target assignment, and allowed status transition.
Citizen privacy remains unchanged, and no placeholder or unverified governance record may become an
operational recipient.

### Workflow Persistence and Authorization

- [x] Add versioned complaint assignment history with exactly one active assignment, transfer and
      reassignment provenance, effective periods, actor identity, and immutable historical rows.
- [x] Add internal notes, inspection schedules/results, work references, external dependencies,
      resolution evidence metadata, and an append-only government-action audit/idempotency ledger.
- [x] Add explicit status-transition rules and atomic database functions for acknowledge, assign,
      reassign, transfer, schedule/complete inspection, record work/dependency, update status, and
      submit resolution.
- [x] Enforce active, verified, non-placeholder government scopes and eligible target assignments in
      PostgreSQL; reject cross-authority, cross-ward, cross-department, expired, revoked, stale, and
      client-selected recipient escalation attempts.
- [x] Preserve citizen-owned complaint/location/media privacy and expose private resolution evidence
      only through bounded signed uploads and authorized reads.

### Government Complaint API

- [x] Add authenticated, paginated queue and complaint-detail APIs with status/category/ward/
      department/assignee/date/search filters and data-minimized map coordinates.
- [x] Add validated, idempotent action endpoints for every Phase 5 workflow operation and return
      conflict-safe current state after successful mutation or replay.
- [x] Add resolution-evidence upload intent/finalization using the existing private Storage bucket;
      never accept arbitrary object paths, authority IDs, or official recipient IDs from clients.
- [x] Add shared strict contracts, schemas, typed client support, structured coordinate-free logs,
      API contract tests, authorization tests, and database-adapter tests.

### Government Dashboard

- [x] Replace the access-scope placeholder with an accessible government workspace, effective-scope
      selector, queue summary, filters, paginated table/cards, and privacy-safe location context.
- [x] Add complaint detail with timeline, routing/assignment explanation, authorized staff actions,
      internal notes, inspection/work/dependency forms, and resolution-evidence submission.
- [x] Make role capabilities explicit in the UI while treating API/database authorization as
      authoritative; include loading, empty, stale-session, forbidden, validation, and conflict states.
- [x] Add focused dashboard unit/component coverage and unauthenticated route-level local runtime
      smoke tests.
- [ ] Run an authenticated dashboard smoke test with a real verified government role and operational
      pilot complaint after the hosted/test environment and pilot routing data are available.

### Verification and Traceability

- [x] Add migration, RLS, scope-isolation, transition, assignment-history, audit, idempotency,
      resolution-evidence, API, and dashboard tests.
- [x] Regenerate database types and run clean reset/lint/pgTAP, formatting, lint, type-check, tests,
      builds, Compose validation, Expo alignment/export, and production dependency audit.
- [x] Create the Phase 5 workflow ADR and worklog; update all required architecture, database, API,
      authentication, deployment, setup, tracker, changelog, decision, and known-issue documents.

## Phase 6 Execution Plan

Phase 6 adds authenticated, database-first complaint communication and durable notifications. The
V1 pilot remains a single Socket.IO instance backed by PostgreSQL. Redis, BullMQ, Redis adapters,
caches, and Sentry remain excluded. Public comments are fail-closed while complaints remain private;
no Phase 6 surface may make a complaint or its media publicly visible.

### Communication Persistence and Access Control

- [x] Add private, forced-RLS conversation, message, receipt, notification, delivery-attempt, and
      outbox-dispatch tables with append-only history, bounded payloads, indexes, deduplication keys,
      leases, retries, and terminal failure state.
- [x] Add service-only database functions for current complaint access, authorized room resolution,
      idempotent private-message persistence, message reads, notification listing/reads, recipient
      fan-out, and `FOR UPDATE SKIP LOCKED` delivery claims.
- [x] Extend complaint submission and every supported government workflow event so the domain event
      is appended in the same transaction without editing an applied migration or exposing citizen,
      contact, exact-location, media-path, or token data.
- [x] Keep public comments structurally supported but non-creatable until a later reviewed public
      complaint visibility policy is implemented; private conversation access remains limited to
      the complaint owner and currently authorized government scope.

### Realtime and Notification Delivery

- [x] Authenticate every Socket.IO connection with a verified Supabase access token and an active
      application profile; join only the authenticated user's server-owned room automatically.
- [x] Validate and authorize complaint, authority, ward, and department room joins on every request;
      recheck authorization before permanent events, message reads, and ephemeral typing events.
- [x] Persist messages before broadcasting, return bounded acknowledgements, make client message
      creation idempotent, and emit only sanitized event contracts.
- [x] Implement the PostgreSQL-leased notification worker with bounded exponential retry,
      lease recovery, exact delivery deduplication, structured logs, and terminal dead-letter state.
- [x] Deliver durable in-app notifications and single-instance Socket.IO events; expose explicit
      pending/unsupported states for push and email until approved providers and credentials exist.

### API, Clients, Tests, and Operations

- [x] Add authenticated communication and notification HTTP endpoints plus strict shared types,
      validation schemas, response decoding, pagination, and no-store responses.
- [x] Add citizen and government conversation/notification client integration sufficient to recover
      persisted history after reconnect; realtime is an enhancement, never the source of truth.
- [x] Add migration, RLS, room-authorization, persistence-before-broadcast, API, worker lease/retry,
      deduplication, offline-notification, and reconnect/replay tests.
- [x] Regenerate database types and run reset, database lint/pgTAP, formatting, lint, strict
      type-checking, tests, builds, Expo checks, and production dependency audit.
- [x] Create an ADR for the PostgreSQL delivery ledger/lease boundary and update every required
      architecture, database, API, deployment, setup, tracker, worklog, and known-issue document.

## Phase 7 Execution Plan

Phase 7 completes the private accountability loop around the versioned Phase 5 resolution boundary.
Citizen feedback, confirmation, reopening, escalation, and post-submission evidence remain
server-orchestrated and database-enforced. Reopen windows, rating scales, evidence requirements,
attempt limits, and escalation thresholds are versioned policy data; no operational values are
hardcoded or activated without an approved policy.

### Accountability Persistence and Policy

- [x] Add effective-dated resolution-policy versions with approval attribution, scope matching,
      rating bounds, reopen windows, attempt limits, evidence requirements, and escalation thresholds.
- [x] Add append-only resolution feedback, citizen action replay/audit, reopen requests, private
      reopen evidence, evidence links, and escalation events with forced RLS and least privilege.
- [x] Extend resolution records with server completion time, captured completion location, optional
      work-reference linkage, and explicit before/after evidence semantics without rewriting history.
- [x] Move new government resolution submissions into citizen verification atomically while retaining
      existing Phase 5 resolution history and data-minimized notification delivery.

### Citizen and Government APIs

- [x] Add strict citizen resolution-context, feedback/confirmation, reopen-evidence upload/finalize,
      evidence-access, and reopen APIs with ownership, workflow-version, policy, expiry, and exact-replay
      checks.
- [x] Add a scoped government accountability read API exposing resolution, feedback, reopen, and
      escalation history without weakening complaint or media privacy.
- [x] Reuse the Phase 6 status-history outbox for resolution, reopen, and escalation notifications;
      never include feedback text, ratings, coordinates, media locators, or tokens in event payloads.

### Clients, Verification, and Traceability

- [x] Add mobile before/after review, citizen outcome and ratings, confirmation, live additional
      evidence capture, and policy-aware reopen UX with stable retry identities.
- [x] Add Citizen Web feedback/confirmation and policy-aware reopening actions that derive the
      active resolution/workflow context server-side, use purpose-scoped idempotency, and direct
      location-bound follow-up evidence to the mobile capture flow.
- [x] Add government-dashboard resolution/feedback/reopen/escalation history and completion-location
      capture while retaining database-authoritative allowed actions.
- [x] Add migration, forced-RLS/ACL, policy ambiguity, ownership, idempotency, evidence integrity,
      feedback, confirmation, repeated-reopen escalation, API, store, mobile, and dashboard tests.
- [x] Regenerate database types; run reset, database lint/pgTAP, formatting, lint, type-check, tests,
      builds, Expo checks/export, Compose validation, and dependency audit.
- [x] Create the Phase 7 ADR/worklog and update all required architecture, database, API, deployment,
      setup, tracker, decision, and known-issue documents.

## Phase 8 Execution Plan

Phase 8 creates a separately reviewed public projection of selected complaint facts. It must never
query private complaint rows, exact locations, original media, citizen identity, private evidence,
internal notes, or unmoderated text directly into a public response. No projection is available
until an authorized reviewer explicitly publishes a sanitized version under an approved,
effective-dated transparency policy. Map rendering remains provider-neutral until the map-provider
and outbound-coordinate policy is approved.

### Public Projection and Moderation Boundary

- [x] Add effective-dated transparency policy versions and append-only complaint publication
      versions with review attribution, generalized coordinates, safe summaries, sensitivity
      classification, provenance, and explicit publication/revocation state.
- [x] Add reviewed processed-media derivative references without creating a public Storage bucket or
      exposing original object paths; keep public media unavailable until moderation and delivery
      policy are operational.
- [x] Add versioned duplicate groups and membership records that can reference only currently
      published complaint projections.
- [x] Enable and force RLS, revoke direct table access, and expose only narrow read-only public RPCs
      plus scoped administrative review RPCs. Seed no active policy or publication.

### Nearby, Hotspot, Boundary, and Detail APIs

- [x] Add provider-neutral shared contracts and strict validation for bounding boxes, category,
      status, date, ward, cluster precision, pagination, and public complaint identifiers.
- [x] Add anonymous read APIs for reviewed nearby points/clusters, hotspot aggregates, verified ward
      boundaries, duplicate groups, and sanitized public complaint detail.
- [x] Ensure every public response is derived only from the reviewed projection, uses already-
      generalized coordinates, excludes small unsafe aggregates, and returns no internal identifiers
      or notes beyond explicitly approved public identifiers.
- [x] Add platform-admin publication review APIs only if the current access-control boundary can
      authorize them without inventing policy values; otherwise leave publication database-gated.

### Client Surfaces, Verification, and Traceability

- [x] Add a citizen-web nearby transparency experience with filters, accessible list/detail fallback,
      empty/loading/error states, and a provider-neutral spatial visualization that makes no external
      tile or coordinate request.
- [x] Add the mobile public-nearby data surface and safe detail navigation without introducing an
      unapproved native map provider.
- [x] Add migration, RLS/ACL, projection leakage, moderation, revocation, spatial/filter/cluster,
      API contract, shared validation, and client tests using rollback-isolated synthetic fixtures.
- [x] Regenerate database types; run reset, lint, pgTAP, formatting, strict type-checking, tests,
      builds, Expo checks/export, Compose validation, and dependency audit.
- [x] Create the Phase 8 ADR/worklog and update all required architecture, database, API, deployment,
      setup, tracker, decision, and known-issue documents.
- [x] Add account-bound support and private star/follow state only for current reviewed public
      projections, publish only aggregate support counts, and prevent community signals from
      changing routing, assignment, workflow status, escalation, SLA, or KPI state.
- [x] Add bounded authenticated engagement lookup/mutation APIs, PostgreSQL-backed quotas, strict
      shared validation, `recent|trending` reviewed-public ordering, and focused migration/API/
      client tests. The clean 43-migration aggregate database and repository release gates passed.
- [x] Refine the Expo information hierarchy with compact visible copy and a primary Community
      destination containing Local, Trending, and privacy-safe Heat views. Keep detailed guidance
      in state-specific help and accessibility labels instead of repeating it below every option.
- [x] Show signed-in citizens their three newest owner-scoped complaints at the top of Community,
      refresh on focus, keep the panel independent of location/public-feed errors, and never mix
      private items into public map/ranking/engagement state.

Phase 8 core engineering is complete locally, including reviewed-public support/star and community
ordering. Operational completion remains gated on the approved
visibility/generalization/moderation policy, reviewed public projections, verified ward geometry,
abuse operations, provider/privacy decisions, managed migration deployment, and rendered/load/device validation
(`TRANSPARENCY-001`, `TRANSPARENCY-002`, `GOVDIR-001`). No complaint was published by fixtures.

## Phase 9 Execution Plan

Phase 9 adds measurable service accountability without inventing operational targets. SLA,
calendar, override, and escalation records remain inactive until an authorized platform
administrator publishes reviewed, effective-dated policy versions. PostgreSQL remains the durable
source of truth and work coordinator; Redis, BullMQ, Redis adapters/caching, and individual-officer
rankings remain outside V1.

### SLA Policy and Deadline Model

- [x] Add effective-dated acknowledgement, inspection, and resolution SLA policies with reviewed
      business calendars, holidays, category overrides, authority scope, provenance, approval, and
      immutable published versions.
- [x] Materialize complaint SLA clocks and deadline history from the policy version applicable at
      routing/submission time; preserve paused external-dependency intervals and never recalculate
      historical deadlines silently.
- [x] Add constraints, indexes, forced RLS, least-privilege grants, and append-only guards for policy,
      clock, deadline, pause, and audit records. Seed no active operational target.

### Escalation and Durable Scheduling

- [x] Add versioned escalation rules plus append-only escalation events that snapshot the applied
      rule, deadline, assignment scope, reason, and resulting workflow action.
- [x] Add PostgreSQL-leased due-work records and service-role claim/complete/fail RPCs with bounded
      batches, expired-lease recovery, deterministic retry backoff, and dead-letter audit state.
- [x] Extend the existing worker process to evaluate due SLA work idempotently and emit structured,
      privacy-safe logs without Redis, BullMQ, or Sentry.

### Reproducible KPI Projections

- [x] Add versioned KPI definitions, immutable calculation runs, and ward, department, and
      municipality snapshots for acknowledgement/resolution compliance, citizen-confirmed
      resolution, reopen and misrouting rates, backlog, external-dependency segmentation, evidence
      completeness, and communication quality.
- [x] Add access-scoped government KPI APIs and dashboard summaries based only on persisted snapshot
      inputs; do not expose public or internal individual-officer rankings.
- [x] Record calculation windows, definition versions, source cutoffs, numerator/denominator inputs,
      exclusions, and run provenance so every metric can be reproduced.

### Verification and Traceability

- [x] Add migration, RLS/ACL, policy-version, calendar/deadline, external-dependency pause,
      escalation, lease/retry/idempotency, KPI reproducibility, API authorization, worker, and
      dashboard tests using rollback-isolated synthetic fixtures.
- [x] Regenerate database types and master SQL; run database reset/lint/pgTAP, formatting, lint,
      strict type-checking, tests, builds, Compose validation, and dependency audit.
- [x] Create the Phase 9 ADR/worklog and update architecture, database, API, deployment, setup,
      tracker, decision, and known-issue documentation while distinguishing engineering completion
      from operational-policy activation.

Phase 9 engineering is complete locally. Operational completion remains gated on reviewed pilot
calendars/targets/escalation rules, a managed KPI schedule and retention policy, migration/worker
deployment, existing-complaint adoption policy, load sizing, monitoring/runbooks, and staging smoke
validation (`SLA-001`, `SLA-002`, `KPI-001`). No active SLA policy or schedule was seeded.

## Phase 10 Execution Plan

Phase 10 hardens the implemented V1 without weakening its verified-data, privacy, or review gates.
The locally executable work below must be completed and verified independently of managed Supabase
template access. Hosted credentials, official pilot data, policy approvals, legal approval, and
physical-device evidence remain release gates and must not be replaced by demo values.

### Security and Abuse Controls

- [x] Add shared PostgreSQL-backed API request quotas for authenticated mutations and bounded
      anonymous transparency reads, with privacy-safe hashed subjects, deterministic windows,
      cleanup support, `429`/`Retry-After` responses, and no Redis or in-memory production counter.
- [x] Apply tighter quotas to identity-audit, device, government-invitation, messaging, complaint
      upload/submission, and privileged government mutation paths; add database, API, concurrency,
      failure, and isolation coverage.
- [x] Add API security headers and bounded operational responses without exposing credentials,
      tokens, exact coordinates, private paths, or internal dependency errors.
- [x] Add a deterministic tracked-file and current-history secret scan to local/CI release checks,
      retain the production dependency audit, and document the separate remote/all-history review.
- [x] Add privileged TOTP/AAL enrollment and API enforcement in matching `observe`/`enforce`
      modes without weakening database authorization. Keep managed enforcement and recovery smoke
      open before pilot access (`AUTH-002`) so operators cannot be locked out.
- [ ] Complete provider-session binding for device revocation and the audited existing-user access
      lifecycle before relying on either control operationally (`AUTH-001`, `AUTH-003`).

### Portal Authentication and Official Onboarding

- [x] Show the exact current signed-in account on citizen, government, and administrator surfaces,
      including MFA, authorized, denied, empty-scope, and dependency-error states; provide explicit
      sign-out and switch-account actions without enumerating other accounts.
- [x] Explain the three independent privileged gates—Auth identity, that user's own TOTP/AAL2, and
      current database membership/scoped role—and distinguish first-time QR enrollment from a
      returning authenticator-code challenge.
- [x] Add reviewed wrong-account, password-recovery, and administrator-mediated lost-authenticator
      guidance without adding a client-side role or MFA bypass.
- [x] Normalize provider-generated TOTP QR data before rendering, keep ephemeral enrollment SVGs
      outside Next image optimization, and recover explicitly from this portal's own interrupted
      unverified enrollment without deleting another application's factor.
- [x] Replace authority/ward/department UUID entry with a named, API-authorized selector backed by
      a service-role-only projection of active, verified, non-placeholder, routing-eligible records;
      restrict municipal administrators to their own authority.
- [x] Add strict shared contracts plus API, service, store, portal, migration, and ACL coverage for
      the selector and account-context behavior.
- [x] Remove the stale Citizen Web app-local Supabase override and make the API, mobile, and all
      three portal scripts load the single root `.env`, with deployment-injected values taking
      precedence, app-local files rejected, environment-aware Turbo build caching, and regression
      coverage for loading/precedence/missing-file behavior.
- [ ] Implement the audited existing-user assign/revoke/renew lifecycle before onboarding an email
      that already exists in Supabase Auth (`AUTH-001`).
- [ ] Add authority-first search and bounded pagination to the platform-wide invitation catalog
      before statewide administrator rollout (`AUTH-011`).
- [x] Add existing-user-only email/password sign-in to the Admin Console and Government Dashboard
      while retaining invitation-controlled account creation, individual TOTP enrollment/AAL2, and
      current database membership/scope authorization.
- [x] Add a project-ref-guarded, non-production staging account provisioner that creates confirmed
      synthetic Auth identities without outbound email, uses only reviewed governance selector
      records, assigns time-bounded BMC test scopes through the trusted atomic persistence boundary,
      and writes generated passwords only to a permission-restricted git-ignored local artifact.
- [x] Provision and verify the current staging matrix: one global platform administrator, one BMC
      municipal administrator, one authority operator, A and K/W ward officers, and Public Health
      and Solid Waste Management department officers. All seven passwords, active profiles, exact
      role/membership selectors, and 30-day assignment expiry were verified without outbound email.
- [x] Complete first-login TOTP enrollment for the current staging platform-administrator and BMC
      municipal-administrator identities; both factors are verified and both portal roots returned
      HTTP `200` after the QR-render repair.
- [ ] Complete the remaining municipal, A Ward, K/W Ward, Solid Waste Management, and Public Health
      queue-isolation/cross-scope denial smoke with the other pre-provisioned identities.

### Citizen Authentication and Locality Experience

- [x] Replace citizen passwordless entry with email/password sign-in and account creation on web
      and mobile; retain safe password recovery through Supabase Auth and support existing users
      without client-side account enumeration.
- [x] Implement Supabase Phone MFA enrollment/challenge for mobile citizen access and API requests
      as the original ADR-0028 design. This historical implementation is superseded by ADR-0033
      and is no longer the current citizen authentication boundary.
- [x] Implement the original fresh Phone-MFA password-change/recovery proof and zero-factor legacy
      fallback. This historical implementation is superseded by the confirmed-phone OTP flow in
      ADR-0033.
- [x] Extend the append-only authentication audit allow-list with `password_changed` for the
      original ADR-0028 flow. Migration 49 remains immutable history; its AAL1 zero-factor
      exception is not the current citizen verification design.
- [x] Replace citizen Advanced Phone MFA/AAL2 with ordinary Supabase confirmed-phone OTP while
      keeping email/password as the primary credential. Link and confirm the signed-in user's phone
      through `phone_change`, fail closed on identity/phone mismatch, and require no Advanced Phone
      MFA add-on or citizen AAL2 session.
- [x] Require the API to check the current server-owned `auth.users.phone` and
      `phone_confirmed_at` state through service-only migration
      `20260723130000_citizen_phone_verification_without_mfa.sql`; privileged
      administrator/government TOTP and AAL2 policy remain unchanged.
- [x] Keep Phone Auth signup capability enabled for existing linked-phone OTP, and add the
      service-owned Before User Created hook in
      `20260724100000_require_email_identity_for_auth_signup.sql` so phone-only Auth user creation
      is rejected even though the provider gate is on.
- [x] Use an isolated non-persistent Supabase client for every supported phone-OTP password
      change/recovery, bind the returned identity to the initiating user, update the password
      immediately, and clear persistent sessions after global sign-out without retaining an OTP
      proof/access token in application state. If reset-password navigation unmounts after the
      isolated recovery session is established but before completion, locally sign that session
      out during cleanup.
- [x] Add equivalent ordinary phone confirmation to Citizen Web while keeping its protected
      feature gate unchanged until the complete web release matrix is approved.
- [x] Complete the ADR-0033 clean local database reset, all 49 pgTAP files/1,607 assertions,
      application-schema database lint, generated database-type drift, and deterministic
      master-SQL drift verification.
- [x] Pass all five local Auth E2E cases: email OTP, phone link/confirmation, existing-phone SMS
      OTP password change, phone-only signup denial through the hook, and government invitation.
- [x] Pass all 23 mobile test suites, type-check, lint, changed-file diff validation and the
      1,293-module Android export; pass Citizen Web's eight test files/type-check/lint/production
      build and focused API/config tests/type-check/build/lint.
- [x] Pass repository-wide tests, type-check and lint after ADR-0033 integration.
- [x] Pass targeted Prettier, tracked/current-history secret scanning and repository diff checks
      for ADR-0033.
- [x] Put Citizen Web in fail-closed `public-only` mode so public home/transparency/directory remain
      available without protected session or network work while auth, account, report, and owned
      complaint routes await equivalent protected-flow parity.
- [x] Open user-initiated HTTPS reference links in Expo's in-app browser through one validated
      adapter; retain native handlers for settings, emergency telephone, Auth/deep links, and
      internal routes.
- [x] Add a private `profile-images-private` Storage bucket, owner-only RLS, bounded image types and
      sizes, profile metadata, web/mobile upload and removal flows, and signed or authenticated
      reads without exposing citizen avatars in public complaint projections.
- [x] Add mobile profile-photo capture through Expo Camera alongside the private gallery flow, with
      explicit permission requests, permanent-denial settings recovery, and the existing private
      validation/upload/signed-read boundary.
- [x] Add a one-time verified current-civic-area lookup on the mobile profile using foreground
      location and the governance projection; retain only derived authority/ward labels in component
      state and do not persist exact coordinates as a profile address.
- [x] Coordinate mobile location by purpose: share a five-minute, memory-only, at-most-100-metre
      current-area fix across Community, Nearby, and Profile; coalesce concurrent reads; let
      explicit Refresh bypass reusable positions; clear state on Auth identity changes; and keep
      complaint issue/media evidence on fresh high-accuracy acquisition.
- [x] Show the complete non-placeholder complaint taxonomy on mobile while keeping inactive,
      unverified, or otherwise non-routable categories disabled; category visibility must never
      become a routing or submission promotion.
- [x] Generate the JagrukSetu V1 hierarchy from the reviewed Markdown source: 17 primaries, 340
      subcategories and 19 derived workflows, including 20 protected Corruption leaves.
- [x] Preserve the twelve stable operational routing profiles in the initial taxonomy slice and map
      the documented thirteen specialised leaves without changing their identifiers.
- [x] Add the authenticated, public-safe, 30-second-cached detailed taxonomy endpoint and strict
      RPC decoding without exposing official routing targets or contacts.
- [x] Replace the mobile flat complaint-category choice with primary-category and
      subcategory/issue-type dropdowns; display workflow, sensitivity and route readiness as
      read-only metadata.
- [x] Persist only the primary code, subcategory code and derived workflow type; validate the
      canonical tuple and database-owned operational mapping on draft write and complaint
      insertion.
- [x] Generate migration `20260723120000`, seed 55 and a complete SQL Editor deployment artifact
      with deterministic drift checks.
- [x] Classify the other 243 public/restricted leaves through one general ward profile and all 84
      private/emergency-private leaves through official protected handoffs, leaving zero unclassified
      leaf.
- [x] Add the private forced-RLS handoff registry, fail-closed 26-ward route readiness,
      taxonomy-aware citizen/government/email labels, sanitized API contract and mobile official
      call/in-app-browser actions.
- [x] Generate source/route worklists, validation manifests, seed 56 and
      `supabase/deploy/jagruksetu-bmc-intake-v1.sql`; verify 256 submittable leaves, 84 protected
      handoffs, 338 contacts and 29 approved actions on a clean reset.
- [ ] Apply both taxonomy/intake artifacts to reconciled hosted staging, deploy the matching
      API/mobile build and smoke specialised/general submission plus protected call/browser actions.
- [ ] Replace general ward mappings with precise department/role/asset/fallback routes as reviewed
      official evidence becomes available (`TAXONOMY-001`).
- [x] Tighten current-location complaint evidence to a maximum 50 m accuracy radius and require
      captured complaint media to remain within the same reviewed proximity policy; preserve
      server-side PostGIS enforcement and mock/stale-location rejection.
- [x] Present reviewed public complaints as a modern locality feed with ongoing-status filters and
      Reddit-like information hierarchy, while keeping public identity, exact coordinates, private
      media, and unreviewed complaints out of the response.
- [x] Add a provider-neutral, privacy-safe nearby heatmap view using the existing reviewed hotspot
      projection. Do not select an external basemap or transmit coordinates to a map vendor without
      a separate owner-approved provider/privacy decision.
- [x] Configure and diagnose Supabase Advanced Phone MFA with Twilio for the historical ADR-0028
      flow. ADR-0033 supersedes that citizen design: the ordinary Phone provider now supplies
      confirmed-phone OTP, while Advanced Phone MFA remains unnecessary for citizens. Supabase
      Storage/Edge Functions are not an SMS carrier and are not used as a homemade OTP store.
- [x] Document the attributed citizen lost-phone recovery procedure with two-person approval,
      exact Auth user/factor selection, supported Supabase Admin factor deletion, audit evidence,
      old-session denial, replacement enrollment, and safe user communication.
- [ ] Complete India TRAI/DLT requirements where applicable, provider rate limits/CAPTCHA,
      installed-device link/resend/expiry/password-recovery smoke, stale `phone_change` cleanup
      validation, and the attributed lost-phone recovery rehearsal before pilot release
      (`AUTH-010`, `AUTH-014`, `AUTH-015`).
- [ ] Design a dedicated owner-private address schema/API, consent and retention behavior, and a
      reviewed reverse-geocoding/provider policy before persisting a citizen street address from
      current location (`PROFILE-002`).
- [x] Implement reviewed-public support/trending semantics: one support per active account,
      aggregate-only public counts, private star/follow state, current-projection withdrawal,
      bounded API quotas, and explicit separation from official routing/workflow/SLA/KPI behavior.
- [ ] Approve pilot moderation/abuse operations, retention and support-response procedures before
      managed community activation. Public comments remain a separate disabled feature requiring
      reporting, moderation, notification, and privacy policy (`COMMUNITY-001`, `NOTIFY-003`).

### Reliability, Health, and Release Verification

- [x] Add versioned API liveness/readiness endpoints, a narrow service-only database probe,
      graceful shutdown, health-contract tests, and deployment probe documentation.
- [x] Add dependency-free bounded load/smoke tooling for health and safe read endpoints with
      explicit concurrency, timeout, latency, and error thresholds; never point destructive load
      at production.
- [x] Add release verification commands that cover generated governance/database/master artifacts,
      formatting, lint, strict type checking, unit/integration/API/RLS tests, builds, Expo export,
      Compose validation, secret scan, and dependency audit.
- [ ] Validate notification/SLA worker retry and lease assumptions under bounded local load; retain
      PostgreSQL retry/dead evidence and do not introduce Redis, BullMQ, or Sentry.
- [ ] Complete scheduled cleanup/reconciliation for private complaint, resolution, and governance
      snapshot objects before sustained public operation (`COMPLAINT-003`, `GOVDASH-002`,
      `GOVSYNC-003`).

### Operations, Accessibility, Privacy, and Pilot Gates

- [x] Publish V1 operator runbooks for deployment verification, rollback, backup/restore rehearsal,
      incident response, support triage, moderation, data correction, ward/contact refresh, and
      pilot go/no-go; distinguish executable steps from owner/platform approvals.
- [ ] Complete automated accessibility regressions and manual keyboard, screen-reader, contrast,
      reduced-motion, browser, and representative-device review for the citizen, government,
      administrator, and mobile surfaces.
- [ ] Prepare draft privacy notice, terms, location/media consent, retention, and data-processing
      checklists for legal/owner review; do not represent unapproved text as binding policy.
- [ ] Reconcile and migrate the replacement staging ledger, configure exact Auth redirects and
      provider limits, deploy matching services/workers, and run browser/installed-device callback
      and critical-flow smoke tests (`ENV-002`, `AUTH-005`). Custom Auth templates remain optional.
- [ ] Load only reviewed official Pune pilot geometry, routing/recipient evidence, operating
      policies, contacts, and public/SLA/KPI versions; placeholder or merely unverified records must
      remain inactive and non-routable (`ROUTING-001`, `TRANSPARENCY-001`, `SLA-001`, `KPI-001`).
- [ ] Obtain municipal ownership, support/moderation staffing, legal approval, rollback evidence,
      backup-restore evidence, and a signed pilot go/no-go review before calling V1 production-ready.

### Routing Delivery Assurance

- [x] Prove complaint submission resolves verified jurisdiction, category/asset ownership,
      department, durable officer role, and current assignment entirely from database evidence.
- [x] Add fail-closed integration coverage for exact authority/department/role/assignment routing
      and explicitly reject placeholder, unverified, stale, and superseded recipient evidence.
- [x] Separate verified government queue assignment from approved officer/governing-body contact
      readiness; expose bounded readiness metadata without contact values or a false delivery claim.
- [ ] Load and review the official Pune pilot polygons, operational routes, assignments, authority
      memberships, and approved complaint-intake contacts before enabling real submissions
      (`ROUTING-001`).
- [ ] Design and approve any future outbound email/SMS delivery channel, audit, retry, consent, and
      privacy policy before changing `automaticOutboundDelivery` from false.

## JagrukSetu Citizen Experience and Design-System Sprint

This cross-phase sprint applies the approved civic-product benchmark to the existing Local Wellness
clients. `JagrukSetu` is the working experience name for this implementation slice, not a completed
legal/product rebrand. The sprint must reuse the existing complaint, transparency, profile,
governance, routing, privacy and authorization boundaries rather than creating a mock parallel app.
Unsupported guest reporting, public comments, precise public coordinates, public contact values,
external map tiles and notification providers remain explicit unavailable states.

### Shared Foundation

- [x] Add exportable JSON design tokens plus typed TypeScript and CSS-variable projections for
      colour, status, typography, spacing, radius, shadow, motion, z-index and breakpoints.
- [x] Add framework-neutral, strongly typed reusable component contracts for reports, maps,
      timelines, contacts, badges, progress and privacy/provenance states.
- [x] Add dependency-free typed localisation resources for `en`, `mr` and `hi`, map English to
      `en-GB` formatting, and keep the existing persisted language codes authoritative.
- [x] Add focused token, component-contract and localisation tests; keep Node's existing test
      runner rather than introducing an unrelated Jest test stack.
- [ ] Introduce an isolated component-development/story surface only if its dependencies and build
      boundary can be added without destabilising the existing Expo/Next applications; record a
      genuine dependency/tooling decision in an ADR if Storybook is introduced.

### Citizen Web Experience

- [x] Add a responsive app shell with skip navigation, desktop top navigation, mobile bottom
      navigation, empty logo slot, visible focus, current-route semantics and reduced-motion/
      forced-colour support.
- [x] Evolve Home into a concise civic dashboard/feed with a dominant report action, search,
      category discovery, nearby reviewed reports, recent official activity and a compact trust
      explainer, using only real or explicitly unavailable data states.
- [ ] Evolve Transparency into an accessible map/list workspace with selectable first-party
      markers, filters, sorting, hotspots/boundaries where available and a non-map list
      alternative; do not add an external basemap provider.
- [ ] Refactor complaint list/detail/history onto shared cards, status/confidence/provenance badges,
      timeline and receipt patterns while keeping official updates distinct from community signals.
- [ ] Add a verified-governance directory experience that exposes only the current API's safe
      jurisdiction projection and clearly labels contact browsing as unavailable until a private,
      reviewed contract exists.
- [ ] Consolidate profile/history navigation and show real complaint, security, locale and profile
      capabilities while keeping saved addresses, notification-channel preferences and guest
      reporting unavailable until their backend/policy contracts exist.

### Mobile Experience

- [x] Refine authenticated Home with the current private profile avatar/name, a device-time greeting,
      a concise browse affordance, and one-row report/status/Nearby quick actions plus View all.
- [x] Present the five stable mobile destinations in a rounded, detached bottom capsule and replace
      their decorative navigation glyphs plus the refined Home/Nearby glyphs with accessible,
      dependency-free React Native icon shapes.
- [x] Restyle Nearby governance around current-location context, a first-party schematic spatial
      summary, result count, and compact safe governing-body cards without fabricating contact,
      distance, opening-hours, or directions data.
- [x] Adapt the shared tokens to React Native, replace decorative Unicode navigation glyphs with
      accessible colour icons, and consolidate compact card/header/icon primitives.
- [x] Add a locale provider and migrate the high-visibility shell, Home, Community, report,
      complaint-detail, directory and profile copy to typed English/Marathi/Hindi resources.
- [x] Preserve the one-page complaint form while adding automatic draft/location/duplicate
      progression, concise section summaries, unified evidence guidance, a sticky submit action and
      dedicated success/failure/unknown receipt routes.
- [ ] Add an optional accessible section-jump navigator only after physical screen-reader testing
      proves it improves the single-page form instead of adding focus/cognitive overhead.
- [ ] Improve Home with nearby/trending discovery and trust cues; improve complaint detail with
      clearer route confidence/provenance, evidence and official-versus-community grouping.
- [x] Improve Community performance by loading Heat data only when selected, bounding feed pages,
      providing a text alternative and virtualising long report lists where safe.
- [x] Improve Profile/History and governance discovery without persisting exact addresses,
      exposing operational routing contacts, or presenting unsupported push/SMS/WhatsApp controls
      as active; expose only ADR-0037's sanitized verified office fields.

### Accessibility, Verification and Documentation

- [x] Add reusable accessibility states and focused tests for location recovery, list selection,
      directory filtering, long text, empty/error/loading and keyboard/focus behavior where the
      current test environment can render them.
- [ ] Verify touch targets, landmarks/headings, visible focus, text-labelled states, reduced motion,
      colour contrast, screen-reader progress and a non-map alternative.
- [x] Run targeted formatting, mobile/localisation lint, strict type-check, full mobile tests and
      the Expo Android export after the compact/localised mobile changes.
- [ ] Re-run the Citizen Web production build and visually inspect its responsive surfaces through
      the in-app browser when the web portion of this sprint resumes.
- [x] Update README, architecture, authentication, API, database, deployment, Supabase setup,
      task/progress/changelog/decision/issue tracking and an implementation worklog. Update
      `PROJECT_OVERVIEW.md` or `PLAN.md` only if product scope or phase order actually changes.

## Mobile Citizen Experience Completion Sprint

This cross-phase sprint makes the already implemented identity, complaint, media, accountability,
and transparency capabilities discoverable and usable from Expo Go. It preserves private media,
server-owned routing, email/password access with mandatory confirmed-phone OTP, and verified-only governance
rules. It must not manufacture an
operational category, route, governing body, officer, or contact when reviewed production data is
absent.

### Runtime and Authentication

- [x] Remove the stale app-local environment override from Expo's load path, preserve a private
      temporary backup, and use the root environment as the single local credential source.
- [x] Add clear native configuration and Supabase project-alignment diagnostics for loopback or
      mismatched URLs without exposing configured values.
- [x] Present explicit email/password sign-in, account creation, and password-recovery modes;
      require ordinary confirmed-phone verification, prevent sign-in/recovery from silently
      creating accounts, and retain generic anti-enumeration errors.
- [x] Add fresh-SMS signed-in password change and recovery through an isolated non-persistent Auth
      client, strict same-user/same-phone checks, immediate password update, global/local sign-out,
      resend cooldown, repeated-submit guards, and bounded success/failure states without
      persisting credentials, OTPs, proof tokens, or challenge sessions.

### Navigation and Citizen Dashboard

- [x] Add a modern authenticated mobile navigation shell for Home, Complaints, Report, Nearby, and
      More while preserving stable complaint/detail/deep-link routes.
- [x] Add grouped account/help submenus exposing profile, stored language preference, notifications,
      public reports, device guidance, and logout.
- [x] Add profile camera/gallery controls and a verified current-civic-area card with honest
      permission, accuracy, unsupported-area, ambiguity, and dependency states; do not persist an
      exact location or present it as a saved postal address.
- [x] Replace the basic home screen with a refreshable complaint dashboard showing owned totals,
      active/action-needed/resolved summaries, recent complaints, draft/report actions, and honest
      empty/error states.

### Nearby Governance and Complaint Access

- [x] Add an authenticated, service-role-only governing-body projection that resolves verified,
      non-placeholder jurisdiction names from PostGIS records without exposing private contacts or
      enabling direct client governance-table access.
- [x] Add the location-aware Nearby screen with permission, accuracy, unsupported-area, ambiguous,
      empty, and retry states; never display UUIDs or placeholders as citizen-facing authorities.
- [x] Surface category reload, complaint list refresh/filter/pagination, live media capture, draft
      resume, upload, duplicate review, submission, status history, messages, and accountability
      actions through the new navigation without weakening existing safety gates.
- [x] Preserve category-specific required attributes and photo/video count limits across routing,
      draft API, mobile decoding, dynamic input, readiness checks, and submission so a future
      reviewed operational category cannot fail from metadata silently dropped by the client.

### Verification and Traceability

- [x] Add mobile auth-mode, dashboard aggregation, environment, and nearby governance contract
      tests plus API, migration, and ACL coverage for the new projection.
- [x] Close the mobile reliability review: reload Home on route focus, guide permanently denied
      camera/microphone/location permissions to OS settings, acquire location before generating
      prepared media, guard each finished voice URI from duplicate processing, rotate stale
      submission identities without weakening exact network retries, and distinguish no-route
      responses from generic backend dependency failures.
- [x] Release the complaint-restore busy counter even when an Auth refresh replaces the restore
      effect, preventing an indefinite Report-button spinner before draft entry.
- [x] Rotate the mobile submission identity after an allow-listed pre-insert routing-evidence
      mismatch so a stale server reservation cannot trap the next safe retry; preserve ambiguous
      network/dependency outcomes as non-rotating.
- [x] Pass formatting, mobile/API lint, strict type-checking, relevant tests, Android Expo export,
      database type/master-SQL drift checks, database lint, and the complete local pgTAP suite.
- [ ] Complete the physical-device Expo Go smoke with a LAN-reachable API URL and current staging
      Supabase environment (`COMPLAINT-002`, `AUTH-005`).
- [x] Update the required project documents and record verified-data/staging-application gaps
      separately from completed mobile engineering.

## Staging Activation and Demo Identity Closeout

- [x] Confirm the hosted target is a dedicated staging project using newly generated privileged and
      database credentials stored outside source control.
- [x] Establish an IPv4-compatible Supavisor session-pooler connection because the project's direct
      database hostname is IPv6-only from the current development environment.
- [x] Run a non-mutating migration/seed dry run, then apply all 23 reviewed migrations and six
      non-production seed files to the previously empty staging database.
- [x] Verify the migration ledger, canonical Pune authority, fail-closed taxonomy/source state, and
      existing citizen profile/role through read-only staging queries.
- [x] Provision the first platform administrator through the audited one-time bootstrap and invite
      one Pune-scoped `municipal_admin` through the guarded government invitation persistence path.
- [x] Complete inbox-side municipal invitation acceptance and verify the resulting confirmed Auth
      identity, active profile, Pune membership, and municipal role.
- [x] Reconcile the staging-only privileged roles to the owner's two existing confirmed Auth
      identities in one operator transaction, revoking the temporary alias assignments while
      preserving their effective-dated membership, role, and audit history.
- [ ] Run authenticated account/admin/government OTP and dashboard browser smoke tests against the
      staging-configured applications.
- [ ] Run the interactive password-based privileged staging smoke with the provisioned matrix;
      enroll TOTP only for the accounts actively used in the demo and retain the remaining scoped
      identities for cross-scope denial tests. The QR-rendering crash is fixed locally; repeat the
      first-login flow in a fresh browser session before marking this smoke complete.
- [x] Keep explicit code entry while making citizen, government, and administrator clients
      compatible with provider-default PKCE links; narrowly support only the default government
      `invite` fragment and preserve all database role/membership guards.
- [x] Record BMC A–E administrative wards and Pune's officially current numeric model as pilot
      selections while keeping every placeholder ward and route non-routable pending official
      identity, provenance, and geometry review.

## V1 Simplified BMC Ward Routing Sprint — 2026-07-20

- [x] Inspect and validate all three CSVs inside
      `resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` without modifying the archive.
- [x] Inspect `resources/local_wellness_bmc_ward_directory_2026-07-20.zip` without modifying it and
      treat it as the separate ward-email/office evidence source for the owner-approved staging
      overlay.
- [x] Require exactly 26 unique wards, 12 categories, 312 unique ward/category routes, valid source
      dates/URLs, and internally consistent directory/matrix/long-form contact values.
- [x] Merge direct K/N and P/E email records plus K/S→K/E and P/W→P/N operational parent-office
      mappings with the 26-ward issue-contact matrix.
- [x] Generate a deterministic private seed containing ward email, primary/secondary phone,
      `1916`, WhatsApp, durable role and separate provenance metadata for both immutable archives.
- [x] Add the private forced-RLS `routing.ward_issue_contacts` matrix and indexed lookup path.
- [x] Add forward migration `20260720103000_v1_ward_email_provenance.sql` so every active row keeps
      raw email-source URL/date/locator/status independently from explicit owner-approved staging
      activation.
- [x] Add a PostGIS `resolve_v1_ward_route` facade that derives ward, authority, department, role,
      rule and decision entirely from database records.
- [x] Activate all 12 pilot categories for the V1 BMC facade without requiring client-selected
      assets or mandatory duplicate discovery.
- [x] Preserve existing routing decisions, complaint assignments, status history, idempotency and
      Government Dashboard scope rather than destructively dropping legacy tables.
- [x] Add the private idempotent `complaints.ward_email_outbox` plus bounded claim, complete and
      retry/dead RPCs.
- [x] Keep recipient email, phone, WhatsApp, exact location and provider data out of citizen
      responses and direct client grants.
- [x] Update NestJS routing persistence/service logic and mobile submission behavior, including
      replay-safe timestamp equivalence.
- [x] Generate `supabase/deploy/v1-simple-ward-routing.sql` for hosted SQL Editor use with both V1
      migrations followed by generated seed `54`, and verify its ordered payload checksum.
- [x] Regenerate database types and add migration, seed, RLS, PostGIS route, complaint assignment,
      outbox lease and delivery-state tests.
- [x] Complete a clean local database reset and all 48 pgTAP plans (1,645 assertions), API tests,
      mobile tests, type checks and lint.
- [x] Apply the focused SQL Editor bundle to hosted staging and run one authenticated BMC report
      through complaint, assignment and `pending` email-outbox creation.
- [x] Implement a trusted SMTP email worker, data-minimized template, strict RPC response decoding,
      leased provider-message-ID completion, and bounded failure recording.
- [ ] Deploy that worker with a verified sender domain/address, then complete recipient-mailbox,
      bounce/dead-letter, and provider acceptance testing before claiming external delivery
      (`DELIVERY-001`).
- [ ] Replace deterministic K/P split-crosswalk selection with exact current child geometry before
      production use.
- [ ] Expand the same data-driven contact matrix outside BMC only after municipality ward geometry
      and recipients are supplied; never add application-source branches.

## V1 Physical Database Prune — 2026-07-23

- [x] Inventory the 129 application-owned tables and distinguish current complaint, Community,
      government-dashboard and ward-email runtime dependencies from undeployed prototypes.
- [x] Add forward migration `20260723110000_prune_deferred_v1_subsystems.sql`.
- [x] Physically remove fourteen undeployed governance synchronization/versioned-contact tables and
      the unused `complaints.complaint_comments` table, reducing the application-owned table count
      from 129 to 114.
- [x] Remove the undeployed governance-sync Edge Function, seeds, configuration, generated
      contracts and obsolete tests without changing canonical governance reference inputs; remove
      the zero-consumer `@local-wellness/database` governance-sync export/source/tests while keeping
      governance import.
- [x] Retain the 312-row private `routing.ward_issue_contacts` matrix and compatibility readiness
      boundary used by complaint submission, Community, government operations and ward email.
- [x] Complete a clean local reset, database lint, and all 46 pgTAP files with 1,550 passing tests;
      align legacy schema assertions with the compact V1 state.
- [x] Complete formatting, lint, strict type-check, all 30 package test tasks, all 16 root test
      files, all 16 production builds, generated-artifact drift checks and secret scanning.
- [ ] Apply the forward prune migration to hosted Supabase through the reviewed migration workflow
      after a backup/preflight, then verify 114 application tables and smoke complaint submission,
      Community reads, government scope and one ward-email outbox path.
- [ ] Consider another staged reduction only after every candidate subsystem has a documented
      replacement, required data backfill, compatibility period, cutover/rollback plan and full
      regression evidence. Never drop complaint history or security/audit evidence merely to lower
      a table count.

## Automatically Discovered Tasks

### Hosted Database Performance Hardening — 2026-07-18

- [x] Audit application-side hosted database load and identify one-second idle claim loops plus
      repeated authenticated-request fan-out as concrete avoidable work; do not infer load from the
      number of tables alone.
- [x] Replace fixed idle polling with bounded adaptive backoff: realtime delivery reaches 15
      seconds and notification/SLA/KPI workers reach 60 seconds while idle or failing, and each
      resets immediately after claiming work.
- [x] Validate asymmetric Supabase access tokens through one verified-claims operation, run current
      database authorization reads concurrently, and coalesce only identical in-flight actor
      context reads. Do not cache completed profile, role, membership, or MFA decisions.
- [x] Add a 30-second process-local cache and in-flight coalescing only for the non-user-specific
      complaint-category catalog; authoritative submission still revalidates exact jurisdiction,
      route, policy, media, and complaint state.
- [x] Add and locally validate the read-only
      `supabase/deploy/diagnostics/database_performance_audit.sql` report for cumulative query cost,
      active waits, hot-table churn, index use, and largest tables.
- [ ] Run the performance audit on hosted staging while CPU pressure is visible, retain its output
      privately, and use `pg_stat_statements`, `EXPLAIN`, and Index Advisor evidence before adding
      any index or resizing compute.
- [ ] Reduce the remaining complaint-flow fan-out by consolidating draft hydration and avoiding the
      duplicate PostGIS jurisdiction resolution without weakening evidence/version checks.
- [ ] Bound or stream server-side evidence hashing instead of repeatedly downloading complete
      finalized objects, then add a representative one-photo submission load test and query budget.

- [x] Generate and checksum a single `supabase/master.sql` empty-database bootstrap from all 48
      ordered migrations, add deterministic generate/check commands, and document that seeds and
      existing migrated databases are outside its use boundary.
- [x] Replace the unproven fixed-baseline Dashboard parts with adaptive full-history 23/25 bundles
      that fingerprint and skip coherent completed migrations, apply exact missing sources, reject
      partial/non-contiguous state, and keep seeds and the official ledger separate.
- [x] Generate the 77,849-byte current-session SQL Editor artifact for a verified migration-38
      baseline, embedding exact migrations 39–43 with adaptive fingerprints, an advisory-locked
      transaction, final readiness verification, deterministic generate/check commands, and static
      artifact tests.
- [x] Rehearse the compact upgrade locally from migration 38, verify migrations 39–43 apply, verify
      an immediate rerun safely skips all five, and pass 90 focused assertions across pgTAP plans
      038, 039, 040, 042, and 044.
- [x] Prevent stale Nearby/Trending responses during rapid Community navigation and provide visible
      Back/Sign in controls for anonymous Community visitors.
- [ ] On current staging, use the compact migrations 39–43 bundle only when its migration-38
      baseline preflight passes. The owner reports running it successfully through SQL Editor on
      2026-07-17; readiness, schema, and official migration-ledger reconciliation against all 51
      source migrations remain required. `master.sql` remains empty-database-only.
- [x] Generate the official-source BMC staging/demo pack, ten machine-readable CSVs, workbook,
      manifest, six-warning validation report, relationship-version migration, deterministic seed,
      checksum, and rollback-isolated tests without rewriting the Maharashtra canonical inputs.
- [x] Load source-backed BMC authority, seven zones, 26 operational wards, offices, departments,
      durable roles, officers, assignments, contacts, boundary/crosswalk evidence, and pilot
      categories while keeping external production delivery false.
- [x] Add optional BMC internal-routing seeds `52`/`53` for exactly 22 one-to-one wards and the three
      asset-independent categories `garbage_dump`, `missed_sweeping`, and `mosquito_breeding`, with
      66 deterministic rules, one confidence policy, three duplicate policies, and fail-closed
      verification. No asset-dependent category or split child ward is activated.
- [x] Generate a four-part, transaction-atomic SQL Editor bundle for an existing Supabase target
      that loads baseline categories/core, official BMC boundaries, the reviewed ward/governance
      crosswalk, and bounded routing activation without rewriting canonical governance inputs.
- [x] Verify the current hosted BMC data projection exposes 12 visible categories, three
      operational categories, 22 one-to-one wards/66 rules, finalized private media, a K/W Ward
      internal route, and `automaticOutboundDelivery = false`. This proves internal routing data,
      not external BMC-system delivery.
- [x] Reproduce the hosted submit failure with a clean citizen/draft/location/duplicate/routing
      smoke, isolate the first failure to redundant candidate-boundary evidence validation and the
      second to hosted submission-function drift, then prove the corrected full stack locally from
      draft creation through a `201` complaint receipt.
- [x] Remove the redundant candidate-payload boundary check while retaining separately verified
      jurisdiction evidence and exact boundary-version matching; add safe dependency-operation
      diagnostics without logging coordinates, tokens, descriptions, contacts, or raw provider
      errors.
- [x] Add forward migration
      `20260718100000_complaint_routing_evidence_diagnostics.sql`, a protected canonical V2
      completion function, exact granular evidence-mismatch markers, replay-safe public delegation,
      ACL checks, and BMC submission integration coverage without weakening any evidence check.
- [x] Serialize mobile complaint mutations and make repeated submit taps single-flight so category,
      location, media, duplicate, discard, and submit operations cannot race one another.
- [ ] Apply `20260718100000_complaint_routing_evidence_diagnostics.sql` to hosted staging through
      **SQL Editor → New query**, run the read-only BMC submission runtime audit, and repeat the
      authenticated saved-report submission smoke. Do not claim hosted repair until it returns a
      complaint receipt.
- [x] Pin a network-free official MCGM ArcGIS source manifest for the nine currently unavailable
      BMC categories, mapping candidate road, drain, sewer/manhole, water, streetlight, building,
      public-right-of-way, and tree layers while explicitly prohibiting import, publication,
      routing activation, or external delivery.
- [ ] Acquire, snapshot, validate, match, and manually review BMC asset ownership for roads, drains,
      sewer/manholes, water, streetlights, buildings, public land/right-of-way, and trees/gardens
      before activating any of the nine remaining categories; all nine canonical BMC routing rows
      require asset ownership (`ROUTING-001`).
- [ ] Acquire reviewed child geometry or an approved address/PIN crosswalk for the K/S, K/N, P/E,
      and P/W split wards; legacy K and P parent geometry must continue to fail closed for routing
      (`DATA-004`).
- [ ] Verify the replacement staging project's Auth identities, application profiles, citizen role,
      administrator role, and government membership/role through trusted read-only checks; repair
      only through the audited workflows and never infer access from email or Auth metadata
      (`ENV-002`, `ENV-004`, `AUTH-001`).
- [x] Confirm the active staging Supabase privileged/database credentials are newly generated
      replacements and remain outside source control (owner-confirmed 2026-07-14).
- [ ] Complete the historical provider-log review, remote/all-branch secret scan, and revoke any
      legacy Redis token if it still exists; Redis remains unused and deferred (`SEC-001`).
- [x] Install and validate the repository-pinned Supabase CLI.
- [x] Initialize and validate local Supabase configuration and invite template.
- [ ] Complete hosted identity configuration for the confirmed staging project: exact redirect
      allow-lists, actual default/code/invite email delivery, SMS provider, rate limits, backups,
      managed secret storage, and browser/device smoke tests. Custom templates are optional
      (`ENV-002`, `AUTH-005`).
- [ ] Add audited existing-user government assignment plus expire, revoke, renew, and additional-scope lifecycle operations before broader government onboarding (`AUTH-001`).
- [ ] Enforce privileged MFA/AAL after managed enrollment and recovery rehearsal before pilot
      launch; the local enrollment/challenge/switch-account UX is complete (`AUTH-002`).
- [ ] Bind device revocation to provider sessions before representing revocation as forced logout (`AUTH-003`).
- [ ] Add PostgreSQL/platform-backed audit, invitation, and device quotas without Redis (`AUTH-004`).
- [ ] Run hosted callback, real SMS, Expo development-build deep-link, OS SecureStore, and SSR-cookie smoke tests (`AUTH-005`).
- [x] Add template-compatible one-shot web callbacks and strict mobile PKCE/token-hash callbacks;
      reject raw citizen/admin/mobile fragment sessions and document installed-build requirements
      (ADR-0019).
- [ ] Approve and publish official Phase 9 pilot calendars, targets, category overrides, completion
      states, dependency pauses, escalation rules, and verified target roles (`SLA-001`).
- [ ] Decide and implement an audited prospective adoption policy—or explicit permanent exclusion—
      for complaints created before Phase 9; load-test worker batches against lease duration
      (`SLA-002`).
- [ ] Configure managed KPI scheduling, cadence/windows, retention, freshness/failure monitoring,
      late-data correction, and production-volume validation (`KPI-001`).
- [x] Use the exact allow-listed same-origin citizen callback and cover URL construction; delivered hosted-link and SSR-cookie smoke remains under `AUTH-005`/`ENV-002` (`AUTH-006`).
- [x] Apply all 23 existing migrations through `20260714124000` and the six reviewed
      non-production seed files to the previous staging Supabase target; verify 12 seeded categories
      with zero operational rows and 11 synchronization sources with zero active rows. Retain this
      as historical evidence rather than current-target state.
- [ ] Smoke citizen web Auth, NestJS profile reads, SSR cookies, onboarding, and account rendering
      against the reconciled replacement staging environment (`ENV-004`, `AUTH-005`).
- [x] Verify the previous staging citizen identity has an active application profile and citizen
      role; current-target verification remains separately open above.
- [x] Create a distinct administrator identity on the previous staging target and grant the first
      global `platform_admin` role through the audited one-time bootstrap RPC.
- [x] Invite a distinct government identity on the previous staging target as `municipal_admin`
      with `authority` scope for Pune Municipal Corporation through the Auth invitation plus guarded
      persistence RPC.
- [x] Accept and verify that previous-target municipal-admin invitation, then reconcile the temporary privileged
      aliases to existing confirmed owner-controlled Auth identities with one active global
      `platform_admin` and one active Pune-scoped `municipal_admin` after the change.
- [ ] Smoke the platform-admin and government OTP login, effective scope, admin console, and
      government dashboard with the reconciled controlled inboxes.
- [x] Add the authority foreign key after Phase 2 creates the canonical governance entity (`DB-001`).
- [ ] Obtain official LGD codes for all districts, talukas, local bodies, Gram Panchayats, villages, and wards before promoting affected records to verified routing data (`DATA-002`).
- [ ] Replace template Gram Panchayat/village records and synthetic ward rows with complete official datasets (`DATA-002`, `DATA-003`).
- [ ] Import verified pilot municipality and ward polygons so a real pilot coordinate can satisfy the Phase 2 spatial exit criterion (`DATA-004`).
- [ ] Resolve the Vasai-Virar ward/local-body name mismatch and all composite routing department/role/agency labels through an explicit reviewed crosswalk (`DATA-005`).
- [ ] Obtain record-specific sources and current verification for local-body, office, ward, utility, department, role, and officer contact data (`DATA-003`, `DATA-006`).
- [x] Record the BMC pilot identity decision as administrative wards A, B, C, D, and E; never infer
      an ordinal mapping from `BRIH-W01`–`BRIH-W05`.
- [x] Create separate official-source-backed BMC operational ward records, including A–E, while
      preserving the canonical numeric placeholders as non-routable history (`DATA-003`,
      `DATA-005`).
- [ ] Retire the draft V1 numeric BMC synchronization-scope targets and create a reviewed,
      versioned official replacement scope without ordinally mapping the canonical placeholders
      (`DATA-003`, `DATA-005`).
- [x] Record that the Pune pilot will use the officially current numeric ward model.
- [ ] Reconcile `PUNE-W01`–`PUNE-W05` to official effective-dated numeric identities and geometry;
      the selected model does not verify the bootstrap placeholders (`DATA-003`, `DATA-004`).
- [ ] Implement a reviewed delta-refresh operator workflow before importing a replacement governance bundle; the current generator intentionally supports the pinned baseline only (`DATA-008`).
- [x] Extend governance reporting with a reconciled per-file accepted/unverified/quarantined/rejected outcome matrix (`DATA-006`); official LGD/contact/source-specificity evidence remains a separate pilot-promotion gate.
- [ ] Add an audited mapping/revocation workflow for any retained legacy placeholder authority scopes before existing-account onboarding (`AUTH-001`, `DATA-008`).
- [x] Re-run `pnpm audit --prod` with registry connectivity; no known vulnerabilities were reported.
- [x] Make the Husky pre-commit hook invoke the repository-pinned pnpm through Corepack so it works without a global `pnpm` shim.
- [x] Make local-required Supabase Auth E2E reject non-loopback API URLs before creating test users.
- [x] Reconcile `AGENTS.md` documentation lifecycle references with the canonical tracker files under `docs/`.
- [x] Remove the empty stray file `docs/architecture.md,` after confirming the canonical file is `docs/architecture.md`.
- [ ] Optimize production container contents after the runtime dependency graph is implemented.
- [ ] Acquire, review, and publish the verified Pune pilot polygons, authority/department/role mappings, asset ownership, confidence policy, routing rules, and fallbacks required for operational routing (`ROUTING-001`).
- [x] Implement the PostgreSQL lease, scheduled Edge retrieval, immutable snapshot, audit, and
      contact-version persistence slice without Redis or BullMQ (`GOVSYNC-001`).
- [ ] Implement and operate approved source-specific parsers, entity matchers, change detection,
      review surfaces, and transactional publishers (`GOVSYNC-001`).
- [ ] Add DNS resolution/rebinding protection and orphaned snapshot reconciliation before any
      source is activated (`GOVSYNC-002`, `GOVSYNC-003`).
- [x] Connect the duplicate-detection framework to privacy-safe complaint candidate persistence and explicit, non-merging citizen review semantics (`ROUTING-002`).
- [x] Add a service-only activation report for simultaneously applicable routing rules using conflicting confidence-policy versions; the runtime continues to fail closed (`ROUTING-003`).
- [x] Add a distinct routing idempotency key and stored-result replay before Phase 4 clients use automatic retries (`ROUTING-004`).
- [ ] Configure approved speech-to-text and media moderation/processing providers, then add normalized-description confirmation and processing lifecycle tests without exposing original media (`COMPLAINT-001`).
- [ ] Run complete camera/video/voice/location, interrupted-upload, protected-storage, deep-link,
      and callback smoke tests on representative physical Android/iOS devices. Include
      current-area reuse/TTL/explicit-refresh/Auth-clear behavior and prove sequential complaint
      issue/media captures remain fresh (`COMPLAINT-002`, `AUTH-005`).
- [ ] Select and configure the Expo/EAS push-notification project, Android/iOS provider credentials,
      consent/preferences, and delivery policy before adding `expo-notifications` or registering a
      push token; in-app history and Socket.IO remain the only implemented notification channels
      (`NOTIFY-001`).
- [ ] Add a PostgreSQL/platform-scheduled cleanup path for expired upload reservations and orphaned private Storage objects without Redis or BullMQ (`COMPLAINT-003`).
- [ ] Add an owner-scoped, idempotent draft-attachment removal/replacement API and mobile action
      that cleans the exact private object safely, rejects submitted/foreign media, and preserves
      audit/concurrency evidence (`COMPLAINT-004`).
- [ ] Add an owner-authorized, short-lived, non-cacheable signed-read endpoint and mobile viewer for
      finalized original complaint evidence without exposing buckets/object paths or weakening the
      separate resolution-evidence access boundary (`COMPLAINT-005`).
- [ ] Add a dedicated private persisted-address model only after the provider, consent, RLS,
      retention, and exact-location privacy design is approved (`PROFILE-002`).
- [x] Implement reviewed locality support/trending behavior with one private row per account,
      aggregate-only support output, private star/follow state, privacy-safe live ranking, current-
      projection withdrawal, and explicit separation from official routing/SLA priority.
- [ ] Complete managed migration/data activation, pilot moderation and abuse operations, rendered/
      device testing, and public-projection smoke before enabling community interaction. Public
      comments remain separately disabled (`COMMUNITY-001`, `NOTIFY-003`).
- [ ] Paginate mobile notification history beyond its current newest-100 request using the existing
      API cursor, with stable deduplication and refresh behavior (`NOTIFY-004`).
- [x] Backfill missing Auth profiles and baseline citizen roles idempotently without altering existing privileged or revoked assignments; add local OTP-only email templates and delivered-code E2E coverage.
- [x] Add authenticated, data-driven nearby-asset discovery and a mobile verified-asset picker that rejects placeholder, inactive, unverified, expired, unowned, and non-routable assets.
- [x] Prevent the mobile complaint flow from advancing past location capture unless evidence is verified or partially verified, and strictly decode profile responses.
- [x] Reject stale, expired, spoofed, oversized, or MIME-mismatched government resolution evidence
      before workflow finalization; cap active unlinked reservations and force signed reads to
      download rather than render inline.
- [x] Keep evidence linked to an earlier resolution visible as immutable history while exposing only
      finalized, unlinked evidence as eligible for a new resolution submission.
- [ ] Add scheduled private resolution-evidence object cleanup plus full decode, malware scanning,
      and moderation before the public pilot (`GOVDASH-002`).
- [ ] Approve and publish the operational Phase 7 rating bounds, feedback/reopen windows, eligible
      statuses, reason codes, evidence requirement, attempt cap, and repeat-escalation threshold;
      feedback and reopening must remain unavailable until then (`RESOLUTION-001`).
- [ ] Add current-assignment-authorized signed review of citizen before/reopen evidence and expose
      only current-assignment work references in the resolution form (`RESOLUTION-002`).

## Current Blockers

- The sanitized civic-area office projection is locally implemented through
  `20260724120000_verified_civic_area_office_contacts.sql`. Hosted staging must apply that migration
  (or the byte-identical SQL Editor artifact), deploy the matching API/mobile build, and verify one
  exact-ward plus one municipality-wide office response and safe phone/mail/source actions.
- The 12-category/26-ward V1 facade is local until
  `supabase/deploy/v1-simple-ward-routing.sql` is run against hosted staging and a fresh complaint,
  assignment and single `pending` outbox row are verified. Repository generation now includes the
  separate immutable phone/WhatsApp/category and ward-email/office sources plus the forward email-
  provenance migration; it does not imply hosted application.
- The SMTP sender, data-minimized template, leased completion/failure path, and server-only
  configuration contract are implemented. Hosted worker deployment, a controlled recipient-
  mailbox/provider-message-ID smoke, and bounce/dead-letter operations remain open under
  `DELIVERY-001`. Phone and WhatsApp remain private reference contacts, not automated channels.
- K/P split coverage uses deterministic stored crosswalk selection for staging; exact current child
  geometry remains required before production.

- Hosted Supabase has reported sustained CPU above 80%, and complaint submission can stall under
  that pressure. Fixed one-second idle polling and redundant API authentication work are mitigated
  locally, but no hosted improvement is claimed until the read-only performance audit is run while
  the condition is present. Exact expensive statements, plans, and any evidence-backed index or
  query repair remain a staging operational task. The verified 129→114 V1 prune removes only
  undeployed/unused structures for maintainability and is not presented as the cause or cure for
  the earlier request storm; further removal or security-sensitive caching remains prohibited
  without replacement/backfill/cutover evidence.

- Mobile navigation, dashboard, OTP modes, complaint metadata, and verified-directory engineering
  are complete locally. A physical phone must launch Expo with a LAN-reachable API URL; the root
  environment's loopback URL is intentionally rejected on native devices.
- The replacement staging target's migration ledger has not been independently reconciled. Even if
  its owner-reported master import includes the verified-governing-body projection, no verified
  pilot geometry is documented as active; Nearby therefore cannot return a real authority yet.
- The earlier credential-safe managed read audit found zero category projections and no tested BMC
  jurisdiction rows, but that observation is superseded for pilot data: a current hosted smoke now
  returns 12 catalog categories, three operational categories, a verified K/W Ward jurisdiction,
  and a deterministic mosquito-breeding route with finalized private media. Submission still fails
  after routing because hosted staging has not applied the additive
  `20260718100000_complaint_routing_evidence_diagnostics.sql` repair. Local in-process submission
  returns `201`, so the remaining immediate blocker is managed schema/function rollout, not mobile
  location, media, category selection, PostGIS, or routing availability.
- Citizen, government, and administrator callbacks now accept default PKCE links or delivered codes
  without requiring template edits. Exact managed redirect allow-lists, SSR-cookie smoke, and an
  installed mobile build remain environment-gated under `AUTH-005`/`ENV-002`.
- Citizen account failures now render explicitly, but a working profile still requires the citizen
  web Auth client and API to target the same fully migrated Supabase environment. The stale local
  override is removed and runtime scripts now share the root environment; current-target
  profile/role reconciliation and browser/API smoke remain (`ENV-004`).
- The configured replacement project is owner-confirmed as staging, and the owner reports a master
  SQL import. Its exact migration/seed/Auth/role state is not independently verified. Hosted
  identity validation remains gated on ledger reconciliation, exact provider/redirect
  configuration, and browser/device smoke tests (`ENV-002`, `ENV-004`, `AUTH-005`); the historical
  security audit remains under `SEC-001`.
- Citizen Advanced Phone MFA is no longer a citizen release requirement. ADR-0033 uses the
  ordinary Supabase Phone provider for confirmed-phone OTP and keeps privileged TOTP/AAL2
  unchanged. Hosted staging still needs migrations 52–53, Phone Auth signup capability and phone
  confirmations enabled, the email-required Before User Created hook activated, the preferred
  `*_PHONE_VERIFICATION_MODE=enforce` variables, and an installed-device
  link/resend/password-change/recovery/signup-denial smoke. Ordinary Phone Auth also creates an
  alternate AAL1 provider identity, and stale `phone_change` plus lost-phone recovery require
  explicit operations (`AUTH-010`, `AUTH-014`, `AUTH-015`). Citizen Web remains intentionally
  public-only until its complete protected-flow release matrix is approved.
- Phase 2 schema, validation, safe baseline import, security, generated types, and local verification are complete.
- The `PLAN.md` Phase 2 pilot-coordinate exit criterion remains blocked by pilot selection and absent verified boundary geometry (`DATA-004`).
- Workbook-to-CSV visual/cell parity remains blocked by the unavailable approved spreadsheet runtime (`DATA-007`).
- Rendered application inspection remains blocked by the unavailable in-app browser; route-level runtime smoke checks passed (`ENV-003`).
- Phase 3 engineering has no implementation blocker. Hosted BMC routing currently resolves only
  three categories across 22 exact one-to-one wards. Pune and the remaining nine BMC categories
  still fail closed; the canonical BMC routing references require reviewed asset ownership for all
  nine. The official MCGM layer manifest is discovery evidence only, not an approved import or
  route (`ROUTING-001`).
- The undeployed governance synchronization/contact prototype, Edge Function and draft source/scope
  seeds were removed from the compact V1 runtime. A future source-refresh subsystem must be
  reintroduced through a new reviewed architecture with parser/review/publication, DNS hardening,
  retention and migration plans (`GOVSYNC-001` through `GOVSYNC-003`). This does not change BMC ward
  routing or Pune's need for reviewed current geometry/data.
- Phase 4 engineering is locally complete, including a clean full-stack BMC draft/location/
  duplicate/routing/submission smoke. Hosted BMC data exposes 66 internal rules for three
  categories, but the final hosted submission function remains at the pre-repair definition until
  migration `20260718100000` is applied. Pune production routing remains blocked on reviewed
  geometry and routing evidence (`ROUTING-001`, `COMPLAINT-006`).
- Automatic voice transcription/media moderation and physical-device capture/resume validation require approved providers and devices (`COMPLAINT-001`, `COMPLAINT-002`).
- Phase 5 government-workflow schema/API/UI engineering is implemented locally. Its replacement-
  target schema and the prior platform-administrator/Pune municipal-administrator assignments must
  be reconciled; authenticated dashboard smoke remains pending. A BMC internal demo queue requires
  the two new migrations, optional BMC seeds `50`–`53`, official test-account role binding, and a
  submitted complaint in that target. External BMC delivery remains disabled.
- A real interactive map remains gated on provider, billing/key, and coordinate-sharing decisions
  (`GOVDASH-001`); the implemented dashboard uses authorized textual location context.
- Resolution evidence has checksum, size, signature, content-type, expiry, and private-access gates,
  but full decoding, malware scanning/moderation, and scheduled Storage-object cleanup remain
  pre-pilot work (`GOVDASH-002`).
- Phase 6 engineering is locally complete. Managed staging needs ledger reconciliation through its
  migrations, one worker and one realtime instance, exact origin/server-secret configuration, and authenticated
  reconnect, expiry, revocation, and backlog smoke tests. Push/email providers and preferences are
  unresolved (`NOTIFY-001`), realtime remains deliberately single-instance (`NOTIFY-002`), and
  public comments remain disabled pending an explicit visibility/privacy decision (`NOTIFY-003`).
- Phase 7 engineering and local verification are complete. Managed feedback/reopening remains
  intentionally unavailable until an operational policy is approved and published
  (`RESOLUTION-001`); the replacement target's Phase 7 migration state is unreconciled.
- Citizen Web now exposes owner complaint history/detail/timeline plus feedback and policy-aware
  reopen actions locally. Mobile reviewed-public support, private stars, and live trending are
  implemented, but remain operationally inactive until the engagement migration, public policy,
  reviewed projections, moderation/abuse procedures, and hosted/device smoke are complete. Public
  comments remain deliberately unavailable (`COMMUNITY-001`, `NOTIFY-003`).
- Government accountability currently exposes evidence metadata without a signed before/reopen
  evidence review action, and transferred complaints can display historical work references that
  PostgreSQL safely rejects for a new resolution (`RESOLUTION-002`).
- Phase 8 transparency and Phase 9 accountability engineering are locally complete, but their
  migration versions have not been reconciled against the current staging ledger. No visibility
  policy, publication, SLA calendar/target/escalation chain, KPI schedule, or operational snapshot
  was seeded (`TRANSPARENCY-001`, `SLA-001`, `KPI-001`). Existing-complaint SLA adoption and
  managed worker lease sizing remain explicit rollout work (`SLA-002`).

## Technical Debt

- Production Node images currently copy the verified workspace from the build stage, including development dependencies and source. This favors a correct Phase 0 build; pruning and image-size optimization are tracked for a later infrastructure task.
- Existing-account government access lifecycle, privileged MFA, device-session binding, append-path quotas, and hosted/real-device validation remain explicitly tracked pre-launch work.
- Expired private upload reservations and orphaned Storage objects need a PostgreSQL/platform-scheduled cleanup path before public operation (`COMPLAINT-003`).
- Finalized draft attachments need owner-scoped individual removal/replacement, and submitted
  original evidence needs a separate short-lived owner signed-read/view path
  (`COMPLAINT-004`, `COMPLAINT-005`).
- The mobile notification screen currently shows the newest 100 durable records and needs API-cursor
  pagination for older history (`NOTIFY-004`).
- If governance synchronization is reintroduced after V1, its replacement Storage design must
  include orphan reconciliation and retention from the outset (`GOVSYNC-003`).
- Private resolution evidence needs scheduled expired/orphan object cleanup and provider-backed
  full media decoding/malware moderation before public operation (`GOVDASH-002`).
- The mobile civic-area lookup intentionally retains only derived labels in memory. A persisted
  street address needs a dedicated private model and provider/privacy decision (`PROFILE-002`).
- Reviewed-public support, private star/follow state, live trending, and official-priority
  separation are implemented. Pilot moderation/abuse operations, managed data activation, rendered
  validation, and any future comments/reporting/notification model remain technical and operational
  debt (`COMMUNITY-001`, `NOTIFY-003`).

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
- ADR-0013 — Use database-enforced government complaint workflows.
- ADR-0014 — Use PostgreSQL-leased outbox delivery for V1 notifications.
- ADR-0015 — Use database-enforced resolution accountability.
- ADR-0016 — Use reviewed public complaint projections.
- ADR-0017 — Use an authenticated verified-only governance directory projection.
- ADR-0018 — Use database-enforced SLA and reproducible KPI snapshots.
- ADR-0019 — Support provider-default passwordless callbacks (superseded by ADR-0020 for citizen
  entry; retained for privileged invitations and legacy callbacks).
- ADR-0020 — Use email/password and staged MFA (superseded by ADR-0028, then ADR-0033 for
  citizens).
- ADR-0021 — Use private owner-scoped profile images.
- ADR-0022 — Use PostgreSQL-backed V1 API hardening.
- ADR-0023 — Separate queue routing from external contact delivery.
- ADR-0024 — Use account-bound reviewed-public complaint engagements.
- ADR-0025 — Use password sign-in for pre-provisioned privileged identities.
- ADR-0026 — Use verified JWT claims for API authentication while retaining current database
  authorization.
- ADR-0027 — Use a simple ward/contact routing facade for the V1 BMC pilot.
- ADR-0028 — Enforce citizen Phone MFA for mobile password access (superseded by ADR-0033).
- ADR-0029 — Use purpose-scoped mobile location coordination.
- ADR-0030 — Show owner-private reports in Community.
- ADR-0031 — Prune deferred database subsystems for V1.
- ADR-0032 — Separate citizen taxonomy from operational routing profiles.
- ADR-0033 — Use confirmed Phone Auth OTP without citizen MFA (supersedes ADR-0028; privileged
  TOTP/AAL2 remains unchanged).
- ADR-0034 — Step up an existing authenticator before citizen phone change without making MFA a
  requirement for ordinary no-factor citizens.

## Files Modified This Session

- Added two deterministic SQL Editor-sized master parts at the reviewed end-of-Phase-5 boundary, extended the generator/check to keep the
  complete and split artifacts synchronized, and documented ordering, empty-database safety, and
  migration-ledger reconciliation requirements.
- Added citizen email/password signup/sign-in, non-enumerating password recovery, and staged
  Supabase Phone MFA on web/mobile; added privileged TOTP/AAL observe/enforce modes for government
  and administrator clients and API authorization.
- Added owner-private profile images with Storage RLS, bounded file validation, signed reads, and
  web/mobile upload, replacement, and removal experiences.
- Tightened complaint location/media proximity to 50 m at client, API, and PostgreSQL boundaries;
  added a reviewed locality feed and provider-neutral privacy-safe heatmap to mobile.
- Added PostgreSQL-backed API quotas, security/health responses, graceful shutdown, bounded smoke
  tooling, secret scanning, operator runbooks, and monitoring signals without Redis or Sentry.
- Added routing-delivery readiness that distinguishes a verified government queue from an approved
  officer/governing-body complaint-intake contact and never claims automatic outbound delivery.
- Added six additive Phase 10 migrations through `20260716117000`, pgTAP/API/client coverage,
  generated database types, and the deterministic master SQL.
- Added BMC operational ward relationship versioning, official-source staging/demo data artifacts,
  deterministic governance seeds, and optional routing seeds `52`/`53` for three asset-independent
  categories, 22 exact wards, and 66 rules while leaving external complaint delivery disabled.
- Added exact signed-in account context across all three web portals, clear first-enrollment versus
  returning TOTP guidance, account switching/recovery paths, and named administrator invitation
  selectors backed by a strict service-only governance projection.
- Added migrations `20260716118000`, `20260716119000`, and
  `20260717100000_public_complaint_engagements.sql`, bringing that milestone's source set to 43
  migrations with a 23/20 adaptive split.

- Added the modern Expo citizen shell, its original login/create/recovery modes, complaint
  dashboard/history, grouped menu, verified-governance Nearby screen, category-aware dynamic form,
  and runtime configuration diagnostics.
- Added Expo profile camera/gallery selection and a verified, non-persistent current-civic-area
  lookup with permission/settings recovery; exact coordinates are not saved as an address.
- Added protected Citizen Web complaint list/detail/timeline pages plus feedback/confirmation and
  policy-aware reopen actions using server-owned resolution context.
- Added one verified-directory migration/pgTAP plan, a service-only PostGIS projection, strict
  shared/API/mobile contracts, regenerated database types/master SQL, and focused coverage.
- Added two Phase 7 accountability migrations, two pgTAP plans, regenerated database types, shared
  resolution contracts/validation, authenticated API/store boundaries, and focused tests.
- Added mobile private evidence review, policy-driven feedback/reopening, live follow-up capture,
  durable citizen receipts, external-update refresh, and safe retry behavior.
- Added government-dashboard completion-location/work-reference input and access-scoped resolution,
  feedback, reopen, and escalation history.
- Completed the review-gated Phase 8 public projection, duplicate groups, anonymous read APIs, and
  provider-neutral citizen web/mobile transparency surfaces without activating public data.
- Added Phase 9 reviewed/versioned SLA policy and business-calendar storage, materialized clocks,
  external-dependency pauses, transactional escalation, PostgreSQL-leased workers, reproducible KPI
  snapshots, strict APIs, and the access-scoped government accountability dashboard.
- Made the earlier email authentication compatible with either managed default links or delivered
  codes while retaining citizen-create-only registration and database-enforced privileged access.
- Updated README, technical guides, trackers, ADR-0015 through ADR-0019, the Phase 7/8/9 worklogs,
  and the mobile-citizen-experience worklog. Canonical governance CSV/workbook bytes and managed
  environments were not changed.
- Optional BMC seeds `52`/`53` activate source-backed internal demo routing only for three
  asset-independent categories across 22 exact wards; external complaint delivery and official-
  system submission remain false. Redis, BullMQ, Redis adapters/caching, and Sentry remain absent.
- Added compact mobile navigation and a dedicated Community surface with Local, Trending, and Heat
  views; authenticated citizens can support once and privately star current reviewed reports.
- Replaced the mobile six-stage complaint presentation with one scrollable form, added an explicit
  submission-blocker checklist, changed notification dots to bells, and shortened remaining visible
  option copy without weakening routing, media, duplicate, or acknowledgement gates.
- Added the four-part `supabase/deploy/bmc-mobile-demo/` SQL Editor bundle for targeted category,
  boundary, crosswalk, and routing activation on an existing staging project. The bundle keeps K/P
  split wards and unavailable categories fail closed and never enables external delivery.
- Added the compact `supabase/deploy/current-session/01_migrations_39_through_43.sql` upgrade,
  deterministic generator/check commands, and static/runtime tests. A local migration-38 rehearsal
  applied all five migrations, reran safely, and passed 90 focused pgTAP assertions.
- Diagnosed the hosted BMC complaint failure in two stages, removed redundant candidate-boundary
  payload validation while preserving exact independently verified versions, added safe dependency
  diagnostics, and proved a complete local submission returns `201`.
- Added migration `20260718100000_complaint_routing_evidence_diagnostics.sql`, granular exact
  mismatch markers, a protected canonical submission implementation, a read-only hosted runtime
  audit, mobile mutation single-flight protection, and official MCGM discovery contracts for all
  nine unavailable BMC categories.
- Added password entry for existing Admin Console and Government Dashboard identities without
  changing their TOTP/AAL2 or database authorization gates; provisioned seven distinct expiring BMC
  staging identities and stored their generated credentials only in a gitignored mode-`0600` local
  artifact.
- Reduced avoidable hosted database pressure with verified-claims authentication, in-flight actor
  context coalescing, a bounded category-catalog cache, adaptive idle worker/realtime polling, and a
  read-only hosted performance audit. Current authorization, exact routing, complaint state, and
  fail-closed verification remain uncached.
- Added a forward-only V1 physical prune that removes fifteen unused/undeployed application tables,
  retires the undeployed governance-sync runtime, preserves active complaint/Community/government/
  ward-email behavior, and verifies the resulting 114-table schema through a clean reset, database
  lint and 1,550 pgTAP tests.

## Next Recommended Task

### Release Gate — hosted civic-area offices and polished mobile (2026-07-24)

- [ ] Apply `supabase/deploy/civic-area-office-contacts.sql` to the reconciled hosted staging
      project and record its SHA-256 separately when SQL Editor is used.
- [ ] Deploy the matching API/mobile build and verify an exact ward result, a wardless
      municipality-wide result, null-field omission, and safe call/mail/in-app source actions.
- [ ] On representative Android and iOS devices, validate English/Marathi/Hindi long labels,
      screen-reader order, 44 px targets, one automatic location permission prompt, five-minute
      Community/Nearby/Profile reuse, explicit recovery, and fresh sequential complaint evidence.
- [ ] Submit a complaint and confirm the dedicated result route plus owner-private Community
      preview without automatic public publication.

### Release Gate — hosted JagrukSetu BMC intake (2026-07-24)

- [ ] Reconcile hosted staging through
      `20260724100000_require_email_identity_for_auth_signup.sql`, confirm the 312-row base ward
      matrix and twelve specialised profiles, then run
      `supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql` followed by
      `supabase/deploy/jagruksetu-bmc-intake-v1.sql`.
- [ ] Record the SQL Editor source hashes separately from the migration ledger; the repository has
      not applied either artifact to hosted Supabase.
- [ ] Deploy the matching API and mobile build and verify 17 primaries, 340 subcategories, 19
      workflows, 256 submittable leaves, 84 protected handoffs, 338 contacts and 29 actions.
- [ ] On a physical device, verify long-label dropdown behavior, screen-reader focus, draft resume,
      one specialised submission, one general submission and protected call/browser actions.
- [ ] Confirm protected actions never create complaint, Community or ward-email records and that
      all 20 `COR` leaves remain private and unmapped.

### Release Gate — hosted V1 database prune (2026-07-23)

- [ ] Back up and reconcile hosted staging before applying
      `20260723110000_prune_deferred_v1_subsystems.sql`; the repository has not modified hosted
      Supabase.
- [ ] Verify the application-owned table count is 115 after the intake migration and rerun
      complaint submission/detail,
      owner/public Community, government scope/actions and ward-email queue/claim smoke tests.
- [ ] Monitor hosted CPU/request counts independently. Table reduction is a maintainability change,
      not an evidence-backed repair for the prior PostgREST request storm.
- [ ] Start any later physical reduction only after replacement, backfill, compatibility,
      cutover/rollback and regression plans are approved.

### Release Gate — managed citizen authentication validation (2026-07-23)

- [x] Diagnose the current hosted failure: Phone Auth and Twilio Verify are enabled, but
      `public.user_has_verified_phone(uuid)` is absent from PostgREST (`PGRST202`) and no hosted
      identity has a confirmed phone.
- [x] Prevent Supabase `USER_UPDATED` for the same user from resetting the mobile OTP code-entry
      state after a phone-change request; cover initial, repeated-same-user and changed-user
      inspection behavior.
- [x] Remove the pinned Auth SDK's deprecated custom `processLock`, defer authoritative user
      inspection until the Auth-state callback returns, and cancel stale scheduled work on newer
      Auth events, sign-out and unmount.
- [x] Attribute the hosted `PUT /auth/v1/user` HTTP `401`: the affected non-privileged citizen has
      a verified TOTP factor from an earlier Government Dashboard test, so Supabase returns
      `insufficient_aal` before invoking Twilio Verify.
- [x] Add the ADR-0034 compatibility path: ordinary no-factor citizens continue directly to SMS,
      while an account with an existing verified TOTP factor must complete a same-user AAL2
      challenge before changing its phone. Do not enroll or delete factors automatically.
- [x] Run one hosted no-factor delivery smoke with a temporary email-backed Auth identity:
      Supabase accepted the exact `phone_change` request and cleanup completed. Handset receipt,
      OTP verification and the installed-device TOTP compatibility path remain pending.
- [x] Clarify the legacy-authenticator screen: no SMS is sent during TOTP step-up, codes rotate in
      the previously enrolled authenticator app, the mobile-number/SMS step follows successful
      verification, and a lost factor requires an administrator reset.
- [x] After explicit user authorization, delete only the affected citizen's matching verified
      legacy TOTP factor; verify the Auth user remains intact, zero verified factors remain and the
      phone is still unverified. Existing sessions are invalidated by Supabase.
- [x] Apply `20260723130000_citizen_phone_verification_without_mfa.sql` and
      `20260724100000_require_email_identity_for_auth_signup.sql` to reconciled hosted staging
      through the ordinary migration workflow (or
      `supabase/deploy/citizen-phone-verification-without-mfa.sql` in SQL Editor). A follow-up
      service-role probe confirms `public.user_has_verified_phone(uuid)` is now callable.
- [ ] Capture all five SQL artifact verification columns as `true`, then verify the
      schema/migration ledger and service-only function grants.
- [x] In hosted Supabase, enable the ordinary Phone provider with Twilio Verify, enable phone
      confirmations and Phone Auth signup capability, then activate
      `public.hook_require_email_identity` as the Before User Created Auth Hook. Provider settings
      were read-only verified and hook activation was operator-confirmed.
- [ ] Prove existing linked-phone OTP succeeds and new phone-only creation is rejected. Citizen
      Advanced Phone MFA Enrollment/Verification may remain disabled; privileged portal TOTP/AAL2
      settings must remain enabled.
- [ ] Set `API_CITIZEN_PHONE_VERIFICATION_MODE=enforce`,
      `EXPO_PUBLIC_PHONE_VERIFICATION_MODE=enforce`, and
      `NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE=enforce`. The legacy `*_PHONE_MFA_MODE`
      variables are compatibility fallbacks only and should not be used for a new deployment.
- [ ] Run the installed-app Twilio matrix: initial phone link/change, resend cooldown,
      invalid/expired OTP, returning confirmed-phone access, fresh-OTP password change,
      verified-phone recovery, global/local sign-out, rejection of a different user or phone, and
      denial of a new phone-only Auth user.
- [ ] Rehearse attributed recovery for a citizen who has lost an already confirmed phone and
      validate stale/duplicate `phone_change` cleanup; do not add an unverified-email bypass.
- [ ] Confirm and document the accepted V1 limitation that a linked ordinary Phone Auth identity
      can authenticate directly at AAL1 through a custom Supabase client even though JagrukSetu
      presents email/password as its primary sign-in UI.
- [ ] Verify exact production recovery redirects, India delivery/DLT requirements, provider limits,
      CAPTCHA/abuse monitoring, and password-change notification policy.
- [ ] Keep Citizen Web public-only until it passes the same protected password/confirmed-phone
      matrix; then review an explicit switch to `full`.

### Release Gate — installed-device location coordination (2026-07-23)

- [ ] Navigate Community → Nearby → Profile inside five minutes and confirm only the first action
      starts a native current-area acquisition.
- [ ] Move across a known boundary and verify explicit Refresh and TTL expiry obtain and resolve a
      new position.
- [ ] Verify disabled services, askable/permanent permission denial, background/resume, sign-out,
      and account replacement behavior on representative Android and iOS builds.
- [ ] Capture a complaint issue point followed by photo, video, and voice evidence and prove every
      sequential evidentiary action obtains a fresh high-accuracy fix.
- [ ] Confirm no exact current-area coordinate is written to SecureStore, SQLite, logs, telemetry,
      or public projections.

### Release Gate — Community owner visibility (2026-07-23)

- [ ] Submit one report on an installed app and confirm it appears immediately under **Your
      reports** when Community gains focus, including with location denied and public transparency
      unavailable.
- [ ] Confirm the owner card opens authenticated complaint detail and exposes no public
      support/star action.
- [ ] Sign in as a second citizen and confirm the first citizen's private report is absent.
- [ ] Confirm the report remains absent from Local, Trending, and Heat until separately reviewed
      and published.

### Follow-on Sprint — JagrukSetu UI/UX benchmark implementation

- [x] Audit the existing mobile, citizen-web, design-system, and localisation foundations against
      the benchmark while preserving the one-page mobile report decision.
- [x] Add shared civic design tokens, token CSS, typed component contracts, reduced-motion support,
      and the en-GB/mr-IN/hi-IN localisation core.
- [x] Add an accessible mobile report-progress summary inside the existing scrollable form.
- [x] Add a responsive citizen-web landing/feed shell with report, explore, history, profile,
      search, trust, and unavailable-data states.
- [x] Refine authenticated mobile Home, the detached five-destination navigation capsule, and the
      safe Nearby governing-body presentation against the supplied mobile references.
- [x] Localise the core authenticated mobile shell, auth, Home, complaint, report/result,
      Community, Nearby, notification, menu and profile copy through the shared catalog.
- [x] Localise the remaining mobile accountability, media, evidence and Auth edge copy through the
      shared catalog.
- [ ] Localise Citizen Web through the shared catalog.
- [x] Add purpose-scoped automatic location with one process-wide permission attempt, five-minute
      current-area reuse, explicit recovery and isolated fresh complaint/media evidence.
- [x] Show owner-private complaints separately in Community, virtualise report lists and defer Heat
      loading until selected.
- [x] Publish the authenticated sanitized civic-area office contract and safe mobile call, email
      and in-app source actions without exposing routing recipients or internal identifiers.
- [ ] Add reusable web primitives/stories and migrate complaint/transparency cards and timelines.
- [ ] Add authenticated web report capture and a verified governance directory contract before
      rendering office contacts.
- [ ] Add rendered accessibility/responsive tests and physical-device/browser QA.

Progress: 82% of this UI/UX sprint. The detailed two-dropdown taxonomy, complete V1 intake
classification, protected official handoffs, compact/localised core mobile experience,
purpose-scoped location, owner Community preview, and sanitized office directory are implemented.
Public-comment policy, external map provider, guest reporting, OS notification preferences,
remaining web/non-core string migration, and physical accessibility/device validation remain
intentionally gated.

Apply `supabase/deploy/v1-simple-ward-routing.sql` to the reconciled hosted staging project through
**SQL Editor → New query**. Submit one fresh authenticated BMC report and verify the complaint
receipt, resolved ward, government assignment and exactly one `pending` ward-email outbox row. Then
configure the trusted provider worker and complete one leased delivery with a provider message ID;
do not claim email delivery before that test.

Run `supabase/deploy/diagnostics/database_performance_audit.sql` in hosted staging's **SQL Editor →
New query** while the CPU warning or stalled report flow is observable, keep the result private,
and identify the top statements by total execution time, mean time, and calls. Confirm candidates
with the Dashboard Query Performance/Indexes views and `EXPLAIN` before changing schema or compute.
Then apply only evidence-backed query/index repairs and repeat a one-photo authenticated report
submission while monitoring CPU and latency. The current performance hardening requires no
migration and does not introduce Redis, BullMQ, or Sentry.

Review Batch 0's 21 open data issues and six discrepancy groups, then acquire a hash-pinned Batch 1
official export containing entity-level local bodies, talukas/villages, current wards and boundary
versions. Resolve `Mumbai` LGD `482` to canonical `Mumbai City` only through an attributed crosswalk;
do not treat the Batch 0 source registry, stale PMC booklet, or empty operational files as routing
evidence. For a reconciled existing Supabase target, apply the three files under
`supabase/deploy/maharashtra-batch0/` in order after confirming the target already includes schema
through migration `20260718100000`.

Run the complete
`supabase/migrations/20260718100000_complaint_routing_evidence_diagnostics.sql` in hosted staging's
**SQL Editor → New query**, then run
`supabase/deploy/diagnostics/bmc_submission_runtime_audit.sql` and repeat the authenticated saved-
report submission. The current hosted target already exposes 12 catalog categories, three
operational categories, 22 routable BMC wards, private finalized media, and K/W routing; do not
repeat those completed data loads merely to repair submission. Reconcile the official migration
ledger separately.
Use the Admin Console to invite one unique official account and verify individual TOTP plus scoped
Government Dashboard access. Do not release hosted citizen access until migrations 52–53, the
email-required Before User Created hook, the `*_PHONE_VERIFICATION_MODE=enforce` settings, and the
managed Phone Auth/device matrix pass; keep automatic external complaint delivery disabled until
its provider, recovery, integration, and delivery controls are approved.
For the immediate staging demo, use the pre-provisioned synthetic accounts instead of sending an
invitation: enroll a separate authenticator only for each account exercised, verify A/K-Ward and
department isolation, and remove the local credential artifact plus disable the synthetic Auth
identities after testing.
Next, review the official MCGM asset-source manifest, snapshot and validate bounded feature data,
and approve owner/maintainer matches plus K/P child geometry before activating any further category.

### Completed — 2026-07-18

- [x] Add forward migration tolerating safe GPS/timestamp precision differences during complaint
      submission routing evidence validation.
- [x] Align complaint receipt and detail routing payloads with the mobile response contract.
- [x] Add civic color tokens and distinct colored bottom-navigation icons.
- [ ] Expand translated copy coverage across all mobile screens for English, Marathi, and Hindi.
- [ ] Profile and measure slow mobile requests/render paths on physical devices.
- [x] Raise default idle worker/realtime polling intervals to reduce Supabase RPC load.
- [ ] Verify hosted scheduled jobs do not run duplicate worker instances.
- [ ] Apply migration `20260718123000` to hosted staging and verify a fresh K/W submission.

### Complaint receipt and isolated ward-email recovery — 2026-07-24

- [x] Attribute the false mobile failure after a committed submission: the first-submit API
      response duplicated `categoryId` inside the strict nested routing summary.
- [x] Make the API emit the canonical receipt shape and keep mobile decoding compatible with the
      earlier response only when nested and outer category IDs match.
- [x] Add regression coverage for canonical, compatible, mismatched, and private-field receipt
      shapes.
- [x] Represent network/response-decoding submission outcomes as unknown and direct the citizen to
      owned complaints before retrying, rather than asserting that the report failed.
- [x] Verify SMTP authentication without logging credentials or contact values.
- [x] Add an isolated 60-second ward-email worker, a one-row smoke command, clean shutdown, and
      worker tests without activating notification/SLA/KPI loops.
- [x] Process the bounded hosted-staging backlog through the configured SMTP provider and persist
      provider message IDs, including the current K/W complaint.
- [ ] Verify arrival in the intended recipient mailbox, bounce/dead-letter behavior, quota/abuse
      monitoring, and supervise the isolated process in the hosted environment before calling
      government delivery operational.
- [x] Expand the local detailed taxonomy through the complete V1 crosswalk: 256 leaves are
      submittable over 13 profiles and all 84 protected leaves stay out of ordinary ward-email
      fallback.
- [ ] Apply the generated intake artifact to hosted staging and later replace the 243 general
      mappings with reviewed precise routes.
