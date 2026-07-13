# Phase 2 Maharashtra Governance Worklog

## Objective

Build a normalized, provenance-aware Maharashtra governance registry with Supabase PostgreSQL, PostGIS and RLS. Phase 2 covers administrative hierarchy, local bodies, wards, departments, offices, durable officer roles, versioned assignments, utilities, emergency contacts and non-operational complaint-routing references.

## Canonical Sources

- machine-readable source: CSV exports currently under `resources/governance/csv/`;
- human reference copy: `resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx`;
- requested but currently absent directory: `resources/governance/csv/seed_data_for_mh/`.

Canonical artifacts are read-only. Import and normalization must preserve checksums, source URLs, source verification labels, dates and raw placeholder values.

## Audit Checkpoint

The required pre-implementation audit is complete:

- all 18 CSV files were parsed without modifying them;
- 887 non-README data rows were inspected;
- physical row shape, duplicate rows, identifier coverage, placeholders, provenance, contact syntax and cross-file relationships were checked;
- current data gaps and import risks were recorded in `docs/governance-data.md` and this worklog;
- ADR-0008 records the registry, provenance, versioning, privacy and RLS decision.

## Delivered Scope

- dedicated unexposed governance schema and canonical authority hierarchy;
- PostGIS `MultiPolygon` SRID 4326 boundary versions;
- global department and officer-role catalogs plus authority-scoped utilities and scope-linked emergency contacts;
- authority-specific offices, department mappings and officer assignments, with versioned reference-only routing rows awaiting reviewed crosswalks;
- append-only import batches, file checksums, row provenance and quarantine outcomes;
- deterministic CSV validation and seed generation without modifying source files;
- indexes, constraints, foreign keys and verified-only RLS;
- generated database types and migration, seed, RLS and routing-reference tests;
- documented import and refresh workflow.

## Explicit Exclusions

- complaint submission and operational assignment;
- media capture or storage workflows;
- maps, dashboards and realtime behavior;
- client or application governance mutation surfaces;
- Redis, BullMQ and Sentry.

## Current Outcome

The Phase 2 engineering baseline is delivered and locally verified:

- seven ordered forward migrations create and harden 22 forced-RLS governance tables;
- 18 CSVs plus the workbook are hash-pinned without changing their bytes;
- validation reports 0 errors, 2,343 explicit warnings, 789 operational/reference rows and 98 quarantined template rows;
- two generated seed artifacts retain 901 raw/metadata records and safely normalize the supplied structural/catalog baseline;
- 239 authorities, 1 state, 36 districts, 359 talukas, 190 local bodies, 70 placeholder wards, 16 departments, 38 offices, 23 roles, 10 utilities, 14 emergency contacts and 18 unresolved routing references are seeded;
- no administrative units, authority-department mappings, officers, assignments or boundary versions are fabricated;
- database types, import/resource tests and all 194 Phase 2 pgTAP assertions pass.

Phase 2 remains at 90% against `PLAN.md`: real pilot municipality/ward geometry, official identifiers and verified pilot contacts are absent, so a real coordinate cannot yet satisfy the phase exit criterion. Workbook cell parity and rendered browser inspection remain explicitly tracked environment follow-ups.
