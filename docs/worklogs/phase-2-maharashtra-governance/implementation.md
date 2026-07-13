# Phase 2 Governance Implementation

## Status

The locally safe Phase 2 engineering baseline is complete. It intentionally creates no complaint endpoint, map, dashboard feature, realtime behavior or client governance mutation surface.

## Audited Source Baseline

- 18 CSV files are present directly under `resources/governance/csv/`.
- Seventeen data/reference files contain 887 records; `README.csv` is metadata.
- Each data export uses a presentation title on row 1, its real header on row 2 and data from row 3.
- All files are UTF-8 with BOM, comma-delimited and CRLF-terminated.
- Physical parsing found no malformed row widths, exact duplicate rows, control characters or edge whitespace.

## Delivered Implementation

### Database

- `20260713160000_phase_2_governance_schema.sql` creates PostGIS/`btree_gist`, the unexposed schema, 22 tables, provenance, LGD fields, indexes, foreign keys, checks and temporal exclusions.
- `20260713161000_phase_2_governance_security.sql` adds version/import lifecycle guards, grants, forced RLS and explicit read policies.
- `20260713162000_phase_2_identity_authority_forward_fix.sql` preserves old arbitrary scopes as non-routable legacy placeholders and adds canonical authority foreign keys.
- `20260713163000_phase_2_jurisdiction_resolution.sql` adds the service-only, evidence-returning `ST_Covers` resolver.
- `20260713164000_phase_2_governance_integrity_forward_fix.sql` makes scope keys immutable, rejects graph cycles, tightens ownership/lifecycle checks and adds service-only effective-access RPCs.
- `20260713165000_enforce_authority_parent_types.sql` enforces the structured authority parent-type matrix.
- `20260713166000_harden_governance_access_and_geometry.sql` excludes placeholder authority scopes from effective access and constrains boundary coordinates to valid longitude/latitude bounds.

### Validation and Generated Seed

- `resources/governance/manifests/phase-2-baseline.v1.json` pins the exact canonical source list, titles, headers, dispositions, aliases and hashes.
- `packages/database/src/governance-import/` validates the pinned baseline, creates stable IDs, classifies every source row and renders deterministic SQL/report output without rewriting source bytes.
- `supabase/seed/20_phase_2_governance.generated.sql` is the idempotent normalized baseline.
- `supabase/seed/21_phase_2_governance_checksum.generated.sql` records the main seed hash without self-reference and rejects conflicting values.
- `docs/worklogs/phase-2-maharashtra-governance/data-validation.json` is the machine-readable result: 0 errors, 2,343 warnings, 789 operational/reference records and 98 quarantined records.

### Normalized Baseline

The seed retains 901 provenance records and creates the exact entity counts recorded in `testing.md`. Recognized placeholder contacts/identifiers normalize to null with raw evidence retained. Gram Panchayat and village templates remain raw import records; the existing `administrative_units` table remains empty. The manifest-pinned Vasai–Virar alias resolves ward ownership without editing the source, and Brihanmumbai uses two district links.

Current-officer source rows create zero people and zero assignments. All 70 wards remain placeholders, all 18 routing references remain draft/unresolved/non-routable, and no geometry is invented.

## Required Import Behavior

- Never alter the canonical CSV or workbook.
- Convert recognized placeholder identifier/contact values to normalized nulls while preserving the raw text in immutable import records.
- Seed no verified person or assignment from `Current_Officers.csv`.
- Do not promote gram-panchayat, village or ward template rows as verified entities.
- Preserve reference-source links, raw source verification labels and `last_verified_on` where supplied.
- Store accepted but incomplete structural records as unverified.
- Resolve `Vasai-Virar City Municipal Corporation` through an alias rather than changing source data.
- Represent Brihanmumbai's two-district coverage relationally.
- Keep all complaint-routing references non-operational.

## Application Surface

Phase 2 adds no complaint, map, dashboard, realtime or direct governance-write endpoint. A later application read surface requires an explicit, reviewed contract over verified data.

The citizen web, government dashboard and admin console were started after implementation. Their public/auth routes and protected redirects passed HTTP smoke checks. A rendered viewport inspection remains pending because no approved in-app browser target was connected.
