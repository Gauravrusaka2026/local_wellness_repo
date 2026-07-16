# Database

## Purpose

This document defines the database structure, migration workflow, naming conventions, and Supabase security requirements.

The core database is Supabase PostgreSQL with PostGIS.

---

## Database Principles

- PostgreSQL is the source of truth.
- All exposed tables use RLS.
- UUIDs are used for domain identifiers.
- Timestamps are stored in UTC.
- Historic complaint events are immutable.
- Officer assignments are versioned.
- Ward boundaries are versioned.
- Routing rules are versioned.
- Deactivation is preferred over destructive deletion.
- Database migrations are committed to Git.

---

## Schemas

Recommended schemas:

```text
public
governance
routing
complaints
communications
operations
analytics
integrations
audit
```

Supabase Auth remains under the managed `auth` schema.

---

## Core Tables

### Identity

- profiles;
- devices;
- roles;
- user_roles;
- authority_memberships;
- auth_audit_events.

Phase 1 keeps these tables in `public` because the Supabase data API must enforce authenticated self-service and scoped reads through RLS. Authorization helper functions live in an unexposed `private` schema and use fixed search paths.

### Phase 1 Identity Relationships

- `profiles.id` is the corresponding `auth.users.id` and is provisioned by an Auth trigger;
- `devices.user_id` owns a hashed installation identifier and server-controlled risk state;
- `roles.code` identifies immutable seeded system roles;
- `user_roles` records status, scope, grantor, effective start and optional expiry;
- `authority_memberships` records invitation/approval state and effective authority access;
- `auth_audit_events` records actor, subject, authority, device, outcome and sanitized metadata as append-only history. Actor, subject and device UUIDs are immutable attribution snapshots rather than cascading foreign keys.

Access-lifecycle actor references use restrictive deletion semantics so an administrator identity cannot be deleted while it remains the recorded inviter, approver, grantor or revoker. Deactivate such identities instead of erasing provenance. Revoked memberships preserve any prior approval actor and timestamp.

The identity forward-fix migration adds the private, non-client-executable
`backfill_missing_auth_identities` operation. It idempotently creates a missing application profile
and non-privileged global citizen role for an existing `auth.users` row, normalizes only bounded
Auth identity metadata, never overwrites an existing profile, and does not reactivate a revoked
citizen-role record. The migration invokes it once so identities created before the profile trigger
can be repaired during upgrade.

Phase 2 adds restrictive foreign keys from `authority_memberships`, non-global `user_roles`, and authority-attributed audit events to `governance.authorities`. The forward fix first preserves any older arbitrary identifier as a `placeholder`/`other` authority with routing disabled, so an upgrade does not discard access history or misrepresent a legacy UUID as verified governance data. Placeholder authority scopes are retained for remediation but excluded from effective access. Scoped role writes additionally validate authority, ward, and authority-department ownership.

### Governance

- reference_sources;
- import_batches;
- import_files;
- import_records;
- authorities;
- states;
- districts;
- talukas;
- local_bodies;
- local_body_districts;
- administrative_units;
- wards;
- departments;
- authority_departments;
- offices;
- officer_roles;
- officers;
- officer_assignments;
- utilities;
- emergency_contacts;
- jurisdiction_boundary_versions;
- complaint_routing_references.

The Phase 2 tables live in an unexposed `governance` schema. `authorities` is the common identity used by access control; typed tables preserve the actual hierarchy. Nullable `lgd_code` fields are distinct from synthetic/source codes, retain leading zeroes as text, and use partial unique indexes only when a real code exists. A local body may cover more than one district through `local_body_districts`.

Every normalized source-backed row points to an immutable import record and, where available, an official reference URL. Verification status, last-verified date, placeholder state, and routing eligibility are separate fields. Database checks make routing eligibility possible only for active, verified, non-placeholder rows. The baseline intentionally creates no named officer, officer assignment, or boundary version because the canonical files contain no safely verified incumbent or geometry.

The machine validation report includes a per-file outcome matrix instead of only aggregate issue
counts. For the current 901 canonical rows, it records 41 accepted, 691 unverified, 169 quarantined,
and zero rejected outcomes. `accepted` means the row can enter the normalized structural baseline;
it does not promote the row to verified/routable state. Missing official evidence remains
unverified, and placeholder/template records remain quarantined or normalized to null/non-routable
fields. The pipeline does not rewrite the canonical CSV files or workbook.

Officer roles are durable definitions. Incumbency belongs to versioned `officer_assignments`. Boundary geometry and complaint-routing references are versioned independently with half-open UTC effective periods. Routing rows from the baseline remain `draft`, `unresolved`, and non-routable; they are reference evidence for Phase 3, not executable rules.

Phase 3 adds the following permanent synchronization-foundation tables to the same private schema:

- `source_endpoints`;
- `sync_runs`;
- `raw_snapshots`;
- `sync_run_snapshots`;
- `sync_candidates`;
- `sync_change_items`;
- `sync_review_items`;
- `sync_review_events`.

The operational retrieval/contact slice adds:

- `sync_scope_targets` for review-gated authority, local-body, and ward synchronization selection;
- `sync_source_leases` for short, exclusive source claims;
- `sync_events` for append-only safe retrieval audit events;
- `source_evidence` for immutable field/record locators into a source snapshot;
- `contact_channels` for durable contact ownership, visibility, and intended use;
- `contact_channel_versions` for temporal contact values, provenance, review, and delivery approval.

Source endpoints carry parser-contract and scheduling metadata, public retrieval locations or the
repository-bootstrap path, plus opaque secret references rather than credentials. Official remote
endpoints additionally carry exact HTTPS host allowlists, expected MIME types, response-size and
timeout limits, failure counters, retry suspension, a deterministic SHA-256 contract hash, and
attributed activation approval. Activation requires the approved hash to equal the current contract
hash and the approving user to hold an active global `platform_admin` role. Only supported MIME
types and HTTPS port 443 URLs without fragments are valid remote contracts. Raw-snapshot
metadata points to immutable bytes in the private `governance-raw-snapshots` Storage bucket and
deduplicates a source/content digest without overwriting the first observation. Run-to-snapshot
links preserve repeated observations. Candidate, change, review, and review-event rows separate
source parsing from canonical promotion.

The Phase 3 seed creates one draft/unverified `bootstrap_bundle` endpoint for
`resources/governance/csv/`, linked to the existing imported Phase 2 batch. Repository bootstrap
records use that batch/path relationship and no invented official URL; official remote endpoints
instead require a verified `reference_source_id` and HTTPS URL. Each record has one retrieval method
(`http_get`, `api`, or `manual_upload`) and one supported foundation format (`csv`, `geojson`,
`html`, `json`, `pdf`, `text`, or `xlsx`); bootstrap and official-source identity fields are
mutually exclusive.

Database triggers enforce the staged run lifecycle, immutable source evidence, terminal outcomes,
review attribution, and explicit verification/routing decisions. A placeholder change can only be
approved while quarantined, unverified/placeholder, and non-routable.

