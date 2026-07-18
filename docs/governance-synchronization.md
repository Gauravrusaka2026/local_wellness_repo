# Governance Synchronization

## Purpose

Governance synchronization is a permanent, review-gated backend capability for refreshing government structures, contacts, assignments, boundaries, utilities, emergency contacts, and routing evidence from official sources. It extends the immutable Phase 2 bootstrap import; it does not replace or rewrite that import.

The shared contracts, lifecycle, publication-eligibility rules, and pure contact normalizer live in
`@local-wellness/database/governance-sync`. The first operational slice retrieves approved official
sources through a dedicated Supabase Edge Function and preserves exact source bytes. It does not
yet include a source-specific HTML/PDF parser, entity matcher, publisher, or operator review UI.

## Source Boundary

The canonical bootstrap remains read-only:

```text
resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx
resources/governance/csv/*.csv
```

The CSV files are the machine-readable source of truth and the workbook is the human reference copy. Synchronization must register the bootstrap as a manual `repository_bootstrap` source. It must never overwrite, relocate, or silently normalize those files.

The originally requested `resources/governance/csv/seed_data_for_mh/` directory is not present in
the repository bundle. The manifest-pinned bootstrap files currently live directly under
`resources/governance/csv/`. Synchronization must preserve that discrepancy as source metadata; it
must not create the missing directory, copy files into it, or rewrite the manifest automatically.

The Phase 3 seed registers this corpus once as the manual `repository_bootstrap` source
`mh_governance_csv_bootstrap_v1`, dataset `bootstrap_bundle`, at
`resources/governance/csv/`. It links to the existing imported Phase 2 batch rather than inventing
an external reference source or official URL. The registry record remains draft and unverified; it
is provenance for the immutable bootstrap, not a scheduled retrieval target.

The separate 2026-07-18 Batch 0 ZIP follows the same non-publishing boundary. Its deterministic
adapter records a `source_bundle_sha256`, every archive member and every CSV row, catalogs canonical
official URLs, and performs only conflict-safe LGD enrichment of exact existing hierarchy matches.
It does not create `source_endpoints`, schedules, snapshots, candidates, change proposals, or review
approvals. The six supplied discrepancy groups, 21 issues, stale PMC document, empty operational
files, and ambiguous `Mumbai`/`Mumbai City` identity remain inputs for a future reviewed Batch 1 and
the permanent synchronization pipeline.

Official sources are separate registry records. Their public retrieval URLs and parser-contract versions belong in the database. Credentials do not: a source may retain only an opaque secret reference resolved by the runtime environment.

Each registry record selects one retrieval method: `http_get`, `api`, or `manual_upload`. Supported
foundation formats are `csv`, `geojson`, `html`, `json`, `pdf`, `text`, and `xlsx`. An official
source must reference an approved `governance.reference_sources` row and HTTPS endpoint, with no
bootstrap import batch or repository path. A repository bootstrap must instead reference an
existing import batch and repository path, use `manual_upload`, and have neither an official source
reference nor endpoint URL.

