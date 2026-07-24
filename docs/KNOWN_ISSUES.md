# KNOWN_ISSUES.md

## Open Issues

### UI-001 — Benchmark surface completion and rendered accessibility QA remain open

- Severity: Medium before presenting the full citizen experience as complete
- Status: Core mobile benchmark/localisation implementation complete; rendered/device QA and web
  parity pending
- Discovered: 2026-07-20

The compact token-driven mobile shell, complete core English/Marathi/Hindi catalogue, one-page
autosaving report, automatic location/recovery policy, authenticated profile/greeting Home,
detached navigation capsule, virtualized Community lists, lazy Heat mode, and sanitized civic-office
directory contract are implemented locally. The remaining benchmark inventory is not yet a claim
of release quality: reusable web primitives/stories, authenticated web capture, rendered
keyboard/screen-reader tests, physical-device permission/evidence tests, long-list performance
profiling, and in-app browser/dialler/mail screenshots remain open. Existing decisions continue to
keep public comments, guest reporting, external map tiles, saved postal addresses, notification
providers, and unverified government contacts unavailable or explicitly labelled as such.

### DB-002 — Compact V1 schema is locally verified but not applied to hosted Supabase

- Severity: Medium until hosted reconciliation
- Status: Local migration complete; hosted operator rollout pending
- Discovered: 2026-07-23

Migration `20260723110000_prune_deferred_v1_subsystems.sql` physically removes fourteen
never-deployed governance synchronization/versioned-contact tables and the unused
`complaints.complaint_comments` table. At that migration boundary, a clean reset and the complete
pgTAP run pass all 46 files and 1,550 tests, database lint passes, and the application-owned table
count is 114 instead of 129. The later protected-handoff registry brings the current local count to 115. The active complaint, Community, government workflow and ward-email paths remain covered.

Hosted Supabase has not been changed. Before applying the migration, take an operator-controlled
backup, stop any external synchronization caller, confirm there is no active synchronization
lease, confirm `complaints.complaint_comments` is empty, and confirm the 312-row owner-approved
26-ward-by-12-category replacement matrix is present before pruning populated legacy governance
records. Unknown hosted-only dependencies intentionally abort because the migration does not use
`CASCADE`. After applying the ordinary forward migration, verify the 114-table inventory and run
complaint/Community/government/email smoke tests. Do not interpret this reduction as a high-CPU
fix: earlier evidence identifies request volume and polling/fan-out, not table count, as the
performance concern. On a target that also receives the intake migration, verify 115 rather than
114 application-owned tables.

Any later physical reduction must be staged behind an approved replacement, required data
backfill, compatibility period, cutover/rollback plan and full regression evidence. Complaint
history, authorization/audit evidence and active delivery state are out of scope for destructive
count reduction.

### SLA-001 — Operational calendars, targets, and escalation rules are not approved

- Severity: High before automatic SLA enforcement is activated
- Status: Engineering complete; operational policy/data/deployment pending
- Discovered: 2026-07-16

Phase 9 implements reviewed effective-dated calendars, policies, category overrides, materialized
clocks, external-dependency pauses, escalation rules/events, PostgreSQL-leased work, and
scope-authorized reads. It deliberately seeds no active target or escalation chain. Before pilot
activation, owners must approve official Pune business hours/holidays, acknowledgement/inspection/
resolution targets, completion states, pause behavior, category overrides, escalation delays,
actions, and verified target roles. The two migrations, trusted worker settings, monitoring,
runbooks, and rollback-isolated staging smoke must then be deployed and reviewed. Missing or
ambiguous policy continues to fail closed and must not be replaced with demo values.

### SLA-002 — Existing-complaint adoption and sustained lease behavior need an approved rollout

- Severity: Medium before migrating an environment with live complaint history
- Status: Open rollout and load-validation task
- Discovered: 2026-07-16

New routing assignments and later complaint cycles initialize immutable SLA evidence. Complaints
and assignments that predate the Phase 9 migration are intentionally not given fabricated clocks;
they report `not_materialized` until an explicit reviewed adoption/backfill policy exists. Decide
whether historical cases remain excluded or receive an audited prospective clock anchored to a
defined event. Also load-test bounded sequential batches against the configured lease durations and
add lease renewal or smaller batch guidance if a run can outlive its lease. Idempotent execution and
expired-lease recovery prevent duplicate evidence, but they do not replace operational sizing.

### KPI-001 — KPI scheduling, retention, and managed-scale validation remain

- Severity: Medium before organizational KPI reporting is represented as current
- Status: Engineering complete; operations and policy pending
- Discovered: 2026-07-16

Phase 9 stores versioned definitions and immutable municipality/ward/department snapshots with
cutoff, window, numerator, denominator, exclusions, segmentation, algorithm version, and input
fingerprint. No managed schedule, approved reporting cadence/window, retention policy, late-data
correction process, freshness alert, or production-volume benchmark exists yet. Configure
Supabase/PostgreSQL scheduling, supervise the trusted worker, define stale/failed-run behavior, and
validate query/API bounds before presenting snapshots as an operational dashboard. Individual-
officer rankings remain intentionally unsupported.

### TRANSPARENCY-001 — Public visibility and coordinate-generalization policy is not approved

- Severity: High before any complaint becomes public
- Status: Open product, privacy, moderation, and retention decision; Phase 8 engineering fails closed
- Discovered: 2026-07-16

Phase 8 requires explicit policy values for eligible categories/statuses, sensitive-category
handling, minimum coordinate generalization, minimum hotspot cohort size, public-summary rules,
publication/revocation authority, processed-media moderation, duplicate-group visibility, retention,
and abuse response. None are approved operational values. The implementation must therefore store
effective-dated reviewed policies, seed no active policy, publish no complaint automatically, and
return an empty public dataset until an authorized review creates a compliant projection. Private
complaints, exact coordinates, citizen identity, original media, private evidence, internal notes,
and unmoderated text must never be used as the public read model.

### TRANSPARENCY-002 — External basemap provider and outbound-coordinate policy are unresolved

- Severity: Medium for the full interactive map experience
- Status: Open provider, billing, key-management, and privacy decision
- Discovered: 2026-07-16

The repository has no approved map provider, API key/billing arrangement, domain or application
restrictions, tile-retention terms, accessibility baseline, or decision on whether even generalized
coordinates may leave Local Wellness infrastructure. Phase 8 may implement provider-neutral spatial
contracts, server-side PostGIS queries, an accessible list, and a first-party coordinate plot that
makes no external requests. Selecting MapLibre/Google or loading third-party tiles remains blocked
until the owner records the provider and privacy decision. This extends the government-dashboard
constraint tracked by `GOVDASH-001` rather than weakening it.

### RESOLUTION-001 — Operational resolution and reopening policy values are not approved

- Severity: High before citizen reopening is activated
- Status: Open product-policy input; Phase 7 engineering fails closed
- Discovered: 2026-07-16

The approved roadmap requires citizen confirmation, four feedback ratings, reopening within policy,
and repeated-reopen escalation, but it does not define the rating scale, reopen window and anchor,
eligible statuses, attempt limit, evidence requirement, repeat threshold, escalation destination, or
no-response closure behavior. A supplementary design note gives examples only; it is not an approved
operational policy.

Phase 7 implements effective-dated, review-attributed policy storage and exercises it with
rollback-isolated synthetic fixtures. It seeds no active operational policy and rejects
feedback/reopen mutations when no single current approved policy matches. Before pilot activation,
the owner must approve the policy values and privacy/retention rules for feedback text and additional
evidence, then publish them through an auditable database change. Clients must read the resolved
policy context and must not hardcode fallback values.

### RESOLUTION-002 — Government follow-up evidence review and current work-reference options are incomplete

- Severity: Medium before an operational government pilot
- Status: Open Phase 7 follow-up; database authorization remains fail closed
- Discovered: 2026-07-16

The access-scoped government accountability response exposes private evidence metadata and counts,
but the dashboard has no current-assignment-authorized signed-read flow for citizen before/reopen
evidence. The existing Phase 5 resolution-evidence access helper is not wired into the dashboard and
does not cover those citizen evidence relationships. In addition, complaint detail returns historical
work references after a transfer, so the resolution form can offer an earlier-assignment reference
that PostgreSQL correctly rejects.

Before an operational pilot, add a bounded current-scope evidence locator/read action for the exact
complaint/evidence relationship and expose only work references eligible for the current assignment.
Keep Storage private, force downloads, reauthorize every request, and add scope-transfer, unrelated-
evidence, expiry, and current-reference tests. Do not weaken the existing database rejection to make
the current UI options succeed.

### DATA-001 — Canonical CSV path and export shape differ from the requested import layout

- Severity: Medium
- Status: Mitigated — importer pins and validates the available layout; source-package mismatch remains
- Discovered: 2026-07-13

The requested `resources/governance/csv/seed_data_for_mh/` directory is absent. All 18 canonical CSV files are currently stored directly under `resources/governance/csv/`. Every data CSV is UTF-8 with a BOM and uses a workbook-title row at row 1 followed by the actual header at row 2; `README.csv` is metadata rather than a relational table.

The Phase 2 importer now validates this layout explicitly, skips title rows intentionally, and fails clearly if the canonical path, title, headers, row widths, or hashes change. It does not relocate, rewrite, or silently normalize the source files. A future source delivery should still use the documented nested path or intentionally version the manifest path.

### DATA-002 — Maharashtra identifiers and local-government coverage are incomplete

- Severity: High for verified routing
- Status: Open data acquisition task
- Discovered: 2026-07-13

