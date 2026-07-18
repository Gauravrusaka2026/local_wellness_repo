# Maharashtra Batch 0 Intake Implementation

## Source and Validation Artifacts

- `resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip` is the immutable input.
- `resources/governance/manifests/maharashtra-batch0-2026-07-18.v1.json` pins the archive identity, inventory, CSV contracts, reconciliation policy, promotion ceiling, and redaction rules.
- `resources/governance/manifests/maharashtra-batch0-2026-07-18.v1.validation.json` records the independently derived counts, warnings, safeguards, unresolved gaps, and generated-artifact hashes.

## Generator and Seeds

`scripts/generate-maharashtra-batch0-governance.mjs` validates the archive and generates deterministic SQL. It checks the ZIP path and hash, safe member inventory, internal member hashes, table headers, row counts, exact canonical hierarchy reconciliation, token redaction, and non-promotion safeguards.

The generated deployment inputs are:

- `supabase/seed/60_maharashtra_batch0_governance.generated.sql`
- `supabase/seed/61_maharashtra_batch0_governance_checksum.generated.sql`
- `supabase/deploy/maharashtra-batch0/01_source_bundle_import_support.sql`
- `supabase/deploy/maharashtra-batch0/02_batch0_reference_and_lgd_seed.sql`
- `supabase/deploy/maharashtra-batch0/03_batch0_seed_checksum.sql`

The main seed catalogues 38 reference sources, creates one import batch, creates a 29-file ledger, preserves all 160 CSV rows, and records validation messages and normalization dispositions. It enriches Maharashtra with LGD code `27` and 35 exact existing districts with their missing LGD codes. Preflight and post-write guards abort on canonical identity conflicts, incomplete ledgers, LGD conflicts, or accidental Mumbai promotion.

The checksum companion records the generated main-seed SHA-256 without making the seed self-referential. Both generated files must be regenerated rather than edited by hand.

## Migration

`supabase/migrations/20260718110000_governance_source_bundle_imports.sql` extends `governance.import_batches` with nullable `source_bundle_sha256`, permits workbook-less archive imports, validates SHA-256 syntax, and requires at least one immutable source-artifact hash. Existing workbook-backed batches remain supported.

## Import Results

- Normalized: Maharashtra state plus 35 exact district matches.
- Quarantined: source district `Mumbai` / LGD `482` because no exact canonical name match exists.
- Reference only: 124 records.
- Redacted: transient token observations in 4 records.
- Operational entities promoted: none.
- Routing or external delivery activated: none.

## Deployment Boundary

The three SQL Editor files were reapplied successfully to the complete local database. Applying
them to, or verifying them against, a hosted Supabase project is a separate deployment action and
is not asserted by this worklog.
