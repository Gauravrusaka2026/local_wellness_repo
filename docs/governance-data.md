# Maharashtra Governance Reference Data

## Purpose

This document defines the Phase 2 governance-data contract: which repository artifacts are authoritative, how they are validated and imported, how incomplete records remain visibly unverified, and how a later source refresh is reviewed.

## Canonical Artifacts

The human reference copy is:

```text
resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx
```

The machine-readable exports currently present in the repository are:

```text
resources/governance/csv/*.csv
```

The requested nested path `resources/governance/csv/seed_data_for_mh/` is not present in the current source bundle. The versioned manifest therefore pins the available files directly under `resources/governance/csv/`. Import tooling fails when those paths or hashes drift; it does not silently copy, move or rewrite canonical files.

The CSV files are the machine-readable source of truth. The workbook is the human reference copy and its checksum is pinned, but cell/sheet parity could not be independently reviewed because the approved spreadsheet runtime was unavailable. Its formatting is not an import contract; `DATA-007` tracks the pending parity check.

## CSV Export Contract

All 18 CSV files are UTF-8 with a byte-order mark, comma-delimited and CRLF-terminated. Seventeen contain data or reference rows; `README.csv` contains key/value metadata.

Each data export has two leading structural rows:

1. row 1 contains the sheet title and empty trailing cells;
2. row 2 contains the actual field names;
3. records begin at row 3.

`README.csv` is different: row 1 is a title, row 2 is blank and rows 3–16 contain metadata. It must not be loaded as an entity table.

An importer must validate the exact expected file manifest and row-2 headers. It must not infer a schema from the title row or silently accept added, removed, reordered or renamed columns.

## Audited Baseline

The initial audit found 887 data rows across the 17 non-README files.

| File                         | Data rows | Import classification                                                            |
| ---------------------------- | --------: | -------------------------------------------------------------------------------- |
| `Complaint_Routing.csv`      |        18 | Non-operational routing references                                               |
| `Current_Officers.csv`       |         4 | Office-routing and incumbent templates; no verified named officers               |
| `Departments.csv`            |        16 | Global catalog candidates with missing row-level provenance                      |
| `Districts.csv`              |        36 | Structural candidates; identifiers and contacts incomplete                       |
| `Emergency_Contacts.csv`     |        12 | Eleven actionable expressions and one district-specific framework row            |
| `Gram_Panchayats.csv`        |        71 | Template rows only; quarantine from verified entities                            |
| `Municipal_Corporations.csv` |        29 | Structural baseline; contacts, websites and ward directories pending             |
| `Municipal_Councils.csv`     |       115 | Incomplete structural baseline; contacts pending                                 |
| `Nagar_Panchayats.csv`       |        46 | Incomplete structural baseline; contacts and classification verification pending |
| `Officer_Roles.csv`          |        23 | Durable global role candidates with missing row-level provenance                 |
| `Offices.csv`                |        38 | Structural baseline; only the State EOC has actionable contact fields            |
| `Reference_Links.csv`        |        16 | Source catalog; not directly linked to every source row                          |
| `State_Overview.csv`         |         1 | Maharashtra structural summary                                                   |
| `Talukas.csv`                |       359 | Parent relationships present; all LGD codes pending                              |
| `Utilities.csv`              |        10 | Nine named agencies and one unverified generic city-utility template             |
| `Villages.csv`               |        23 | Template rows only; quarantine from verified entities                            |
| `Wards.csv`                  |        70 | Synthetic placeholder wards; no verified boundary or contact                     |

Physical CSV validation found consistent row widths, no blank data rows, no exact duplicate data rows, no control or NUL characters and no leading/trailing cell whitespace. Semantic validation is still mandatory because missing values are generally represented by phrases rather than empty fields.

## Validation Rules

### Structural validation

- require the complete expected file manifest;
- record and verify the SHA-256 checksum before parsing;
- decode UTF-8 with an optional BOM and require comma-delimited records;
- treat row 2 as the header for data sheets;
- reject malformed row widths and unexpected columns;
- reject empty primary labels, invalid dates and invalid URL syntax where a URL is required;
- retain original row number, file name and raw values for every result.

### Identifier and hierarchy validation

- accept official LGD codes only when syntactically valid and source-verified;
- convert LGD placeholder phrases to a normalized null while retaining their raw value;
- require district parents for talukas and local bodies, and taluka parents for rural children;
- scope natural names by parent jurisdiction because names are not globally unique;
- use a join table for authorities that span multiple districts;
- resolve name differences through a reviewed manifest-pinned alias/crosswalk, never by editing source text.

