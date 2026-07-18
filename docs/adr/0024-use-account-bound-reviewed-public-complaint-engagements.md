# ADR-0024: Use Account-Bound Reviewed-Public Complaint Engagements

## Status

Accepted

## Date

2026-07-17

## Context

ADR-0016 keeps private complaints, exact locations, citizen identity, original media, and internal
workflow evidence outside the public transparency model. Citizens now need a locality-oriented way
to support an already reviewed report, privately star it for later, and view a bounded trending
order without turning private duplicate evidence or unreviewed complaints into public content.

Community interaction introduces a new public-visibility and privacy boundary. A support count can
be public, but the supporting account must not be disclosed. A private star must remain visible only
to its account. Neither signal is official government evidence and must not change routing,
assignment, status, escalation, SLA, or KPI calculations.

## Decision

- Store one private engagement row per `(complaint, account)` in the unexposed, forced-RLS
  `complaints` schema. The row contains independent support and follow/star state; direct table
  access remains revoked from every Data API role, including `service_role`.
- Permit engagement only for a current reviewed public projection and an active authenticated
  profile. Withdrawing the projection immediately removes it from feed, engagement lookup, and
  mutation results without deleting private engagement history.
- Publish only the aggregate support count with a reviewed public projection. Never return supporter
  identities, account counts by locality, profile images, or another account's follow/star state.
- Treat star/follow state as private account data. The API returns it only to the authenticated
  account through a bounded lookup or mutation response.
- Serve engagement through bearer-authenticated NestJS endpoints and narrow service-role database
  functions. The API derives the actor from the verified session, strictly validates at most 100
  unique public IDs per lookup, and applies separate PostgreSQL-backed read and mutation quotas.
- Add `recent` and `trending` order to the existing bounded public feed. Trending ranks current
  reviewed projections inside the requested viewport by aggregate support, then publication time
  and public ID. Counts and ordering are live, so cursor pages may shift while support changes.
- Keep the locality feed and aggregate heat view provider-neutral. They continue to use only
  already-generalized reviewed projection and minimum-cohort hotspot data.
- Keep comments, public identities, public profile images, engagement notifications, and automatic
  official-priority effects disabled. No Redis, BullMQ, Redis adapter/cache, or Sentry dependency is
  introduced.

## Alternatives Considered

### Reuse the private Phase 4 supporter structure directly from clients

Rejected because client table access would widen the private complaint boundary, bypass current
projection withdrawal, and expose internal complaint identity rather than stable public IDs.

### Publish supporter identities or profile images

Rejected because locality participation does not require public identity and would create an
avoidable correlation path between citizens and reported locations.

### Let support change official priority or SLA

Rejected because popularity is not verified severity, jurisdiction, ownership, or government
policy. Any future operational use requires a separate reviewed policy and audit model.

### Add comments with support and stars

Rejected because comments need independent moderation, reporting, abuse, retention, notification,
and privacy controls tracked under `NOTIFY-003`.

## Consequences

- One active account can contribute at most one support to one current public complaint.
- Public feed consumers receive a useful aggregate signal without learning who supported a report.
- A citizen's stars can be restored across devices after authentication, but no public saved-list
  or notification workflow is implied.
- Trending results remain privacy-safe and data-driven, but mutable support counts mean a later
  cursor page is not a frozen ranking snapshot.
- Withdrawing a reviewed projection removes its current community surface while retained private
  engagement rows preserve audit and possible future republishing semantics.
- Abuse detection beyond the implemented account requirement, database uniqueness, and API quotas
  remains a pilot-operations responsibility; open comments remain unavailable.

## Implementation Notes

- Migration `20260717100000_public_complaint_engagements.sql` adds the private table, aggregate
  support projection, `recent`/`trending` feed function, and service-only engagement functions.
- Public list/detail DTOs may include only `supportCount`; authenticated engagement DTOs add
  `supported` and `starred` for the current actor.
- Structured logs and rate-limit subjects must omit public text, exact coordinates, raw user IDs,
  and engagement payload history.
- Tests must cover direct ACL denial, one-row-per-account behavior, exact idempotent state setting,
  withdrawn projections, inactive profiles, aggregate-only output, bounded lookup, sorting, and
  official-workflow separation.

## Related Documents

- `docs/adr/0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md`
- `docs/adr/0016-use-reviewed-public-complaint-projections.md`
- `docs/adr/0022-use-postgresql-backed-v1-api-hardening.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/KNOWN_ISSUES.md`