The service-role-only retrieval RPCs are:

- `public.claim_due_governance_sync_sources` for `FOR UPDATE SKIP LOCKED` claims and leases;
- `public.heartbeat_governance_sync_lease` for bounded lease extension;
- `public.record_governance_sync_snapshot` for content-addressed evidence or HTTP `304` linkage;
- `public.fail_governance_sync_run` for terminal failure audit and bounded exponential backoff.

Only active, verified, non-placeholder, attributed-approved official sources whose `next_sync_at`
is due can be claimed. The claim RPC returns exactly one source per call. Its trusted lease range is
180–900 seconds; the Edge dispatcher narrows this to 300–900 seconds with a 300-second default and
heartbeats around Storage persistence. An expired lease fails its prior run, applies exponential
backoff, and is not reclaimed in that call. Successful retrieval advances the source cadence; a
failure delays retry with exponential backoff capped at 24 hours. The pilot seed adds ten PMC/BMC
endpoint contracts, all `draft` and `unverified`, so the default database has no claimable scheduled
source.

Synchronization scope is independent from source activation and routing eligibility. The
service-only `sync_scope_targets` table supports generic authority, local-body, and ward targets,
uses composite foreign keys to reject cross-authority or cross-municipality hierarchy mismatches,
and keeps target identity immutable. Active scope requires attributed review by an active global
`platform_admin`. Even a reviewed active synchronization target remains non-routable unless the
referenced canonical entity is independently active, verified, non-placeholder, and routing
eligible. The pilot seed resolves `PUNE-W01`–`PUNE-W05` and `BRIH-W01`–`BRIH-W05` from the canonical
ward import; all ten scope rows and their placeholder ward records remain non-routable V1 audit
history. They are not official pilot identities. The reviewed replacement scope is BMC
administrative wards `A`–`E` and Pune's current official numeric wards `1`–`5`, after authoritative
identity and geometry evidence is available. `BRIH-W01`–`BRIH-W05` must never be ordinal-mapped to
the lettered wards; create reviewed records and a new scope version instead.

Snapshot finalization validates the exact `storage.objects` row, size, MIME type, source-bound
content-addressed path, and digest. Referenced snapshot objects cannot be materially updated,
renamed, or deleted. The Edge adapter retains a newly created content-addressed object when
finalization fails or is ambiguous so it cannot race a late commit. The pending grace-period
reconciler must recheck database references before classifying or removing a true orphan.

The scheduling migration adds `source_contract_sha256` as nullable, installs the deterministic hash
trigger, backfills every existing endpoint through that trigger, and only then sets the column
`NOT NULL`. This sequencing is required for safe additive upgrades of populated Phase 3 databases
and is covered by the root migration-safety test.

Contact values never overwrite their durable owner. A channel has exactly one owner and separates
`public_official`, internal, or restricted visibility from directory, complaint-intake, emergency,
or general-enquiry use. Versions retain effective periods, source URL, snapshot, record locator,
verification status, review attribution, and a separate complaint-delivery approval flag. A
source-verified value remains staged; publication requires `manually_verified`, an approved review,
and an active non-placeholder channel. The service-only `current_verified_contacts` view exposes
only current, public-official, manually verified versions. Complaint delivery is permitted only
when the published channel is also approved for complaint intake.

Publication additionally binds the approved candidate/proposal to the exact owner type and UUID,
channel identity and policy, normalized value, source URL, snapshot locator, evidence value hash,
and complaint-delivery decision. Each approved review is single-use for contact publication.

Legacy contact columns on `offices`, `officers`, `utilities`, and `emergency_contacts` are retained
for compatibility but protected by update triggers. Every synchronized change must append a new
contact version and close the prior version as superseded or stale; values and provenance cannot be
rewritten.

The Edge retrieval and pure contact-normalization slices are implemented. Source-specific parsers,
candidate persistence/orchestration, entity matching, publication logic, and operator review UI
remain unimplemented.

### Complaints

- `complaint_drafts`;
- `complaint_location_evidence`;
- `complaint_media`;
- `complaints`;
- `complaint_assignments`;
- `complaint_status_history`;
- `complaint_submission_requests`;
- `duplicate_check_runs`;
- `duplicate_check_matches`.

Phase 4 creates these nine tables in an unexposed `complaints` schema. Drafts are owner-scoped,
revisioned, resumable for 30 days, and retained as `discarded` or `submitted` rather than deleted.
Location evidence, submitted complaints, initial assignments, status history, and duplicate runs/
matches are append-only. A submitted complaint has private visibility and is bound one-to-one to
its source draft, selected exact-location evidence, and stored routing decision.

`complaint_submission_requests` is the durable exact-replay ledger. It stores only a SHA-256 hash
of the raw idempotency key, a canonical request fingerprint, a stable routing request ID, and the
completed response. An exact retry returns the existing complaint; conflicting actor/key/payload
reuse fails closed. Complaint numbers are generated server-side in UTC as
`LW-YYYYMMDD-<sequence>`.

Media reservations bind an owner, draft, client media identifier, kind/source, private bucket,
opaque object path, declared MIME type/size/checksum, optional capture-location evidence, and expiry.
Finalization records observed MIME type/size and a server-verified SHA-256 only after the API has
inspected the object. Photo/video and voice captures use separate private buckets. Processing and
moderation states are modeled but no provider automatically advances them in Phase 4.

Duplicate checks select exactly one current verified, non-placeholder, routing-eligible policy;
use PostGIS distance, time, category, text similarity, media hashes, and asset evidence; cap the
candidate set; and retain the scored advisory result. They never merge or automatically reject a
complaint. Future supporters and public complaint visibility require later migrations; Phase 7
adds private feedback and reopening through the server boundary described below.

Phase 5 extends the same private schema with:

- `government_role_capabilities`;
- `government_status_transition_rules`;
- `government_action_requests`;
- `government_action_audit_events`;
- `complaint_internal_notes`;
- `complaint_inspections`;
- `complaint_work_references`;
- `complaint_external_dependencies`;
- `complaint_resolution_evidence`;
- `complaint_resolutions`;
- `complaint_resolution_evidence_links`;
- `notification_outbox`.

It also adds `workflow_version` to complaints and turns `complaint_assignments` into versioned
history. Exactly one assignment may be active; assignment/transfer closes that version and appends
the next one with its actor, effective period, reason, and predecessor. The original routing
decision remains immutable. A government mutation supplies the expected workflow version and an
idempotency key whose hash and request fingerprint are stored in `government_action_requests`.
Exact retries replay the completed response; stale workflow versions and conflicting key reuse fail
closed. Every successful action appends a data-minimized audit event.

Role capabilities and the transition graph are database data, not client claims. Trusted RPCs
reauthorize the current profile, role, membership, authority/ward/department scope, capability,
assignment, and verified governance hierarchy before reading or mutating. `platform_admin` has
global operational scope; authority roles remain within their authority; ward and department roles
remain within their exact current scope; `moderator` is read-only. Assignment choices must be
active, verified, non-placeholder, routable governance assignments, and transfers cannot cross the
complaint's authority.