The audited source contains six taluka names repeated across different districts: Ashti, Kalamb, Karanja, Karjat, Khed and Malegaon. The municipal-council name Karjat appears in both Ahilyanagar and Raigad. These are not duplicate records, but they make name-only unique constraints unsafe.

### Placeholder and verification validation

Values such as `To be extracted`, `To be verified`, `pending`, `Needs official LGD code`, `Template seed`, `Seed placeholder for Phase 2`, `District portal` and `Official portal` are not contacts, identifiers, people or source URLs. The importer must classify them explicitly and must not rely on database nullability to detect them.

A record stays quarantined or unverified when any identity-defining value is a placeholder, its parent cannot be resolved, its official identifier conflicts, or its source is insufficient for the claimed verification level. Raw source status must be preserved separately from the normalized verification decision.

### Relationship and routing validation

- split no free-text department, role, escalation, jurisdiction or ownership expression automatically into trusted foreign keys;
- require reviewed crosswalks from source labels to catalog identifiers;
- preserve unmatched tokens for remediation;
- keep routing references non-operational even when the source status says `Active`;
- reject overlapping effective versions for the same boundary scope, assignment key or routing-reference code.

Only 6 of 18 routing department strings exactly match a department name. Exact role matching is 1 of 18 for first recipients, 2 of 18 for first escalation and 0 of 18 for second escalation. Every routing row notes that official department/local-body mapping is still required.

### Contact and officer validation

- validate phone and email syntax only after removing recognized placeholder values;
- model alternate emergency numbers separately rather than storing a slash-delimited contact as one telephone number;
- preserve source-backed verification and dates separately from contact syntax, and flag generic/non-record-specific evidence for review;
- require a real person name, durable role, authority scope, effective period and official source before creating a verified officer assignment, plus an office when one is applicable and verified;
- never interpret `Office-based routing`, `Each District Collectorate` or `Each Zilla Parishad` as a person.

The current officer file provides zero verified named people. Phase 2 therefore creates no verified officers or assignments from that source.

### Geometry validation

- require `MultiPolygon` geometry with SRID 4326;
- reject invalid, empty or longitude/latitude-out-of-range geometry;
- preserve a reference-source link, source version and last-verified date with each boundary revision;
- prevent overlapping current boundary versions for the same jurisdiction;
- build spatial indexes only on normalized geometry columns.

The current source contains no coordinates, WKT, GeoJSON or other polygon payload. Because boundary geometry is required for a version row, the baseline creates no boundary version until a separate official geometry source is reviewed.

## Import Flow

1. Load the versioned manifest and require every pinned workbook/CSV path, title, header and SHA-256 digest.
2. Parse each CSV without changing it and retain file name, source row, raw values and record hash.
3. Validate malformed widths, required values, dates, URLs, placeholders, duplicate composite keys and cross-file parents.
4. Classify source records with `accepted`, `accepted_with_warnings` or `rejected` validation status and `normalized`, `placeholder_preserved` or `reference_only` disposition.
5. Build the deterministic baseline model only when there are zero errors. Validation failure leaves every existing generated artifact unchanged.
6. Atomically render the machine report, main generated seed and checksum companion. Stable IDs and explicit conflict checks make the pinned output repeatable.
7. During `supabase db reset`, load raw evidence and normalized records in one transaction, mark the batch imported and then record the externally computed main-seed checksum through the companion seed.
8. Regenerate database types only after schema changes and run the governance artifact, migration, seed, RLS, spatial, temporal and checksum tests.

The current report includes aggregate accepted/warning/quarantine counts, a disposition and record count for each source file, and file/row diagnostics. It does not yet produce a complete accepted/unverified/quarantined/rejected matrix per file; that reporting enhancement is tracked. A zero process exit code means the pinned validation policy was satisfied, not that every row became a verified entity.

Use the commands according to intent:

```bash
# Read-only validation; writes no artifacts.
pnpm governance:data:validate

# Intentionally regenerate report and both seed artifacts after reviewed manifest/source change.
pnpm governance:data:generate

# Ordinary development and CI drift check.
pnpm governance:data:check
```

