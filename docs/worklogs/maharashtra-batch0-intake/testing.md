# Maharashtra Batch 0 Intake Testing

## Archive and Data Validation

The independent validation report records `passed_with_warnings` and confirms:

- the expected archive SHA-256 and 28-member safe inventory;
- all 27 internal manifest member hashes;
- 22 CSV schemas and 160 ledger rows;
- 38 reference sources;
- 1 state row, 36 district rows, and 35 exact district matches;
- one quarantined Mumbai row;
- 4 token-redacted records;
- 0 populated operational rows;
- no canonical CSV modification, routing activation, external-delivery approval, synchronization-endpoint activation, placeholder promotion, or stale PMC booklet promotion.

## Repository Test Coverage

`tests/maharashtra-batch0-governance.test.mjs` covers deterministic regeneration and source-bundle safety. Its six tests check the immutable archive inventory, exact hierarchy reconciliation, Mumbai quarantine, token redaction with original row hashes, non-activation of routing and operational entities, preservation of LGD enrichment by baseline seed regeneration, and freshness of committed generated artifacts.

`supabase/tests/database/046_governance_source_bundle_imports.test.sql` contains 12 pgTAP assertions covering the new hash column, nullability and constraints, compatibility with workbook-backed batches, valid ZIP-only batches, source-hash immutability, malformed hashes, and rejection of batches with no immutable source-artifact hash.

`supabase/tests/database/047_maharashtra_batch0_governance_seed.test.sql` contains 23 pgTAP assertions covering batch identity, the 29-file/160-row ledger, normalization dispositions, token redaction, Maharashtra and district LGD enrichment, Mumbai quarantine, non-routability, absence of operational normalization, 38 source URLs, RLS, stale PMC evidence handling, and accepted-with-warning staging.

## Generated SQL Guards

The seed contains transactional preflight and verification blocks that fail on:

- archive or import-batch identity mismatch;
- missing or conflicting canonical Maharashtra state data;
- missing exact canonical districts or conflicting LGD codes;
- an unexpected canonical `Mumbai` duplicate;
- incomplete file or row ledger counts;
- accidental promotion of the quarantined Mumbai row.

## Execution Scope

The generated validation report is repository evidence for the intake. The SQL pgTAP suites remain the target-database verification layer and must be run after applying the migration and seeds to a compatible local or staging database. No hosted Supabase test execution is claimed here.

## Executed Repository Check

On 2026-07-18, the six Batch 0 Node tests passed. A clean local reset applied all 45 migrations and
all ordered seeds, and the complete 47-file pgTAP suite passed 1,612 assertions. The 37 governance
import/package tests, application-schema database lint, generated database-type/master drift
checks, and the three-part SQL Editor package rerun also passed. No hosted Supabase execution is
claimed.
