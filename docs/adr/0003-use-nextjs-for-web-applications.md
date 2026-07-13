# ADR-0003: Use Next.js for Web Applications

## Status

Accepted

## Date

2026-07-11

## Context

Local Wellness requires separate citizen, government, and platform-administration web surfaces. These surfaces have different audiences, deployment permissions, and future rendering needs while sharing the same repository standards.

## Decision

Use Next.js with the App Router and strict TypeScript for three independent web applications:

- `apps/citizen-web`;
- `apps/government-dashboard`;
- `apps/admin-console`.

Phase 0 creates only structural layouts and empty root pages. It does not implement product UI, authentication, data access, or business logic.

## Alternatives Considered

- One multi-tenant Next.js application: reduces project count but couples deployment, access boundaries, and release cadence across distinct audiences.
- Vite single-page applications: provide a smaller client-only foundation but do not provide the documented Next.js server and routing capabilities.
- A separately managed repository for each web surface: weakens shared tooling and atomic package changes.

## Consequences

- Each web surface can be deployed and permissioned independently.
- Some framework configuration is intentionally repeated across applications.
- Shared UI and domain behavior must live in documented packages rather than being copied between apps.
- The repository must keep compatible Next.js and React versions centrally pinned.

## Implementation Notes

- Development ports are 3000 for citizen web, 3003 for the government dashboard, and 3004 for the admin console.
- Next.js route types are generated before standalone TypeScript checks.
- Product UI and shared design-system components remain deferred.

## Related Documents

- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/deployment.md`