Generated artifacts are `docs/worklogs/phase-2-maharashtra-governance/data-validation.json`, `supabase/seed/20_phase_2_governance.generated.sql` and `supabase/seed/21_phase_2_governance_checksum.generated.sql`. Never hand-edit them.

## Maharashtra Batch 0 Source-Bundle Intake

`resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip` is an immutable enrichment
bundle, not a replacement for the canonical Phase 2 CSVs/workbook. Its pinned manifest and
validation report live under `resources/governance/manifests/`. The generator validates safe ZIP
paths, bounded expansion, all 28 members, 27 internal member hashes, 22 CSV schemas, exact row
counts/keys, duplicate rows, non-routable hierarchy flags, canonical district reconciliation, and
transient-query redaction.

The bundle contains 160 CSV records: 38 source observations, 17 conflicting observations, one
state, 36 districts, 21 open issues, 23 refresh-plan entries, and 24 supplied validation entries.
Every operational entity CSV is header-only, and the boundary GeoJSON has zero features. The PMC
CARE PDF is retained only as stale 2016 evidence. Consequently, the generated seed:

- records the ZIP plus all members and all 160 rows in the immutable import ledger;
- catalogs 38 canonical official-source URLs without activating synchronization endpoints;
- adds LGD `27` to the existing Maharashtra state and LGD codes to 35 exact existing district
  matches, aborting on any non-null conflict;
- retains `Mumbai`/LGD `482` as reference-only until an attributed `Mumbai City` crosswalk exists;
- creates or activates no local body, ward, boundary, department, office, role, officer,
  assignment, contact, utility, emergency contact, asset, routing rule, public projection, or
  external delivery.

Four rows contained an ephemeral CSRF query value. Generated JSON/SQL uses the canonical URL,
records `SENSITIVE_QUERY_REDACTED`, and retains the SHA-256 of the original pre-redaction row. Do not
copy the transient query value into a source endpoint, report, log, or review note.

Use:

```bash
pnpm governance:mh:batch0:generate
pnpm governance:mh:batch0:check
```

Generated local-reset seeds are `supabase/seed/60_maharashtra_batch0_governance.generated.sql` and
`61_maharashtra_batch0_governance_checksum.generated.sql`. Existing hosted targets use the three
ordered, generated files in `supabase/deploy/maharashtra-batch0/`; they require the canonical Phase
2 seed and schema through migration `20260718100000`. A successful import is not routing approval.

## Promotion Criteria

The following are operator review criteria for promoting a quarantined or unverified record. PostgreSQL enforces lifecycle, placeholder, provenance-presence, geometry, temporal and routing-eligibility invariants, but it cannot determine whether a generic government page is sufficiently record-specific or whether an external identifier is the current official LGD value.

A reviewed promotion should supply:

- a resolvable, verified parent hierarchy;
- the official identifier when the entity type is expected to have one;
- a record-specific official source URL or documented authoritative dataset;
- an explicit verification status and last-verified date;
- non-placeholder identity fields;
- valid, source-backed contact values when contacts are promoted;
- valid SRID 4326 geometry when a boundary is promoted;
- a real named incumbent, durable role, authority and validity period for officer assignments, plus the applicable office where one is verified;
- explicit normalized department, role, utility, ownership and authority mappings for routing references.

Phase 2 promotion never makes a complaint-routing reference operational. Operational routing requires Phase 3 behavior and tests.

## Phase 3 Engineering Overlay

The routing schema and engine consume normalized database records, never the CSV files directly at
request time. `supabase/seed/30_phase_3_pilot_categories.sql` links the 12 owner-approved taxonomy
labels to available bootstrap routing-reference evidence where possible, but keeps the domain,
categories, and one `Blocked drain`/`Storm-water blockage` alias draft, unverified, and non-routable.
It does not alter the canonical CSV, promote its `Active` text, or create an operational mapping.

Pune Municipal Corporation is the Phase 3 architecture and test reference. No Pune-specific logic
is present in the engine, and the current bootstrap does not provide the verified Pune polygons,
department/role crosswalks, assignments, asset ownership, confidence policy, or fallback rules
needed for an operational route. Synthetic test records do not change that data-readiness state.

The canonical `Wards.csv` records for Pune and Brihanmumbai remain immutable placeholder evidence.
The selected pilot direction is Pune's current official numeric wards `1`–`5` and BMC's official
administrative wards `A`–`E`, after authoritative identifiers and geometry are reviewed. Do not
rename or promote `PUNE-W01`–`PUNE-W05` or ordinal-map `BRIH-W01`–`BRIH-W05` to the BMC letters.
Preserve those rows and the V1 scope seed as audit history; publish reviewed canonical records and a
new scope version when official evidence is available.

