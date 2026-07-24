# ADR-0032: Separate Citizen Taxonomy from Operational Routing Profiles

## Status

Accepted

## Date

2026-07-23

## Context

The JagrukSetu reference taxonomy defines a citizen-facing hierarchy of primary category,
subcategory and optional issue variant, followed by a routing profile. Its first version contains
concrete primary categories and 20 subcategories per primary category, but no concrete
issue-variant records. The existing complaint runtime instead has twelve stable operational
category records whose identifiers are already referenced by drafts, complaints, route rules,
duplicate policies and the private BMC ward-contact matrix.

Replacing or reparenting those operational identifiers would create unnecessary migration risk.
Treating every taxonomy row as an operational route would be unsafe because most jurisdiction,
department, role, asset and delivery crosswalks have not been verified. This is especially
important for corruption allegations, which must never fall through to the ordinary ward mailbox
or an office named in the allegation.

## Decision

- Keep the existing operational routing-category identifiers and exact-route behavior unchanged.
- Extend `routing.issue_categories` additively so a row can represent a routing profile, taxonomy
  primary category or taxonomy subcategory. Do not add a parallel taxonomy table.
- Store stable human taxonomy codes separately from legacy routing-profile codes.
- Link a taxonomy subcategory to an existing operational routing profile only through an explicit,
  database-owned mapping. A missing mapping remains fail closed.
- Expose one sanitized taxonomy RPC and authenticated API catalog containing primary/subcategory
  labels, derived workflow type, sensitivity, routing readiness and only the mapped operational
  category identifier. Authority, ward, department, office, role, recipient and routing-rule
  identifiers remain absent.
- Present two mobile dropdowns: primary category and subcategory/issue type. Display the selected
  subcategory's workflow type and routing readiness as read-only metadata. Add a third selector only
  when a later reference version defines concrete issue variants.
- Persist the selected primary code, subcategory code and derived workflow type in complaint draft
  custom attributes. PostgreSQL validates the complete tuple and its mapped operational category;
  the client cannot claim an official destination.
- Seed all taxonomy rows for discovery. Submission remains available only for explicitly mapped,
  currently verified operational profiles.
- Add `COR` — Corruption, Bribery & Public Integrity — as a protected primary category. Its
  subcategories default to private, have no Community/public route and remain non-submittable until
  an independent competent oversight route, accused-chain exclusion and secure delivery policy are
  configured. They never use the generic BMC ward-email fallback.

## Alternatives Considered

### Replace the twelve operational categories with taxonomy leaves

Rejected because stable category identifiers are referenced throughout complaint, routing,
duplicate, SLA and delivery history. Replacing them would add risk without improving the citizen
experience.

### Reparent operational categories directly under taxonomy primaries

Rejected because one operational profile may serve more than one taxonomy subcategory, and the
taxonomy hierarchy should not imply inherited official routing.

### Create new taxonomy-specific tables

Rejected for V1 because the existing category relation already supports hierarchy and metadata.
Another table family would conflict with the current database-simplification goal.

### Route every taxonomy entry to the current ward mailbox

Rejected because category breadth is not evidence of authority competence. It would also expose
protected allegations to potentially implicated offices and falsely represent routing as correct.

### Let the client send a routing profile or authority

Rejected because clients are untrusted. The API and PostgreSQL must continue to derive official
assignment from current server-side evidence.

## Consequences

- Citizens can browse a complete, structured taxonomy without a long flat list.
- A selection can be retained in a resumable draft even while official routing is pending.
- Only the currently mapped subset can be submitted; unavailable choices explain their routing
  state instead of silently selecting an unsafe fallback.
- Existing complaint and BMC contact identifiers remain compatible.
- Future issue variants, jurisdiction mappings and independent corruption intake require additive
  reference-data updates rather than UI rewrites.
- The taxonomy catalog adds rows but no new table, worker, scheduler or external dependency.

## Implementation Notes

- Generate taxonomy seed SQL deterministically from the reviewed Markdown source and verify drift
  in tests.
- Validate reserved taxonomy custom-attribute keys as an all-or-none tuple.
- Require a mapped draft category to equal the database mapping; require no operational category
  for an unmapped/protected taxonomy choice.
- Revalidate the tuple during submission so a later mapping change cannot make stale client state
  authoritative.
- Keep Corruption at the protected activation tier until a separate privacy, evidence,
  whistleblower, retention and oversight-routing review is accepted.

## Related Documents

- [ADR-0009](./0009-use-database-evidence-for-deterministic-routing.md)
- [ADR-0011](./0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md)
- [ADR-0023](./0023-separate-queue-routing-from-external-contact-delivery.md)
- [ADR-0027](./0027-use-a-simple-ward-contact-routing-facade-for-the-v1-bmc-pilot.md)
- `resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md`
- `docs/worklogs/jagruksetu-complaint-taxonomy/overview.md`
