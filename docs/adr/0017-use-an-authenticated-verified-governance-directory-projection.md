# ADR-0017: Use an authenticated verified-only governance directory projection

## Status

Accepted

## Date

2026-07-16

## Context

The citizen mobile experience needs to explain which governing body covers the user's current
location. The existing jurisdiction API returns internal identifiers and boundary-version evidence
for routing; it does not provide citizen-facing names and deliberately exposes no governance
directory. Direct mobile reads from governance tables would bypass the NestJS authorization
boundary, make field omission a client convention, and risk presenting placeholder identities,
unverified contacts, or stale records as official.

Verified pilot geometry is not yet available in staging. Engineering must therefore support an
honest unsupported state without hardcoding Pune, Mumbai, wards, authorities, contacts, or fallback
names.

## Decision

Expose one bearer-authenticated NestJS endpoint backed by a service-role-only PostgreSQL projection.

- Resolve the submitted location through the existing accuracy-aware PostGIS jurisdiction
  function; reject accuracy worse than 100 metres before database resolution.
- Return only active, verified, routing-eligible, non-placeholder governance entities whose entity
  and boundary provenance use active official sources.
- Return citizen-safe entity kind, name, type, verification date, and official source URL. Do not
  return internal UUIDs, geometry, officers, phone numbers, emails, or private office contacts.
- Represent zero, one, or multiple valid matches explicitly as `unsupported`, `resolved`, or
  `ambiguous`; never choose an arbitrary match. Represent insufficient accuracy as `low_accuracy`.
- Keep the database function executable only by `service_role`; `anon` and `authenticated` clients
  receive no direct function or table access.
- Keep municipality behavior entirely data-driven. Missing production data produces no fabricated
  directory result.

## Alternatives Considered

### Query governance tables directly from the mobile client

Rejected because it would widen the Supabase client surface, duplicate eligibility checks, and make
privacy/security dependent on every client release.

### Add names and contacts to the routing jurisdiction response

Rejected because the routing response serves a different evidence/audit purpose and includes
internal identifiers. Public contact publication also needs a separately approved, version-aware
contact policy.

### Display a configured Pune or Mumbai fallback

Rejected because municipality-specific application logic violates the data-driven routing model
and could misdirect a citizen when boundaries or assignments change.

## Consequences

- Mobile can provide a useful, provenance-linked directory when verified records exist.
- Staging remains honestly empty until the additive migration and reviewed official geometry are
  applied.
- Contacts and officer assignments remain unavailable on this endpoint until their publication and
  verification rules are separately approved.
- Every lookup reaches the trusted API/database boundary; no Redis cache is introduced.

## Implementation Notes

- Migration `20260716104000_verified_governing_body_projection.sql` creates the narrow function.
- `POST /api/v1/governance/bodies/resolve` accepts only bounded location evidence.
- Strict shared Zod schemas reject undeclared, unverified, or private response fields.
- pgTAP and API/store/mobile tests cover grants, placeholder exclusion, official provenance,
  ambiguity, accuracy, private-field rejection, and no-ID mobile responses.
- Redis, BullMQ, Redis adapters/caching, Sentry, and direct client governance reads remain absent.

## Related Documents

- `docs/adr/0008-use-a-normalized-provenance-aware-governance-registry.md`
- `docs/adr/0009-use-database-evidence-for-deterministic-routing.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/KNOWN_ISSUES.md`