Internal notes, inspection results, work references, dependency details, completion notes, and
original resolution evidence are private government records. Resolution evidence is reserved at a
server-owned `resolution-evidence-private` path, uploaded with a transient signed token, and
finalized only after server-side MIME/size/SHA-256 verification. A complaint's current assignment
may retain at most 20 unlinked reserved/finalized evidence rows; linked and superseded-assignment
evidence is excluded from that allowance and remains immutable history. Detail responses derive
`availableForResolution`: only finalized,
unlinked evidence owned by the current complaint assignment is true, so prior-resolution and
superseded-assignment evidence cannot be reused.

The evidence locator returns upload status/expiry and current complaint workflow version for a
pre-download authorization and concurrency check. Expired reservations and stale versions fail
before object download. An exact replay of a completed finalization uses its stored observed
metadata and workflow response rather than reading Storage again. A resolution must reference at
least one available finalized evidence row and cannot be submitted while an external dependency is
active. When multiple dependencies are active, resolving one preserves the current waiting status;
the final closure advances the complaint to `work_in_progress`. Resolution rows and evidence links
are append-only and versioned. Only a bounded optional public message is copied into citizen-visible
status history.

Service-only bounded functions mark elapsed reservations `expired` or a reserved row `failed`; they
do not delete evidence history. No schedule or private Storage reconciliation/removal job is wired
in Phase 5.

Phase 7 adds the accountability tables:

- `resolution_policies`;
- `resolution_policy_versions`;
- `citizen_action_requests`;
- `citizen_action_audit_events`;
- `complaint_feedback`;
- `complaint_reopen_evidence`;
- `complaint_reopen_requests`;
- `complaint_reopen_evidence_links`;
- `complaint_escalation_events`.

Stable policy identity is separate from effective-dated versions. A version records approval
attribution, rating bounds/requirements, feedback and reopen windows, eligible statuses, attempt
cap, additional-evidence requirement, allowed reopen reason codes, and repeated-reopen escalation
threshold. Scope may be global, authority, category, or authority-plus-category. Runtime selection
uses the most specific single approved version effective at the resolution's immutable server
completion time; that same version governs context, evidence reservation, feedback, and reopening.
Missing or ambiguous policy evidence fails closed. Phase 7 deliberately seeds no active policy.

New resolution rows record a server completion time plus captured SRID 4326 point, accuracy,
provider, capture/device timestamps, mock-location signal, and optional existing work-reference
link. Existing Phase 5 rows retain null completion-location fields rather than receiving an
invented backfill. Resolution-evidence
links identify their `after` role. Finalized original complaint media remains the immutable before
record, while follow-up reopen evidence is stored separately and linked once to its accepted reopen
request.

`expire_citizen_reopen_evidence_reservations(limit)` is a bounded service-only maintenance
function that marks elapsed `reserved` rows as `expired` without erasing audit metadata. Phase 7
does not schedule it or delete Storage objects; platform scheduling, orphan reconciliation, full
media decoding, malware scanning, and moderation remain tracked under `GOVDASH-002`.

`citizen_action_requests` and its audit table mirror the established exact-replay boundary without
sharing government capabilities. Feedback is immutable and references the exact complaint,
resolution, citizen, policy version, and action request. A resolved feedback outcome advances to
`resolved`; adverse outcomes remain recorded without an implicit reopen. Reopening separately
checks current ownership, workflow version, latest resolution, policy deadline/status/reason,
attempt count, and finalized non-reused evidence in one transaction. It appends a reopen request,
links evidence, derives `reopened` or `escalated`, records a repeated-reopen escalation when the
configured threshold is reached, and appends status history plus the existing notification outbox
event atomically.

### Routing

- `issue_domains`;
- `issue_categories`;
- `category_aliases`;
- `asset_types`;
- `category_asset_types`;
- `assets`;
- `asset_versions`;
- `asset_ownership_versions`;
- `confidence_policies`;
- `confidence_policy_versions`;
- `duplicate_detection_policies`;
- `duplicate_detection_policy_versions`;
- `route_rules`;
- `route_rule_versions`;
- `routing_decisions`.

Phase 3 creates these tables in an unexposed `routing` schema. Stable identities are separated from
effective-dated asset, ownership, policy, and rule versions. Temporal exclusion constraints reject
overlapping non-draft versions. Rules target durable departments and officer roles; an incumbent is
resolved from the current governance assignment at decision time. Fallback order is a versioned,
cycle-checked rule path rather than an application constant.

All routing-eligible records must be active, verified, non-placeholder, source-backed, and dated.
Rule activation also requires an eligible category/domain, department, officer role, confidence
policy, authority, and any configured asset evidence. Database candidate queries reapply these
checks and the TypeScript evaluator verifies the returned evidence again.

`routing_decisions` is append-only and uniquely keyed by actor plus request ID. The recorder returns
an existing row only for an identical complete payload and rejects conflicting reuse. Phase 4 adds
a service-only replay lookup so an exact HTTP retry can return the stored decision without
recomputing resolution time; complaint submission owns a stable routing request ID. The table
retains exact location evidence and selected entity/version identifiers for audit. The server
builds metadata only from routing evidence, and a database check rejects known contact, officer-email,
complaint-text, and description keys at the metadata boundary. No routing table is a direct client
API.

The service-only `report_routing_confidence_policy_conflicts` activation report identifies
overlapping operational rule versions for the same viable category/scope/asset context when they
reference different confidence-policy versions. It is an operator validation gate; runtime
candidate loading continues to reject conflicting applicable policy versions independently.

The service-only `discover_routing_assets` function supports the mobile picker. It first requires a
single independently resolved PostGIS jurisdiction, then returns at most 50 sanitized asset IDs,
display/type names, and measured distances. The category, asset type, asset/version, ownership,
owner authority and optional office/department/role relationships must all be current, verified,
non-placeholder, and routing-eligible. Ambiguous/unsupported jurisdiction or missing ownership
returns no selectable asset rather than weakening routing validation.

### Communication

- `conversation_rooms`;
- `room_members`;
- `messages`;
- `message_receipts`;
- `complaint_comments`;
- `notification_outbox`;
- `notification_outbox_jobs`;
- `notifications`;
- `notification_deliveries`;
- `notification_delivery_attempts`.

Phase 6 stores communication in the existing unexposed, forced-RLS `complaints` schema. Every
submitted complaint has exactly one conversation room; the current implementation creates private
rooms only. `room_members` preserves effective-dated participation evidence for the citizen and
message senders, but it is not an authorization source. Current complaint ownership or current
government assignment scope is recalculated for every message/read/room operation.

