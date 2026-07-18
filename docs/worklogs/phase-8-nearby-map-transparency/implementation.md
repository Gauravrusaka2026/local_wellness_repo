# Phase 8 Implementation

## Database

- The additive schema/security pair, retained RPC/ACL forward fix, and duplicate-group publication
  migration create the review-gated transparency boundary without changing private complaint
  visibility.
- Versioned policies/category rules, publication review/projection history, reviewed duplicate
  groups, and unavailable-by-default processed derivative structure remain in the unexposed
  `complaints` schema.
- Service-only publication derives a point from reviewed ward geometry; bounded read functions
  return strict JSON projections only.
- Service-only duplicate review and withdrawal functions operate on current published projections,
  enforce a 100-member bound, preserve reviewer attribution/membership history, and expose no
  private identifiers.
  A detail response returns `duplicateGroup: null` until an active reviewed group exists.
- `20260717100000_public_complaint_engagements.sql` adds the private forced-RLS engagement table,
  one-row-per-account constraint, aggregate support projection, current-projection gate, service-
  only lookup/mutation functions, and `recent|trending` public-list ordering.

## Shared and API

- Shared types and Zod schemas define bounded WGS84 viewports, safe public status/category/ward/
  location records, hotspots, verified boundary GeoJSON, pagination, and public detail.
- The strict public-detail schema includes only `canonicalPublicId`, sorted `relatedPublicIds`, and
  `totalCount` for a reviewed duplicate group; list records remain unchanged.
- An anonymous NestJS module validates each request, calls narrow service-role functions, strictly
  decodes their JSON, and maps missing detail to a public `404` without falling back to private data.
- Authenticated engagement lookup and mutation routes derive the actor from the verified bearer
  session, accept no client-supplied identity/private complaint ID, enforce bounded lookup and
  PostgreSQL-backed read/mutation quotas, and return `Cache-Control: no-store` private state.

## Clients

- Citizen web uses browser-approved geolocation to select a bounded nearby viewport, renders a
  first-party no-tile spatial plot and accessible list, supports filters/pagination, and exposes a
  sanitized detail route.
- Mobile uses device-approved location to request the same already-generalized records and provides
  compact Local, Trending, and Heat modes without adding a native map dependency. Signed-in users
  can support once and privately star a current reviewed item.
- Web and mobile detail views render reviewed related reports as public-detail links/rows without
  implying that an unreviewed similarity result is a confirmed duplicate.
- Empty environments explicitly explain that unreviewed/private records are excluded; they never
  synthesize demo markers or hardcode pilot municipality data.