The dataset has no explicit LGD identifier for districts, local bodies, or wards. All 359 taluka rows contain `Needs official LGD code`; all 71 Gram Panchayat rows and all 23 village rows are template records with pending identifiers. The 190 listed urban local bodies are an acknowledged baseline rather than the stated statewide total of 424.

Natural names must remain scoped by their parent jurisdiction until official identifiers are available. Template Gram Panchayat and village rows must not be treated as real entities or verified coverage.

### DATA-003 — Ward, officer, office, and local-body contact records are placeholders

- Severity: High before pilot activation
- Status: Open verification task
- Discovered: 2026-07-13

All 70 ward rows are synthetic five-ward placeholders for 14 corporations and have pending zone, contact, and GIS fields. All corporation, municipal-council, and nagar-panchayat phone/email fields are extraction placeholders. The `Current_Officers.csv` file contains zero named people: its four `Officer Name` values are office/role descriptions or explicit incumbent placeholders.

The owner has selected BMC administrative wards A, B, C, D, and E plus Pune's officially current
numeric ward model for the pilot. That decision does not verify the canonical bootstrap rows. The
existing `BRIH-W01`–`BRIH-W05` and `PUNE-W01`–`PUNE-W05` targets remain draft, unverified,
non-routable placeholders. BMC's canonical rows must never be interpreted ordinally as A–E; the
original draft synchronization scope still needs a versioned official replacement. Pune rows may
be promoted only if official evidence proves their exact current identity, otherwise new official
rows must supersede them.

The optional BMC staging pack now creates separate source-backed operational ward, office, role,
officer, assignment, and contact records without promoting the five numeric placeholder rows. It is
eligible for the optional internal demo queue only when the generated four-part BMC SQL Editor
bundle is applied in order. The routing data covers three asset-independent categories across 22
exact one-to-one wards; a hosted read audit found none of those tested BMC jurisdiction rows on the
replacement target. External production delivery remains false. Pune and the rest of the canonical
placeholder corpus remain unresolved under this issue.

Phase 2 must not create verified officers or assignments from those labels. Placeholder rows may be retained only with an explicit placeholder/unverified state and raw-source provenance. Production-facing officer names and contacts require record-specific official verification.

### DATA-004 — No jurisdiction geometry is available

- Severity: High for the Phase 2 real-coordinate exit criterion
- Status: Open — external verified GIS input required
- Discovered: 2026-07-13

The canonical CSV corpus contains no coordinates, WKT, GeoJSON, or boundary files. PostGIS storage, versioning, indexes, and synthetic spatial tests can be completed safely, but no real Maharashtra coordinate can resolve to a verified municipality and ward until official pilot polygons are supplied and reviewed.

The optional BMC pack now includes official legacy administrative-ward GeoJSON and versioned
crosswalks. Twenty-two operational wards have one-to-one internal demo routing for three
asset-independent categories; split K and P units retain parent geometry and fail closed until child
geometry or an approved address/PIN crosswalk exists. This does not provide Pune or statewide
geometry. A credential-safe hosted read audit found no tested BMC jurisdiction rows, so the
four-part deployment bundle is not recorded as active in managed staging.

### DATA-005 — Cross-file names and routing labels are not normalized

- Severity: High for operational routing
- Status: Open data-mapping task
- Discovered: 2026-07-13

Five ward rows refer to `Vasai-Virar City Municipal Corporation`, while the corporation table uses `Vasai-Virar Municipal Corporation`. Brihanmumbai is represented by one slash-delimited two-district value and therefore requires a local-body-to-district join rather than one district foreign key. The canonical BMC A–E placeholder scope requires a versioned replacement using the separate official-source-backed operational records; no ordinal crosswalk from the five numeric placeholders is permitted. Pune's selected numeric model likewise requires an official effective-dated identity review.

The optional BMC pack now supplies those separate official lettered operational records and
versioned zone/boundary relationships; it never ordinal-maps `BRIH-W01`–`BRIH-W05`. The original
Maharashtra cross-file mismatches and Pune identity review remain open.

Only 6 of 18 routing primary department/agency labels exactly match a department row. Officer destinations are mostly composite free-text labels: only 1 of 18 first-recipient, 2 of 18 first-escalation, and 0 of 18 second-escalation values exactly match a durable officer role. All 18 routing notes state that official department/local-body mapping is required despite a source status of `Active`.

These records must remain non-routable references until an explicit, reviewed crosswalk resolves department, role, authority, utility, and asset ownership identifiers. The canonical CSV must not be silently corrected.

### DATA-006 — Provenance and verification metadata are inconsistent

- Severity: Medium
- Status: Open data-quality task
- Discovered: 2026-07-13

Row widths, dates, and declared source URLs are structurally valid, and no exact duplicate source rows were found. However, many URLs are generic home/list pages rather than record-specific evidence. Departments and officer roles have no source URL, verification state, or date; utilities lack verification dates/status and one uses `Municipal source required` instead of a URL; wards contain a text source reference but no URL; routing references have dates but no source URL or verification state.

Imports must preserve the original provenance fields, map missing evidence to an explicit unverified state, and prevent promotion to verified/public-safe data until record-specific evidence exists.

The baseline report now exposes a reconciled accepted/unverified/quarantined/rejected matrix for
every source file. Database and importer checks validate shapes and recognized formats; they cannot
establish that a syntactically valid contact or LGD value is the current official value. Thirteen
normalized emergency contacts inherit verified source status, several from generic official pages,
and require record-specific review before they are represented as fully verified pilot contact
evidence.

### DATA-007 — Workbook-to-CSV parity has not been independently verified

- Severity: Medium
- Status: Open validation gap
- Discovered: 2026-07-13

The user-designated Excel workbook exists and is preserved as the human reference copy. The approved spreadsheet artifact runtime was unavailable during the initial Phase 2 audit, so visual and cell-level workbook-to-CSV parity could not be checked without violating the repository session's spreadsheet tooling rules.

The CSV files remain the machine-readable source of truth. Add an approved workbook parity check when that runtime is available; until then, record both workbook and CSV checksums for refresh traceability.

### DATA-008 — Replacement-bundle delta refresh is not automated

- Severity: Medium
- Status: Open operator-tooling task
- Discovered: 2026-07-13

The committed governance generator intentionally reproduces the hash-pinned Phase 2 baseline and fails closed on source or artifact drift. It does not yet compare a replacement bundle with the accepted batch, close superseded temporal versions, or publish reviewed verification promotions.

Do not overwrite the current canonical bundle or use the baseline generator as an unreviewed in-place refresh. Before importing a replacement dataset, implement a reviewed delta workflow that reports additions, removals, hierarchy/identifier changes and version closures, then applies the accepted change through an additive seed/version artifact or migration.

### DATA-009 — Maharashtra Batch 0 is a hierarchy/source intake, not routing coverage

- Severity: High if the batch is mistaken for statewide operational data
- Status: Engineering intake complete; operational data and reviewed crosswalks still open
- Discovered: 2026-07-18

`resources/governance/local_wellness_maharashtra_batch0_2026-07-18.zip` is internally
hash-consistent and contains a useful official-source registry plus one Maharashtra state row and
36 district identity/code rows. It contains zero taluka, village, local-body, ward, boundary,
department, office, officer-role, officer, assignment, contact-version, utility, emergency-contact,
routing-reference, asset, or ownership records. Its GeoJSON is an empty FeatureCollection and its
only archived source document is a 2016 PMC CARE booklet that the batch itself correctly marks
stale and non-routable.

The batch also preserves 17 conflicting observations across six statewide local-government count
groups, five stale source observations, five unverified/inaccessible observations, and 21 explicit
data issues. Thirty-seven of 38 source-registry rows lack an archived content hash, so the registry
records URL/review evidence rather than immutable copies of those web pages. All sources lack an
explicit content-effective date. These facts must remain visible and cannot be converted into
verified current contacts, geometry, assignments, ownership, or routing.

Thirty-five district names match the existing canonical district registry exactly. The new LGD row
uses `Mumbai`, while the existing canonical entity uses `Mumbai City`; do not infer that crosswalk
or assign LGD code `482` until an official export/notification or attributed reviewer explicitly
confirms it. The safe seed may add source evidence and unambiguous non-routable identifiers only.
It must activate zero boundaries, routing rules, contacts, assignments, external delivery, or
public projections.

The deterministic Batch 0 pipeline now implements that safe boundary. It preserves all 160 CSV
rows across a 29-file import ledger, catalogs all 38 canonical source URLs, redacts four transient
CSRF-token observations from staged JSON while retaining their original row hashes, adds LGD `27`
to Maharashtra, and enriches 35 exact existing district matches. `Mumbai`/LGD `482` remains a
reference-only record with no normalized target. The generated seed, checksum companion, SQL Editor
deployment, generated database types, clean local reset, database lint, and 47-file pgTAP suite are
verified. Hosted Supabase was not changed.

Closing this issue still requires a reviewed Batch 1 with entity-level official local bodies,
talukas/villages, current ward identities and boundary versions, plus attributed resolution of the
six count discrepancies and the `Mumbai` alias. Batch 0 must not be used to activate statewide
routing or represent the 2016 PMC booklet as a current contact directory.

### GOVSYNC-001 — Governance synchronization is not yet production-operational

- Severity: High for sustained production routing accuracy
- Status: Deferred outside V1; undeployed prototype retired on 2026-07-23
- Discovered: 2026-07-13

The hash-pinned governance import pipeline remains, but the separate synchronization prototype was
never deployed, scheduled or used by an application runtime. V1 therefore removes its fourteen
source/run/snapshot/candidate/review/contact tables, Edge Function, draft seeds and the unused
`@local-wellness/database` governance-sync module. Governance import remains supported.

