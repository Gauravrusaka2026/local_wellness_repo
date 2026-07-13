# Phase 1 Testing

## Automated Coverage

- shared configuration and Zod validation unit tests;
- mobile and web authentication input/callback utility tests;
- NestJS service and HTTP contract tests with mocked Supabase boundaries;
- migration structure and privilege invariants;
- pgTAP RLS tests for anonymous, self, cross-user, cross-authority, expired, revoked and escalation cases;
- local Supabase email magic-link and delivered government-invite session flows;
- provider-gated phone OTP E2E plus unit coverage for phone request/verification dispatch;
- generated database type consistency;
- client secret-boundary and deferred-dependency repository tests.

## Verification Commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm database:start
pnpm database:reset
pnpm database:test
pnpm database:types
pnpm test:auth:e2e
EXPO_NO_TELEMETRY=1 NEXT_TELEMETRY_DISABLED=1 pnpm build
docker compose --file infrastructure/docker/compose.dev.yml config --quiet
pnpm audit --prod
```

## Session Results

- Frozen installation passed for all 17 workspace projects; the lockfile was current and the installed graph required no changes.
- Peer dependency and Prettier checks passed.
- ESLint and TypeScript passed across all 16 application/package workspaces; the root project-reference build also passed.
- Application/package/repository coverage passed: API 27/27, mobile 6/6, citizen web 6/6, government dashboard 5/5, admin console 6/6, validation 5/5, configuration 4/4, security boundaries 3/3, and workspace structure 3/3.
- The aggregate test command reached the sandbox's local-listen restriction in the API HTTP contract file. The same seven HTTP cases and all 20 API unit/service cases passed in the permitted focused runner.
- A clean local reset, database lint, and generated-type verification passed.
- All 154 pgTAP assertions passed across the schema, RLS, and atomic device-lifecycle plans.
- Current-key local Auth E2E passed email magic-link and delivered government-invite provisioning/session/readback; phone was skipped because no SMS provider was configured (2 passed, 0 failed, 1 skipped). Test-user cleanup passed.
- All 16 production workspace builds passed, including the Expo Android export and all three Next.js builds.
- Development Compose validation passed.
- The first `pnpm audit --prod` attempt could not resolve the registry. A commit-readiness follow-up with registry connectivity passed with no known vulnerabilities reported; CI retains the same required online audit.
- The Husky pre-commit hook passed after changing it to resolve the pinned pnpm version through Corepack rather than requiring a global `pnpm` shim.

See `docs/PROGRESS.md` and the 2026-07-13 `docs/CHANGELOG.md` entry for the consolidated verification record.