Messages are immutable, complaint/room-bound records with a trimmed 1–4,000 character body. A
sender UUID plus client message UUID is unique, and a SHA-256 request fingerprint distinguishes an
exact replay from conflicting reuse. Message responses expose only citizen/government author type,
whether the current actor authored the record, body, and timestamps; they do not expose an Auth
user UUID. `message_receipts` stores one read-through position per room/user. Database guards allow
only a monotonic move to a later `(created_at, message_id)` pair.

`complaint_comments` is structural preparation only. The table accepts retained moderation state,
but no Phase 6 creation/read RPC or direct role grant exists while every complaint remains private.
Public comments require a later visibility, moderation, abuse, and privacy decision.

Phase 6 extends the Phase 5 `notification_outbox` rather than creating another source ledger. Each
row binds to exactly one status-history, assignment-version, or message source. Supported domain
events are complaint submitted, status changed, assignment changed, and private message created.
Triggers append source-bound events in the same transaction and backfill existing eligible
submission/assignment rows idempotently. Payload checks allow only complaint/status/scope/message
identifiers and occurrence time; private body text, exact location, contacts, user identifiers,
object paths, signed URLs, and tokens are prohibited.

`notification_outbox_jobs` is a mutable lease/retry projection over the immutable outbox.
`claim_notification_outbox` selects due or expired jobs with `FOR UPDATE SKIP LOCKED`, increments an
attempt, and issues a 15–300 second opaque lease. Materialization is idempotent by
`(outbox_id, recipient_user_id)`, creates only current authorized recipients other than the actor,
and marks the job complete. Failures retry with bounded exponential backoff and become `dead` after
five attempts.

`notifications` is the durable, data-minimized in-app history. `notification_deliveries` tracks
one channel/event/destination reference with `pending`, `processing`, `retry`, `delivered`,
`unsupported`, or `dead` state; values such as email addresses and push tokens are not copied into
the row. In-app delivery is materialized as delivered, realtime delivery begins pending, and email/
push intent is explicitly unsupported until providers and policies exist. Realtime claims use
their own 5–300 second leases, recheck recipient access, and append claim/delivered/failed/
lease-expired evidence to `notification_delivery_attempts`.

### Operations

- `sla_calendars` and `sla_calendar_versions`;
- `sla_calendar_working_periods` and `sla_calendar_exceptions`;
- `sla_policies`, `sla_policy_versions`, and `sla_category_overrides`;
- `sla_escalation_rules` and `sla_escalation_rule_versions`;
- `complaint_sla_bindings`, `complaint_sla_clocks`, `complaint_sla_pause_intervals`, and
  `complaint_sla_deadline_history`;
- `sla_escalation_jobs` and `complaint_sla_escalation_events`;
- existing `complaint_external_dependencies` and complaint workflow records.

### Analytics

- `kpi_definitions` and `kpi_definition_versions`;
- `kpi_calculation_runs`;
- `kpi_snapshots` with municipality, ward, or department scope and explicit delay segments;
- Phase 8 bounded hotspot aggregates over reviewed public projections (not a private complaint
  snapshot table).

### Audit

- audit_events;
- security_events;
- data_change_events.

---

## Naming Conventions

- tables: snake_case plural;
- columns: snake_case;
- primary key: `id`;
- foreign keys: `<entity>_id`;
- timestamps: `<event>_at`;
- boolean values: `is_` or `has_`;
- enum-like text columns use check constraints;
- database functions use snake_case.

---

## Standard Columns

Most mutable tables should include:

```text
id
created_at
updated_at
created_by
updated_by
status
```

Versioned tables should include:

```text
effective_from
effective_to
version
status
reference_source_id
source_version
verification_status
last_verified_on
```

---

## Complaint Status History

Complaint status history must be append-only.

A complaint status update must:

1. validate transition;
2. update current complaint status;
3. insert status history;
4. create notification outbox row;
5. create audit event;
6. commit as one transaction.

Phase 4 implements the first transition. `public.submit_complaint` validates the actor-owned
active draft, verified or partially verified location and spoof state, active verified category,
required asset and attributes, finalized media count and capture distance, duplicate
acknowledgement, emergency acknowledgement, and exact routed-decision evidence. It then creates the
complaint, initial routed assignment, first `draft -> submitted` history row, terminal draft
transition, and stored replay response in one transaction.

Phase 5 database rules add the bounded government transition graph. The service-only action RPC
locks the current complaint/assignment, verifies actor scope/capability and the expected workflow
version, and performs the action, status-history append, action audit, and data-minimized
`notification_outbox` append in one transaction. Non-status actions are also audited and advance
the workflow version. Outbox rows are append-only persistence; no delivery behavior is implemented
in Phase 5.

---

## PostGIS

Phase 2 enables PostGIS in the `extensions` schema. Jurisdiction geometry is stored separately from durable entities in `governance.jurisdiction_boundary_versions` as non-empty, valid `MultiPolygon` values with SRID 4326 and longitude/latitude coordinates constrained to the valid world envelope.

Required spatial data:

- complaint points (implemented as exact `Point` location evidence in Phase 4);
- municipality polygons;
- ward polygons;
- district polygons;
- asset points;
- road lines;
- special jurisdiction polygons.

Implemented Phase 2 index:

```sql
create index jurisdiction_boundary_versions_boundary_gix
on governance.jurisdiction_boundary_versions
using gist (boundary);
```

The service-role-only `governance.resolve_jurisdiction` function uses `ST_Covers`, so a coordinate exactly on a polygon edge is included. It considers only effective, active, verified, non-placeholder, routing-eligible local-body and ward boundaries. The function returns boundary version identifiers for auditability and does not execute complaint assignment.

Phase 3 adds `routing.resolve_jurisdiction_with_accuracy`. It combines exact matches with verified
boundaries inside the reported GPS-accuracy radius using geography `ST_DWithin`. Multiple nearby
boundaries are retained so the application can return an ambiguous/manual-review outcome. A
geography GiST expression index complements the existing geometry index. Spatial asset versions
have geometry and geography GiST indexes; candidate matching uses the greater of the asset-type
match radius and the input accuracy. API and database contracts reject accuracy above 5,000 metres.

The additive `public.resolve_verified_governing_bodies` projection reuses the accuracy-aware
resolver for the authenticated mobile directory. Its API limit is 100 metres. It admits only
active, verified, routing-eligible, non-placeholder state/local-body/authority records plus any
matched district, taluka, or ward, and requires active official provenance for every entity and
boundary used. Its JSON contains only entity kind/name/type, `lastVerifiedOn`, and the official
source URL. UUIDs are present only as internal relational columns outside the returned JSON and are
not exposed by the API. Geometry, officers, contacts, office details, and routing rules are absent.
`anon` and `authenticated` have no execute privilege; only `service_role` may call the function.

---

## Routing Query

Conceptual query:

```sql
select *
from governance.resolve_jurisdiction(:longitude, :latitude, :resolved_at);
```

Use `ST_Covers` where boundary-edge behavior requires inclusion.

The Phase 3 API uses service-role-only wrappers rather than granting direct schema access:

