# Phase 2 Governance Testing

## Audit Validation Performed

Read-only audit scripts parsed every CSV and checked encoding, delimiter, row widths, headers, blanks, exact duplicates, edge whitespace, control characters, date format, URL coverage, contact syntax, placeholders, candidate keys and cross-file parent references.

Observed results:

- 18 of 18 CSV files decoded as UTF-8 with BOM and comma delimiters;
- 17 data/reference files contained 887 data rows in total;
- zero malformed-width data rows;
- zero exact duplicate data rows;
- zero blank data rows outside the intentionally non-tabular README structure;
- zero control/NUL characters and zero leading/trailing cell whitespace cases;
- all supplied `Last Verified` and `Last Checked` values used `YYYY-MM-DD` format;
- all district references resolved after interpreting the explicit `Mumbai City / Mumbai Suburban` multi-value;
- all checked revenue-division labels matched the district table;
- gram-panchayat and village template rows referenced a supplied district/taluka pair;
- five ward rows did not exactly match a corporation name because of the Vasai-Virar alias difference;
- no usable ward geometry was present;
- no verified named officer was present.

The committed importer reproduces these source-audit results and fails closed on manifest, hash, title, header or row-width drift.

## Automated Test Results

### Source and Import Pipeline

- 19 hash-pinned files: 18 CSV exports plus the workbook.
- 887 raw source records and 14 README metadata records.
- 0 validation errors and 2,343 explicit warnings: 1,982 placeholder and 361 unverified warnings.
- 789 operational/reference records and 98 quarantined template records.
- 12 importer tests cover BOM/title/header/quoted parsing, malformed/width drift, source hash drift, duplicate/incomplete/date/URL failures, missing parents, safe normalization, placeholder contacts, unresolved routing, stable UUIDs/SQL escaping, deterministic output, stale/missing artifacts and failure atomicity.
- 4 shared governance-validation tests and 3 canonical resource/hash/companion-seed contract tests pass.

### Database and RLS

A clean reset applies all Phase 1 migrations, all seven Phase 2 migrations, the two generated governance seeds and the role seed. Application-schema database lint reports no errors.

All eight pgTAP files pass: 348 assertions total, with 194 Phase 2 assertions:

- `004_governance_schema.test.sql`: 55 schema, constraint, index, RLS and function assertions;
- `005_governance_seed.test.sql`: 44 provenance/count/quarantine assertions;
- `006_governance_rls.test.sql`: 38 ACL, visibility, manager-isolation and effective-access assertions;
- `007_governance_spatial.test.sql`: 14 geometry, coordinate-envelope, resolver and history assertions;
- `008_governance_versioning.test.sql`: 43 import lifecycle, temporal exclusion, immutability, assignment and authority-hierarchy assertions.

The self-intersection notice emitted by `007` is expected negative-test output. No real Maharashtra boundary is used; positive routing fixtures are synthetic and transaction-local.

### Seeded Baseline Assertions

- 901 immutable import records: 700 normalized, 165 placeholder-preserved and 36 reference-only;
- 108 accepted and 793 accepted-with-warnings; 0 rejected;
- 239 authorities, 1 state, 36 districts, 359 talukas, 190 local bodies and 191 local-body/district links;
- 70 non-routable placeholder wards, 16 departments, 38 offices, 23 officer roles, 10 utilities, 14 emergency contacts and 18 draft/unresolved routing references;
- 0 administrative units, authority-department mappings, officers, assignments or boundaries;
- manifest, workbook and externally generated seed checksums stored in the imported batch.

## Verification Commands and Outcome

The following passed on 2026-07-13:

```bash
pnpm install --frozen-lockfile
pnpm governance:data:check
pnpm database:reset
pnpm database:lint
pnpm database:test
pnpm database:types
pnpm database:types:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose --file infrastructure/docker/compose.dev.yml config --quiet
pnpm audit --prod
```

Local Auth E2E passed email magic-link and delivered-invitation cases; the phone case skipped because no SMS provider is configured. Citizen web, government dashboard and admin console started and returned the expected public/auth responses and protected redirects. The rendered visual pass remains open under `ENV-003` because the approved browser surface had no connected target.
