# ADR-0037: Expose Sanitized Civic-Area Office Contacts

## Status

Accepted

## Date

2026-07-24

## Context

ADR-0017 introduced an authenticated, verified-only civic-area projection and deliberately
excluded every office/contact field until a publication policy was approved. The BMC governance
import now contains official-source ward-office records with office names, office types, addresses,
public switchboard numbers, public email addresses, verification dates, and source URLs. The mobile
“Nearby” experience can identify the governing hierarchy, but it cannot yet help a citizen contact
the verified public office serving that location.

The routing matrix in `routing.ward_issue_contacts` contains a different class of data: complaint
recipients, category routes, phone/WhatsApp evidence, source locators, and owner-approval metadata.
Those operational values must remain private. Officer identities, direct mobile numbers, and
unpublished contacts must also remain outside citizen responses.

## Decision

- Extend the existing service-role-only `public.resolve_verified_governing_bodies` projection with
  an optional `offices` collection.
- Publish only `governance.offices` rows that are active, verified, non-placeholder, have an active
  official HTTPS source, have a verification date, and contain at least one non-empty address,
  official phone, or official email.
- When a ward resolves, return offices for that exact ward plus wardless offices explicitly scoped
  to the resolved local body. When no ward resolves, return only wardless offices explicitly scoped
  to the resolved local body. Bound every match to at most 25 offices.
- Return only office `name`, `type`, optional `address`, optional `phone`, optional `email`,
  `lastVerifiedOn`, and `sourceUrl`. Omit absent contact fields instead of returning nulls.
- Keep the endpoint bearer-authenticated and the database function executable only by
  `service_role`. Mobile continues to call NestJS and never reads governance tables or functions
  directly.
- Never query or expose `routing.ward_issue_contacts`, officer names/direct mobile numbers,
  WhatsApp routing contacts, internal UUIDs, routing evidence, unpublished data, or source-review
  metadata through this projection.
- Preserve rolling-deployment compatibility: an older database may omit `offices`; API and mobile
  consumers treat that as an empty collection.
- Keep the first-party schematic area panel. Automatically acquire contextual location through the
  existing focus-aware memory/last-known current-area coordinator. Offer explicit refresh/settings
  only as recovery actions; explicit recovery bypasses reusable location fixes. Ignore a response
  that completes after blur, account change, or a newer lookup.
- Open HTTPS source pages through Expo's in-app browser. Open a validated first public phone number
  through the device dialler and a schema-validated public email through the mail composer.
- Add a partial scope index on verified offices. Do not add a persistent client cache, direct
  Supabase client read, new map provider, Redis, BullMQ, or Sentry.

This decision supersedes only ADR-0017's blanket exclusion of phone/email/private office data. Its
verified hierarchy, official-source, service-role, accuracy, ambiguity, and no-internal-ID
requirements remain accepted. ADR-0027's private routing-contact boundary also remains accepted.

## Alternatives Considered

### Expose the private ward routing matrix

Rejected because its values select complaint recipients and include phone/WhatsApp/source-review
evidence that has not been approved as a public directory.

### Return every office attached to the authority

Rejected because authority-wide offices without an explicit local-body scope are not necessarily
relevant to a citizen's current area and would create a noisy, potentially misleading directory.
The accepted projection does include municipality-wide offices when they are wardless and
explicitly scoped to the resolved local body.

### Read verified offices directly from Expo through Supabase

Rejected because the governance schema is intentionally outside the client Data API surface and
field omission must be enforced by the trusted API/database boundary.

### Require all three contact fields before publication

Rejected because official offices may validly publish only one or two channels. The projection
requires at least one useful public field and omits absent fields.

## Consequences

- Citizens can see and act on a small public office directory for their verified current area.
- A ward result can include both the exact ward office and useful municipality-wide offices without
  leaking offices from another local body or ward.
- Exact public office contacts become part of the authenticated API contract, while operational
  routing recipients remain private.
- Existing clients and databases can be deployed in stages because `offices` is additive and
  optional at decode time.
- A verified civic-area match may still contain no offices when no record satisfies publication
  policy; the UI must explain that state without fabricating contacts.
- Contact freshness still depends on the canonical governance import and verification workflow.
  This projection does not prove that a mailbox or switchboard responds.

## Implementation Notes

- Migration `20260724120000_verified_civic_area_office_contacts.sql` replaces the SQL body without
  changing the function signature or relational return type.
- `supabase/deploy/civic-area-office-contacts.sql` is the identical rerunnable SQL Editor artifact.
- Strict shared Zod schemas reject nested private/undeclared office fields and require HTTPS office
  source URLs.
- pgTAP covers grants, exact-ward plus municipality-wide scope, official provenance, contact-empty
  exclusion, null omission, and private-table separation. API/store/mobile tests cover rolling
  compatibility, strict decoding, and safe action targets.

## Related Documents

- [ADR-0008](./0008-use-a-normalized-provenance-aware-governance-registry.md)
- [ADR-0017](./0017-use-an-authenticated-verified-governance-directory-projection.md)
- [ADR-0027](./0027-use-a-simple-ward-contact-routing-facade-for-the-v1-bmc-pilot.md)
- [ADR-0029](./0029-use-purpose-scoped-mobile-location-coordination.md)
- [ADR-0031](./0031-prune-deferred-database-subsystems-for-v1.md)
- `docs/worklogs/civic-area-office-contacts/overview.md`
