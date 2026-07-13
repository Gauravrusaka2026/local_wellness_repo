# ADR-0004: Use NestJS for the API

## Status

Accepted

## Date

2026-07-11

## Context

The platform requires a server-side API with explicit module boundaries, dependency injection, validation integration, authorization guards, observability hooks, and a path from a V1 modular monolith to later service extraction.

## Decision

Use NestJS with TypeScript for the primary API runtime and keep V1 as a modular monolith.

Phase 0 initializes only the Nest application module and bootstrap process. It intentionally contains no controllers, endpoints, validation pipeline, authentication, database access, or domain modules.

## Alternatives Considered

- Direct Express or Fastify: offers a smaller runtime but requires the project to define more application structure and conventions itself.
- Multiple domain microservices: creates premature deployment, consistency, and operational complexity for the V1 scope.
- Supabase Edge Functions as the full backend: conflicts with the documented primary API architecture and long-running workflow requirements.

## Consequences

- NestJS supplies consistent module, guard, interceptor, and dependency-injection conventions for later phases.
- The API carries framework runtime overhead compared with a minimal HTTP server.
- Domain logic must remain outside controllers and use the documented shared-package boundaries.
- Future service extraction remains possible but is not required for V1.

## Implementation Notes

- `apps/api` builds to `dist/main.js` and listens on port 3001 by default.
- The Express platform adapter is used by the initial Nest bootstrap.
- API versioning, controllers, Swagger, validation, Auth, and observability behavior are deferred.

## Related Documents

- `PROJECT_OVERVIEW.md`
- `PLAN.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`