```sql
select * from public.resolve_jurisdiction_context(
  :longitude,
  :latitude,
  :accuracy_meters,
  :resolved_at
);

select * from public.resolve_routing_candidates(
  :longitude,
  :latitude,
  :accuracy_meters,
  :category_id,
  :asset_id,
  :resolved_at
);
```

The candidate function returns state/district/taluka/local-body/ward identifiers and exact boundary
versions, asset/ownership versions and match distance, target identifiers, confidence weights,
signals, priorities, and fallback evidence. It deterministically caps output at 100 rows. It never
treats an unresolved Phase 2 routing reference as an operational rule. The API requires every row's
hierarchy and five-entry boundary vector to equal the separately resolved jurisdiction and fails
closed when applicable rows carry conflicting policy versions.

Phase 4 adds service-role-only complaint wrappers for owner-scoped draft lifecycle, exact-location
evidence, media reservation/finalization, duplicate candidate/result records, submission claim,
routing replay, atomic submission, and owned list/detail/timeline reads. The private schema remains
outside PostgREST; anonymous and authenticated roles cannot call these functions, and the API
supplies the verified Auth actor rather than trusting a body user ID.

---

## Migration Workflow

Create migration:

```bash
supabase migration new create_complaints_schema
```

Apply locally:

```bash
supabase db reset
```

Inspect diff:

```bash
supabase db diff
```

Push to linked environment only after review:

```bash
supabase db push
```

### Master bootstrap SQL

`supabase/master.sql` is the deterministic, single-file bootstrap form of all 34 ordered SQL files
in `supabase/migrations/`. Each source migration retains its own transaction boundary, and the
header records the exact source filename and SHA-256 digest. Seed artifacts remain separate because
they contain environment/bootstrap data rather than table definitions and security policy.

Run `pnpm database:master:generate` after adding or changing an unapplied migration and
`pnpm database:master:check` in verification. The master artifact is only for an empty compatible
Supabase database. Never put it in the migration directory, apply it after the incremental history,
or use it to replace or mutate migration records in an existing environment.

---

## Migration Rules

- never edit an applied production migration;
- create a forward-fix migration;
- avoid destructive changes;
- backfill before adding non-null constraints;
- create indexes concurrently where appropriate;
- document long-running migrations;
- test rollback or forward recovery;
- seed only non-sensitive reference data.

---

## Seed Data

Phase 2 seed inputs are hash-pinned by `resources/governance/manifests/phase-2-baseline.v1.json`. Generate, validate, and check them with:

```bash
pnpm governance:data:validate
pnpm governance:data:generate
pnpm governance:data:check
```

The generated main SQL is `supabase/seed/20_phase_2_governance.generated.sql`; `21_phase_2_governance_checksum.generated.sql` records its externally computed checksum without self-reference. Supabase applies both before `supabase/seed/roles.sql` by lexical path order. Never edit generated SQL or canonical CSVs manually; update the versioned source bundle and manifest, review validation output, then regenerate all artifacts together.

The Phase 2 seed contains:

- Maharashtra state;
- the supplied district, taluka, and urban-local-body structural baseline;
- synthetic wards marked as placeholders and routing-ineligible;
- departments;
- officer roles;
- offices and utilities;
- emergency-contact references;
- unresolved complaint-routing references;
- all raw source rows and import provenance.

Template Gram Panchayat and village rows remain in raw provenance rather than becoming named entities. Current-officer placeholders create zero officer and assignment rows. Never commit production officer personal data, credentials, or secrets into seed files.

`supabase/seed/30_phase_3_pilot_categories.sql` adds exactly 12 engineering categories:

- Garbage dump;
- Missed sweeping;
- Pothole;
- Blocked drain;
- Sewage overflow;
- Water leakage;
- Broken streetlight;
- Open manhole;
- Mosquito breeding;
- Illegal construction;
- Encroachment;
- Fallen tree.

The domain and every category are `draft`, `unverified`, and non-routable. They are not placeholder
entities, but they are still non-production taxonomy records and cannot be returned by the normal
operational category query. `Blocked drain` retains one explicit, unverified, non-operational alias
to the bootstrap label `Storm-water blockage`; the canonical CSV is unchanged. The seed creates no
Pune-specific rule, department, officer, boundary, ownership, or confidence record.

---

## Row Level Security

RLS policies must be stored in Git.

Recommended location:

```text
supabase/policies/
```

RLS tests:

```text
supabase/tests/
```

Test:

- anonymous access;
- citizen access;
- officer access;
- ward boundaries;
- department scope;
- municipal scope;
- admin scope;
- revoked roles;
- expired assignments.

Phase 1 also applies column privileges: citizens can directly update only safe profile fields. Device mutation is API-only and uses service-role-only database functions that commit registration/revocation and the corresponding audit event in one transaction. Authenticated SQL reads expose only safe device metadata; identifier hashes and push tokens remain server-only. Profile and device visibility for municipal administrators requires the target user to have a current active membership, while historical role and membership records remain available through their scoped tables. Effective access helpers require both a current role assignment and, for authority-scoped roles, a current authority membership.

Phase 2 enables and forces RLS on every governance table. Anonymous roles receive no schema usage. Authenticated users receive no governance mutation privileges; verified, active, non-placeholder directory rows are selectable only through explicit policies, and authority managers may read their own managed scope. Import ledgers require platform-administrator scope. Officer/person and assignment rows are never public-directory data. The service role has explicit non-destructive DML and jurisdiction-resolution privileges but no delete grant on retained version/import history. The schema is also absent from the local Data API schema allow-list, so RLS and grants remain defense in depth for direct database access rather than an accidental public API.

Phase 3 enables and forces RLS on all 15 routing tables and the synchronization tables. The
`routing` and `governance` schemas remain outside the Data API allow-list. Anonymous and ordinary
authenticated roles cannot execute routing RPCs or read routing/synchronization tables. The service
role receives narrowly scoped non-destructive table privileges and execute access to category,
jurisdiction, candidate, and decision-recording wrappers; it receives no delete privilege on
routing decisions, raw snapshots, or review history.

The scheduling/contact migration extends the same forced-RLS boundary to leases, events, evidence,
channels, and contact versions. Only the service role can execute the four retrieval RPCs. Lease
tokens authorize only the matching run/source claim and are not persisted in audit payloads.
Append-only event/evidence tables and versioned contact history have no delete grant; normal clients
cannot query the current-contact projection.

Phase 4 enables and forces RLS on all nine complaint tables. `public`, `anon`, `authenticated`, and
`service_role` receive no direct schema, table, sequence, or private-function privilege. The service
role may execute only the reviewed `public` security-definer wrappers; those wrappers use an empty
search path and enforce actor ownership, active profile state, lifecycle, cross-table scope, and
append-only rules. Citizens therefore cannot use the Supabase Data API to read exact complaint
coordinates or mutate an official assignment even when they own the underlying complaint.