PostgreSQL deterministically hashes every retrieval contract with SHA-256, including its source,
scope, URL/path, parser version, expected MIME types, exact hosts, size/timeout limits, and cadence.
An official source can become active only when `approved_contract_sha256` exactly matches that
current hash and the approving user still holds an active global `platform_admin` role. Editing any
hashed contract field invalidates the approval until a platform administrator reviews the new hash.
Remote contracts accept only the supported MIME allowlist and HTTPS on port 443, without URL
fragments; redirects are checked against the same exact host contract. Supported MIME values are
`application/geo+json`, `application/json`, `application/pdf`, `application/vnd.ms-excel`,
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`, `text/html`, and
`text/plain`.

## Pilot Registry and Statewide Expansion

The pilot seed registers four Pune Municipal Corporation source contracts (official site/office
evidence, officer directory, ward-office directory, and open-data departments) and six
Brihanmumbai Municipal Corporation contracts (administrative roles, Municipal Commissioner,
Assistant Commissioners, department heads, emergency-contact PDF, and official contact directory).
All ten rows retain their official URL, authority scope, parser key/version, expected media type,
exact host allowlist, and daily candidate cadence. They are intentionally `draft`, `unverified`,
and not approved, so they cannot be claimed by the scheduler.

The V1 pilot target seed separately records five placeholder targets for each municipality through
the service-only `governance.sync_scope_targets` registry. It resolves the bootstrap source codes
`PUNE-W01`–`PUNE-W05` and `BRIH-W01`–`BRIH-W05`; all ten scope rows and their canonical ward rows are
`draft`, `unverified`, unapproved, without geometry, and non-routable. Preserve them unchanged as
bootstrap/audit history rather than promoting or silently relabelling them.

The reviewed operational synchronization direction is BMC administrative wards `A`–`E` and Pune's
current official numeric wards `1`–`5`. The BMC letters are not an ordinal translation of
`BRIH-W01`–`BRIH-W05`. After authoritative identity and boundary evidence is obtained, create
reviewed canonical ward records and a new scope version. A scope can become active only after an
active global `platform_admin` reviews it, and selecting a target for synchronization never grants
routing eligibility. The referenced entity must independently be active, verified,
non-placeholder, and routing eligible.

Pune and Brihanmumbai are source-adapter pilots, not application branches. Source records bind to a
database authority and dataset kind; fetch, normalization, matching, versioning, and review contain
no municipality-name condition. The same registry and pipeline can add Maharashtra Municipal
Corporations, Municipal Councils, Nagar Panchayats, Gram Panchayats, District Collectors, talukas,
ward/rural-development offices, utilities, and emergency authorities without redesign. Each new
source still requires an official reference, reviewed contract, source-specific parser fixtures,
and attributed activation.

## Staged Pipeline

```text
registered source
  -> Supabase Cron dispatch
  -> PostgreSQL claim and short lease
  -> allowlisted HTTPS retrieval
  -> immutable raw snapshot
  -> source-specific parser
  -> pure normalization and validation
  -> entity matching
  -> change detection
  -> review queue
  -> explicit approval or rejection
  -> transactional publication
