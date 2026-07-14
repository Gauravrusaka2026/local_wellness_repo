# Phase 3 Routing Worklog

## Objective

Implement generic, deterministic complaint-routing engineering over versioned Supabase PostgreSQL
and PostGIS evidence. The phase resolves jurisdiction, category, asset ownership, department,
durable officer role, optional current assignment, confidence, ambiguity, and fallback without
hardcoding any municipality, ward, category, department, officer, or ownership mapping.

Phase 3 also establishes the permanent, review-gated governance-synchronization foundation needed
to keep those records current without replacing the immutable Phase 2 bootstrap.

## Reference Scope

- Reference municipality: Pune Municipal Corporation, for architecture and synthetic tests only.
- Pilot taxonomy: Garbage dump, Missed sweeping, Pothole, Blocked drain, Sewage overflow, Water
  leakage, Broken streetlight, Open manhole, Mosquito breeding, Illegal construction, Encroachment,
  and Fallen tree.
- Canonical bootstrap: CSV files directly under `resources/governance/csv/`; the requested
  `resources/governance/csv/seed_data_for_mh/` directory is absent.
- Human reference copy: `resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx`.

The source files remain read-only. The category seed is deterministic engineering data and leaves
all 12 records draft, unverified, and non-routable.

## Delivered Engineering

- private, forced-RLS routing taxonomy, asset, ownership, confidence, duplicate-policy, rule, and
  decision-audit model;
- accuracy-aware PostGIS jurisdiction and asset candidate queries with service-only RPC wrappers;
- pure TypeScript routing evaluator with strict evidence eligibility, deterministic ranking,
  confidence scoring, ambiguity handling, and database-materialized fallback candidates;
- authenticated NestJS category, jurisdiction, and routing resolution contracts with strict input,
  sanitized output, structured logging, and append-only decision recording;
- configurable duplicate-scoring framework, intentionally not wired to complaints;
- review-gated governance-sync typed ports, persistence, private raw-snapshot bucket, lifecycle, and
  publication gates;
- locally verified migrations, seed, validation, package/API tests, and pgTAP coverage.

## Explicit Exclusions

- production routing from bootstrap placeholders or unverified pilot records;
- complaint submission, complaint duplicate queries/merging, media, maps, dashboards, or realtime;
- governance source connectors, scraping, scheduling, parser implementations, publication
  orchestration, or review UI;
- Redis, BullMQ, Redis adapters/caching, and Sentry.

## Current Outcome

### Engineering implementation complete for the session

The schema, pure packages, server contracts, synchronization foundation, and automated test suites
are implemented. Clean migration, generated-type drift, repository-wide verification, authenticated
routing API, and citizen HTTP smoke checks passed. Rendered viewport inspection was unavailable
because no in-app browser target was connected; `ENV-003` retains that low-severity follow-up.

### Pilot data validation pending

The repository has no verified Pune ward polygons, operational category/department/role mappings,
asset ownership, current assignment set, confidence policy, or complete fallback rules. The engine
must therefore produce no production route from the current bootstrap. `ROUTING-001` and
`GOVSYNC-001` track the remaining data and operational synchronization work.
