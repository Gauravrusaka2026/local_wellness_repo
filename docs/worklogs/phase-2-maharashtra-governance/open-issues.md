# Phase 2 Governance Open Issues

## Source Path Mismatch

The requested `resources/governance/csv/seed_data_for_mh/` directory is absent. The 18 CSV exports are directly under `resources/governance/csv/`. Import configuration must identify the source path explicitly and fail rather than silently relocating canonical files.

## Missing Official Identifiers

Districts and urban local bodies have no LGD-code column. All 359 taluka, 71 gram-panchayat and 23 village LGD fields contain placeholder text. The state value `MH` is an ambiguous general/ISO-style code, not a verified LGD identifier. These identifiers must remain null until an official LGD refresh.

## Incomplete Coverage

The source states that Maharashtra has 424 urban local bodies, but the supplied corporation, council and nagar-panchayat tables total 190 records and are explicitly a baseline. The 71 gram-panchayat and 23 village rows are templates, not named entities. Statewide completeness cannot be claimed.

## Placeholder Wards and Missing Geometry

All 70 ward records are synthetic placeholders: five rows for each of 14 corporations. All zone, contact and GIS fields are pending. The source contains no coordinates or polygons, so only synthetic transaction-local spatial behavior can be validated; real Maharashtra jurisdiction coverage cannot.

## Name and Parent Ambiguity

- Five ward rows use `Vasai-Virar City Municipal Corporation`; the corporation table uses `Vasai-Virar Municipal Corporation`.
- Brihanmumbai is encoded against `Mumbai City / Mumbai Suburban` in one field.
- Six taluka names repeat across districts: Ashti, Kalamb, Karanja, Karjat, Khed and Malegaon.
- Municipal Council Karjat appears in Ahilyanagar and Raigad.

Imports require parent-scoped keys, a multi-district relationship and explicit aliases.

## Placeholder Contacts and Officers

The current source contains zero verified named incumbents. One current-officer row describes office-based routing; three contain incumbent templates. Most local-body, ward and district contact values say `To be extracted`, `District portal` or an equivalent placeholder. These values must not appear as verified people or contacts.

The district emergency `1077 / district-specific` row is a framework, not one callable statewide number. It requires district-specific contact data before verified visibility.

## Incomplete Provenance

Departments and officer roles lack row-level source URLs, verification states and verification dates. Utilities lack verification states and dates, and the generic city-water/sewer row has no URL source. Ward source references are descriptive text rather than URLs. Most structural rows cite a generic list or portal rather than a record-specific source.

## Unresolved Routing Crosswalks

Only 6 of 18 routing department labels exactly match the department catalog. Exact role matching covers 1 of 18 first recipients, 2 of 18 first escalations and no second escalations. Ownership and priority fields are free text, and all routing rows say official mappings remain required despite source status `Active`.

Routing references must remain non-operational until normalized crosswalks and ownership data are available in Phase 3.

## Workbook Parity

The workbook checksum is pinned, but cell/sheet parity against the CSV exports could not be reviewed because the approved spreadsheet runtime was unavailable. The CSVs remain machine truth. Repeat this audit without rewriting either source when the approved runtime is available.

## Replacement-Bundle Refresh

The committed generator safely reproduces the pinned baseline; it does not diff a new bundle, close superseded versions or automate verification promotions. Implement and review that delta workflow before replacing the source bundle.

## Validation Hardening

PostgreSQL enforces geometry type, SRID, non-empty/valid shape and longitude/latitude envelope. Additional source-policy hardening remains useful for official LGD formats, contact semantics, record-specific source evidence, per-file outcome summaries and explicit replacement-bundle diff reports.

## Legacy Scope Remediation

The Phase 2 forward fix preserves arbitrary Phase 1 scopes as explicit legacy `other` placeholders so history is not deleted. Effective-access RPCs now reject placeholder authorities and invalid historic ward/department ownership. Operators still need an audited mapping/revocation workflow for any such retained rows before onboarding existing accounts broadly.

## Delivered Evidence

- seven migrations and two generated governance seeds apply from a clean reset;
- 22 governance tables have forced RLS;
- all 348 pgTAP assertions pass, including 194 Phase 2 cases;
- deterministic artifact, generated type, database lint, workspace test and build checks pass;
- no officer, assignment, administrative-unit or boundary row is fabricated from placeholder input.
