# ADR-0009: Use Database Evidence for Deterministic Routing

## Status

Accepted

## Date

2026-07-13

## Context

Phase 3 must resolve a complaint location and category through jurisdiction, asset ownership, department, durable officer role, current assignment, and fallback evidence. Maharashtra governance data changes independently of application releases, while the Phase 2 bootstrap contains placeholders, incomplete crosswalks, and no verified pilot geometry. A routing result must therefore be explainable without promoting those records or embedding Pune-specific data in application code.

The `governance` and `routing` schemas are intentionally absent from the PostgREST exposure list. The routing API still needs a narrow way to query trusted PostGIS and versioned routing evidence without granting citizens direct table access.

## Decision

Operational routing is a database-evidence pipeline with a deterministic TypeScript evaluator:

- PostgreSQL/PostGIS resolves current jurisdiction, asset, ownership, rule, department, role, assignment, fallback, and confidence-policy candidates from versioned records.
- Private `governance` and `routing` schemas remain unexposed. The NestJS API uses narrowly scoped `public` RPC wrappers that are executable only by `service_role`.
- `packages/routing-engine` is a pure package. It applies eligibility checks, stable ranking, database-supplied confidence weights and thresholds, ambiguity handling, and explanation construction to candidates whose fallback depth and path were materialized by the database. It does not traverse a database graph and does not know municipality or category names.
- Every operational query and the evaluator independently reject inactive, expired, unverified, placeholder, and non-routable evidence. Database activation constraints remain a second enforcement layer.
- Rules target durable departments and officer roles. Current officer assignments are resolved at decision time and are not embedded in rule versions.
- Fallback order and confidence policy are versioned database records. Near ties require manual review; a stable identifier may order output but cannot silently decide an ambiguous route.
- Internal routing decisions retain evidence identifiers, versions, score factors, rejections, and fallback steps for auditability. Citizen-facing responses expose only a sanitized routing summary and do not include the full candidate graph, rejection/factor details, exact-location audit, or officer contacts.
- Duplicate detection uses a configurable pure scoring framework. Complaint-candidate persistence and production duplicate queries remain deferred until complaint capture exists.

Pune Municipal Corporation and the Phase 3 pilot categories are reference data for planning and tests only. Application source contains no Pune-, ward-, department-, officer-, or category-specific branch.

## Alternatives Considered

### Put the whole routing algorithm in one database function

Rejected because deterministic ranking and explanation behavior would be harder to unit-test and reuse, while frequently changing application behavior would be coupled to migrations. PostGIS and set-based candidate selection remain in PostgreSQL where they belong.

### Hardcode pilot mappings in the API

Rejected because it would make application releases the governance source of truth, bypass provenance/versioning, and risk routing from placeholders.

### Let clients resolve or choose official recipients

Rejected because clients cannot be trusted with role or assignment selection and direct governance access would weaken the database security boundary.

### Route from unresolved Phase 2 reference labels

Rejected because composite free-text department and role labels are not verified operational mappings.

## Consequences

- Routing behavior is reproducible, data-driven, and independently testable.
- Governance corrections and version changes do not require municipality-specific code changes.
- The API can explain why a route was selected or withheld.
- Verified boundaries and reviewed mappings are still required before real Pune routing can succeed; engineering completion does not imply data readiness.
- Candidate RPC contracts and evaluator contracts must evolve together and remain covered by integration tests. The RPC supplies current direct and fallback candidates; the evaluator ranks them without performing database I/O.
- Exact routing locations and decision evidence are sensitive and remain service-only under forced RLS.

## Implementation Notes

- Keep all routing tables forced-RLS and revoke direct `anon` and `authenticated` access.
- Use SRID 4326 PostGIS geometry and temporal half-open intervals.
- Store operational rules separately from `governance.complaint_routing_references`.
- Use rollback-isolated synthetic verified fixtures for positive integration tests; assert that real bootstrap placeholders never route.
- Do not add Redis, BullMQ, Redis adapters, Redis caching, or Sentry.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/worklogs/phase-3-routing/overview.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0008-use-a-normalized-provenance-aware-governance-registry.md`
- `docs/adr/0010-use-review-gated-governance-synchronization.md`
