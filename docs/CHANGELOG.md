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