A future sustained source-refresh capability still needs source-specific parsers, canonical entity
matching, change detection, attributed review, transactional version publication, retention,
monitoring and conflict/disappearance policy. It must be proposed as a new architecture with a
replacement/backfill/cutover plan rather than restoring the retired prototype piecemeal. Automated
jobs must never rewrite the canonical CSV/workbook inputs or promote placeholder, conflicting,
stale or merely source-observed data.

### GOVSYNC-002 — Official-source fetches need DNS-resolution and rebinding enforcement

- Severity: High before activating remote sources
- Status: Deferred requirement for any future replacement synchronization runtime
- Discovered: 2026-07-14

The undeployed Edge fetcher and endpoint registry were removed from V1. If remote governance
retrieval is reintroduced, the replacement must enforce resolver-backed rejection of loopback,
private, link-local, reserved and rebound DNS answers at every redirect/connection boundary, plus
exact HTTPS host policy and deterministic IPv4/IPv6/CNAME/failure tests. No remote source polling
is active in the current V1 runtime.

### GOVSYNC-003 — Partial snapshot persistence needs orphan reconciliation

- Severity: Medium before scheduled retrieval
- Status: Deferred requirement for any future replacement snapshot store
- Discovered: 2026-07-14

The retired prototype no longer writes or references raw governance snapshots. Any replacement
snapshot store must ship with content-address validation, approved retention, late-commit-safe
orphan reconciliation, auditable quarantine/deletion and rollback behavior from its first rollout.
Do not reintroduce an object-first/database-second flow without that lifecycle.

### ROUTING-001 — Verified Pune pilot routing data is unavailable

- Severity: High for operational Phase 3 routing
- Status: Engineering implemented; data validation pending
- Discovered: 2026-07-13

The generic routing schema, PostGIS queries, deterministic evaluator, authenticated API contracts,
confidence/fallback behavior, and decision-audit boundary can be tested with rollback-isolated
synthetic verified fixtures. That engineering does not make the bootstrap production-routable.

Routing delivery readiness now also distinguishes a verified internal government queue from an
approved officer or governing-body complaint-intake contact. It never exposes contact values or
claims automatic outbound delivery. A valid verified department/role queue remains usable during
officer turnover, but no placeholder or discovered-only contact can become a recipient. Actual
email/SMS/contact delivery remains a separate future provider, privacy, retry, and audit decision.

Pune Municipal Corporation still requires reviewed municipality and selected-ward polygons,
current LGD identifiers where applicable, authority-department availability, durable officer roles,
current officer assignments where safely verified, asset types/assets/owners for asset-dependent
categories, operational category records, confidence-policy versions, route-rule versions, and
complete fallback paths. The 12 seeded categories are draft, unverified, and non-routable, and all
Phase 2 placeholder records remain excluded. Until those inputs pass record-specific official-source
review, a real Pune coordinate must not produce a production route.

The current V1 BMC overlay activates 13 operational profiles through a private 26-ward ×
13-profile contact matrix. It uses the stored PostGIS boundary/crosswalk evidence, a durable
municipal intake target and the existing auditable complaint assignment rather than requiring an
asset owner for the citizen-submission critical path. This is owner-approved staging coverage, not
a claim that every K/P child polygon or recipient is production-current. Exact child geometry,
hosted deployment/smoke and an outbound email provider remain open. Pune and statewide routing are
still unavailable.

The network-free `bmc-routing-asset-sources.v1` manifest now pins candidate official MCGM GIS layers
for roads, drains, sewer/manholes, water pipelines, streetlights, buildings, public right-of-way,
and trees. It is discovery evidence only: automatic retrieval, bulk import, verification,
publication, route activation, and external delivery are all explicitly prohibited until the
review-gated synchronization workflow completes. This limited BMC capability does not close the
Pune or statewide routing gap.

### TAXONOMY-001 — General ward intake still needs precise operational crosswalks

- Severity: Medium for routing precision; hosted activation remains a release gate
- Status: Coarse V1 coverage implemented locally; precise ownership data and hosted activation
  pending
- Discovered: 2026-07-23

The generated JagrukSetu taxonomy contains 17 primaries, 340 subcategories and 19 workflow types.
Thirteen leaves preserve the twelve specialised profiles and another 243 public/restricted leaves
use the coarse `general_ward_complaint` profile, so 256 leaves are internally submittable. This
meets the V1 intake requirement but does not prove the exact department, officer role, asset owner,
fallback or government system for those 243 leaves. Replace a general mapping only when reviewed
municipality-specific evidence is available.

All 84 private/emergency-private leaves, including all 20 Corruption, Bribery & Public Integrity
leaves, use official call/browser handoffs. A handoff is not a JagrukSetu complaint and does not
produce a ward email, Community record or receipt from the authority. More sensitive end-to-end
intake would require competent destinations, accused-chain exclusion, secure delivery,
confidentiality/whistleblower policy, evidence retention and access-audit controls.

Migration `20260724110000_v1_bmc_general_intake_and_handoffs.sql`, seed 56 and
`supabase/deploy/jagruksetu-bmc-intake-v1.sql` are locally verified but not applied to hosted
Supabase. After an operator deploys the matching taxonomy and intake artifacts, smoke specialised
and general submissions plus protected call/browser actions on a physical device.

### GOVDIR-001 — Verified governance directory has bounded BMC coverage only

- Severity: High for real Nearby governing-body results
- Status: BMC K/W path verified in staging; statewide data and ledger reconciliation pending
- Discovered: 2026-07-16

The authenticated NestJS endpoint, strict shared/mobile contracts, service-role-only PostGIS
projection, accuracy/ambiguity handling, placeholder/official-source gates, and migration/API/mobile
tests are implemented locally. Migration
`20260724120000_verified_civic_area_office_contacts.sql` adds a bounded optional office collection:
only active verified exact-ward or municipality-wide records with official HTTPS provenance and at
least one public address/phone/email field can appear. Internal IDs, geometry, officers, direct
mobiles, WhatsApp/routing recipients, routing evidence, and unpublished office data remain absent.
The matching SQL Editor artifact is not yet applied to hosted staging.

The earlier current-target audit found no tested BMC jurisdiction rows, but a later authenticated
hosted smoke resolved K/W Ward through the verified projection. Coverage remains bounded to the BMC
overlay: K/S, K/N, P/E, P/W, Pune, and statewide geometry are still incomplete, and the official
migration ledger still needs reconciliation. Unsupported output outside the reviewed geometry is
correct. Never use the master file as an upgrade, copy synthetic pgTAP fixtures into staging, or
hardcode Pune/BMC names to close this issue.

### COMPLAINT-001 — Transcription and media moderation providers are not configured

- Severity: Medium before public pilot
- Status: Engineering fallback complete; provider integration pending
- Discovered: 2026-07-14

Phase 4 records private voice evidence and explicit processing/moderation states, but no approved
speech-to-text or media-moderation provider has been selected. The mobile client therefore states
that transcription is unavailable, never invents text, and requires the citizen to type and confirm
the complaint description. Media remains pending rather than being represented as automatically
reviewed.

Select providers only after privacy, retention, regional processing, cost, failure, and deletion
requirements are approved. Implement processing without Redis or BullMQ, preserve the original
private evidence, require user confirmation of normalized text, and add retry/audit/provider-failure
coverage before claiming automatic transcription or moderation.

### COMPLAINT-002 — Complete complaint capture needs physical-device and hosted smoke tests

- Severity: High before pilot launch
- Status: Local engineering verified; device/environment validation pending
- Discovered: 2026-07-14

The mobile unit suites and Android Expo export pass, and database/API integration covers the secure
submission path with rollback-isolated verified fixtures. Complaint capture now uses one scrollable
form and exposes all locally knowable submit blockers instead of relying on six-screen ordering or
an unexplained disabled button. Profile camera/gallery selection and the verified civic-area lookup
have focused tests, but this environment had no connected physical device or in-app browser target.
Camera, video, microphone, foreground GPS, mock-location behavior, OS protected storage,
interrupted upload recovery, deep links, delivered email callbacks, and network transitions
therefore still require representative Android/iOS and managed-environment testing. The client can
display all non-placeholder catalog categories, but the canonical bootstrap still exposes zero
operational choices. The hosted target now returns the three bounded BMC categories and verified
K/W routing. Final complaint creation is separately blocked by the unapplied forward repair tracked
in `COMPLAINT-006`; that function drift does not justify activating placeholders or claiming
external submission.

General locality lookup no longer starts independent high-accuracy acquisitions in Community,
Nearby, and Profile. Those screens now share a five-minute, memory-only, at-most-100-metre
current-area fix with last-known reuse, single-flight acquisition, explicit-refresh bypass, and Auth
identity invalidation. The first relevant feature may request foreground permission automatically
once per process; denial requires explicit retry/settings and cannot loop on focus. Complaint issue
and media evidence continue to obtain fresh high-accuracy fixes and never reuse the current-area
cache.
The remaining device test must verify native cache/permission behavior, movement across a boundary,
background/resume expiry, absence of persisted coordinates, and fresh sequential evidence capture.

### COMPLAINT-003 — Expired private upload reservations need scheduled cleanup

- Severity: Medium before sustained public use
- Status: Open operational hardening task
- Discovered: 2026-07-14

Upload reservations expire and cannot be submitted after their lifecycle window, while failed
integrity checks remove the mismatched object immediately. A client that abandons an upload after
object transfer can still leave an expired reservation or orphaned private object. Phase 4 does not
yet run a cleanup scheduler.

Add an idempotent PostgreSQL/platform-scheduled cleanup operation that claims expired reservations,
removes only their exact private object locators, records the outcome, and tolerates missing objects.
Do not introduce Redis or BullMQ for this task.

