# Phase 2 Governance Decisions

## Architectural Decision

ADR-0008 selects a normalized, provenance-aware registry in an unexposed `governance` schema.

## Data Authority

- CSV exports are the machine-readable source of truth.
- The XLSX workbook is the human reference copy.
- Both are read-only inputs; checksums identify the exact bytes processed by an import batch.
- The currently supplied CSV files are directly under `resources/governance/csv/`; import configuration must fail clearly rather than assume the absent `seed_data_for_mh` subdirectory.

## Identity and Normalization

- A canonical authority supertype supplies durable authorization identities for state, state-agency, district, local-body and utility records. Talukas and wards remain subordinate typed scopes rather than authorities.
- UUID primary keys remain independent from official LGD codes.
- Missing LGD codes are null, never placeholder strings.
- Natural names are unique only within their verified parent jurisdiction.
- Multi-district local bodies use a join table rather than a slash-delimited foreign key.
- The reviewed Vasai–Virar source alias is pinned in the manifest; canonical CSV text is not rewritten and no general alias table is claimed.
- Structured authority parent types, parent immutability and whole-graph cycle checks are enforced. Reparenting requires an explicit replacement/supersession workflow.

## Catalogs and Authority Mappings

- Departments and officer roles are reusable global catalogs. Utilities own authority identities, while emergency contacts link to their applicable state/district/taluka/local-body/ward scope.
- Offices, department availability and assignments attach explicitly to an authority. Phase 2 routing references do not yet have an authority mapping and remain non-operational source evidence.
- Free-text slash-, comma- and arrow-delimited source values do not become trusted foreign keys automatically.

## Verification and Privacy

- Raw source verification status and normalized verification state are distinct.
- Placeholder and unresolved rows remain quarantined or unverified even when the source uses `Active`.
- No named officer or verified officer assignment is imported from the current `Current_Officers.csv` because it contains no real incumbent name.
- Contact values and provenance are preserved separately. The baseline reflects source verification labels, but generic source pages are tracked as a provenance weakness rather than silently treated as record-specific evidence.
- The schema is outside the Supabase Data API and has no client mutation grants.
- Forced RLS limits ordinary authenticated directory reads to verified/current/non-placeholder data; authority managers and platform administrators intentionally have broader read-only review access within their managed scope.

## Versioning and Routing

- Ward boundaries, officer assignments and complaint-routing references are append-versioned with validity periods.
- Spatial boundaries use PostGIS `MultiPolygon` with SRID 4326.
- Missing geometry remains null and cannot satisfy spatial-routing checks.
- Phase 2 routing records are references only. They remain non-operational until Phase 3 resolves authority, department, role, utility and ownership mappings.

## Import and Access Boundaries

- Baseline generation is deterministic and fail-closed. It uses stable UUIDs and replaces generated artifacts atomically only after validation succeeds.
- The main seed cannot contain its own checksum, so an idempotent checksum companion records and verifies the externally computed main-seed hash.
- Source verification is stored with `reference_source_id`, raw source status and `last_verified_on` where present; nonexistent `source_url`/`last_verified_at` columns are not assumed.
- The trusted API loads effective roles and memberships only through service-only database RPCs. Those functions reject inactive or placeholder authorities and invalid ward/department ownership while retaining invalid legacy rows for remediation history.

## Operational Dependencies

Phase 2 uses Supabase PostgreSQL, PostGIS and repository tooling. Redis, BullMQ and Sentry remain excluded by ADR-0007.