Phase 5 enables and forces RLS on all 12 added government-workflow/outbox tables and preserves the
same no-direct-table-access rule, including for `service_role`. Only the reviewed public wrappers
are executable by the server credential. Those functions treat the service role as transport, not
authorization: they require the verified actor UUID and recheck active identity, effective role,
authority membership, optional selected role assignment, exact scope, capability, workflow state,
current version, current assignment, and verified/non-placeholder governance targets. Audit,
internal-note, work-reference, resolution, evidence-link, and outbox history is append-only;
assignment and mutable lifecycle rows have guarded transitions.

Read authorization uses the complaint's stored scope plus an active verified authority, membership,
and role. It does not require a historical officer tenure to remain active: current summaries hide a
stale incumbent, while superseded complaint-assignment history preserves that provenance and an
authority/global operator can reassign to a fully current verified target. Ward/department roles
cannot assign or transfer. Scheduled inspections and active dependencies block transfer/manual
status exit until their own completion/closure action resolves the child workflow.

Phase 6 enables and forces RLS on all nine new communication and delivery tables and preserves the
schema-wide direct-access revocation for `public`, `anon`, `authenticated`, and `service_role`.
The API, worker, and realtime runtime may execute only reviewed public wrappers. Actor-facing
wrappers receive the UUID derived from a verified bearer/socket session and recheck the active
profile, citizen ownership, or current government assignment scope. Worker wrappers require a
bounded worker/instance identifier plus an opaque live claim token for completion/failure.

Conversation membership does not grant access. Notification history is recipient-specific and is
returned only while that recipient still has complaint access. The realtime claim also rechecks
access and marks a revoked recipient's queued delivery terminal rather than returning its payload.
Messages, comments, delivery attempts, and source outbox records are immutable; read positions,
notification read time, and job/delivery lifecycle updates are constrained by guarded triggers.
Public-comment table structure does not create public access because no create/read RPC or table
privilege is granted.

Phase 7 enables and forces RLS on every accountability and follow-up-evidence table and preserves
the schema-wide denial of direct access, including for `service_role`. Actor-facing wrappers receive
the citizen UUID from a verified bearer token, recheck an active profile and exact complaint
ownership, and use a guarded citizen-action context for the only permitted complaint workflow
mutation. Government accountability reads still apply the current assignment capability/scope
check. Policy rows, feedback, reopen requests, evidence links, escalation events, and audits are
append-only; policy lifecycle and reserved-evidence finalization use narrowly validated transitions.

Phase 8 enables and forces RLS on every transparency policy/review/projection/duplicate/derivative
table and revokes direct table access from all Data API roles, including `service_role`. Only
reviewed service-role functions may publish, withdraw, review/withdraw duplicate groups, or return
bounded public projections. Anonymous HTTP requests terminate at NestJS; `anon` receives no direct
database execute surface.

Phase 9 enables and forces RLS on all 19 SLA, escalation, and KPI tables and continues the schema-
wide direct-table denial, including for `service_role`. Platform-admin publication and trusted
worker claim/execute/fail operations use narrow service-role wrappers. Government read wrappers
receive the actor UUID derived from a verified bearer token and recheck current role assignment,
authority membership, complaint assignment, and requested municipality/ward/department scope.
Policy evidence, lease tokens, complaint clocks, escalation jobs/events, and KPI source rows are
not client tables.

---

## Storage Metadata

Supabase Storage objects should be linked to database media records.

Do not rely only on storage object names.

Media record should include:

- complaint ID;
- uploader;
- storage bucket;
- storage path;
- MIME type;
- checksum;
- size;
- processing status;
- moderation status;
- capture source;
- capture time;
- capture location.

Phase 4 creates `complaint-originals-private`, `voice-recordings-private`,
`complaint-thumbnails`, and `resolution-evidence-private` as private buckets with MIME and file-size
allow-lists. It creates no anonymous/authenticated object policy and no public-media bucket. The API
chooses an owner/draft/media-scoped object path, returns a transient signed-upload token, then
verifies the stored object's MIME type, byte size, and SHA-256 before database finalization. The
token is never persisted in complaint metadata. Thumbnail processing is not implemented merely
because its private bucket exists.

Phase 5 uses `resolution-evidence-private` for government completion evidence. The API reserves the
complaint/evidence-scoped path, issues a transient signed upload, and verifies the object before
finalization. Verification retains the 50 MiB maximum and exact object-size and SHA-256 checks, and
uses bounded parsing to derive the MIME type from accepted JPEG, PNG, WebP, HEIC/HEIF, MP4,
QuickTime, and WebM binary signatures. Storage metadata must match. A signature/MIME, size, or
checksum mismatch removes the reserved object and fails closed.

Phase 7 reuses `complaint-originals-private` for a separately namespaced post-submission reopen
object path. The API reserves that exact path only for the complaint owner and latest resolution,
then applies the same bounded binary signature, MIME, size, and SHA-256 finalization boundary before
the evidence may be linked to a reopen request. The live capture's point, accuracy, provider,
capture/device time, and mock-location signal remain private evidence. Reopen evidence is not a new
public upload path and cannot be selected twice.

The complaint owner may request a five-minute signed read for a finalized before, after, or reopen
evidence identifier only after a fresh ownership/relationship check. The response is private and
non-cacheable; object paths and signed tokens are never stored in feedback, status history,
notifications, or logs.

Authorized viewing returns a five-minute, forced-download signed URL only after a separate scope
and `view` capability check. All government-workspace responses set `Cache-Control: private,
no-store`, and evidence access is logged with safe identifiers rather than private paths/URLs. There
is no public evidence object or direct Storage policy for dashboard clients. Binary signatures are
not full media decoding, malware scanning, or moderation; those providers/policies and scheduled
cleanup of expired/failed Storage objects remain pre-production work.

---

## Database Backups

Production requirements:

- point-in-time recovery where available;
- daily backups;
- restore test;
- backup retention policy;
- export procedure;
- incident runbook.

---

## Generated Types

Generate the current committed `public`, `governance`, `routing`, and `complaints` schema types after migrations with the repository script:

```bash
pnpm database:types
```

The script writes through a temporary file and replaces the committed output only after the Supabase CLI and formatter succeed. CI runs `pnpm database:types:check` to detect drift without truncating the committed file on generation failure.

---

## Database Testing

Phase 1 commits three ordered migrations:

- `20260713100000_phase_1_identity_and_access.sql`;
- `20260713130000_restrict_device_sensitive_column_access.sql`;
- `20260713150000_atomic_device_lifecycle_and_access_provenance.sql`.

A clean local reset and schema lint pass. The three pgTAP plans contain 154 assertions covering schema/privilege invariants, RLS scope and lifecycle behavior, and atomic device/audit operations including rollback on audit failure.

Phase 2 adds seven ordered migrations for the governance schema, security/version guards, identity-authority forward fix, jurisdiction resolution, scope immutability/effective-access hardening, authority parent-type enforcement, and coordinate-envelope/placeholder-access hardening. Its five pgTAP plans contain 194 assertions covering schema and indexes, canonical seed counts and quarantine state, RLS/ACL visibility, hierarchy and role-scope constraints, temporal versioning, and synthetic PostGIS resolution. All eight database plans contain 348 passing assertions. Source-pipeline unit tests independently cover manifest/hash/title/header/row-width drift, malformed rows, duplicate keys, missing values, placeholders, cross-file references, deterministic IDs, SQL escaping, generated-artifact drift and failure atomicity.

