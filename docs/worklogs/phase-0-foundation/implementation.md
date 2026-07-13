# Phase 0 Foundation Implementation

## Workspace

The root manifest, pnpm workspace catalog, lockfile, and Turborepo task graph coordinate 16 application and package workspaces. Corepack pins pnpm 11.11.0, and TypeScript solution references cover every workspace.

## Applications

- `apps/mobile`: Expo Router shell with an empty route.
- `apps/citizen-web`: Next.js App Router shell with an empty page.
- `apps/government-dashboard`: Next.js App Router shell with an empty page.
- `apps/admin-console`: Next.js App Router shell with an empty page.
- `apps/api`: NestJS bootstrap with no controllers.
- `apps/realtime-server`: Socket.IO bootstrap with no events.
- `apps/workers`: TypeScript process scaffold with no jobs.

## Shared Packages

All documented packages contain private ESM manifests, strict composite TypeScript configurations, build and validation scripts, declaration exports, and behavior-free entry points.

Shared TypeScript configurations live in `packages/config/typescript/` for base, Node.js, Next.js, and React Native targets.

## Platform Foundation

- Supabase folders are present without configuration, schema, migration, policy, or function logic.
- Docker Compose defines Redis and the three Node runtimes for local development.
- Multi-stage Dockerfiles build API, realtime, and workers production targets as a non-root user.
- Terraform and monitoring folders are placeholders only.

## Continuous Integration

GitHub Actions performs:

1. Corepack setup;
2. frozen dependency installation;
3. peer validation;
4. production dependency audit;
5. formatting;
6. linting;
7. strict type checking and project-reference compilation;
8. tests;
9. all workspace builds;
10. Docker Compose validation.

Migration validation is deferred until a migration exists.

## Security Corrections

Credentials found in the ignored environment example were removed. Dependency install scripts are explicitly allowlisted. Two transitive advisories were resolved through reviewed overrides and the full build matrix was rerun.