```

Each stage has a narrow port:

- `GovernanceSyncSourceRegistryPort` loads active source definitions and due work. The service-only
  claim RPC implements the current scheduling/claim boundary with PostgreSQL row locks and leases.
- `GovernanceRetrieverPort` returns raw bytes and response metadata. The current Edge adapter
  implements safe generic HTTPS retrieval; source-specific API authentication remains adapter work.
- `GovernanceSnapshotStorePort` preserves fetched bytes under an immutable, content-addressed object
  path and returns their digest and HTTP metadata. The Edge function implements this port against
  the private Supabase Storage bucket.
- `GovernanceNormalizerPort` converts a pinned parser contract and snapshot into candidates without deciding that they are verified.
- `GovernanceEntityMatcherPort` records official-ID, reviewed-crosswalk, scoped-natural-key, or manual matching evidence. Match confidence never verifies a candidate automatically.
- `GovernanceChangeDetectorPort` proposes creates, updates, temporal version changes, deactivations, quarantine, reference-only retention, or no-op outcomes.
- `GovernanceReviewQueuePort` records attributed review decisions.
- `GovernancePublisherPort` applies one approved change set transactionally and idempotently while preserving history.

The application layer composes these ports. The package does not hide I/O behind global state and does not introduce a second bootstrap generator.

`normalizeGovernanceContactRecords` is a pure, source-independent normalizer for parser output. It
normalizes email, phone, HTTPS URL, directory, and address values; detects malformed, missing,
placeholder, duplicate, cardinality, and layout-drift evidence; and can assign at most
`source_verified`. An official-source candidate reaches that state only when the caller supplies a
currently approved source contract and every record-specific URL host belongs to the contract's
approved host set. It cannot publish a value or claim manual verification. The registered PMC/BMC
parser keys are contracts only: their source-specific HTML/PDF extraction adapters remain pending.

## Persistence Foundation

Phase 3 migrations implement the following server-only persistence boundary:

- `governance.source_endpoints` for reviewed source, dataset, retrieval, parser-contract, cadence,
  repository-path/public-URL, and opaque secret-reference metadata;
- `governance.sync_runs` for the enforced lifecycle and terminal outcome counts;
- `governance.raw_snapshots` plus `sync_run_snapshots` for immutable source/digest metadata and
  repeated-content observations;
- `governance.sync_candidates` for raw and normalized record evidence, validation, and match state;
- `governance.sync_change_items` for immutable proposals and requested verification/routing state;
- `governance.sync_review_items` and append-only `sync_review_events` for attributed decisions;
- `governance.sync_scope_targets` for service-only, review-gated authority/local-body/ward selection
  independent from routing eligibility;
- `governance.sync_source_leases` for short, exclusive PostgreSQL retrieval claims;
- append-only `governance.sync_events` and `governance.source_evidence` for safe run and field-level
  provenance;
- durable `governance.contact_channels` and append-and-close
  `governance.contact_channel_versions` for official contact history;
- the private `governance-raw-snapshots` Supabase Storage bucket for exact source bytes.

All synchronization tables force RLS and remain outside the Data API schema allow-list. Anonymous and normal
authenticated clients receive no direct access. Service operations receive only non-destructive
privileges; raw snapshots and review events cannot be updated or deleted. The database repeats the
TypeScript lifecycle and placeholder/review gates so an adapter cannot bypass them accidentally.

The first retrieval slice is implemented, but not activated. The seed registers ten official PMC
and BMC endpoints as `draft` and `unverified`; none is claimable or scheduled. An operator must
review and explicitly activate a source and create the environment-specific Cron invocation before
the Edge function can fetch it. Source-specific parsers, a candidate persistence orchestrator,
entity matching, transactional publication, and the operator review interface remain pending.
`20260714112000_governance_sync_scope.sql` and `41_governance_sync_pilot_wards.sql` add only the
generic scope boundary and ten inactive engineering targets; they do not activate a source, parser,
canonical ward, boundary, or route.

## Run Lifecycle

A run follows this exact path:

```text
queued
  -> retrieving
  -> snapshot_preserved
  -> normalizing
  -> matching
  -> detecting_changes
  -> awaiting_review
  -> approved | rejected
approved
  -> publishing
  -> published
