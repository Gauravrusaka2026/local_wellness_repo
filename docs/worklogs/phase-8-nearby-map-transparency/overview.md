# Phase 8 Nearby Map and Transparency

## Objective

Provide a privacy-safe public view of reviewed complaint outcomes and spatial patterns without
exposing private complaint records, exact locations, citizen identity, originals, internal notes,
or placeholder governance data.

## Scope

- effective-dated transparency policies and category eligibility;
- review-attributed, versioned public complaint projections and withdrawals;
- approximate ward-derived locations, bounded nearby filters, hotspots, and verified boundaries;
- separately reviewed, versioned public duplicate groups that reference only current published
  projections;
- one account-bound support per current reviewed projection, aggregate-only public counts, and
  private star/follow state for the current authenticated actor;
- `recent|trending` bounded locality ordering and provider-neutral Local/Trending/Heat mobile views;
- anonymous API contracts and provider-neutral citizen web/mobile experiences;
- forced-RLS, migration, privacy, API, validation, and client verification.

Public comments, public participant identities/avatars, public original media, a third-party basemap, production pilot data, Redis,
BullMQ, and Sentry are outside this worklog.

## Activation Boundary

No visibility/generalization/moderation policy or production projection is seeded. Public reads
remain empty until an approved policy, verified current ward geometry, and a deliberate complaint
review all exist. Provider selection and media activation remain separately blocked by
`TRANSPARENCY-001`, `TRANSPARENCY-002`, and `GOVDASH-002`.

Duplicate similarity remains private input rather than public fact. A service-role reviewer must
explicitly create a group after every member already has a current public projection. Public detail
then exposes only the canonical public ID, related public IDs, and group size; withdrawal removes
the relationship from subsequent reads without mutating private complaint history.

Engagement is likewise unavailable without a current reviewed projection. Withdrawal immediately
removes the feed and engagement surface while retaining the private account-bound row for audit.
Support and stars do not change routing, assignment, workflow status, escalation, SLA, or KPI data.
