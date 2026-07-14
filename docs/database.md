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
ward import; all ten scope rows and their placeholder ward records remain non-routable. The BMC
numeric placeholders require an official crosswalk to the municipality's lettered ward structure
before production activation.

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
complaint. Future supporters, feedback, reopen requests, resolution evidence, and public complaint
visibility require later migrations.

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

### Communication

- complaint_comments;
- conversation_rooms;
- room_members;
- messages;
- message_receipts;
- notifications;
- notification_outbox;
- notification_deliveries.

### Operations

- sla_policies;
- escalation_rules;
- escalation_events;
- work_orders;
- external_dependencies.

### Analytics

- ward_kpi_snapshots;
- department_kpi_snapshots;
- municipality_kpi_snapshots;
- hotspot_snapshots.

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

Phase 4 implements the first transition only. `public.submit_complaint` validates the actor-owned
active draft, verified or partially verified location and spoof state, active verified category,
required asset and attributes, finalized media count and capture distance, duplicate
acknowledgement, emergency acknowledgement, and exact routed-decision evidence. It then creates the
complaint, initial routed assignment, first `draft -> submitted` history row, terminal draft
transition, and stored replay response in one transaction. Later status-transition,
notification-outbox, and government-action functions remain future work.

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
token is never persisted in complaint metadata. Thumbnail processing and resolution-evidence use
are not implemented merely because their private buckets exist.

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
evidence. Hosted migration/RLS/Storage verification, verified Pune data, and a physical-device
media submission remain pending; see the Phase 4 testing worklog.

Required:

- migration tests;
- RLS tests;
- foreign key tests;
- status transition tests;
- spatial routing tests;
- concurrent complaint assignment tests;
- idempotency tests;
- notification outbox tests.