### COMPLAINT-004 — Finalized draft attachments cannot be removed or replaced individually

- Severity: Medium for complaint-capture usability
- Status: Core private upload/submission complete; attachment lifecycle follow-up open
- Discovered: 2026-07-16

Citizens can capture, upload, finalize, and submit private evidence, or discard the entire draft.
The draft UI and API do not yet offer an authorized per-attachment remove/replace operation after
finalization. This does not weaken current private upload integrity or submission checks, but it can
force a citizen to discard otherwise valid draft work after capturing an unwanted item.

Add an idempotent owner/draft-scoped operation with revision/concurrency checks. It must reject
foreign, submitted, or already-linked evidence; remove only the exact server-owned private object;
retain a non-secret audit/lifecycle record; tolerate exact retries and missing objects; and keep
bucket/object paths out of responses/logs. Add mobile confirmation/error/retry behavior and
database/API/Storage tests. Do not grant direct client Storage deletion.

### COMPLAINT-005 — Original submitted complaint evidence has no citizen signed-read view

- Severity: Medium for citizen review and trust
- Status: Core private upload/submission complete; owner read surface open
- Discovered: 2026-07-16

Complaint detail currently returns safe media metadata/counts, but the citizen cannot request a
short-lived read target for their finalized original photo/video/voice evidence. Phase 7 has a
separate owner-authorized resolution/reopen-evidence read path; it must not be treated as permission
to expose original complaint media or object locators.

Add an authenticated owner-only endpoint that rechecks complaint/media ownership and finalized
state, resolves the private locator server-side, returns a short-lived non-cacheable signed target,
and logs only bounded identifiers. Add a mobile viewer/player with expiry/error/retry states and
cross-owner, unfinalized, missing-object, path/token leakage, and replay tests. Do not create a
public bucket, persistent URL, or direct Data API/Storage policy.

### COMPLAINT-006 — Hosted BMC complaint completion requires the additive submission repair

- Severity: High for the current staging demo
- Status: Fixed and verified locally; hosted SQL migration and smoke pending
- Discovered: 2026-07-18

An authenticated hosted report with valid K/W Ward location, the operational mosquito-breeding
category, 15.851 m non-mock GPS evidence, two finalized private media objects, duplicate evidence,
and exactly one verified route reached routing but returned `DEPENDENCY_UNAVAILABLE`. A clean hosted
reproduction found two independent causes: the API redundantly required local-body/ward boundary
entries to be duplicated in candidate explanation metadata even though jurisdiction provenance was
already verified separately with exact boundary-version equality, and the hosted complaint
completion function diverged at its exact routing-evidence gate.

The API now requires verified candidate hierarchy evidence while relying on the independently
verified jurisdiction plus exact boundary-version vector for boundary provenance. It does not
weaken entity, version, geometry, or routing checks. Forward migration
`20260718100000_complaint_routing_evidence_diagnostics.sql` installs an internal exact mismatch
classifier, a protected canonical V2 completion implementation, granular non-sensitive conflict
markers, and a service-role-only public delegate. A clean in-process API smoke against local
Supabase completed catalog, draft, GPS, duplicate, routing, and submission with `201`.

Hosted staging must still run the complete forward migration in **SQL Editor → New query**, then run
`supabase/deploy/diagnostics/bmc_submission_runtime_audit.sql` and retry the saved report. Do not
claim the managed issue resolved until the runtime audit passes and submission returns a complaint
receipt. If PostgREST alone reports `PGRST202` after the audit passes, use the guarded schema-cache
reload file once. No tolerance, placeholder promotion, direct client grant, or external BMC delivery
was introduced. The mobile client now rotates its submission identity after an allow-listed
pre-insert routing-evidence mismatch, so a stale reservation can be retried safely; ambiguous
network/dependency outcomes still do not rotate automatically.

### ENV-003 — Rendered application smoke test needs an in-app browser session

- Severity: Low
- Status: Open validation-environment follow-up
- Discovered: 2026-07-13

The citizen web and API started successfully during Phase 3 verification. Citizen `/` and
`/auth/login`, the expected API root 404 envelope, unauthenticated category rejection, and an
authenticated zero-operational-category response were verified over HTTP. The approved in-app
browser had no connected target, so viewport layout, interaction, and screenshot inspection could
not be completed.

Repeat the visual smoke test when the in-app browser is connected. This is not evidence of an
application runtime failure, and Phase 3 intentionally adds no routing UI.

The 2026-07-17 authentication refresh was verified with component/contract tests, production
builds, and HTTP route checks, but the in-app browser still exposed no controllable tab. Interactive
verification of account switching, first-time QR enrollment, returning TOTP challenge, named
official selection, and post-invitation redirects therefore remains open.

### ENV-004 — Citizen account data requires one aligned migrated environment

- Severity: Medium for local and hosted account testing
- Status: Code resolved; replacement-target schema/profile and browser/API validation pending
- Discovered: 2026-07-14

The citizen account route authenticates with Supabase and reads its profile through the NestJS API.
If the browser Auth client and API target different Supabase environments, the API is stopped, or
the selected database has not applied the Phase 1 profile trigger/migrations, a valid Auth session
cannot produce the expected `public.profiles` response. This was previously experienced as an empty
account surface.

The route now validates the API response and visibly distinguishes signed-in identity, onboarding,
profile provisioning/unavailability, and API failure, with retry and sign-out actions. Operators
must still configure the citizen web and API against the same fully migrated local or hosted
Supabase environment and complete delivered-link/SSR-cookie testing under `AUTH-005`/`ENV-002`.
A stale ignored `apps/citizen-web/.env.local` was found pointing Citizen Auth at a different project
than the root API environment. It was removed, and authentication-facing package scripts now load
the one root `.env` while preserving deployment-injected values. Regression tests cover file
loading, precedence, app-local-file rejection, and a missing local file; Turbo build inputs prevent
reuse of a bundle built for a different project.
The previous staging target contained the identity trigger/backfill migration, and a read-only
check confirmed its citizen Auth identity had an active profile and citizen role. That does not
prove the replacement target's state. Reconcile its migrations and verify the current citizen
profile/role, then establish a fresh browser session against its reachable API, before closing this
issue.

### GOVDASH-001 — Interactive complaint map needs a provider and coordinate-sharing policy

- Severity: Medium for the full Phase 5 map experience
- Status: Open product/privacy input
- Discovered: 2026-07-14

The access-scoped queue and complaint-detail workflow can be implemented without sending complaint
coordinates to a third party. A real interactive basemap cannot be selected safely until the owner
chooses a provider and records key/billing/domain restrictions plus whether exact or generalized
coordinates may leave Local Wellness infrastructure. Phase 5 therefore exposes no queue map points
and uses authorized textual location context on complaint detail; it must not add fake map tiles or
unreviewed outbound coordinate links.

### GOVDASH-002 — Resolution evidence needs scheduled object cleanup and full media processing

- Severity: High before a public pilot
- Status: Open provider/operations hardening task
- Discovered: 2026-07-14

Phase 5 keeps resolution evidence private, caps active unlinked reservations, validates workflow
version and expiry before download, verifies exact size and SHA-256 plus bounded JPEG/PNG/WebP/
HEIC/HEIF/MP4/QuickTime/WebM signatures, rejects MIME spoofing, and marks failed or elapsed
reservations terminal. Authorized reads are short-lived, non-cacheable, and forced to download.

Signature recognition is deliberately a narrow integrity gate, not full container/image decoding,
malware scanning, content moderation, or a guarantee that media is safe to open in another
application. Expired database reservations can be marked in bounded batches, but no scheduled job
yet deletes their exact private Storage objects or reconciles missing/orphan objects.

Before public operation, select and approve a privacy-compatible scanning/moderation approach,
enforce bounded concurrency and resource limits, add full decode/container validation, and deploy an
idempotent Supabase-scheduled cleanup process that deletes only server-owned object paths and audits
every result. Do not introduce Redis, BullMQ, or Sentry for this work.

### SEC-001 — Exposed environment credentials require rotation

- Severity: Critical
- Status: Mitigated for staging — replacement credentials confirmed; historical audit remains
- Discovered: 2026-07-11
- Affected systems: Supabase and Redis

The previously ignored `.env.example` contained live-looking privileged Supabase, database, and Redis credentials. The values were removed and replaced with safe, names-only placeholders during Phase 0.

The file is not tracked in the current Git index and has no entries in the currently available Git history. Pattern scans of the working source and current Git objects found no remaining matches. This does not establish that the credentials are safe because they were present in the working copy and may have been copied or exposed elsewhere.

On 2026-07-14 the owner confirmed that the active hosted target is a dedicated staging project and
that its Supabase privileged credential and database credential are newly generated replacements.
Those replacement values remain only in the untracked local environment and were sufficient for the
reviewed staging migration deployment. They are not the earlier values described above.

Remaining owner/security actions:

1. Confirm the replaced Supabase/database values are revoked if that was not part of generating the
   new credentials.
2. Revoke any legacy Redis token that still exists; Redis remains unused and deferred.
3. Review Supabase/legacy-provider audit or access logs for unexpected activity.
4. Run secret scanning against all local branches and the remote repository.
5. Move deployed-environment values into approved environment-specific secret managers; keep local
   replacements only in untracked environment files.

The confirmed replacement staging credentials may be used for non-production integration. No old
credential may be reused, and production remains separately gated.

### ENV-002 — Hosted identity environments require activation

- Severity: High for hosted integration; not blocking local Phase 1 completion
- Status: Current staging target and provider/application activation remain unverified
- Discovered: 2026-07-13

