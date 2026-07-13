# ADR-0008: Use a Normalized, Provenance-Aware Governance Registry

## Status

Accepted

## Date

2026-07-13

## Context

Phase 2 introduces Maharashtra administrative areas, government authorities, durable officer roles, changing officer assignments, jurisdiction boundaries and complaint-routing reference data. The supplied workbook is useful for human review, while its CSV exports are the machine-readable authority. The source contains verified structural records alongside incomplete baselines, free-text relationships and explicit placeholders. It does not contain usable LGD codes for districts, talukas or local bodies, verified ward geometries, or a named incumbent who can safely be promoted to a verified officer assignment.

The registry must support Phase 1 authority scope without exposing mutable governance data directly to clients. It must also retain the provenance and validity history needed to refresh changing public-sector data without rewriting past assignments, boundaries or routing decisions.

## Decision

Use a normalized, provenance-aware governance registry in a dedicated `governance` PostgreSQL schema that is not exposed through the Supabase Data API.

- Treat the CSV files as read-only machine-readable source material and the XLSX workbook as the human reference copy. Import tooling must never rewrite either source.
- Represent grantable government scope through a canonical authority supertype. State, state-agency, district, local-body and utility records may own an authority identity; talukas and wards remain subordinate typed scopes referenced by scoped roles.
- Keep departments and officer roles as global catalogs. Give utilities authority identities, scope emergency contacts explicitly, and connect offices, department availability and assignments to an authority instead of embedding slash-delimited source labels in foreign-key columns. Routing references remain unmapped source evidence in Phase 2.
- Record every import in an append-only ledger with source path, byte checksum, import version, validation outcome and row counts. Preserve raw source values for traceability even when a normalized field is null or quarantined.
- Store unavailable LGD codes as null. Never persist sentinel text such as `Needs official LGD code` as an identifier. Enforce LGD uniqueness only when a code is present, and use parent-scoped natural keys where the available source can support them safely.
- Quarantine placeholder, malformed, incomplete and unresolved rows from verified visibility. Preserve their raw values and source status without presenting them as verified entities or contacts.
- Do not create a verified officer or officer assignment from `Current_Officers.csv`. It contains office-routing templates and incumbent placeholders, not a verified named person.
- Enable PostGIS and store jurisdiction boundary revisions as `MultiPolygon` geometry with SRID 4326. A missing polygon produces no boundary-version row and cannot satisfy spatial-routing checks.
- Version ward boundaries, officer assignments and complaint-routing references with non-overlapping validity periods. Refreshes append a new version and close the previous version; they do not overwrite historical facts.
- Preserve Phase 2 complaint-routing rows as non-operational references. They may be promoted to normalized, versioned reference records, but cannot drive complaint assignment until Phase 3 supplies verified authority, department, role, utility and ownership mappings.
- Provide no Phase 2 application or client write surface. Governance mutation remains an operator-controlled import process.
- Enable and force RLS on governance data. Ordinary authenticated directory reads are verified/current/non-placeholder; scoped managers and platform administrators may review broader data without gaining a client mutation path. The unexposed schema and absence of client mutation grants provide additional defense in depth.
- Do not add Redis, BullMQ or Sentry. Phase 2 import, validation and tests use PostgreSQL, PostGIS and repository tooling only.

## Alternatives Considered

- Import every CSV row directly into exposed public tables: rejected because sentinel values, aggregate templates, incomplete contacts and synthetic wards would be indistinguishable from verified operational data.
- Use the workbook as the runtime import source: rejected because spreadsheet formatting and presentation rows make deterministic schema validation harder than the corresponding CSV exports.
- Store governance data as one denormalized JSON document: rejected because authority scope, foreign keys, RLS, spatial indexing and historical validity require relational constraints.
- Create separate authorization foreign keys for every authority type: rejected because Phase 1 memberships and future scoped access need one stable authority reference while typed tables still preserve hierarchy.
- Make LGD codes mandatory at initial load: rejected because the current source has no usable district, taluka, urban-local-body, gram-panchayat, village or ward codes. Placeholder text must not be misrepresented as an identifier.
- Treat the source routing status `Active` as operational readiness: rejected because every routing row says official mappings are still required and most department and role labels do not resolve exactly to the supplied catalogs.
- Replace assignment and boundary rows in place during refresh: rejected because it would destroy the history required for auditability and reproducible routing.

## Consequences

- Phase 1 authority scopes can receive a durable governance foreign key without coupling access control to a specific local-body table.
- Verified and unverified records can coexist without allowing placeholder names or contacts to appear as official.
- Import and refresh runs are reproducible and auditable by source checksum and row-level provenance.
- Querying current assignments, boundaries and routing references requires validity-window predicates, but historical state remains available.
- Reusable catalogs remain separate from authority-scoped utilities, contacts, offices and assignments.
- The initial registry will contain structural gaps: LGD identifiers and geometry remain null, statewide local-body coverage is incomplete, and officer assignments remain empty until authoritative data is supplied.
- Spatial indexes can support future jurisdiction lookup, but Phase 2 cannot claim real spatial-routing coverage from the current source.
- Direct client queries cannot reach the schema. A later read API or intentionally exposed verified view requires a separately reviewed change.

## Implementation Notes

- Validate an exact file manifest and row-2 header contract before parsing data; each data export has a presentation title in row 1. `README.csv` is metadata rather than a tabular seed source.
- Store UUID primary keys independently of optional official codes. Use parent-scoped case-insensitive natural keys and partial unique indexes for non-null LGD codes.
- Model multi-district authorities through a join table. Do not store `Mumbai City / Mumbai Suburban` as one district foreign key.
- Preserve source URLs, source verification labels and last-verified dates. A generic home or list page does not by itself promote a contact, incumbent or boundary to verified.
- Resolve known source-name differences, including `Vasai-Virar City Municipal Corporation` versus `Vasai-Virar Municipal Corporation`, through an explicit manifest-pinned alias/crosswalk without changing the canonical CSV.
- Normalize emergency alternate numbers as separate contact values when promoted. Keep the district-specific `1077` framework row unverified until a callable local number is attached to a district.
- Use GiST indexes for current verified geometry and conventional indexes for hierarchy, LGD lookup, active validity windows and authority-specific routing lookups.
- Test migration application, seed determinism and checksums, rejected/quarantined rows, foreign keys, uniqueness, RLS, version overlap protection and PostGIS geometry validity.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/authentication.md`
- `docs/governance-data.md`
- `docs/supabase-setup.md`
- `docs/worklogs/phase-2-maharashtra-governance/overview.md`
- ADR-0006
- ADR-0007