```

An active machine stage may transition to `failed`. `published`, `rejected`, and `failed` are terminal; retrying creates a new run linked to the same source rather than rewriting audit history. The state machine rejects skipped snapshot, matching, change-detection, and review stages.

## Snapshot and Provenance Rules

A production snapshot adapter must use a private Supabase Storage bucket. Object paths must be immutable and content-addressed. PostgreSQL retains the content SHA-256, byte length, media type, ETag, Last-Modified value, retrieval timestamp, source, and run linkage. A repeated source-and-digest pair is an idempotent observation, not a reason to replace the earlier object.

The implemented Edge adapter stores objects as
`<source-endpoint-id>/<sha256>.<reviewed-extension>`, with `upsert: false`. An existing object is
accepted only after its length and digest are rechecked. Conditional `ETag` and `Last-Modified`
requests are supported. HTTP `304` links the prior snapshot to the new run and never creates an
empty Storage object or raw-snapshot row.

Snapshot finalization rechecks the exact `storage.objects` row, byte size, MIME type, source-bound
content-addressed path, and source contract before recording metadata. Once a raw snapshot refers to
an object, database guards prevent that Storage object from being renamed, materially updated, or
deleted. If finalization fails or its outcome is ambiguous, the Edge function intentionally retains
the content-addressed bytes. A grace-period reconciliation job must first check for a late committed
snapshot link before classifying or removing an orphan; eager deletion could race that commit.

Normalized candidates retain both the snapshot identifier and a record locator within that snapshot. No normalized publication is eligible when either value is absent. Raw snapshots and review events are append-only evidence.

## Review and Publication Gates

Publication eligibility is deterministic and independent of a source's own `Active` or `Official` text.

- The run must be in `approved` state and the proposal must have an attributed approved review.
- Candidates with validation errors cannot be published to normalized records.
- Ambiguous and unresolved matches cannot be published as normalized changes; they remain reviewable or quarantined.
- A placeholder may be retained only with the `quarantined` disposition. It cannot be marked verified or routing eligible.
- Marking a record verified requires an explicit reviewer decision, a record-specific source URL, a reference-source identifier, and a last-verified date.
- Enabling routing requires a separate explicit review decision, a verified target state, and normalized rather than quarantined publication.
- A no-change proposal does not mutate governance data.

Officer incumbency, jurisdiction boundaries, and routing records must use append-and-close version changes. Publication must not rewrite an earlier assignment, boundary, routing decision, raw snapshot, or review event.

Official contacts use the same history-preserving rule. A channel identifies the durable owner,
channel type, visibility, and intended use; values live only in temporal versions. A
`source_verified` version remains staged. Publication requires attributed manual review, a
record-specific official URL, exact source snapshot and locator, and a current effective period.
The service-only current-contact projection returns only active, non-placeholder,
`public_official`, manually verified versions. Complaint delivery is a separate explicit approval
available only to a published public-official `complaint_intake` channel. Legacy contact columns on
offices, officers, utilities, and emergency contacts are retained for migration compatibility but
are immutable; refreshes must append a contact version instead.

The database binds a published contact to the reviewed candidate and proposal, including the target
owner type and UUID, channel identity/type/use/visibility, normalized value, source URL, exact
snapshot locator, source-evidence value hash, and complaint-delivery decision. A unique constraint
makes each review item single-use, so one approval cannot publish multiple contact versions.

A future publisher must reload the authoritative run, change set, proposals, candidate matches and
latest reviews from PostgreSQL inside its publication transaction. It must bind every proposal to
that persisted run/change set and must not trust caller-supplied proposal/review arrays. The current
eligibility helper already rejects a match whose candidate identifier differs from the proposal's
candidate; persisted run/change-set binding remains part of `GOVSYNC-001` publisher implementation.

## Scheduling and Concurrency

The retrieval topology is:

```text
Supabase Cron
  -> POST governance-sync-fetch with a dedicated dispatch secret
  -> claim_due_governance_sync_sources
  -> SELECT ... FOR UPDATE SKIP LOCKED + short PostgreSQL lease
  -> exact-host allowlisted HTTPS fetch
  -> content-addressed private Storage object
  -> immutable snapshot metadata and sync event
  -> later parser/normalizer/matcher/review/publication stages