The owner has selected a replacement staging project, confirmed replacement credentials, and
reports loading a generated master SQL file. The exact artifact revision, migration ledger, seeds,
Auth identities, profiles, and privileged assignments were not independently verified because a
working database connection was unavailable. The successful 2026-07-14 deployment of 23 migrations
and six seeds applies to the previous staging target and is historical evidence only.

The first clean-bootstrap split failed on `public.profiles`, confirming that the current project
contains an earlier Local Wellness schema but not its cutoff. A later fixed Phase 9 assumption also
failed and was removed. The older SQL Editor parts contained a 42-migration history split 23/19 and
later a 43-migration 23/20 split; those are historical verification records. The current adaptive
source set covers all 54 migrations in a 23/31 split, fingerprints a coherent prefix, skips complete
migrations as units, and rejects partial or non-contiguous state. This avoids duplicate-object
replay without concealing security drift, but it still does not populate or repair the Supabase
migration ledger. Full post-run schema/ledger, seed, Auth, and role reconciliation remains required.

On 2026-07-16 the API liveness endpoint succeeded while readiness returned `503`/`PGRST202` for a
missing `public.api_readiness_check()`. A later credential-safe read audit found readiness healthy
and all five expected private Storage buckets present, so that symptom is resolved. The same audit
returned zero category projections and no tested BMC jurisdiction rows. This proves infrastructure
availability but not current migration-ledger reconciliation, pilot data, Auth/role state, or an
operational complaint/community demo.

A follow-up read-only RPC probe confirmed the Phase 10 privileged/citizen MFA functions are present,
while both `list_government_invitation_options` (migration 42) and
`list_public_complaint_engagements` (migration 43) return `PGRST202`. The exact status of migrations
38–41 is not proven through the exposed API. Therefore the small migration 43 delta must not be used
alone on this target. The 77,849-byte migrations 39–43 artifact remains a bounded historical bridge
when its migration-38 baseline preflight passes. After that bridge, reconcile all remaining
migrations through 51 and load generated taxonomy seed 55. Use the legacy BMC bootstrap only before
migrations 47 and 50 when its data
is genuinely absent; current targets use the V1 ward-routing artifact. SQL Editor execution still
does not repair the migration-history ledger.

The compact path is locally verified: an exact migration-38 database accepted migrations 39–43,
an immediate rerun skipped all five safely, and pgTAP plans 038, 039, 040, 042, and 044 passed 90
focused assertions. The owner reports successfully running that artifact through the staging SQL
Editor on 2026-07-17; independent schema/readiness/ledger verification remains pending.

The current target still needs fully reviewed SMS/email provider settings, exact redirects,
delivered code/link/invite behavior, rate limits, backup settings, managed secrets, and application
smoke tests. Separate development and production projects remain operator-managed inputs. Custom
email-template access is no longer required: the clients accept Supabase's default link templates
as well as delivered codes.

Before completing hosted identity activation:

- finish the historical security audit under `SEC-001` without reusing prior values;
- reconcile the current target against all 54 migrations through
  `20260724110000_v1_bmc_general_intake_and_handoffs.sql` and verify its
  seed/Auth/profile/role
  state before starting managed workers or treating privileged access as active;
- configure exact citizen, government, administrator, and installed-mobile callback allow-list
  entries; custom token/code templates are optional;
- configure and verify password recovery email and Indian SMS delivery;
- smoke-test citizen email/password signup/sign-in/recovery, confirmed-phone OTP delivery,
  privileged TOTP, redirects, SSR cookies, and effective government scope in the browser and
  installed mobile build;
- repeat migration/RLS smoke in development where used, and never promote to production without an
  independently reviewed production project/deployment.

The invitation and demo-role reconciliation completed on the previous staging target prove that
historical environment only. The current target now has a separately provisioned, verified,
time-bounded synthetic BMC matrix under ADR-0025; it does not transfer or validate any historical
official identity. Real officials must still enter through reviewed onboarding and must never be
inferred from an email address or Auth metadata.

### AUTH-001 — Existing-user assignment and role renewal are incomplete

- Severity: High for broader government onboarding
- Status: Open — newly discovered Phase 1 follow-up
- Discovered: 2026-07-13

The implemented endpoint securely invites a new government Auth user and creates one membership/role assignment. It intentionally returns a non-enumerating conflict for an existing email. There is no server workflow yet to promote an existing citizen, add another authority or role, revoke access, or renew an expired assignment.

Authorization stops at `effective_until`, but partial unique indexes use stored status. Without an explicit transition from `active` to `expired`, a time-expired row can block a replacement. Add audited expire/revoke/renew/assign operations and concurrency tests before onboarding existing or returning government users.

Phase 2 also retains any pre-governance arbitrary authority UUID as a non-routable placeholder for audit/history. Effective-access functions exclude those rows, but an operator workflow must explicitly map or revoke them before reactivating an existing government's access.

A one-time trusted staging transaction reconciled the demo privileges between already-confirmed
identities while retaining revoked rows and audit history. That environment operation does not
provide the missing application/API lifecycle and does not close this issue.

The ADR-0025 staging helper is likewise not the missing lifecycle. It creates only a fixed synthetic
account matrix, resolves bounded reviewed scopes, and preassigns expiring access through existing
trusted functions. It cannot promote an arbitrary existing citizen, add or replace general scopes,
renew normal officials, or perform application-level revocation. Those operations still require
the audited API/database lifecycle and concurrency handling described above.

### AUTH-002 — Privileged MFA needs managed enforcement and recovery validation

- Severity: High before pilot launch
- Status: Engineering implemented; managed activation and recovery validation pending
- Discovered: 2026-07-13

The government dashboard and admin console now show the exact current email, explain Auth/TOTP/
database authorization as separate gates, distinguish first-time QR enrollment from a returning
challenge, and provide sign-out/account-switch and reviewed recovery guidance. The API can enforce
`aal2` for privileged operations. Matching `observe` and `enforce` modes keep the local and staging
rollout from locking operators out before enrollment and recovery are proven.

Password entry for a pre-provisioned identity follows this same path and does not weaken the
remaining managed-enforcement or recovery work. Every synthetic staging identity used in a demo
still requires its own factor and an AAL2 validation smoke before privileged enforcement can be
claimed operational.

The 2026-07-18 staging enrollment failure was traced to Supabase's newline-terminated TOTP SVG data
URL being passed through Next Image, which rejects a source ending in a control character. The
local portals now trim the provider value, render it without image optimization, detect their own
unfinished unverified factors, and offer an explicit bounded restart. This resolves the known
rendering/retry defect; it does not complete the outstanding managed recovery or AAL2 browser smoke.

Keep privileged enforcement in observe mode until current administrators and government users can
enroll, a documented recovery procedure is rehearsed, exact hosted callbacks work, and both AAL1
rejection and AAL2 success are verified against the managed project. Client redirects remain a UX
aid; the API and database access boundary remain authoritative.

### AUTH-003 — Device revocation does not invalidate active sessions

- Severity: High before device-risk enforcement is relied upon
- Status: Open hardening task
- Discovered: 2026-07-13

Soft revocation atomically clears the push token, records an audit event and prevents the same installation identifier from silently re-registering. Phase 1 does not bind Supabase sessions to device rows or revoke an already-issued session. Add provider-side session revocation and device-bound authorization before presenting device revocation as forced logout.

### AUTH-004 — Identity append-path abuse quotas

- Severity: Medium
- Status: Resolved locally; managed concurrency/load validation remains a release check
- Discovered: 2026-07-13
- Resolved: 2026-07-16

Phase 10 adds atomic PostgreSQL-backed fixed-window quotas with privacy-safe subject hashes, bounded
cleanup, endpoint-specific limits, `429`/`Retry-After` behavior, and a ten-device active cap. Identity
audit, device, invitation, messaging, complaint, transparency, and privileged mutation paths have
focused database/API coverage. The managed environment still needs representative concurrency and
alert-threshold validation; no Redis counter was introduced.

### AUTH-010 — Citizen confirmed-phone OTP needs managed delivery and recovery validation

- Severity: High before pilot release
- Status: Hosted SQL applied and provider configured; hook behavior and installed-device validation
  pending
- Discovered: 2026-07-16

Mobile and API now fail closed unless the current Supabase Auth user has a non-empty phone and
`phone_confirmed_at`. Citizen sessions remain AAL1; Advanced Phone MFA and citizen AAL2 are not
required. Migration `20260723130000_citizen_phone_verification_without_mfa.sql` adds the
service-role-only confirmation check. Migration
`20260724100000_require_email_identity_for_auth_signup.sql` adds the Before User Created hook that
allows email-bearing users and rejects phone-only Auth user creation. The combined
`supabase/deploy/citizen-phone-verification-without-mfa.sql` is the complete SQL Editor
alternative. The current integrated migration-54 run passes all 50 pgTAP files/1,640 assertions,
database lint, generated types, master-SQL drift, and the five-case local Auth E2E. Hosted
migration/hook
application is not implied by those local results.

A read-only hosted check on 2026-07-24 confirmed the immediate staging mismatch: the ordinary
Phone provider is enabled, phone auto-confirmation is disabled and Twilio Verify is selected, but
`public.user_has_verified_phone(uuid)` returns `PGRST202` while the superseded MFA helper remains
available. All fifteen hosted Auth identities are email-bearing and none currently has a confirmed
phone. Every protected citizen API call therefore fails closed while trying to determine
verified-phone state. The SQL Editor artifact now reloads the PostgREST schema cache and returns
explicit installation/grant checks after it runs. A separate mobile `USER_UPDATED` race that could
replace the OTP code-entry screen with phone entry immediately after requesting a code is fixed and
regression-covered. The mobile client also no longer supplies the current SDK's deprecated
`processLock`; its fail-fast auto-refresh tick produced the observed zero-millisecond lock
warnings. Authoritative Auth follow-up remains deferred and stale work is cancelled. Neither
client repair could create the then-missing hosted function.

