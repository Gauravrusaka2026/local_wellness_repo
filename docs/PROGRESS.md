# PROGRESS.md

## Overall Completion

18% implemented.

Phase 0 and Phase 1 are complete. The repository now contains a buildable foundation plus the locally verified identity and scoped-access boundary. Complaint, governance, routing, media, realtime, operations, and analytics behavior remains in later phases.

## Phase Completion

| Phase                                        | Status      | Completion |
| -------------------------------------------- | ----------- | ---------: |
| Phase 0 — Foundation                         | Complete    |       100% |
| Phase 1 — Identity and access                | Complete    |       100% |
| Phase 2 — Maharashtra governance model       | Not started |         0% |
| Phase 3 — Taxonomy and routing               | Not started |         0% |
| Phase 4 — Citizen complaint capture          | Not started |         0% |
| Phase 5 — Government dashboard               | Not started |         0% |
| Phase 6 — Realtime and notifications         | Not started |         0% |
| Phase 7 — Resolution, feedback and reopening | Not started |         0% |
| Phase 8 — Nearby map and transparency        | Not started |         0% |
| Phase 9 — SLA, escalation and KPI            | Not started |         0% |
| Phase 10 — Hardening and launch              | Not started |         0% |

Phase 1 completion is measured against the `PLAN.md` exit criteria: citizens have phone/email passwordless clients; email and delivered-invite sessions pass locally; current database scope gates government access; escalation attempts fail; and server credentials remain outside client sources. Phone delivery, hosted callbacks, MFA, device-bound session invalidation, access lifecycle expansion, quotas, and real-device validation are documented pre-launch follow-ups rather than hidden completion claims.

## Sprint Completion

- Sprint 1 — Project Foundation: 100% complete.
- Sprint 2 — Identity and Access: 100% complete.

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

## Current Milestone

Phase 1 is locally complete and ready for non-production hosted activation after the owner-managed security and provider gates are closed.

## Next Milestone

Complete `SEC-001` and `ENV-002`, select the pilot municipality, collect verified authority/ward/department inputs, and begin Phase 2 — Maharashtra governance model. Complete `AUTH-001` before broad onboarding of existing or returning government users.

## Current Blockers

- No blocker remains for the local Phase 1 exit criteria.
- Hosted integration requires rotation/audit of the previously exposed credentials plus managed project, provider, redirect, template, backup, and secret configuration.
- Phone OTP E2E needs a real SMS provider; phone request/verification code paths have unit coverage.
- Phase 2 requires product-owner/operator selection and verified pilot governance data.

## Verification Summary

- Frozen installation: passed for all 17 workspace projects; the lockfile was current and the installed graph required no changes.
- Peer dependency check: passed.
- Prettier check: passed.
- ESLint: 16 of 16 workspaces passed.
- TypeScript workspace checks and root project-reference build: 16 of 16 passed.
- Focused TypeScript/JavaScript tests: 65 of 65 passed across API (27), mobile (6), citizen web (6), government dashboard (5), admin console (6), validation (5), configuration (4), security boundaries (3), and workspace structure (3).
- The aggregate `pnpm test` reached the sandbox's local-listen restriction in the seven API HTTP contract cases; those same cases and all other API tests passed in the permitted focused runner.
- Clean Supabase reset and database schema lint: passed.
- pgTAP migration/RLS/lifecycle coverage: 154 of 154 assertions passed across three plans.
- Generated database types: regenerated and verified.
- Local Auth E2E with current publishable/secret keys: 2 passed, 0 failed, 1 provider-gated phone case skipped; invitation cleanup passed.
- Turborepo production build: 16 of 16 workspaces passed, including Expo Android export and all three Next.js applications.
- Development Docker Compose validation: passed.
- Production dependency advisory audit: passed with no known vulnerabilities reported.
- Commit-hook portability: the Husky hook resolves pnpm through Corepack and passed its staged-file validation without requiring a global pnpm shim.

## Last Updated

2026-07-13