### Legacy pre-V1 BMC Demo Overlay

The read-only Maharashtra baseline is not rewritten to make Mumbai operational. The separate
`resources/governance/csv/mumbai_bmc_demo_bootstrap_v1/` dataset, workbook, manifest, validation
report, and official legacy-ward GeoJSON preserve their own provenance and warnings. Generated
BMC governance/routing artifacts create separate source-backed operational records and retain the
canonical numeric placeholders as audit history.

For an existing non-production project that has not yet applied the V1 ward facade or prune,
`supabase/deploy/bmc-mobile-demo/` packages the
reviewed subset into four transaction-atomic SQL Editor files: baseline categories/core, official
boundaries, ward/governance crosswalk, and routing activation/verification. Run them in that exact
order. The bundle exposes 12 categories but activates only garbage dump, missed sweeping, and
mosquito breeding across 22 one-to-one wards. K/S, K/N, P/E, P/W, the other nine categories, and
automatic external delivery remain fail closed. All nine canonical BMC routing-reference rows
require asset ownership evidence. The bundle must never be used to claim official BMC-system
submission or to promote the canonical Maharashtra placeholders. Apply it only as a legacy
bootstrap before the current V1 ward-routing artifact; never replay it after migration 47 or 50.

`resources/governance/manifests/bmc-routing-asset-sources.v1.json` is the network-free discovery
contract for those nine categories. It pins only official MCGM ArcGIS metadata for road, storm-water,
sewer/manhole, water-pipeline, streetlight, building, tree, and related right-of-way candidates. It
does not contain feature data and does not approve a source registration, retrieval schedule,
stable identifier, ownership match, publication, routing activation, or external delivery. Validate
it with `pnpm governance:bmc:assets:validate`; immutable snapshots, bounded parsers, versioned asset
and ownership records, ward joins, entity matching, and human approval remain required before any
candidate can become routable.

### V1 BMC Ward-Contact Overlay

`resources/local_wellness_bmc_pmc_routing_2026-07-18.zip` is retained as an immutable research and
QA archive. Its source registry, conflict ledger, promotion recommendation, BMC/PMC contact matrix,
and two evidence PDFs explicitly recommend zero automatic promotions. It is not an input to the V1
generator and must not activate a route. The later operator-supplied contact archives below are the
only machine inputs for the current simplified BMC overlay.

The V1 overlay has two immutable, operator-supplied inputs; neither replaces the Phase 2 canonical
CSV/workbook:

- `resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` is the machine input for category coverage,
  primary/secondary phone, `1916`, WhatsApp, durable role and issue-source provenance; and
- `resources/local_wellness_bmc_ward_directory_2026-07-20.zip` is the machine input for ward-email,
  ward-office and email-source provenance.

The first archive's three CSV members must reconcile to 26 unique wards, 12 categories and 312
unique ward/category rows. The email source must resolve one mailbox for each operational ward:
direct K/N and P/E entries win, K/S maps to the K/E parent-office record, and P/W maps to the P/N
parent-office record. Only then may `supabase/seed/54_bmc_v1_ward_issue_contacts.generated.sql` be
emitted. The generator preserves both archive SHA-256 values, source URLs/dates, deterministic
record locators and raw source-reported verification status; it never rewrites either ZIP.

The generated matrix is private operational staging configuration for the simplified facade. The
owner's separate staging approval permits all 312 rows to route and queue email even where the raw
source reports a conflict or a non-promoted state; it does not rewrite that raw status, update the
retired review-gated synchronization history, prove recipient acceptance, or authorize production
delivery. Email, phone and WhatsApp remain private, and phone/WhatsApp are reference-only in V1.
A future replacement for scheduled source review requires a new ADR and migration.

### JagrukSetu BMC Intake V1 Overlay

The complete citizen taxonomy is classified by a separate versioned overlay under
`resources/governance/csv/jagruksetu_bmc_intake_v1/`. These files do not replace or rewrite the
canonical Phase 2 CSV/workbook or either immutable ward-contact ZIP:

- `Source_Registry.csv` pins the seven official public sources used by protected handoffs; and
- `Protected_Handoff_Actions.csv` defines the approved digits-only call and credential-free HTTPS
  browser actions.