After the operator ran the combined SQL Editor artifact, a follow-up service-role probe on
2026-07-24 resolved `public.user_has_verified_phone(uuid)` successfully and returned `false` for
the affected citizen. The operator also reports activating the Before User Created hook. The
hosted RPC blocker is therefore resolved; the hook still needs a negative phone-only-signup test
before release.

The same read-only diagnostic attributed the affected user's `PUT /auth/v1/user` HTTP `401`
separately from the missing RPC. The affected hosted Auth user had only the `citizen` application
role and no active authority membership, but retained a verified TOTP factor from an earlier
Government Dashboard test. Supabase therefore returned `insufficient_aal` before calling Twilio
Verify when that AAL1 session tried to change its phone. ADR-0034 adds a conditional same-user
authenticator step-up for this state while leaving ordinary no-factor citizens on the direct SMS
path. After the user explicitly authorized recovery, the administrator deleted only the matching
legacy TOTP factor. Verification confirmed that the Auth user remains intact, has zero verified
factors and still has no verified phone. Supabase invalidated the account's active sessions as part
of the verified-factor deletion. Future lost-authenticator recovery remains an attributed
administrator action rather than an automatic client bypass.

A subsequent temporary email-backed identity smoke received a successful Supabase response for
one exact `phone_change` request through the configured provider path, and the temporary identity
was deleted successfully. This narrows the remaining provider risk to physical handset delivery,
OTP verification and the installed-device existing-TOTP path.

Before pilot release, capture the SQL artifact's five `true` checks, prove the active hook rejects
phone-only creation, and set all preferred `*_PHONE_VERIFICATION_MODE` variables to `enforce`.
Complete India TRAI/DLT requirements where applicable, provider/project rate limits, CAPTCHA/abuse
monitoring, exact installed-app redirects, and the physical-device matrix for initial link/change,
resend, invalid/expired codes, returning access, signed-in password change, recovery, identity
mismatch, cross-device sign-out, existing linked-phone OTP success and phone-only signup denial.
Accounts without an already confirmed phone fail closed to support; do not restore the superseded
email-only fallback or use the historical MFA-factor reset runbook. Supabase Storage and Edge
Functions are not an SMS carrier or custom OTP store.

### AUTH-011 — Platform-wide invitation choices need bounded search and pagination

- Severity: Medium before statewide administrator rollout
- Status: Open scalability task; current pilot catalog is bounded and functional
- Discovered: 2026-07-17

The government invitation options endpoint is private/no-store, reauthorizes the administrator,
strictly decodes its service-only result, and exposes only active, verified, non-placeholder,
routing-eligible names. Municipal administrators receive one authority's choices. A platform
administrator currently receives every eligible authority, ward, and department in one payload,
which is acceptable for the current PMC/BMC pilot but will not remain bounded statewide.

Before Maharashtra-wide onboarding, add authority-first server search, keyset pagination, explicit
result limits, deterministic ordering, and UI loading/empty/error coverage without weakening the
same eligibility or caller-authority filters. Do not cache the private catalog or reintroduce raw
UUID entry as a workaround.

### AUTH-012 — Synthetic staging Auth identities require explicit teardown

- Severity: Medium for staging credential hygiene
- Status: Bounded role expiry and secure local artifact implemented; Auth-user teardown pending
- Discovered: 2026-07-18

The staging helper gives every synthetic role and authority membership a bounded
`effective_until`, so current database authorization fails after expiry. Supabase Auth identities
and their passwords are not automatically disabled or deleted, however, and an expired account may
still establish an AAL1 session without effective application access. The credential artifact also
remains on the operator machine until deliberately removed.

The current staging run created seven distinct identities whose privileged assignments expire at
`2026-08-17T07:14:01.280Z`. Their generated credentials remain only in the gitignored mode-`0600`
operator artifact; personal TOTP enrollment has not been performed for the unused test identities.

After each demonstration, delete the gitignored `0600` artifact and revoke, disable, or rotate the
synthetic Auth identities through a trusted operator process. Do not automate destructive Auth-user
deletion until audit/history references, repeatable cleanup, and failure recovery are designed and
tested. Never run the helper in production or treat assignment expiry as credential revocation.

### AUTH-013 — Fresh-phone password policy is application-enforced, not a Supabase Auth hook

- Severity: High before treating fresh-phone password updates as provider-wide policy
- Status: Open provider/control limitation; supported JagrukSetu flows are enforced
- Discovered: 2026-07-23

The supported mobile change/recovery flow sends an ordinary SMS OTP with `shouldCreateUser: false`
through an isolated, non-persistent Supabase client. It verifies the returned user and normalized
phone against the expected account, updates the password immediately in that isolated session,
then attempts global sign-out and clears the persistent application session. No OTP proof, access
token, refresh token or password is persisted in application state. The best-effort
`password_changed` event is client-reported telemetry, not proof that Supabase changed the
credential.

Supabase Auth does not expose an application hook that can require this exact phone challenge for
every direct `updateUser({ password })` call. A modified client holding the public project key and
a valid Auth session may therefore bypass the JagrukSetu UI proof. Before representing this as a
provider-wide guarantee, review Supabase's available secure-password-change controls, restrict
untrusted client distribution and project access as far as practical, monitor Auth/audit events,
and obtain a provider-supported enforcement mechanism or revise the claim. Do not route passwords
through NestJS or build a custom OTP store as a workaround.

### AUTH-014 — A confirmed phone is an alternate Supabase AAL1 login identity

- Severity: High before claiming email/password is the only provider-level citizen login
- Status: Accepted V1 limitation; managed threat-model review pending
- Discovered: 2026-07-23

Ordinary Supabase Phone Auth links the confirmed number to the citizen's Auth user. JagrukSetu
presents email/password as its primary sign-in UI and uses `shouldCreateUser: false` for
password-change challenges, but a custom client can request a valid phone OTP for that existing
linked identity and obtain an AAL1 session. Supabase requires Phone Auth signup capability to be
enabled for that existing-user OTP path. The Before User Created hook rejects a new user that has
no email; it does not remove phone OTP login from an existing linked user.

Keep this limitation visible in release/security review and user-support policy. Do not describe
the ordinary OTP as a second factor or claim that email/password is cryptographically mandatory at
the Supabase provider boundary. If the product later requires true AAL2 or email/password-only
provider enforcement, adopt a provider-supported control through a new ADR rather than obscuring
the limitation in client UI.

### AUTH-015 — Stale phone-change state and lost-phone recovery need managed operations

- Severity: High before pilot recovery is represented as complete
- Status: Open managed hardening and support-procedure task
- Discovered: 2026-07-23

Supabase documents ambiguity risk when duplicate stale `phone_change` values exist. The clients
bind confirmation to the initiating Auth user and normalized requested phone, re-read
`phone_confirmed_at`, and fail closed on mismatch, but no managed preflight/cleanup procedure has
yet been validated. Test duplicate/already-linked numbers and interrupted/retried phone changes
against the hosted project, then add a server-side stale-claim preflight only if provider guidance
or observed behavior requires it.

A citizen who no longer controls the already confirmed phone cannot complete the supported
password-change/recovery flow. The former MFA-factor deletion runbook is explicitly superseded:
deleting an MFA factor does not change an ordinary linked Auth phone. Define a two-person,
attributed support procedure for identity review, provider-supported phone replacement, session
revocation, citizen communication, and after-change validation before production. Never add an
unverified-email bypass or mutate the `auth` schema directly.

### PROFILE-001 — Profile images need production media scanning and orphan reconciliation

- Severity: Medium before sustained public use
- Status: Core private upload engineering complete; operational hardening pending
- Discovered: 2026-07-16

Profile images are owner-private, size/type bounded, validated by extension/content type and common
image magic bytes, read through short-lived signed URLs, and excluded from public complaint
projections. Replacement and removal update only the authenticated owner's path.

Before sustained public operation, add provider-backed full image decoding and malware scanning,
moderation policy, scheduled reconciliation for abandoned/replaced objects, and approved retention
and deletion auditing. Never make the source bucket public or include avatar paths in transparency
responses.

### PROFILE-002 — Persisted citizen addresses need a private-data and provider design

- Severity: Medium before saved-address support
- Status: Ephemeral verified civic-area lookup implemented; persistence deliberately open
- Discovered: 2026-07-17

The mobile profile can request foreground location and resolve a verified authority/local-body/ward
through the existing governance projection. It retains only derived civic labels in component
memory, does not persist exact coordinates, and does not represent those labels as a postal address.
Profile photos can now be captured through Expo Camera or selected from the gallery without changing
the owner-private Storage boundary.

Persisting a street address requires a dedicated owner-private schema/API rather than adding precise
location data to broadly projected profile rows. Define consent, purpose, retention/deletion,
encryption/access expectations, RLS and service authorization, correction, reverse-geocoder/provider
terms, provenance/freshness, and a no-public/no-routing-leak guarantee before implementation. Never
derive or store an address silently from complaint evidence.

### AUTH-005 — Real-device and hosted callback smoke tests remain

- Severity: Medium
- Status: Open validation task
- Discovered: 2026-07-13

