# ADR-0030: Show Owner-Private Reports in Community

## Status

Accepted

## Date

2026-07-23

## Context

The mobile Community screen previously read only the reviewed-public complaint projections defined
by ADR-0016. A newly submitted complaint is private until a separate review publishes a sanitized
projection, so its owner could correctly see it in My Complaints while seeing no corresponding item
in Community. That distinction was privacy-safe but looked like a failed or lost submission.

The citizen needs immediate confirmation that their report exists when returning to Community.
That confirmation must not weaken the reviewed-public boundary: an unreviewed complaint contains
private ownership and workflow data, and it must not become a public feed, map, heatmap, trending,
support, or star item merely because its owner can see it.

The existing authenticated `GET /api/v1/complaints` endpoint already provides an actor-scoped,
RLS-backed list of the signed-in citizen's complaints. No new public projection or data contract is
required.

## Decision

Add a separate signed-in-only **Your reports** preview to the mobile Community screen.

- Read the preview from the existing actor-scoped `GET /api/v1/complaints` endpoint.
- Show the newest three owned complaints and provide a route to the full My Complaints screen.
- Refresh the preview whenever Community gains focus so a successfully submitted complaint appears
  immediately when the citizen returns.
- Load owned reports independently of device location and independently of the reviewed-public feed.
  A location denial or public-feed error must not hide the account-owned preview.
- Label the preview as an account view and explain that reports join the public feed only after
  privacy review.
- Open owned items through the authenticated complaint-detail route.
- Never adapt an owned private complaint into a public complaint DTO or add it to the Community map,
  heatmap, nearby list, trending order, support totals, or private star/follow interactions.
- Preserve ADR-0016 publication and withdrawal rules and ADR-0024 engagement eligibility unchanged.

This is a mobile presentation change over existing authenticated contracts. It adds no API route,
database object, migration, RLS policy, Supabase configuration, or public visibility behavior.

## Alternatives Considered

### Merge owned private complaints into the reviewed-public feed

Rejected because that would make one feed contain two visibility models and could expose private
text, location, ownership, or workflow fields through public map and engagement components.

### Automatically publish every submitted complaint

Rejected because submission is not privacy review. Automatic publication would supersede
ADR-0016's reviewed, sanitized, generalized projection boundary and its withdrawal controls.

### Fabricate a reviewed-public item for the owner

Rejected because synthetic public identifiers, generalized coordinates, provenance, support, and
publication state would misrepresent a private complaint and risk later leaking it into public
surfaces.

### Require current location before showing owned complaints

Rejected because ownership is account-scoped rather than locality-scoped. Location permission,
accuracy, cache state, or GPS availability must not determine whether a citizen can find their own
submitted report.

### Keep Community reviewed-public only

Rejected because the backend behavior would remain correct but the mobile experience would continue
to imply that a successful private submission disappeared.

## Consequences

- A signed-in citizen can see their newest submitted reports in Community without waiting for
  publication review.
- Signed-out users and other accounts cannot see the owner-only preview or its records.
- Public Community behavior remains fail-closed and projection-only.
- Owner items deliberately have no support or star controls and do not affect public trending or
  heat aggregation.
- The owned preview and public feed can succeed or fail independently, which avoids one data source
  masking the other.
- Community now communicates two explicit contexts: private account history and reviewed-public
  locality information.
- Physical-device and hosted smoke testing must confirm immediate focus refresh and actor isolation.

## Implementation Notes

- Keep preview selection deterministic by sorting through the existing complaint-summary helper and
  limiting the result to three items without mutating the API response.
- Cancel or ignore a stale focus load when the screen loses focus or the active Auth context changes.
- Use the existing `ComplaintCard` and authenticated complaint-detail route; do not share the
  public `ReportCard` engagement behavior.
- Treat the explanatory publication copy as part of the privacy control, not optional marketing
  content.
- Tests must cover newest-three selection, non-mutation, private visibility preservation, empty and
  paginated results, and absence of public projection identifiers.

## Related Documents

- `docs/adr/0016-use-reviewed-public-complaint-projections.md`
- `docs/adr/0024-use-account-bound-reviewed-public-complaint-engagements.md`
- `docs/adr/0029-use-purpose-scoped-mobile-location-coordination.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/authentication.md`
- `docs/worklogs/community-owned-report-visibility/`
