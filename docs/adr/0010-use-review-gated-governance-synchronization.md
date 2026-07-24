# ADR-0010: Use Review-Gated Governance Synchronization

## Status

Superseded

Superseded by
[ADR-0031](./0031-prune-deferred-database-subsystems-for-v1.md) for V1. The synchronization design is
retained as historical context; its tables and runtime are no longer installed after the V1 prune.

## Date

2026-07-13

## Context

The Phase 2 CSV importer safely reproduces a hash-pinned bootstrap dataset. It cannot keep governance records current because official identifiers, boundaries, contacts, officer assignments, utilities, and emergency references change on different schedules and may come from different official sources.

Directly applying fetched data would allow malformed, ambiguous, stale, or placeholder records to replace reviewed records and affect routing. The system also needs to retain exactly what a source returned so normalization and matching decisions can be audited later. The canonical repository CSVs must remain immutable bootstrap inputs rather than mutable synchronization output.

## Decision

Governance synchronization is a permanent, staged backend capability:

1. An approved source registry defines official public endpoints, formats, parser contracts, cadence metadata, and secret references without storing credentials. The repository bootstrap is a distinct manual source linked to its existing import batch and canonical path, with no invented external URL.
2. Each retrieval creates a run and an immutable, content-addressed raw snapshot in a private Supabase Storage bucket. PostgreSQL retains hashes, object metadata, retrieval headers, and provenance.
3. Normalization produces staged candidates and diagnostics without changing canonical governance rows.
4. Entity matching records matched, new-entity, ambiguous, and unmatched outcomes explicitly.
5. Change detection produces reviewable, field-level proposed changes.
6. Human review records append-only decisions. Only approved, valid, non-placeholder changes may be applied transactionally to versioned governance records.
7. Applied changes create or link to immutable import/provenance records. Officer assignment, ward boundary, routing, and other time-varying changes close prior effective periods and append new versions.
8. Synchronization target selection is service-only, data-driven, and separately review-gated.
   Selecting an authority, local body, or ward for synchronization never verifies that entity or
   makes it routing eligible.

The Phase 3 implementation established persistence contracts, lifecycle enforcement, provider interfaces, and tests. ADR-0012 subsequently selects Supabase Cron, a private Edge fetch function, and PostgreSQL leases for the retrieval stage. Source-specific parsers, the operator review UI, matching policies, and production publication remain pending. No Redis or BullMQ dependency is introduced.

## Alternatives Considered

### Continue using replacement CSV bundles only

Rejected as the permanent model because it cannot represent independent source schedules, immutable HTTP responses, ambiguous matches, or field-level reviewed changes. It remains a valid bootstrap and controlled manual input.

### Let source-specific jobs update governance tables directly

Rejected because retrieval/parsing failures and source changes would bypass review, provenance, and placeholder protections.

### Store raw source bodies only in PostgreSQL

Rejected because immutable response bodies and GIS/source files can be large. Private Supabase Storage holds raw bytes while PostgreSQL holds searchable metadata and hashes.

### Introduce Redis and BullMQ for scheduling

Rejected for V1 under ADR-0007. The staged model does not depend on a queue vendor, and scheduler selection remains deferred.

## Consequences

- Every fetched source and proposed change is traceable and reviewable.
- Identical content can be handled idempotently without overwriting an older snapshot.
- Retrieval cannot silently promote a placeholder or unverified record into operational routing.
- Synchronization has more states and requires operator review tooling before it is operational.
- Private snapshot storage needs retention, access, and backup policies before production activation.
- Engineering completion remains separate from source approval and pilot data validation.

## Implementation Notes

- Preserve `resources/governance/csv/` and the workbook byte-for-byte.
- Register the current CSV corpus as one draft `repository_bootstrap`/`bootstrap_bundle` source at
  `resources/governance/csv/`, linked to the imported Phase 2 batch. Do not infer the absent
  `seed_data_for_mh/` path or create a reference source for the repository itself.
- Keep synchronization tables in the unexposed governance boundary with forced RLS.
- Keep the raw snapshot bucket private and use immutable object paths containing content hashes.
- Sanitize retrieval errors and never persist credentials, authorization headers, or tokens.
- Require approval before application and prohibit approval of invalid, ambiguous, or placeholder candidates.
- Keep synchronization scope identity/hierarchy immutable, require a current global platform
  administrator for activation, and retain an independent canonical-entity routing gate.
- Do not install Redis, BullMQ, Sentry, or external scraper dependencies in this phase.

## Related Documents

- `docs/governance-data.md`
- `docs/governance-synchronization.md`
- `docs/database.md`
- `docs/deployment.md`
- `docs/worklogs/phase-3-routing/overview.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0008-use-a-normalized-provenance-aware-governance-registry.md`
- `docs/adr/0009-use-database-evidence-for-deterministic-routing.md`
- `docs/adr/0012-use-supabase-cron-edge-functions-and-postgresql-leases-for-governance-retrieval.md`