Local email and delivered-invite flows pass, and phone paths have unit coverage. The clients now
support code entry and provider-default PKCE links without requiring managed template edits; the
government callback narrowly supports a complete default `invite` fragment while citizen,
administrator, and mobile callbacks reject raw fragments. Real SMS delivery, exact managed
redirect allow-lists, delivered link expiry/prefetch/reuse, Expo development-build deep links, OS
SecureStore behavior, browser cookie attributes, and hosted callback URLs still require device/
environment smoke tests. Expo Go's temporary `exp://` callback is not a stable substitute for an
installed-build test.

The mobile recovery implementation now accepts exactly one reviewed PKCE code or recovery token,
requires an already confirmed phone plus a fresh ordinary phone OTP, and globally signs out after
the password update. Accounts without that phone fail closed to reviewed support. These local
controls do not replace the remaining managed callback, Twilio and cross-device validation.

### DELIVERY-001 — Ward complaint email transport is accepted, but mailbox delivery is unverified

- Severity: High before representing external complaint delivery as operational
- Status: Local sender and provider-acceptance smoke complete; supervised hosted deployment and
  recipient-mailbox verification pending
- Discovered: 2026-07-20

The V1 BMC facade stores 338 private ward/profile contact rows (the original 312 plus 26 general
profile rows) and atomically queues one
idempotent email job when a routed complaint receives its initial assignment. The immutable issue-
contact archive supplies primary/secondary phones, `1916`, category coverage and official WhatsApp;
the separate immutable 2026-07-20 ward-directory archive supplies email/office evidence. Direct
K/N and P/E mailboxes and K/S→K/E plus P/W→P/N parent mappings are included. Raw source status and
provenance remain stored separately from the owner's staging-routing approval. These values remain
private and no automated phone or WhatsApp action exists.

The trusted workers now include a bounded SMTP sender and a data-minimized JagrukSetu template.
ADR-0035 adds a dedicated 60-second ward-email process so the sender can run without notification,
SLA, or KPI polling. A hosted-staging K/W complaint and one older queued complaint were accepted by
the configured SMTP provider and their provider message IDs were persisted. This proves transport
acceptance and closes the former “no sender process” failure, but not delivery to, ownership of, or
action by the recipient mailbox.

The remaining release gate is a supervised hosted worker deployment plus recipient-mailbox,
bounce/dead-letter, quota, and provider-abuse verification. `pending` still means only queued;
`sent` means SMTP acceptance, not BMC acknowledgement. Do not run a tight polling loop or introduce
Redis/BullMQ to close this issue.

### NOTIFY-001 — Push and email notification providers and user preferences are not configured

- Severity: High before offline notification channels are represented as operational
- Status: Open provider and product-policy decision
- Discovered: 2026-07-14

Phase 6 now implements PostgreSQL-backed notification persistence, in-app history, retry and
deduplication, authenticated single-instance Socket.IO delivery, and inert provider-channel state.
No approved push/email provider, credentials, consent/preference model, channel fallback policy,
or privacy-reviewed external payload template exists yet. The mobile app consequently does not
install `expo-notifications` or register an OS push token. Closing this issue requires an owned
Expo/EAS project, Android FCM and iOS APNs credentials, user consent/preferences, verified
destinations, and approved retention/retry/fallback behavior. Push and email therefore remain
explicitly `unsupported`; they must never be marked sent or silently dropped.

Provider selection and production credentials require owner input. Any external payload must remain
data-minimized and omit complaint descriptions, exact coordinates, citizen/contact identifiers,
private media, internal notes, paths, and tokens. Real-device/background push and delivered-email
tests are required before closing the Phase 6 offline-channel exit criterion.

### NOTIFY-002 — Realtime delivery is intentionally single-instance in V1

- Severity: Medium for availability and future scale
- Status: Accepted V1 limitation; horizontal topology deferred
- Discovered: 2026-07-14

ADR-0005 and the Phase 6 plan permit one Socket.IO instance for the pilot. PostgreSQL remains the
durable source of truth, so reconnecting clients can recover persisted messages and notifications,
but active broadcasts are not coordinated across multiple realtime processes and in-memory typing
presence is lost on restart. Do not introduce Redis or a Redis adapter. A later horizontal design
must choose a reviewed cross-instance mechanism, define presence semantics, and preserve database-
first delivery and authorization.

### NOTIFY-003 — Public complaint comments remain disabled pending visibility policy

- Severity: High before any public complaint surface is enabled
- Status: Open product, privacy, moderation, and abuse-control decision
- Discovered: 2026-07-14

The unused structural `complaint_comments` table was physically removed from V1; there is no
create/read RPC, direct role access, realtime event or client route. Enabling comments first
requires a reviewed public/private complaint policy, moderation lifecycle, reporting and abuse
controls, retention/deletion rules, safe public media derivatives, a new migration and an explicit
architectural/privacy decision. No future implementation may assume the retired table contract.

### COMMUNITY-001 — Locality engagement engineering is complete; pilot operations remain pending

- Severity: High before community interaction is enabled
- Status: Engineering complete; managed activation, moderation, and abuse operations pending
- Discovered: 2026-07-17

The reviewed-public community slice now stores one private forced-RLS engagement row per complaint
and active authenticated account. It publishes only an aggregate support count, keeps star/follow
state private to that account, rejects withdrawn/non-current projections, applies separate API
quotas, and offers bounded Local, Trending, and Heat mobile views. Trending uses live aggregate
support followed by publication time and public ID; cursor pages may shift as support changes.

No supporter identity, avatar, exact location, private media, or private complaint detail becomes
public. Support/star signals cannot alter official routing, assignment, workflow status,
escalation, SLA, or KPI state. Public comments remain disabled under `NOTIFY-003`.

The signed-in mobile Community screen now has a separate owner-only recent-report preview backed by
the existing actor-scoped complaint list. It makes a successful submission immediately
discoverable to its owner without waiting for public review and remains independent of location and
public-feed errors. Installed-device submit/focus behavior and a two-account isolation smoke remain
pending; no public activation is required for those checks.

Operational activation still requires applying the engagement migration, an approved transparency
policy, reviewed public projections, hosted and physical-device smoke, pilot moderation/support
staffing, coordinated-abuse monitoring and response, retention/deletion procedures, and an owner
go/no-go decision. The current account requirement, uniqueness constraint, and PostgreSQL-backed
quotas are baseline controls, not a complete public-community abuse program.

### NOTIFY-004 — Mobile notification history currently shows only the newest 100 records

- Severity: Low for early pilot; grows with account history
- Status: Open client-pagination follow-up; durable server history remains intact
- Discovered: 2026-07-16

The notification API exposes cursor pagination, but the mobile client currently performs one
`limit=100` request. Older durable notifications are not deleted or lost; they are simply not
reachable from the current screen. Add load-more/infinite-scroll behavior using the server cursor,
merge pages by stable notification ID, retain newest-page pull-to-refresh and Socket.IO
reconciliation, and cover duplicate/out-of-order/empty-page/read-state behavior. Do not replace
durable history with an in-memory cache or introduce Redis.

### PERF-001 — Hosted complaint flow creates excessive database and API fan-out

- Severity: High for managed staging reliability
- Status: Partially mitigated locally; hosted query evidence and end-to-end validation pending
- Discovered: 2026-07-18

Hosted Supabase has reported CPU above 80%, and a mobile report submission can remain loading while
the project is under pressure. A read-only application audit found two concrete avoidable load
sources: realtime plus three worker claim loops could issue about 345,600 empty PostgreSQL RPCs per
day at their former one-second idle defaults, and a representative one-photo complaint path can
perform roughly 122 Supabase SDK operations (about 141 for an asset-routed category) across its
multi-stage draft, location, media, duplicate, routing, and submission lifecycle. Those SDK counts
are a code-path estimate, not a hosted statement count.

The local mitigation adds bounded adaptive idle backoff, removes a redundant Auth network
verification, coalesces only identical concurrent actor-context reads, and caches only the
non-user-specific operational/taxonomy catalogs for 30 seconds. Completed profile, role,
membership, MFA,
coordinate, jurisdiction, route, draft, complaint, and workflow decisions remain uncached. The
read-only `supabase/deploy/diagnostics/database_performance_audit.sql` report has been locally
validated, but it still must be run privately on hosted staging while pressure is present.

Do not infer that 127 application tables require consolidation, add a speculative index, or mask
the condition with a security/routing cache. Remaining engineering should use hosted
`pg_stat_statements`, waits, table churn, `EXPLAIN`, and Index Advisor evidence to prioritize draft
hydration, duplicate PostGIS jurisdiction resolution, public feed/hotspot aggregation, quota
writes, and full-object media hashing. Repeat a representative one-photo submission while measuring
CPU and latency before treating the incident as resolved. A temporary compute resize is an
operational safety option if the instance remains saturated, not evidence that the query pattern is
fixed.

### OPS-001 — Production container images are not pruned

- Severity: Low
- Status: Open technical debt
- Discovered: 2026-07-11

The production images copy the verified workspace from the build stage. They run as a non-root user and build successfully, but they include source and development dependencies and are larger than necessary.

Evaluate pnpm deployment pruning or service-specific production dependency packaging after real runtime dependencies exist. Any optimization must preserve reproducible builds and non-root execution.

## Resolved Issues

### MOB-006 — Deprecated Supabase process locking produced zero-millisecond Auth timeouts

- Severity: Previously high for reliable mobile session and phone-gate resolution
- Status: Resolved locally on 2026-07-24; physical-device smoke remains under `AUTH-010`
- Discovered: 2026-07-24
- Resolved: 2026-07-24

