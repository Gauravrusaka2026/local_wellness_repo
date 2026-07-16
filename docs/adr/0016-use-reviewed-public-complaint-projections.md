# ADR-0016: Use reviewed public complaint projections

## Status

Accepted

## Date

2026-07-16

## Context

Phase 8 adds nearby and transparency views while ADR-0011 keeps every source complaint, exact
location, original media object, citizen identity, routing evidence, and internal note private.
Reading those private records directly from an anonymous map endpoint would make field omission an
application convention rather than a durable privacy boundary. Repeated spatial filters could also
reveal more precision than a reviewer intended.

The roadmap does not yet approve operational visibility, sensitive-category, coordinate,
aggregation, moderation, processed-media, withdrawal, or retention values. Verified pilot ward
geometry and a map provider are also unavailable. Engineering must therefore be testable without
publishing placeholder or private data and must fail closed in every deployed environment until the
missing evidence and policies are reviewed.

## Decision

Create an append-only, review-gated public projection model inside the unexposed `complaints`
database schema while preserving private complaint records unchanged.

- Store effective-dated transparency policy versions separately from reviewed publication and
  withdrawal decisions. Seed no approved operational policy.
- Create a sanitized public projection only through a service-only database transaction after an
  active platform administrator supplies the explicit public text and an applicable approved policy
  is resolved unambiguously.
- Derive approximate locations inside PostgreSQL from a current, verified, non-placeholder,
  routing-eligible ward boundary. Never accept a public coordinate from a client and never copy an
  exact complaint or routing point into the projection.
- Serve anonymous nearby, hotspot, boundary, and complaint-detail responses through NestJS and
  narrow service-role PostgreSQL functions. Give no API role direct table access.
- Build hotspots, filters, duplicate groups, and public detail only from current published
  projections. Private duplicate candidates never become public groups automatically.
- Retain processed-media derivative structure behind separate approval gates, but expose no media
  until processing, malware/moderation, privacy, retention, and delivery policy are operational.
- Keep comments disabled and keep map rendering provider-neutral. Selecting an external basemap or
  sending generalized coordinates to one requires a later reviewed decision.

## Alternatives Considered

### Add a public flag to the private complaint row

Rejected because the complaint row contains identity-linked text and references exact/private
evidence. A boolean would make every query responsible for reconstructing the same redaction rules
and would make withdrawals and reviewed historical output difficult to audit.

### Generalize coordinates in each API response

Rejected because different filters or implementation changes could reveal inconsistent locations,
and a response-time failure could accidentally return the source coordinate. The reviewed public
location must be materialized once and versioned.

### Publish ward aggregates without individual review

Rejected for now because sensitive categories, minimum cohorts, eligible statuses, and retention
rules are unapproved. Aggregate output is derived only from projections that already passed review.

### Select a map or media-moderation provider during Phase 8 foundation work

Rejected because provider, billing, data-transfer, retention, and key-management requirements are
not approved. Provider-neutral contracts preserve progress without silently making that decision.

## Consequences

- Public DTOs cannot expose fields that are absent from the projection model.
- Missing, ambiguous, expired, unapproved, placeholder, or unverified evidence yields no public
  output.
- Publication and withdrawal remain attributable and versioned, and withdrawal removes a record
  from all current public queries without deleting audit history.
- Anonymous spatial reads require the trusted API and bounded PostGIS queries; there is no direct
  PostgREST table surface.
- Real public data remains empty until policy and verified pilot boundaries are approved.
- A provider-backed basemap, processed media, comments, and operational moderation remain separate
  activation work.

## Implementation Notes

- Use additive migrations and forced RLS. Revoke schema/table/function defaults before granting the
  API service role only the exact reviewed functions.
- Keep the existing `complaints_phase4_visibility_check` unchanged.
- Validate bounding boxes, time ranges, filters, pagination, and result limits at both API and
  database boundaries.
- Use rollback-isolated synthetic verified fixtures for migration and privacy tests; never promote
  canonical placeholder data.
- Redis, BullMQ, Redis adapters/caching, and Sentry remain excluded by ADR-0007.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/adr/0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md`
- `docs/adr/0015-use-database-enforced-resolution-accountability.md`
- `docs/KNOWN_ISSUES.md`