Phase 3 adds three ordered migrations for the routing model, governance-synchronization persistence,
and service-only security/RPC boundary. Its database plans cover schema and seed invariants,
forced-RLS/ACL behavior, placeholder non-routing, temporal and hierarchy guards, lifecycle/review
gates, synthetic accuracy-aware PostGIS and asset-ownership resolution, fallback/ambiguity behavior,
and append-only duplicate-safe decision evidence. Pure package tests cover eligibility, deterministic
ranking, confidence thresholds, fallbacks, duplicate scoring, synchronization lifecycle, and
publication eligibility; API tests cover authentication, validation, sanitized results, audit
recording, and safe dependency failures.

The final clean reset, application-schema lint, and generated-type drift check passed. All 450 pgTAP
assertions passed across 11 plans, including 102 Phase 3 routing and synchronization assertions.
The committed types cover `public`, `governance`, and `routing`. Synthetic verified fixtures remain
inside rolled-back tests; the reset bootstrap retains zero operational categories and creates no
production route from placeholder or unverified evidence. Repository-wide formatting, lint,
type-check, tests, builds, Compose validation, and production dependency audit also passed; see the
Phase 3 testing worklog for the observed matrix.

Phase 4 adds two ordered migrations for complaint capture and its security/RPC boundary. Four pgTAP
plans cover schema/index/storage invariants, forced-RLS and ACL denial, owner isolation and
append-only guards, rollback-isolated PostGIS location/media/routed submission, exact replay,
atomicity, malformed or placeholder evidence, emergency/duplicate acknowledgement, and media/
routing mismatch failures. The latest clean local reset and schema lint passed, and all 557
assertions passed across 15 plans; Phase 4 contributes 107 assertions (`37 + 24 + 29 + 17`). The
committed generated types now cover `public`, `governance`, `routing`, and `complaints`.

The governance retrieval/contact/scope slice adds three forward migrations, draft-only PMC/BMC
pilot source and ward-scope seeds, pgTAP plans `016_governance_sync_scheduling.test.sql`,
`017_governance_contact_versioning.test.sql`, and `018_governance_sync_scope.test.sql`, Edge
fetch-helper tests, and pure contact-normalizer tests. Coverage includes inactive-by-default
sources, atomic claims, concurrent/stale leases, conditional `304`, immutable snapshot/evidence
history, bounded failure retry, RPC ACL denial, contact provenance, placeholder/source-verification
staging, attributed manual publication, delivery approval, legacy-column immutability, scope
hierarchy/identity, global-platform-admin activation review, and independent routing gates. Current
aggregate verification results belong in `PROGRESS.md` and the applicable worklog. The clean run
passed 657 assertions across 18 pgTAP plans; plans 016–018 contribute 100 assertions
(`44 + 26 + 30`). The Edge pure suite passed 11 cases, the contact normalizer passed 9 cases, and all
three database-package test files passed. Database lint reported only diagnostics owned by the
installed PostGIS extension. The root migration-safety regression also passed.
Its populated Phase 3 fixture confirmed that an existing endpoint receives a 64-character
deterministic source-contract hash before `NOT NULL` enforcement.

Synthetic verified Phase 4 fixtures are rolled back. The actual reset bootstrap still has zero
operational categories and cannot create a production complaint from placeholder or unverified
evidence. The previous staging target received the schema and non-production seeds; the replacement
target is unreconciled. Hosted RLS/RPC/Storage workflow smokes, verified Pune data, and a physical-
device media submission remain pending; see the Phase 4 testing worklog.

The identity/routing forward fixes add pgTAP plans 019–021 for legacy Auth profile repair,
confidence-policy conflict reporting, and verified PostGIS asset discovery. The governance import
unit suite also verifies the per-file outcome matrix and aggregate disposition totals. Phase 5 adds
two forward migrations plus plan `022_government_workflow_schema_and_acl.test.sql` for the private
workflow schema, versioned assignment constraints, forced RLS/ACL denial, capability/transition
data, action idempotency/audit, dependency and resolution gates, private evidence, and outbox
behavior, including multiple-dependency waiting, the 20-row active-unlinked evidence cap, expired
reservation replay, finalized replay, retained linked evidence, and bounded cleanup RPCs. API,
validation, store-adapter, Storage-gateway, and dashboard tests cover strict contracts, private/no-
store responses, scope-aware queue/detail behavior, action inputs, workflow conflicts, pre-download
checks, bounded binary signature/MIME rejection, object removal, forced-download reads, and
identifier-only access logging. Exact aggregate results are recorded in the current progress
tracker and Phase 5 testing worklog after the complete repository gate; no hosted-environment or
verified-pilot result is implied by local fixtures.

Phase 6 adds migrations `20260714130000_phase_6_communication_and_notification_schema.sql` and
`20260714131000_phase_6_communication_notification_security_and_rpc.sql` plus pgTAP plans
`024_communication_notification_schema_and_acl.test.sql` and
`025_communication_notification_integration.test.sql`. Their intended coverage includes the
private schema, indexes and constraints, forced RLS/direct ACL denial, complaint-room backfill,
current actor scope, exact message replay/conflict, monotonic read receipts, source-bound outbox
events, current recipient selection, materialization deduplication, explicit unsupported channel
state, leased claims, retry/dead outcomes, append-only attempt history, and the absence of public-
comment access. A clean local reset applied all 25 migrations and reviewed seeds; all 967 assertions
passed across 25 pgTAP plans. Strict application-schema lint reported no errors, and generated
database types were regenerated successfully. Installed PostGIS-owned diagnostics remain when the
extension schema is included in the broader lint command; no application schema owns those objects.

Phase 7 adds migrations `20260716100000_phase_7_accountability_schema.sql` and
`20260716101000_phase_7_accountability_security_and_rpc.sql` plus pgTAP plans
`026_phase_7_accountability_schema_and_acl.test.sql` and
`027_phase_7_accountability_integration.test.sql`. Coverage includes policy versioning and
fail-closed selection, forced RLS/direct ACL denial, historical-resolution compatibility, captured
completion evidence, owner isolation, exact replay/conflict, rating and outcome validation, policy
windows and attempt limits, private follow-up evidence integrity/non-reuse, feedback confirmation,
reopen state, repeated-reopen escalation, immutable audit/history, and Phase 6 notification-outbox
integration. Synthetic approved policy versions exist only inside rollback-isolated tests.