The mobile client supplied the legacy `processLock` option. In the pinned
`@supabase/auth-js@2.110.2`, that option is deprecated because the client coordinates refresh
concurrency internally; its legacy auto-refresh branch intentionally attempts `_acquireLock(0)`
and logs a warning whenever another Auth operation is active. The client now uses the SDK's
lockless default. Authoritative follow-up is still deferred to keep callbacks short, stale
scheduled work is cancelled when a newer Auth event arrives, and sign-out/unmount invalidates
pending resolutions. Regression coverage proves both deferral and cancellation.

### MOB-005 — Phone update events could reset the OTP code-entry screen

- Severity: Previously high for first citizen phone confirmation
- Status: Resolved locally on 2026-07-24; hosted migration/provider smoke remains under `AUTH-010`
- Discovered: 2026-07-24
- Resolved: 2026-07-24

The initial phone inspection depended on the complete Auth context. Requesting a phone change
causes Supabase to emit `USER_UPDATED`; replacing the context could therefore rerun inspection for
the same unconfirmed user and reset the newly established code-entry state back to phone entry.
Inspection is now claimed once per stable authenticated user ID. A same-user Auth refresh no longer
restarts the flow, while a different account still receives its own authoritative inspection.
Focused regression coverage exercises the initial, repeated-same-user and changed-user cases.

### MOB-004 — Auth refresh could leave the mobile Report button loading indefinitely

- Severity: Previously high for mobile complaint entry
- Status: Resolved locally on 2026-07-18; physical-device confirmation remains part of `COMPLAINT-002`
- Discovered: 2026-07-18
- Resolved: 2026-07-18

The complaint provider incremented its busy-operation counter during saved-draft restoration but
skipped the matching decrement when an Auth session refresh replaced the restoration effect. The
counter could remain positive, leaving the Report button disabled with an ActivityIndicator even
though the API was healthy. Restoration now releases its own increment in `finally` regardless of
effect freshness. The current LAN Expo bundle and API both pass local health checks; a
representative phone reload remains an environment validation step.

### MOB-003 — Mobile refresh, permanent-permission, and capture processing edge cases

- Severity: Previously medium for physical-device reliability
- Status: Resolved locally; physical-device validation remains under `COMPLAINT-002`
- Discovered: 2026-07-16
- Resolved: 2026-07-16

Home previously loaded only on initial mount, permanently denied camera/microphone/location
permissions did not consistently offer a settings recovery path, location and derived-file
preparation could race and leave a prepared local file when location failed, and a completed voice
URI could be processed again after effect dependency changes. Home now reloads on route focus;
permanent denials link to OS settings and recheck supported permission state; capture obtains
location before generating the derived prepared file; and voice processing locks each completed URI
until its one processing attempt finishes. Focused reducer/unit coverage passes. The representative
Android/iOS permission, app-background/return, file cleanup, and recording smoke remains correctly
tracked under `COMPLAINT-002` rather than claimed here.

### MOB-002 — A stale mobile environment override could split Auth and API projects

- Severity: Previously high for mobile sign-in/profile behavior
- Status: Resolved locally; physical-device validation remains under `COMPLAINT-002`/`AUTH-005`
- Discovered: 2026-07-16
- Resolved: 2026-07-16

An ignored app-local environment file could override the repository's current staging values and
point Expo at a different Supabase project while the API used the root environment. The stale file
was removed from Expo's load path and local operation now uses the root `.env` as the single source.
Startup diagnostics reject detectable Supabase URL/public-key project mismatch and native loopback
API/realtime URLs without including configured values in errors. Focused tests cover both guards;
the final LAN-based Expo Go sign-in/profile smoke remains an environment test, not a code defect
claimed complete here.

### AUTH-009 — Privileged clients could request a code-only email without offering code entry

- Severity: Previously high for administrator and government demo access
- Status: Resolved in code on 2026-07-14; hosted template/login smoke remains under `ENV-002`
- Discovered: 2026-07-14

The administrator and government clients previously requested `signInWithOtp` but instructed the
user to follow a sign-in link. That did not match the reviewed code-only magic-link template. Both
clients now provide explicit six-digit code entry and call `verifyOtp` with the `email` type while
retaining `shouldCreateUser: false`, non-enumerating request behavior, safe return paths, and auth
audit recording. The separate one-time government invitation token-hash callback remains intact.
Focused tests, lint, type-checking, and production builds pass for both applications. The managed
staging project's magic-link template and delivered OTP still require inbox/browser verification.

### AUTH-007 — Existing Auth users could be missing identity profile rows

- Severity: Previously high for affected account pages
- Status: Resolved locally on 2026-07-14; hosted rollout remains under `ENV-002`/`ENV-004`
- Discovered: 2026-07-14

An additive, idempotent migration backfills only missing `public.profiles` and baseline global
citizen roles for existing `auth.users`. It preserves existing profiles, privileged assignments,
revocations, and non-citizen scopes. Local migration, RLS, security, and Auth-flow tests pass;
managed projects must apply the migration before hosted legacy accounts benefit.

### AUTH-008 — Local email OTP templates still emitted sign-in links

- Severity: Previously medium for passwordless testing
- Status: Resolved in repository configuration on 2026-07-14
- Discovered: 2026-07-14

Local confirmation and magic-link templates now render the delivered six-digit token only and do
not include a sign-in URL. Auth E2E extracts and verifies the code and rejects link-bearing email
content. Hosted Supabase projects retain their own operator-managed templates; updating confirmation
and magic-link templates is necessary only when a code-only presentation is desired. The clients
also accept provider-default links, while exact redirect configuration and delivered-flow
validation remain required under `AUTH-005`/`ENV-002`.

### DOC-001 — Tracking-document locations were inconsistent

- Severity: Low
- Status: Resolved on 2026-07-14
- Discovered: 2026-07-11

`AGENTS.md` now names the canonical tracker files under `docs/` and includes them in the required
reading order. The empty trailing-comma file `docs/architecture.md,` was removed; no duplicate
tracking documents were created.

### ROUTING-003 — Conflicting applicable confidence policies lacked activation reporting

- Severity: Previously medium for operational routing configuration
- Status: Resolved on 2026-07-14
- Discovered: 2026-07-13

A service-only activation report now identifies simultaneously applicable active verified routing
rules whose confidence-policy versions differ across authority, local-body, ward, asset, and
effective-time scope. Runtime resolution retains its fail-closed guard as defense in depth.

### MOB-001 — Mobile Expo SDK was incompatible with the current Android Expo Go client

- Severity: High for local mobile testing
- Status: Resolved locally; physical-device smoke remains under `COMPLAINT-002`
- Discovered: 2026-07-14
- Resolved: 2026-07-14

The mobile workspace previously targeted an unsupported newer Expo SDK and could not open in the
user's Android Expo Go client, which supports SDK 54. The workspace is now aligned to Expo SDK
54.0.36, React Native 0.81.5, React 19.1, compatible SDK 54 native modules, and TypeScript 5.9.3.
`expo install --check`, mobile strict type-check, and the Android export passed (1,202 modules).
Camera, microphone, GPS, SecureStore, deep-link, and interruption behavior still require the
separate representative physical-device test tracked by `COMPLAINT-002`.

### AUTH-006 — Citizen email magic links used a non-allow-listed callback

- Severity: Previously high for citizen browser sign-in
- Status: Resolved in code on 2026-07-14

The citizen web client now requests the exact queryless same-origin `/auth/callback` URL already
handled by the PKCE callback route, whose safe default destination is `/account`. Unit regression
coverage prevents query parameters from being reintroduced into the provider redirect. Delivered
hosted-link, cookie, and cross-device behavior remains an environment validation task under
`AUTH-005` and `ENV-002`, not a known callback-construction defect.

### ROUTING-002 — Duplicate detection was not connected to complaints

- Severity: Previously medium for Phase 4 complaint capture
- Status: Resolved on 2026-07-14

Phase 4 adds versioned duplicate-policy selection, bounded private candidate retrieval, deterministic
scoring, persisted result evidence, and an authenticated citizen suggestion API. Responses expose
only complaint number/category/status/time, approximate distance, and score; they omit identity,
description, exact location, and media. Suggestions require explicit acknowledgement and are never
merged automatically.

### ROUTING-004 — Routing HTTP retries were not replay-idempotent

- Severity: Previously medium before automatic client retries
- Status: Resolved on 2026-07-14

Routing now accepts a distinct `Idempotency-Key`, reloads the actor-scoped stored decision before
evaluation, returns the original sanitized response across clock/configuration changes, and rejects
key reuse with different category, asset, location, accuracy, or capture time. Complaint submission
uses its own replay record and returns the stored receipt without recomputing routing or creating a
second complaint.

### DB-001 — Authority scope has no governance foreign key

- Severity: Previously medium until Phase 2
- Status: Resolved on 2026-07-13

Phase 2 created `governance.authorities`, preserved any pre-existing arbitrary Phase 1 scope as an explicit non-routable legacy placeholder, and added restrictive authority foreign keys to memberships, non-global roles and authority-attributed audit events. Future scoped roles also validate canonical authority lifecycle plus ward and department ownership.

### ENV-001 — Supabase tooling and local environment inputs were unavailable

- Severity: Previously high for database/Auth work
- Status: Resolved on 2026-07-13

The repository now pins the Supabase CLI, commits validated local configuration and an invite template, applies the Phase 1 migration series cleanly, generates database types and runs pgTAP/Auth E2E coverage. Managed environment activation remains separately tracked as ENV-002.

### DEP-001 — Moderate transitive dependency advisories

- Severity: Moderate
- Status: Resolved on 2026-07-11

The initial audit identified vulnerable transitive PostCSS and `uuid` releases through current Next.js and Expo dependencies. Narrow pnpm overrides select patched compatible releases. Peer checks, the full Expo and Next.js builds, frozen installation, and complete dependency audit pass after the change.