`scripts/generate-jagruksetu-bmc-intake.mjs` joins that overlay with
`resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md`, preserves the 13 specialised mappings, assigns 243
public/restricted leaves to one general ward profile and assigns 84 private/emergency-private
leaves to protected handoffs. It generates a 340-row worklist, import-ready JSON, validation
report, hash-pinned manifests, seed 56 and the exact SQL Editor deployment. Use:

```bash
pnpm governance:jagruksetu:intake:generate
pnpm governance:jagruksetu:intake:check
```

The generated seed copies each ward's existing owner-approved email/provenance into exactly one
general profile, increasing the private contact matrix from 312 to 338 rows. It never emits a
recipient email into generated client data. Protected actions remain distinct from the ward-email
matrix and never create ordinary complaints.

After review, treat both overlay CSVs and generated manifests as versioned inputs: make changes
through a new reviewed dataset version and regenerate; do not hand-edit generated outputs.

## Refresh Process

The following remains the required offline operator workflow for a replacement repository bundle;
it is not a capability of the current baseline generator. The committed command reproduces only
the pinned baseline and does not diff replacement bundles or close temporal versions automatically
(`DATA-008`). The former scheduled synchronization foundation is retired for V1 under ADR-0031;
`docs/governance-synchronization.md` is historical design context only.

1. Add the reviewed replacement source bundle without editing the previous canonical files in place.
2. Record source origin, retrieval date and expected version outside sensitive configuration.
3. Run validation and compare file checksums, row counts, additions, removals, parent changes and verification-status changes with the previous accepted batch.
4. Review destructive-looking deltas, identifier reuse, hierarchy changes and newly verified contacts manually.
5. Implement and review an additive delta artifact or migration, then apply it in a transaction. Append versioned records and close old validity periods using UTC timestamps.
6. Retain the previous import batch, raw rows and normalized historical versions.
7. Regenerate types only if schema changed; data-only refreshes do not require a schema migration.
8. Run the complete governance migration, seed, RLS and routing-data test set before promoting the batch outside development.

## Current Data Gaps and Import Risks

- The requested `seed_data_for_mh` directory is absent.
- Districts and urban local bodies have no LGD-code column; all 359 taluka, 71 gram-panchayat and 23 village LGD values are placeholders.
- The source claims a statewide count of 424 urban local bodies, while the three supplied urban-body tables contain 190 rows. It explicitly describes council and nagar-panchayat coverage as a baseline rather than complete coverage.
- All gram-panchayat and village rows are templates rather than named entities.
- All 70 ward rows are placeholders, cover only five synthetic wards for each of 14 corporations, and contain no geometry.
- Five ward rows use `Vasai-Virar City Municipal Corporation`, while the corporation table uses `Vasai-Virar Municipal Corporation`.
- Brihanmumbai records encode `Mumbai City / Mumbai Suburban` in one source field.
- Most contacts are extraction placeholders. Generic list or portal URLs are not record-specific verification.
- Departments and officer roles have no row-level source URL, verification status or last-verified date.
- Utilities have no verification status or last-verified date; the generic city-water/sewer row has no URL source.
- Complaint-routing priorities and ownership rules are free text, and catalog references are mostly non-exact.
- There are no verified named officer assignments and no usable jurisdiction polygons.
- Pune Municipal Corporation has no verified pilot ward geometry, operational category ownership,
  asset-owner mapping, current assignment set, confidence policy, or fallback route in the current
  bootstrap.
- The BMC overlay has no reviewed asset/ownership import for potholes, blocked drains, sewage
  overflows, water leaks, broken streetlights, open manholes, illegal construction, encroachment,
  or fallen trees. Its official layer manifest is discovery metadata only. The V1 general ward
  profile intentionally uses coarse location-only intake; it is not evidence of a precise
  department, asset owner or official external filing. Replace individual general mappings only
  after reviewed municipality-specific ownership data exists.
- The canonical BMC numeric placeholders and Pune's current numeric wards `1`–`5` still lack an
  approved identity/boundary promotion. The separate BMC overlay supplies source-backed operational
  ward identities and legacy geometry without promoting those placeholders; split K/P child
  geometry and the remaining category/ownership evidence are still incomplete.

These gaps are expected inputs to quarantine and later refresh work. They must not be hidden by marking the corresponding records verified.
