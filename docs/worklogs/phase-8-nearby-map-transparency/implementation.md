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

## Shared and API

- Shared types and Zod schemas define bounded WGS84 viewports, safe public status/category/ward/
  location records, hotspots, verified boundary GeoJSON, pagination, and public detail.
- The strict public-detail schema includes only `canonicalPublicId`, sorted `relatedPublicIds`, and
  `totalCount` for a reviewed duplicate group; list records remain unchanged.
- An anonymous NestJS module validates each request, calls narrow service-role functions, strictly
  decodes their JSON, and maps missing detail to a public `404` without falling back to private data.

## Clients

- Citizen web uses browser-approved geolocation to select a bounded nearby viewport, renders a
  first-party no-tile spatial plot and accessible list, supports filters/pagination, and exposes a
  sanitized detail route.
- Mobile uses device-approved location to request the same already-generalized records and provides
  a list/detail experience without adding a native map dependency.
- Web and mobile detail views render reviewed related reports as public-detail links/rows without
  implying that an unreviewed similarity result is a confirmed duplicate.
- Empty environments explicitly explain that unreviewed/private records are excluded; they never
  synthesize demo markers or hardcode pilot municipality data.
