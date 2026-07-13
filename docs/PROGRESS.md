# PROGRESS.md

## Overall Completion

26% implemented.

Phase 0 and Phase 1 are complete. Phase 2's engineering baseline is complete and locally verified; its remaining exit work requires external, verified pilot identifiers, contacts and real boundary geometry. Complaint submission, operational routing, media, maps, dashboard features, realtime, operations and analytics remain in later phases.

## Phase Completion

| Phase                                        | Status      | Completion |
| -------------------------------------------- | ----------- | ---------: |
| Phase 0 — Foundation                         | Complete    |       100% |
| Phase 1 — Identity and access                | Complete    |       100% |
| Phase 2 — Maharashtra governance model       | In progress |        90% |
| Phase 3 — Taxonomy and routing               | Not started |         0% |
| Phase 4 — Citizen complaint capture          | Not started |         0% |
| Phase 5 — Government dashboard               | Not started |         0% |
| Phase 6 — Realtime and notifications         | Not started |         0% |
| Phase 7 — Resolution, feedback and reopening | Not started |         0% |
| Phase 8 — Nearby map and transparency        | Not started |         0% |
| Phase 9 — SLA, escalation and KPI            | Not started |         0% |
| Phase 10 — Hardening and launch              | Not started |         0% |

Phase 1 completion is measured against the `PLAN.md` exit criteria: citizens have phone/email passwordless clients; email and delivered-invite sessions pass locally; current database scope gates government access; escalation attempts fail; and server credentials remain outside client sources. Phone delivery, hosted callbacks, MFA, device-bound session invalidation, access lifecycle expansion, quotas, and real-device validation are documented pre-launch follow-ups rather than hidden completion claims.

Phase 2 engineering completion covers the normalized registry, canonical import and provenance ledger, PostGIS/version history, authority integration, forced RLS, generated types and local tests. It is not marked 100% because the supplied data contains no real polygons, no verified officer incumbents, incomplete official identifiers/coverage and unresolved routing crosswalks. Therefore a real pilot coordinate cannot yet satisfy the `PLAN.md` exit criterion.

## Sprint Completion

- Sprint 1 — Project Foundation: 100% complete.
- Sprint 2 — Identity and Access: 100% complete.
- Sprint 3 — Governance data foundation and pilot-data closure: 90% complete.

## Completed Milestones

- Deterministic pnpm/Turborepo monorepo, strict TypeScript project references, code-quality tooling, application/package foundations, CI, and containers.
- Six-table Supabase identity/access model with additive forward migrations, forced RLS, safe column grants, immutable audit attribution, and current-scope helpers.
- Atomic service-only government invitation and device lifecycle persistence with audit history and failure rollback.
- Supabase Auth profile provisioning, immutable seeded roles, one-time first-platform-admin bootstrap, authority memberships, and expiring scoped roles.
- NestJS bearer authentication plus profile, device, access-scope, client-audit, and government-invitation endpoints with exact CORS, request IDs, and stable envelopes.
- Expo SecureStore sessions, mobile phone/email flows, citizen SSR PKCE sessions, token-hash government invitations, protected government scope, and access-gated administration UI.
- Shared identity/configuration/validation/database contracts without client-local domain mirrors.
- Redis, BullMQ, and Sentry removed from the V1 topology and prohibited by repository security tests.
- ADR-0006, ADR-0007, and the Phase 1 implementation/testing worklog.
- Seven additive Phase 2 migrations implementing 22 forced-RLS governance tables, PostGIS boundaries, temporal exclusions, canonical authority ownership, parent-type/cycle integrity and service-only access/jurisdiction functions.
- Deterministic validation and generated seeding for 18 canonical CSVs plus the XLSX checksum, preserving 901 source/metadata rows and quarantining template or placeholder records.
- Maharashtra baseline containing 1 state, 36 districts, 359 talukas, 190 urban local bodies, 70 explicitly placeholder wards, durable catalogs and 18 unresolved non-routable routing references; zero people, assignments or fabricated boundaries.
- ADR-0008, the governance import/refresh guide, generated `public`/`governance` database types, and complete Phase 2 migration/seed/RLS/spatial/versioning test plans.

## Current Milestone

Close the Phase 2 pilot-data gap without weakening the verified/placeholder boundary.

## Next Milestone

Select the pilot municipality; obtain reviewed LGD identifiers, record-specific contacts and SRID 4326 local-body/ward polygons; implement the reviewed delta refresh; and prove a real coordinate resolves to municipality and ward. Phase 3 must not begin from placeholder routing data.

## Current Blockers

- No blocker remains for the Phase 2 schema, baseline import, security or local verification.
- Hosted integration requires rotation/audit of the previously exposed credentials plus managed project, provider, redirect, template, backup, and secret configuration.
- Phone OTP E2E needs a real SMS provider; phone request/verification code paths have unit coverage.
- Manual citizen email magic-link click-through currently falls back to the landing page instead of exchanging the PKCE code; the exact callback mismatch is tracked as `AUTH-006`.
- The real-coordinate Phase 2 exit criterion requires pilot selection and official local-body/ward polygons (`DATA-004`).
- Official LGD codes, complete local-government coverage, verified contacts/incumbents and reviewed routing crosswalks remain external data gaps (`DATA-002` through `DATA-006`).
- Workbook-to-CSV cell parity and rendered browser inspection remain environment-gated follow-ups (`DATA-007`, `ENV-003`); source/hash validation and HTTP runtime smoke checks passed.

## Verification Summary

- Frozen installation: passed for all 17 workspace projects; the lockfile was current and the installed graph required no changes.
- Peer dependency validation: passed with no issues.
- Canonical governance validation: passed with 0 errors, 2,343 explicit warnings, 789 normalized/reference rows and 98 quarantined template/placeholder rows; generated seed hash drift check passed.
- Prettier check: passed.
- ESLint: 16 of 16 workspaces passed.
- TypeScript workspace checks and root project-reference build: 16 of 16 passed.
- Aggregate workspace/root tests: passed, including 28 API, 12 governance-import, 4 governance-validation, 23 mobile/web authentication, 3 canonical governance-resource and repository security/structure cases.
- Clean Supabase reset applied all Phase 1 migrations, all seven Phase 2 migrations and both generated governance seed files in order.
- Application-owned database schema lint: passed with no errors.
- pgTAP migration/RLS/lifecycle/governance coverage: 348 of 348 assertions passed across eight plans; Phase 2 contributes 194 assertions across schema, seed, RLS, PostGIS and versioning plans.
- Generated `public` and `governance` database types: regenerated atomically and drift check passed.
- Local Auth E2E with current publishable/secret keys: 2 passed, 0 failed, 1 provider-gated phone case skipped; invitation cleanup passed.
- Turborepo production build: 16 of 16 workspaces passed, including Expo Android export and all three Next.js applications.
- Development Docker Compose validation: passed.
- Production dependency advisory audit: passed with no known vulnerabilities reported.
- Commit-hook portability: the Husky hook resolves pnpm through Corepack and passed its staged-file validation without requiring a global pnpm shim.
- Runtime smoke: citizen web, government dashboard and admin console started; public/auth routes returned successfully and protected routes redirected to sign-in. Rendered viewport inspection remains pending because no in-app browser target was connected.
- Follow-up citizen browser smoke: local email delivery reached Mailpit, but the delivered link exposed the `AUTH-006` callback allow-list mismatch before session creation.

## Last Updated

2026-07-13