The verified governance-directory slice adds migration
`20260716104000_verified_governing_body_projection.sql` and pgTAP plan
`028_verified_governing_body_projection.test.sql`. Its 13 assertions cover function existence,
direct-client denial, service-role execution, official provenance, placeholder/source exclusion,
public-safe output, PostGIS resolution, and migration grants. The latest clean local database run
applied all 30 migrations and passed all 1,085 assertions across 28 plans; application-schema lint
also passed. Synthetic directory entities and boundaries are transaction-rolled-back fixtures and
do not create pilot coverage.

The previous managed staging deployment recorded on 2026-07-14 applied all 23 migrations through
`20260714124000` and all six reviewed non-production seed files. The existing citizen Auth identity
was reconciled by the idempotent profile backfill. Post-seed checks found 12 category records with
zero operational and 11 synchronization endpoints with zero active. No official ward or geometry,
operational route, complaint, application, Edge Function, Cron, source/scope activation, or
production deployment was created by that database operation.

The owner later switched the configured staging target and reports applying a generated master SQL
file. The exact artifact revision and current target ledger were not independently verified, so the
historical deployment above must not be treated as evidence for the replacement project. Reconcile
that target against all 34 current migrations before activation.

## Phase 8 Public Projection Model

Phase 8 preserves `complaints.complaints.visibility = 'private'` and adds public-output evidence as
separate versioned records in the unexposed `complaints` schema. Transparency policies and category
rules define effective eligibility, safe status sets, minimum hotspot cohorts, summary behavior,
and ward-derived location requirements. Publication reviews bind one complaint and one exact policy
version to reviewer-supplied sanitized text. Publication versions snapshot only allowlisted public
category, status, authority/local-body/ward, time, and approximate-boundary evidence; withdrawal
closes a current version rather than rewriting it.

Current approximate points are derived inside PostgreSQL from verified, active, non-placeholder,
routing-eligible ward-boundary versions. Exact complaint/location/routing geometry never enters the
projection tables or public function return types. Human-reviewed duplicate groups and memberships
are versioned separately from private duplicate-detection runs. A service-only review accepts at
most 100 complaints from one local body/category only when every member has a current published
projection; public detail then returns only the canonical public ID, related public IDs excluding
the viewed report, and the group size. Private match scores/evidence and internal complaint IDs
never enter that contract.
Withdrawal closes the active group version. Processed-media derivative records have independent
processing, moderation, and publication gates and expose no public object in this slice.

Every Phase 8 table has forced RLS and no direct `anon`, `authenticated`, or `service_role` table
access. Narrow service-only functions perform publication/withdrawal authorization, duplicate-group
review/withdrawal, and bounded public projection, hotspot, verified-boundary, and detail reads.
NestJS is the anonymous HTTP trust boundary; Supabase Data API roles receive no direct Phase 8
execute surface. No transparency policy, publication, duplicate group, or derivative is seeded.

Phase 8 is delivered by additive migrations `20260716102000_phase_8_transparency_schema.sql`,
`20260716103000_phase_8_transparency_security_and_rpc.sql`,
`20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql`, and
`20260716106000_phase_8_duplicate_group_publication.sql`. The focused transparency pgTAP run passed
91 assertions across plans 029–030; the root session owns the final aggregate repository result.

## Phase 9 SLA, Escalation, and KPI Model

Phase 9 adds migrations `20260716110000_phase_9_sla_escalation_kpi_schema.sql` and
`20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql`. They add 19 private,
forced-RLS tables without exposing the `complaints` schema through PostgREST.

Stable calendar, SLA policy, escalation rule, and KPI-definition identities are separate from
versions. Calendar versions retain an IANA timezone, weekly working periods, date exceptions,
effective interval, provenance, verification state, and approval attribution. Policy versions bind
one exact approved calendar and retain business-minute acknowledgement, optional inspection, and
resolution targets; completion status and optional external-dependency pause behavior; effective
dates; source evidence; and approval. Category overrides version policy targets without embedding
category logic in application code. Escalation-rule versions retain the policy version, milestone,
level, business-minute delay, reviewed action, optional verified target role, effective interval,
and provenance.

Publishing a replacing calendar, policy, or escalation-rule version locks the candidate and the one
eligible approved predecessor in a single transaction. It closes the predecessor at the new
`effective_from`, marks it `superseded`, and approves the candidate. Backdated, same/older-version,
multiple-overlap, already-superseded, invalid-provenance, and incompatible-scope/configuration
requests are rejected without leaving a partial lifecycle transition.

`complaint_sla_bindings` records the exact selection result for one complaint assignment cycle:
`applied`, `not_configured`, `ambiguous`, or `invalid_configuration`. An applied binding snapshots
the selected policy/calendar/override evidence. `complaint_sla_clocks` materializes acknowledgement,
optional inspection, and resolution targets with `active`, `paused`, `met`, `breached`, or
`cancelled` state. Pause intervals and append-only deadline history retain every eligible external-
dependency adjustment. Business-calendar calculations use the version's local timezone while all
stored timestamps remain UTC. Complaint assignment, status history, and dependency triggers—not
API fields—initialize, complete, pause, and resume clocks.

`sla_escalation_jobs` is the mutable bounded lease/retry projection; attempts are capped and terminal
`dead` state is retained. `complaint_sla_escalation_events` is append-only. Execution rechecks the
current complaint/assignment/clock/rule and may record evidence or derive `escalated` only as the
approved rule permits. The resulting status history, append-only escalation event, and data-
minimized notification outbox row commit in the same transaction, so asynchronous delivery cannot
precede its source state.

Eight code-owned KPI definition versions cover acknowledgement compliance, resolution compliance,
citizen-confirmed resolution rate, reopen rate, misrouting rate, backlog, evidence completeness,
and communication quality. They define algorithms only; they do not activate policy or fabricate
source data. Immutable calculation runs retain reporting window, source cutoff, algorithm versions,
input fingerprint, lease/retry state, and outcome. `kpi_snapshots` retain municipality, ward, or
department scope; all/external-dependency/no-external-dependency segment; numerator, denominator,
value, sample size, and exclusions. No table or API defines an individual-officer ranking.

Service-only RPCs publish versions; initialize clocks; claim, execute, or fail escalation jobs;
schedule/enqueue, claim, materialize, or fail KPI runs; and return narrow government-scoped JSON.
All direct table grants are revoked. No active calendar, SLA target, category override, or
escalation rule is seeded, so ordinary bootstrap data creates no operational clock/escalation.

Phase 9 coverage includes forced-RLS/ACL denial, atomic supersession, business-calendar boundaries,
fail-closed policy selection, clock/pause/deadline history, transactional escalation/outbox
behavior, lease/retry/dead semantics, KPI reproducibility and scope isolation, strict RPC payloads,
and immutability. The focused Phase 9 plans pass 48/48 and 51/51 assertions; the clean aggregate
database run passes 1,275 assertions across all 32 plans. These rollback-isolated fixtures verify
engineering and do not activate operational policy.

Required:

- migration tests;
- RLS tests;
- foreign key tests;
- status transition tests;
- spatial routing tests;
- concurrent complaint assignment tests;
- idempotency tests;
- notification outbox tests.
