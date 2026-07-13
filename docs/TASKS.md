# TASKS.md

## Project Status

- Project: Local Wellness
- Current phase: Phase 1 — Identity and access complete
- Current sprint: Sprint 2 — Identity and Access complete
- Overall implementation progress: 18%
- Phase 0 implementation progress: 100%
- Phase 1 implementation progress: 100%
- Last updated: 2026-07-13

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
- [ ] Add the authority foreign key after Phase 2 creates the canonical governance entity (`DB-001`).
- [x] Re-run `pnpm audit --prod` with registry connectivity; no known vulnerabilities were reported.
- [x] Make the Husky pre-commit hook invoke the repository-pinned pnpm through Corepack so it works without a global `pnpm` shim.
- [ ] Reconcile the documentation lifecycle's root-level tracker names with the current `docs/` locations in a documentation-only change.
- [ ] Remove the empty stray file `docs/architecture.md,` after the owner confirms it is unintentional.
- [ ] Optimize production container contents after the runtime dependency graph is implemented.

## Current Blockers

- No blocker remains for the locally verified Phase 1 exit criteria.
- Hosted identity activation remains blocked on owner credential rotation/audit (`SEC-001`) and operator-managed provider/environment configuration (`ENV-002`).
- Phone OTP E2E requires an explicitly configured SMS provider; the code path and dispatch behavior are otherwise covered.
- Phase 2 requires selection of the pilot municipality and verified governance inputs.

## Technical Debt

- Production Node images currently copy the verified workspace from the build stage, including development dependencies and source. This favors a correct Phase 0 build; pruning and image-size optimization are tracked for a later infrastructure task.
- Documentation trackers currently live under `docs/` while `AGENTS.md` refers to root-level tracker names.
- Existing-account government access lifecycle, privileged MFA, device-session binding, append-path quotas, and hosted/real-device validation remain explicitly tracked pre-launch work.

## ADRs Created

- ADR-0001 — Use pnpm and Turborepo for the monorepo.
- ADR-0002 — Use Expo for the mobile application.
- ADR-0003 — Use Next.js for web applications.
- ADR-0004 — Use NestJS for the API.
- ADR-0005 — Use Socket.IO for realtime delivery.
- ADR-0006 — Use Supabase Auth and database-enforced access control.
- ADR-0007 — Defer Redis, BullMQ, and Sentry beyond V1.

## Files Modified This Session

- Phase 1 identity clients and tests in `apps/mobile`, `apps/citizen-web`, `apps/government-dashboard`, and `apps/admin-console`.
- NestJS identity, authorization, invitation, device, audit, configuration, HTTP contract, and service tests in `apps/api`.
- Shared identity/configuration/validation/database contracts in `packages/types`, `packages/config`, `packages/validation`, and `packages/database`.
- Three ordered identity migrations, pgTAP plans, local Auth configuration, and the invite template under `supabase/`.
- Auth E2E, security-boundary, CI, environment, Compose, bootstrap, lockfile, and TypeScript project-reference changes.
- ADR-0006, ADR-0007, the Phase 1 worklog, every required implementation document, and all session trackers.

## Next Recommended Task

Complete `SEC-001`, activate and smoke-test a non-production hosted identity environment, then collect the pilot municipality's verified governance inputs and begin Phase 2. Implement the `AUTH-001` access-lifecycle follow-up before onboarding existing or returning government accounts at scale.
