# ADR-0001: Use pnpm and Turborepo for the Monorepo

## Status

Accepted

## Date

2026-07-11

## Context

Local Wellness contains multiple deployable applications and shared packages. The repository needs deterministic dependency resolution, explicit workspace boundaries, shared task orchestration, and build ordering that respects package dependencies.

## Decision

Use pnpm workspaces as the package and dependency-management layer and Turborepo as the workspace task orchestrator.

All applications and shared packages use the private `@local-wellness/*` namespace. External dependency versions are pinned centrally through the pnpm catalog, and the lockfile is committed. Corepack provisions the repository-pinned pnpm version.

## Alternatives Considered

- npm workspaces: capable of basic workspace management but does not provide pnpm's content-addressed store or catalog workflow.
- Yarn workspaces: viable, but would introduce a different package-manager runtime and configuration model without a project-specific advantage.
- Nx: provides broader generators and orchestration, but its additional abstraction is unnecessary for the current repository boundaries.
- Separate repositories: would make shared package changes, coordinated validation, and atomic releases harder.

## Consequences

- Applications and packages share one deterministic lockfile.
- Turborepo can order and cache builds, linting, and type checks.
- Contributors must use the pinned pnpm major through Corepack.
- The repository must maintain workspace package names, task scripts, and catalog entries consistently.
- CI and container builds must make the pnpm executable available before Turborepo runs child tasks.

## Implementation Notes

- Workspace globs are `apps/*` and `packages/*`.
- The root task graph is defined in `turbo.json`.
- Supply-chain-sensitive install scripts are allowlisted explicitly.
- Shared packages remain private until a separate publishing decision is made.

## Related Documents

- `README.md`
- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/DECISIONS.md`
