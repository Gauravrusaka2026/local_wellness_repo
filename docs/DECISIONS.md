# DECISIONS.md

## 2026-07-11 — Phase 0 Implementation Conventions

These implementation conventions supplement the Phase 0 ADRs and do not replace architectural decisions.

### Workspace Naming and Modules

- All applications and packages use the `@local-wellness/*` workspace scope.
- Workspace packages are private and use ECMAScript modules.
- Shared package entry points compile to `dist` and expose declarations through package exports.
- External dependency versions are exact and centralized in the pnpm catalog; internal references use `workspace:*`.

### Runtime and Toolchain Versions

- Node.js 22 is the foundation runtime major.
- pnpm 11.11.0 is pinned through the root `packageManager` field and provisioned with Corepack.
- TypeScript 6.0.3 is pinned because the current `typescript-eslint` supports TypeScript versions below 6.1; the registry's TypeScript 7 release is not yet compatible.
- ESLint 10.6.0 is used instead of the newly published 10.7.0 so pnpm's release-age supply-chain protection does not require an exception.

### TypeScript Project Layout

- Framework-facing application `tsconfig.json` files use `noEmit` for normal type checking.
- Separate `tsconfig.build.json` files provide composite reference targets and emitted application or declaration output.
- Next.js type checks generate framework route types before invoking TypeScript.
- Root type checking runs both Turborepo workspace checks and a TypeScript solution build.

### Local Development Ports

- Citizen web: 3000.
- API: 3001.
- Realtime server: 3002.
- Government dashboard: 3003.
- Admin console: 3004.
- Redis: 6379 (Phase 0 reservation, superseded for V1 by ADR-0007 on 2026-07-13).

These distinct development ports allow `pnpm dev` to start the application foundations without collisions.

### Foundation Entry Points

- Expo and Next.js root routes intentionally render no product UI.
- The NestJS API intentionally has no controllers or feature modules.
- The Socket.IO server intentionally has no event handlers.
- The workers process intentionally has no queues or jobs.

This keeps Phase 0 buildable without introducing later-phase behavior.

### Dependency Security

- pnpm install scripts are allowed only for `esbuild` and `sharp`, the two dependencies verified to require them.
- PostCSS versions below 8.5.10 resolve to 8.5.16 to address the applicable advisory.
- `uuid` versions below 11.1.1 resolve to 11.1.1 for Expo's CommonJS build-tool chain.
- The complete Expo, Next.js, Node, and container builds must pass after any override change.

### Generated Files and Telemetry

- Framework output, TypeScript build information, and dependency directories are ignored.
- Next.js owns `next-env.d.ts`, so Prettier does not rewrite it.
- Expo, Next.js, and Turborepo telemetry are disabled in CI and explicitly passed through Turborepo's environment boundary.

### Containers

- API, realtime, and workers images use Node 22 Alpine multi-stage builds.
- Production processes run as the non-root `node` user.
- Phase 0 favors verified workspace-copy production stages; dependency pruning is deferred until runtime dependency boundaries are implemented and testable.

### Changesets

- Changesets is configured for private package version tracking.
- Phase 0 does not create a release changeset because it adds the initial private scaffolds and publishes nothing.

## 2026-07-13 — Phase 1 Identity and Access Conventions

These conventions implement ADR-0006 and ADR-0007.

### Identity and Authorization

- Supabase Auth proves identity; current PostgreSQL role and membership rows determine authorization.
- Global roles require an active profile and current assignment. Authority-scoped roles additionally require a matching current active authority membership.
- The trusted API verifies bearer tokens with Supabase Auth and uses a current secret key or legacy service-role key only as its server-side persistence boundary.
- System role codes are seeded, immutable application constants. Clients cannot assign roles, membership state, grantors or risk state.
- Authority UUIDs remain intentionally unreferenced until Phase 2 creates the canonical governance entity.

### Sessions and Keys

- Mobile sessions use chunked Expo SecureStore with device-only accessibility; raw access/refresh token callback pairs are rejected.
- Web sessions use Supabase SSR cookie adapters and PKCE for ordinary email sign-in.
- Administrator invite emails use a query-based one-time token hash because `inviteUserByEmail` does not originate a PKCE verifier.
- Current Supabase publishable/secret key environment names are preferred. Legacy anon/service-role names remain nonempty-value fallbacks only.

### Devices and Auditing

- The raw random installation ID remains only in mobile SecureStore. Mobile sends a digest, and the API hashes that value again before persistence.
- Device registration and soft revocation execute in service-only database functions that append their audit event in the same transaction. Direct authenticated device mutation is denied.
- Sensitive device identifier hashes and push tokens are server-only columns; authenticated SQL access is limited to safe metadata.
- Client session audit events are restricted, best-effort and stamped `source: client_reported`. Server access/device/administration events retain authoritative meaning.
- Audit actor, subject and device UUIDs are immutable attribution snapshots. Access-lifecycle actor foreign keys restrict deletion so approval/grant/revocation provenance is retained.

### Runtime Boundaries

- Browser API access uses an exact configured origin allow-list and bearer tokens, not credentialed cross-origin cookies.
- Redis, BullMQ and Sentry are not V1 dependencies. Request IDs and application error logging are the implemented Phase 1 baseline; structured logs, health checks, uptime checks and provider-native metrics are the approved V1 deployment target.
- Phase 0's controller-free/product-UI-free entry-point convention was a scaffold-only constraint and is superseded for identity surfaces by Phase 1.
- Next.js project-reference builds include application, library and proxy sources so the root TypeScript solution validates the complete runtime boundary; test sources remain in the normal no-emit checks.
- TypeScript test scripts use Node's test runner with `--import tsx`, avoiding a separate `tsx` command-process dependency while preserving the same test semantics.
- Repository Git hooks invoke `corepack pnpm` so the pinned package-manager version works even when no global `pnpm` shim is installed. Staged ESLint checks suppress notices only for files already excluded by the repository ESLint configuration; real lint warnings still fail the hook.