```

The Edge function is fetch/snapshot only. Its generic HTTP adapter rejects non-HTTPS URLs,
credentials, fragments, non-standard ports, IP literals, localhost/internal names, non-allowlisted
redirects, unexpected MIME types, empty or oversized responses, and timeouts. Each dispatch claims
at most one source. The Edge request accepts a 300–900 second lease, defaulting to 300 seconds; the
database RPC permits 180–900 seconds for trusted callers. The function heartbeats after retrieval
and again after a Storage write before database finalization. Lease tokens are passed only to
service-role RPCs and are never logged or returned. Multiple invocations safely skip active claims.
An expired lease fails its abandoned run, applies retry backoff, removes the lease, and deliberately
does not reclaim that source in the same claim call.

Success advances `next_sync_at` by the reviewed refresh interval. A safe retrieval failure records
an append-only audit event and applies bounded exponential retry delay, capped at 24 hours. The
schedule and dispatch secret are environment configuration and are not committed. The repository
contains no active Cron job, and all ten pilot endpoints remain non-claimable until reviewed.

Redis, BullMQ, Redis adapters, Redis caching, and Sentry are prohibited for this subsystem. Runtime diagnostics use structured logging and NestJS Logger where an application adapter is later implemented.

## Engineering Complete vs Data Validation Pending

### Engineering complete

- typed contracts for retrieval, snapshots, normalization, matching, change detection, review, and publication;
- explicit review-gated run lifecycle;
- deterministic publication eligibility and placeholder non-promotion rules;
- forced-RLS source/run/snapshot/candidate/change/review persistence and a private raw-snapshot
  bucket;
- PostgreSQL `FOR UPDATE SKIP LOCKED` claims, short leases, stale-lease recovery, conditional `304`
  handling, bounded retry backoff, heartbeats around Storage, and append-only synchronization
  events, with exactly one source claimed per dispatch;
- custom-secret Supabase Edge retrieval with exact HTTPS allowlists, redirect/timeout/MIME/size
  enforcement, SHA-256 content addressing, private Storage preservation, and safe retention after
  ambiguous database finalization;
- versioned official-contact ownership/value tables with separate publication, public visibility,
  and complaint-delivery approval gates, exact proposal/evidence binding, single-use reviews, plus
  immutable legacy contact columns and referenced snapshot objects;
- pure contact normalization for malformed, incomplete, placeholder, duplicate, cardinality, and
  layout-drift evidence without automatic manual verification;
- ten draft/unverified PMC and BMC source definitions for review, with no active scheduled source;
- ten service-only, draft/unverified/non-routable PMC/BMC ward scope targets covering wards 1–5
  from the canonical bootstrap, with platform-admin activation and independent routing gates;
- database enforcement for immutable evidence, terminal runs, review attribution, and placeholder
  non-promotion;
- focused tests for allowed transitions, terminal outcomes, provenance, explicit verification, routing enablement, ambiguity, validation errors, and placeholder quarantine;
- package subpath export and this operating contract.

The dedicated staging database was initialized on 2026-07-14 with all 23 migrations through
`20260714124000` and the six reviewed non-production seed files. It contains 11 synchronization
endpoints—the repository bootstrap plus ten PMC/BMC contracts—with zero active endpoints. It also
contains 12 categories with zero operational. No Edge Function, Cron, dispatch secret, source or
scope activation, official ward/geometry, route, complaint, application, or production deployment
was performed.

The retrieval and immutable-snapshot slice is implemented but intentionally inactive. The Edge
function stops at `snapshot_preserved`; it does not parse, match, review, or publish. Source-specific
PMC/BMC parsers, candidate persistence/orchestration, entity matching, repeated-disappearance
policy, review API/UI, publication transactions, production Cron/function deployment, and
orphaned-Storage reconciliation remain open. DNS/private resolved-address and rebinding prevention
also remains a source-activation security gate. No production contact or assignment has been
activated by this engineering work, and all ten pilot sources remain draft, unverified, and
inactive.

The additive source-contract migration is upgrade-safe for populated databases: it adds
`source_contract_sha256` as nullable, deterministically backfills existing rows through the contract
hash trigger, and only then applies `NOT NULL`. The root migration-safety regression protects this
sequence from being collapsed into an unsafe populated-table alteration.

### Data validation pending

Every official source still requires operator review of:

- authoritative endpoint and permitted usage;
- parser contract and expected format;
- retrieval cadence and freshness expectations;
- official matching identifiers and reviewed crosswalks;
- field-level source specificity;
- LGD identifiers and official geometry/identity evidence for BMC administrative wards `A`–`E`
  and Pune's current numeric wards `1`–`5`;
- current office contacts and named incumbents;
- department, officer-role, utility, asset-ownership, and routing mappings.

The ten registered pilot endpoints also require stable parser fixtures and source-specific minimum
cardinality/layout expectations. A zero-result directory or changed HTML/PDF layout must create a
validation failure, never an automatic removal.

Until those reviews are complete, fetched and bootstrap records remain unverified or quarantined as appropriate. Engineering completion must not be reported as verified pilot data, current production coverage, or operational routing readiness.
