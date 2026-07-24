# Database

## UI benchmark data boundary

The token/localisation/mobile-progress slice requires no SQL migration. Existing complaint,
routing, transparency, engagement, and private-contact schemas remain authoritative; no mock ward,
officer, contact, comment, or notification rows are added by the UI layer.

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

### V1 physical pruning

[ADR-0031](adr/0031-prune-deferred-database-subsystems-for-v1.md) removes the undeployed
governance synchronization/versioned-contact subsystem and the unused public-comment table through
the forward migration
`20260723110000_prune_deferred_v1_subsystems.sql`. At that migration boundary this reduces custom
application tables from 129 to 114:

- 14 retired `governance` synchronization/contact tables are physically dropped;
- `complaints.complaint_comments` is physically dropped;
- the associated synchronization RPCs, views, validators and triggers are removed; and
- `private.v1_deferred_subsystems_pruned()` records the adaptive-bundle state without exposing a
  client-executable capability.

The migration does not remove canonical governance/import records, PostGIS ward geometry,
complaint data, private messages, notifications, public Community projections/engagements,
government workflow, SLA/KPI records, `routing.ward_issue_contacts`, or
`complaints.ward_email_outbox`. The prior high-CPU incident was caused by request frequency rather
than relation bytes; this prune reduces operational and maintenance surface, not as a substitute
for request-loop prevention.

Migration `20260724110000_v1_bmc_general_intake_and_handoffs.sql` later adds one private
protected-handoff registry, so the current application-owned table count is 115.

The unused `@local-wellness/database/governance-sync` export and source/tests are removed with this
runtime boundary. `@local-wellness/database/governance-import` remains the canonical offline
source-validation/import tooling.

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
- `auth_audit_events` records actor, subject, authority, device, outcome and sanitized metadata as
  append-only history. The client-reportable allow-list includes the non-sensitive
  `password_changed` lifecycle event; passwords, OTPs, recovery tokens, phone numbers and provider
  payloads are never stored. Actor, subject and device UUIDs are immutable attribution snapshots
  rather than cascading foreign keys.

Access-lifecycle actor references use restrictive deletion semantics so an administrator identity cannot be deleted while it remains the recorded inviter, approver, grantor or revoker. Deactivate such identities instead of erasing provenance. Revoked memberships preserve any prior approval actor and timestamp.

The identity forward-fix migration adds the private, non-client-executable
`backfill_missing_auth_identities` operation. It idempotently creates a missing application profile
and non-privileged global citizen role for an existing `auth.users` row, normalizes only bounded
Auth identity metadata, never overwrites an existing profile, and does not reactivate a revoked
citizen-role record. The migration invokes it once so identities created before the profile trigger
can be repaired during upgrade.

Phase 2 adds restrictive foreign keys from `authority_memberships`, non-global `user_roles`, and authority-attributed audit events to `governance.authorities`. The forward fix first preserves any older arbitrary identifier as a `placeholder`/`other` authority with routing disabled, so an upgrade does not discard access history or misrepresent a legacy UUID as verified governance data. Placeholder authority scopes are retained for remediation but excluded from effective access. Scoped role writes additionally validate authority, ward, and authority-department ownership.

Phase 10 adds `avatar_object_path` and the server-maintained `avatar_updated_at` version to
`profiles`. The path is nullable and must be exactly the owning profile UUID plus one bounded
`avatar.jpg`, `avatar.jpeg`, `avatar.png`, or `avatar.webp` filename. The corresponding object stays
in the private `profile-images-private` bucket; the path is application-profile metadata, not a
public URL. A database trigger owns the version timestamp so clients cannot forge cache state.

Camera capture and media-library selection in mobile both reuse this same owner-private path; they
do not change the database or Storage authorization model. The current civic-area card is derived
from the verified governance resolver and remains in client memory. No profile coordinate or street
address column is introduced by that slice, avoiding storage of a new sensitive location field
without a separately reviewed privacy and access model.

Supabase Auth remains the credential source of truth. The service-only
`user_has_verified_phone` function reports only whether an Auth user has a non-empty phone and
non-null `phone_confirmed_at`; it does not return the phone number or an OTP. Privileged direct-RLS
checks still require a JWT at `aal2`. The API independently evaluates citizen confirmed-phone state
and privileged MFA: citizen production access is enforced at AAL1, while privileged rollout
retains its separately configured TOTP/AAL2 policy. No application OTP table or Storage-backed OTP
mechanism exists. The earlier `user_has_verified_phone_mfa` helper is retained only as an unused,
revoked legacy migration object.

Ordinary Phone Auth signup capability must remain enabled because Supabase applies that gate to
existing-linked-phone OTP requests. The `hook_require_email_identity(jsonb)` Before User Created
function accepts only an Auth creation event with a non-empty email, is executable only by
`supabase_auth_admin`, and returns a provider error for phone-only creation. Creating the function
in a migration does not activate the managed Auth Hook; each hosted project must configure that
binding separately.

The staging privileged-account helper adds no table, policy, or migration. It creates confirmed
synthetic identities in `auth.users`, relies on the existing profile trigger, and persists
authorization through `bootstrap_platform_administrator` and
`provision_government_invitation`. The resulting `user_roles` and `authority_memberships` records
have a bounded `effective_until`; current authorization stops when they expire even though the Auth
identity may still establish an AAL1 session. Generated passwords stay in Supabase Auth and the
operator's gitignored local `0600` artifact, never in an application table. Synthetic markers and
expiry hints in Auth user metadata are operational labels only and are never authorization input.
Automatic Auth-user teardown is not implemented, and this fixed staging matrix does not close the
existing-user lifecycle gap in `AUTH-001`.

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

`governance.import_batches` supports either an exact workbook SHA-256, an exact immutable
`source_bundle_sha256`, or both; at least one source artifact is mandatory. This avoids describing a
ZIP research bundle as a workbook while keeping every earlier workbook-backed import valid. Import
batch identity/source hashes and the file/record ledger remain immutable and platform-admin-only
under forced RLS.

The 2026-07-18 Maharashtra Batch 0 source bundle is recorded as one bundle plus all 28 members and
160 CSV records. It registers 38 canonical official-source URLs, enriches the existing Maharashtra
state with LGD `27`, and fills LGD codes on 35 exact existing district-name matches without changing
their verification, provenance, placeholder, or routing fields. `Mumbai`/LGD `482` is retained as a
reference-only import record because the canonical table uses `Mumbai City` and no reviewed alias
crosswalk was supplied. The batch creates no new authority, district, local body, ward, geometry,
contact, officer, assignment, asset, routing rule, synchronization endpoint, or public projection.

The machine validation report includes a per-file outcome matrix instead of only aggregate issue
counts. For the current 901 canonical rows, it records 41 accepted, 691 unverified, 169 quarantined,
and zero rejected outcomes. `accepted` means the row can enter the normalized structural baseline;
it does not promote the row to verified/routable state. Missing official evidence remains
unverified, and placeholder/template records remain quarantined or normalized to null/non-routable
fields. The pipeline does not rewrite the canonical CSV files or workbook.

Officer roles are durable definitions. Incumbency belongs to versioned `officer_assignments`.
Boundary geometry and complaint-routing references are versioned independently with half-open UTC
effective periods. Routing rows from the baseline remain `draft`, `unresolved`, and non-routable;
they are reference evidence for Phase 3, not executable rules.

The former Phase 3 governance synchronization and versioned-contact subsystem is historical. It
was never activated by a deployed application path and is retired by ADR-0031. The prune migration
physically removes its 14 tables, service RPCs, current-contact view, lifecycle/contact validators
and Storage-object guards. Historical migrations remain immutable, but the removed subsystem is
not part of the current V1 schema and must not be redeployed from those migrations in isolation.

Canonical source/import records and normalized governance rows remain. Current BMC routing/contact
selection uses the private `routing.ward_issue_contacts` matrix. Delivery readiness is resolved
from that matrix without returning contact values to clients. The private
`governance-raw-snapshots` Storage bucket may remain in an upgraded project because SQL does not
delete Storage objects; optional cleanup is an operator action through the Storage API/Dashboard
after retention review.

Migration `20260724120000_verified_civic_area_office_contacts.sql` extends the existing
service-role-only `public.resolve_verified_governing_bodies` JSON projection with an optional,
bounded `offices` collection without changing the function's SQL signature. Eligible rows come
only from `governance.offices`: they must be active, verified, non-placeholder, have a verification
date, use an active official HTTPS `reference_sources` row, and publish at least one non-empty
address, phone, or email. Missing contact fields are removed from the JSON. An exact ward result
includes exact-ward offices and wardless offices explicitly scoped to the resolved local body; it
never includes another ward's office. The partial
`governance.offices_verified_civic_area_scope_idx` supports this lookup.

The projection never reads `routing.ward_issue_contacts` and never emits its private complaint
recipients, WhatsApp numbers, officer mobiles, routing evidence, or internal IDs. `anon` and
`authenticated` retain no direct execution privilege; only the trusted service role calls the
projection through NestJS.

See `docs/governance-synchronization.md` for the explicitly retired historical boundary.

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

Migration `20260718100000_complaint_routing_evidence_diagnostics.sql` forward-fixes hosted
submission-function drift without changing these tables. The internal
`complaints.complaint_routing_evidence_mismatches` function compares the claimed actor/request and
draft category/asset/location evidence with the stored routing decision. The protected
`complaints.complete_complaint_submission_v2` implementation invokes that comparison at the
canonical point after prerequisite draft, location, category, emergency, and duplicate validation,
then preserves the original atomic complaint/assignment/history/replay transaction. Neither
internal function is executable by `anon`, `authenticated`, or `service_role`; only the public
submission wrapper retains service-role execute access.

Media reservations bind an owner, draft, client media identifier, kind/source, private bucket,
opaque object path, declared MIME type/size/checksum, optional capture-location evidence, and expiry.
Finalization records observed MIME type/size and a server-verified SHA-256 only after the API has
inspected the object. Photo/video and voice captures use separate private buckets. Processing and
moderation states are modeled but no provider automatically advances them in Phase 4.

Phase 10 makes the V1 proximity requirement a database invariant. Every issue category permits at
most 50-metre current-location accuracy and declares a media-to-issue maximum between 1 and 50
metres; the engineering seed uses 50 metres. The `complaint_location_evidence` insert trigger
rejects evidence above the category accuracy threshold and rejects media-capture evidence whose
PostGIS distance from the draft's selected current-location point exceeds the category threshold.
The server still validates the request before persistence, but PostgreSQL is the final fail-closed
boundary.

The purpose-scoped mobile current-area cache changes no database schema or evidence record. It is
memory-only, is limited to non-evidentiary Community/Profile/Nearby lookups, and cannot populate
`complaints.complaint_location_evidence`. Complaint issue and media points continue through the
fresh evidence path and the same PostgreSQL invariants. No migration, persisted coordinate cache,
scheduled location job, or database TTL was introduced.

The Community owner preview also changes no schema. It uses the existing actor-scoped
`public.list_owned_complaints` boundary through `GET /api/v1/complaints`; forced RLS and the
server-derived actor continue to prevent cross-account access. Its private rows are never copied to
the transparency schema. Publication, generalization, withdrawal, and engagement therefore retain
their existing review-gated tables and functions.

Duplicate checks select exactly one current verified, non-placeholder, routing-eligible policy;
use PostGIS distance, time, category, text similarity, media hashes, and asset evidence; cap the
candidate set; and retain the scored advisory result. They never merge or automatically reject a
complaint. Phase 8 later adds separately reviewed public projections plus account-bound support and
private star/follow state; neither reads nor mutates this private duplicate evidence. Phase 7 adds
private feedback and reopening through the server boundary described below.

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
- `routing_decisions`;
- `ward_issue_contacts` — private denormalized V1 ward/category recipient, phone, WhatsApp and
  provenance configuration generated from two immutable BMC archives. Phone/WhatsApp/category
  evidence and ward-email/office evidence retain separate source URLs, dates, record locators and
  raw source status; active rows additionally require explicit owner approval for staging routing.

Phase 3 creates these tables in an unexposed `routing` schema. Stable identities are separated from
effective-dated asset, ownership, policy, and rule versions. Temporal exclusion constraints reject
overlapping non-draft versions. Rules target durable departments and officer roles; an incumbent is
resolved from the current governance assignment at decision time. Fallback order is a versioned,
cycle-checked rule path rather than an application constant.

Migration `20260723120000_jagruksetu_complaint_taxonomy.sql` extends
`routing.issue_categories` rather than adding another table family. A category row explicitly
identifies whether it is an operational routing profile, taxonomy primary or taxonomy subcategory.
Taxonomy rows carry a stable code, derived workflow, sensitivity, configuration/routing state,
public/community defaults and an optional self-referencing operational-profile mapping. The
taxonomy seed adds 17 primaries and 340 subcategories across 19 workflows. The subsequent BMC
intake seed preserves 13 specialised mappings, maps 243 public/restricted leaves to one
`general_ward_complaint` profile and classifies 84 private/emergency-private leaves as
`protected_handoff`. The active V1 result is therefore 256 internally submittable leaves over 13
operational profiles plus 84 official handoffs, with no pending leaf.

`public.list_complaint_taxonomy()` is service-role only and returns the sanitized 340-leaf catalog.
`submission_available` is true only when the mapped profile/domain and matching `V1_WARD_*`
rule/version are active and verified and every eligible ward has an active owner-approved contact.
Protected rows return only bounded camel-case `handoff_actions` objects containing key, kind,
label, description, target and priority. Source evidence and recipient email remain private.
`complaints.assert_taxonomy_selection(category_id, custom_attributes)` validates the reserved
primary/subcategory/workflow tuple and its database-owned mapping. Draft writes call it, and a
separate complaint-insert trigger repeats the assertion so mapping drift cannot authorize a stale
submission. Legacy drafts with none of the three reserved keys remain compatible; partial or
tampered tuples fail.

`routing.complaint_handoff_actions` is a private, forced-RLS registry for official telephone and
credential-free HTTPS actions. Every active row must be owner-approved, effective and attached to
a private/emergency-private taxonomy row. Database constraints prevent an operational mapping,
public visibility, comments or Community support for all 84 protected leaves, including all 20
`COR` leaves. No protected row enters the BMC ward-email matrix or ordinary complaint flow.

`complaints.complaint_category_display_name(category_id, custom_attributes)` revalidates the stored
taxonomy tuple before using its detailed issue label. Citizen list/detail, government list/detail
and ward-email claims use this helper so a general operational profile does not erase the issue
type shown to users and recipients.

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

Phase 10 separates a routed government queue from optional external contact readiness. After the
ADR-0031 prune, the service-only `assignment_delivery_readiness` function first revalidates the
complaint assignment's current governance scope, then derives ward/local-body/authority contact
availability from active `routing.ward_issue_contacts` rows. A valid assignment reports
`governmentQueueStatus = verified_scope`; contact readiness reports only the selected scope and
available channel types and never returns recipient values. `automaticOutboundDelivery` remains
`false`: a separate trusted sender must claim and complete `complaints.ward_email_outbox`, and no
automatic SMS or WhatsApp sender is activated.

The V1 matrix is a deterministic merge rather than a new source registry. The immutable
`Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` contributes category, phone and WhatsApp evidence;
`local_wellness_bmc_ward_directory_2026-07-20.zip` contributes ward-email and office evidence.
Direct operational K/N and P/E mailboxes take precedence, while K/S uses the K/E parent-office
record and P/W uses the P/N parent-office record. Migration
`20260720103000_v1_ward_email_provenance.sql` requires each active row to retain the email source
URL, dates, locator, raw reported status and an independent owner-approved-for-routing flag. The
base matrix contains 312 records. Seed 56 copies the same approved source/provenance into one
general profile per ward, producing 338 active records. Forced RLS and revoked client privileges
keep all contact values private.

The additive V1 simplification also creates `complaints.ward_email_outbox`. A complaint assignment
created from a `V1_WARD_*` decision atomically snapshots its ward recipient exactly once. Service
workers may claim, complete or fail jobs through lease-checked RPCs; the table distinguishes
`pending`, `processing`, `retry`, `sent` and `dead`. It is forced-RLS and has no direct citizen or
browser grant. No sender runtime or provider is configured by the migration. ADR-0035's isolated
worker changes only how the existing RPCs are supervised; it adds no table, trigger, grant, or
migration.

### Communication

- `conversation_rooms`;
- `room_members`;
- `messages`;
- `message_receipts`;
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

The unused structural `complaint_comments` table had no creation/read RPC or runtime writer and is
physically removed by ADR-0031. A future public-comment capability requires a new moderation,
abuse, privacy and persistence decision rather than restoring that table implicitly.

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

-- Current BMC V1 complaint-submission facade (service role only).
select public.resolve_v1_ward_route(
  :actor_user_id,
  :request_id,
  :category_id,
  :longitude,
  :latitude,
  :accuracy_meters,
  :captured_at,
  :resolved_at,
  :asset_id
);
```

The candidate function returns state/district/taluka/local-body/ward identifiers and exact boundary
versions, asset/ownership versions and match distance, target identifiers, confidence weights,
signals, priorities, and fallback evidence. It deterministically caps output at 100 rows. It never
treats an unresolved Phase 2 routing reference as an operational rule. The API requires verified
hierarchy evidence and every row's five-entry boundary vector to equal the separately resolved
jurisdiction. Boundary provenance is validated by that independent PostGIS result and exact version
equality rather than requiring duplicate boundary entries in candidate explanation metadata.
Applicable rows with conflicting policy versions still fail closed.

`resolve_v1_ward_route` uses direct active ward boundaries first and versioned operational
crosswalks second. It loads the target and recipient from database rows, records the normal routing
decision, and returns only its UUID to the API. It never returns contact values. Unsupported
coordinates or unconfigured ward/category pairs record an `unsupported_area` decision rather than
falling back to a hardcoded municipality.

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

`supabase/master.sql` is the deterministic, single-file clean-bootstrap form of all ordered SQL
files in `supabase/migrations/`. The two smaller files provide adaptive Dashboard reconciliation for
an existing database created from an earlier Local Wellness master. Part 1 ends at the complete
Phase 5 schema/security boundary; Part 2 contains the remaining ordered forward migrations.
Catalog fingerprints detect a coherent completed prefix, whole completed migrations are skipped,
and only exact missing immutable source migrations execute. Each part is one transaction protected
by an advisory transaction lock. Partial or non-contiguous fingerprints fail before later SQL runs.
Every artifact records exact source filenames and SHA-256 digests. Seeds remain separate.

Run `pnpm database:master:generate` after adding or changing an unapplied migration and
`pnpm database:master:check` in verification; the check covers the complete file and both guarded
upgrade parts. Never put any generated artifact in the migration directory. Use `master.sql` only
for an empty compatible database, and use the parts only when the database came from a coherent
earlier Local Wellness migration prefix. Do not weaken a fingerprint failure with blanket
`IF NOT EXISTS`: that can conceal missing constraints, functions, policies, triggers, or RLS.
Executing SQL in the Dashboard does not register source versions in
`supabase_migrations.schema_migrations`, so operators must reconcile the ledger before a later CLI
push even after a successful Dashboard upgrade.

For the current hosted target, a smaller deterministic artifact exists at
`supabase/deploy/current-session/01_migrations_39_through_43.sql`. It is exactly 77,849 bytes and is
valid only when migration 38 (`20260716115000_phase_10_profile_images.sql`) is complete. One
advisory-locked transaction fingerprints migrations 39–43, skips a coherent completed prefix,
executes exact missing source bytes in order, and verifies migration 43 plus
`public.api_readiness_check()` before commit. It changes neither the official migration ledger nor
seed data. A baseline, partial, or non-contiguous error is a stop condition; reconcile the target or
use the two adaptive master parts when their coherent-prefix contract applies.

That compact artifact intentionally ends at migration 43. A current target with the BMC routing
data already present must run the complete additive
`supabase/migrations/20260718100000_complaint_routing_evidence_diagnostics.sql` separately through
the SQL Editor when direct database access is unavailable. The file uses deterministic function
replacement and is safe to rerun after a complete successful execution. It does not load or modify
BMC seed data and does not repair the official migration ledger.

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

Phase 3 enables and forces RLS on all 15 routing tables. The `routing` and `governance` schemas
remain outside the Data API allow-list. Anonymous and ordinary authenticated roles cannot execute
routing RPCs or read private routing/governance tables. The service role receives narrowly scoped
access to category, jurisdiction, candidate and decision wrappers. The former synchronization
tables and retrieval RPCs are removed by ADR-0031; there is no V1 synchronization lease or raw
snapshot database surface after the prune.

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
Messages, delivery attempts, and source outbox records are immutable; read positions, notification
read time, and job/delivery lifecycle updates are constrained by guarded triggers. The unused
public-comment table is removed by ADR-0031; public comments remain outside the V1 persistence and
API contract.

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
database execute surface. The later `public_complaint_engagements` table uses the same forced-RLS
and direct-ACL denial. Only narrow service-role functions may list or set the authenticated actor's
current state; public reads receive aggregate support counts and never supporter identities or
another account's private star/follow flag.

Phase 9 enables and forces RLS on all 19 SLA, escalation, and KPI tables and continues the schema-
wide direct-table denial, including for `service_role`. Platform-admin publication and trusted
worker claim/execute/fail operations use narrow service-role wrappers. Government read wrappers
receive the actor UUID derived from a verified bearer token and recheck current role assignment,
authority membership, complaint assignment, and requested municipality/ward/department scope.
Policy evidence, lease tokens, complaint clocks, escalation jobs/events, and KPI source rows are
not client tables.

Phase 10 stores fixed-window API quota counters in the forced-RLS
`private.api_rate_limit_windows` table. Subjects are SHA-256 values produced by the API rather than
raw user IDs or client addresses. Only narrow service-role functions may consume a quota or purge
a bounded batch of expired windows. The service-only readiness function checks the citizen role and
all five required private Storage buckets without exposing their rows. Phone-factor and privileged-
MFA helper functions expose only boolean authorization decisions. Profile-image object policies
permit an authenticated user to select, insert, replace, or delete only allowed avatar paths under
their own UUID prefix; the single current profile metadata path remains validated by the API and
database constraints.

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

Phase 10 adds `profile-images-private` with a 5 MiB limit and an allowlist of JPEG, PNG, and WebP.
Citizen web and mobile validate the declared type, size, extension, and supported file signature,
then use owner-scoped Storage policies and short-lived signed read URLs. The API records only the
validated owner path and the database versions its timestamp. There is no public bucket or public
profile-image URL. Signature validation is not full image decoding, malware scanning, metadata
stripping, or moderation; those controls and orphan reconciliation remain deployment follow-up.

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

## Hosted Performance Diagnosis

The number of application tables is not, by itself, a database CPU diagnosis. PostgreSQL does not
scan every table for an ordinary request. Hosted pressure is driven by the frequency and execution
plans of active queries, the number of rows they process, lock waits, temporary-file and I/O work,
write churn and dead tuples, and whether autovacuum and the existing indexes keep pace with that
workload.

Run the read-only
`supabase/deploy/diagnostics/database_performance_audit.sql` script against the affected hosted
project while the pressure is observable. It uses a read-only transaction and bounded statement
timeout to report:

- extension and statistics settings, including `pg_stat_statements` availability;
- cumulative query frequency and execution cost from `pg_stat_statements`;
- currently active queries and wait events from `pg_stat_activity`;
- live/dead tuple, sequential-scan, index-scan, and autovacuum statistics for likely hot tables;
- index usage and definitions for routing and complaint-capture paths; and
- the largest user tables and their observed scan activity.

Interpret cumulative results relative to the reported statistics-reset timestamp. The active-query
section is only a point-in-time sample, so capture the audit during the slowdown rather than after
the workload has stopped. Normalized query text and active statements are operationally sensitive
and can contain literals; retain the output privately and do not paste it into public tickets,
commits, or documentation.

Current code review identifies the following paths for measurement, not as proven hosted root
causes:

- duplicate PostGIS jurisdiction resolution during one routing request;
- reviewed-public feed and hotspot projection/aggregation queries;
- the database write performed for each enforced API rate-limit check; and
- complaint draft, location-evidence, and media requests that fan out into several API/database
  operations before submission.

Do not add an index from schema inspection alone. First correlate a candidate with material calls or
execution time in `pg_stat_statements`, then capture its plan with `EXPLAIN` and use Index Advisor
where it supports the query shape. Validate the proposed index against representative hosted-scale
data and remeasure after deployment. Use `EXPLAIN (ANALYZE, BUFFERS)` only for controlled read-only
queries in staging; do not analyze volatile submission, claim, or rate-limit functions on the
hosted project because they mutate state. Index Advisor does not replace plan review and may not
recommend the GiST expression indexes required by PostGIS predicates.

This diagnostic slice adds no migration or index. Any resulting optimization must be delivered as
an additive, tested migration or an application query change after the live evidence identifies the
actual bottleneck.

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

At the historical Phase 3 checkpoint, three ordered migrations covered the routing model,
governance-synchronization persistence and its service-only security/RPC boundary. The then-current
database/package/API tests covered routing, synchronization lifecycle, publication eligibility,
PostGIS resolution and safe dependency failures. That checkpoint passed all 450 pgTAP assertions
across 11 plans, including 102 Phase 3 routing/synchronization assertions.

ADR-0031 later removes the synchronization persistence/RPC boundary and its unused package/tests.
Those historical assertions are not part of the current V1 release count; pruning plan
`050_v1_database_pruning.test.sql` verifies intentional absence and retained V1 contracts. At the
original Phase 3 checkpoint,
synthetic verified fixtures remained inside rolled-back tests and the reset bootstrap retained zero
operational categories. The later generated BMC non-production seeds are documented at the current
repository cutoff below; neither checkpoint creates a production route from placeholder or
unverified evidence. Repository-wide formatting, lint,
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

Synthetic verified Phase 4 fixtures are rolled back. The canonical baseline at that checkpoint had
zero operational categories and could not create a complaint from placeholder or unverified
evidence. The later generated BMC pack is the only bounded local activation and is documented at
the current cutoff below. The previous staging target received the earlier schema and
non-production seeds; the replacement target is unreconciled. Hosted RLS/RPC/Storage workflow
smokes, verified Pune data, and a physical-device media submission remain pending; see the Phase 4
testing worklog.

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
public-safe output, PostGIS resolution, and migration grants. The verified-directory milestone run
applied all 30 migrations and passed all 1,085 assertions across 28 plans; application-schema lint
also passed. Synthetic directory entities and boundaries are transaction-rolled-back fixtures and
do not create pilot coverage. The current repository-wide database result is recorded with the BMC
activation section below.

The previous managed staging deployment recorded on 2026-07-14 applied all 23 migrations through
`20260714124000` and all six reviewed non-production seed files. The existing citizen Auth identity
was reconciled by the idempotent profile backfill. Post-seed checks found 12 category records with
zero operational and 11 synchronization endpoints with zero active. No official ward or geometry,
operational route, complaint, application, Edge Function, Cron, source/scope activation, or
production deployment was created by that database operation.

The owner later switched the configured staging target and reports applying a generated master SQL
file. The exact artifact revision and current target ledger were not independently verified, so the
historical deployment above must not be treated as ledger evidence for the replacement project.
Reconcile that target against all 55 current migrations through
`20260724120000_verified_civic_area_office_contacts.sql` before a managed release. SQL Editor
execution of the prune changes schema but does not repair the Supabase CLI migration ledger.

An earlier read-only hosted audit found `api_readiness_check()` healthy and all five required
private Storage buckets present but returned zero category projections and no tested BMC governing
body. That data observation is superseded: a later clean authenticated smoke returned 12 catalog
categories, three operational categories, finalized private media, verified K/W jurisdiction, and
one deterministic mosquito-breeding route. The final hosted submission still failed at the stored
routing-evidence completion gate. The same complete flow returns `201` against local Supabase after
migration `20260718100000`, so hosted staging needs that additive repair and a post-migration smoke;
it does not need its BMC seeds reloaded merely to fix submission.

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

Migration `20260717100000_public_complaint_engagements.sql` adds one private
`public_complaint_engagements` row per complaint/account with independent support and follow/star
flags. Its composite primary key limits one account to one support state for a complaint. Public
projection payloads expose only `supportCount`; an authenticated active account may retrieve or set
only its own `supported` and `starred` flags through bounded service-only functions. Both functions
resolve current reviewed projections, so withdrawal removes the current engagement surface without
deleting retained private history. The public feed can order the same bounded viewport by `recent`
or live aggregate `trending`; mutable counts mean cursor pages are not a frozen ranking snapshot.
No engagement field is referenced by routing, assignment, workflow status, escalation, SLA, or KPI
tables.

Phase 8 is delivered by additive migrations `20260716102000_phase_8_transparency_schema.sql`,
`20260716103000_phase_8_transparency_security_and_rpc.sql`,
`20260716105000_phase_8_transparency_rpc_and_acl_forward_fix.sql`, and
`20260716106000_phase_8_duplicate_group_publication.sql`, with the later engagement migration
`20260717100000_public_complaint_engagements.sql`. The focused transparency pgTAP run passed
120 assertions across plans 029, 030, and 044, including rollback-isolated engagement behavior and
schema/ACL coverage. The clean local 43-migration reset, generated-type check, schema lint, and all
1,542 assertions across 44 pgTAP plans passed. No managed environment, visibility policy, or public
projection was activated by this verification.

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

Phase 10 adds six forward migrations:

- `20260716112000_phase_10_api_hardening.sql`;
- `20260716113000_phase_10_privileged_mfa.sql`;
- `20260716114000_phase_10_citizen_phone_mfa.sql`;
- `20260716115000_phase_10_profile_images.sql`;
- `20260716116000_phase_10_complaint_location_proximity.sql`;
- `20260716117000_phase_10_routing_delivery_readiness.sql`.

Two additive post-Phase-10 migrations extend the current database:

- `20260716118000_bmc_ward_relationship_versions.sql` adds effective-dated operational-ward to
  administrative-zone membership and official-boundary crosswalk versions, with temporal,
  provenance, hierarchy, routing-eligibility, forced-RLS, and service-role constraints;
- `20260716119000_government_invitation_scope_options.sql` adds the service-role-only
  `public.list_government_invitation_options(uuid[])` projection used by the Admin Console.

Three later product/hardening/import migrations complete the current cutoff:

- `20260717100000_public_complaint_engagements.sql` adds account-bound reviewed-public support and
  private star state;
- `20260718100000_complaint_routing_evidence_diagnostics.sql` adds exact granular routing-evidence
  diagnostics and a protected canonical V2 complaint completion implementation;
- `20260718110000_governance_source_bundle_imports.sql` adds exact ZIP source-bundle provenance
  without fabricating a workbook hash and requires at least one exact source artifact per import.

The invitation projection returns only active, verified, non-placeholder, routing-eligible
authorities, wards, and authority departments. `anon` and `authenticated` cannot execute it; the
trusted API supplies the caller-authorized authority filter and strictly decodes the result.

The current repository cutoff is 55 ordered migrations through
`20260724120000_verified_civic_area_office_contacts.sql`. Migration
`20260720103000_v1_ward_email_provenance.sql` adds the email-specific source URL,
source-as-of/check dates, deterministic record locator, raw source-reported status and explicit
owner staging-approval evidence required by every active V1 matrix row. It does not make the
recipient public or install an outbound sender. Migration 49 extends the existing
append-only authentication audit constraint with `password_changed`; it adds no password-bearing
column and exposes no new table. Migration 50 performs the V1 physical prune documented above.
Migration 51 adds the citizen taxonomy metadata/RPC/validation layer without adding a table or
changing existing operational profile identifiers. Generated seed
`55_jagruksetu_complaint_taxonomy.generated.sql` is separate deployment data.
Migration 52 adds only the service-role confirmed-phone projection over current
`auth.users.phone`/`phone_confirmed_at`; it creates no OTP, credential or application-auth table.
Migration 53 adds the email-required Before User Created Auth Hook function, grants execution only
to `supabase_auth_admin`, and creates no credential or application-auth table.
Migration 54 adds the forced-RLS protected-action registry, fail-closed full-ward readiness,
taxonomy-aware display names and sanitized handoff projection. Generated seed
`56_jagruksetu_bmc_intake.generated.sql` adds the general route/profile, 26 general contacts and
the official handoff rows. Migration 55 adds the bounded, sanitized, service-role civic-area office
projection and its partial lookup index; it adds no office seed rows and exposes no private routing
contact.
Plans 033–039 define 124 assertions for quota/readiness ACLs and
behavior, privileged MFA and the historical citizen-factor helper, private profile-image
metadata/Storage policies, the
50-metre location/media invariant, and the queue-versus-contact readiness boundary. Plan 049 adds
four rollback-isolated assertions for the new allow-list value, sanitized metadata retention and
unknown-event rejection. Plan 052 adds ten assertions for the service-only confirmed-phone
contract, and plan 053 adds eight assertions for the email-required Auth creation hook. Existing
routing and government-workflow plans also assert the exact
authority, department, role, assignment, and placeholder fail-closed behavior. These tests do not
activate a real municipality, contact, routing rule, or outbound-delivery channel.

The latest full clean local reset before migration 55 applied through migration 54 and the complete
then-current seed history. All 50 then-current pgTAP files passed 1,640 assertions.
Application-schema database lint found no error; an additional all-schema inspection reported only
the pre-existing PostGIS extension-body false positives and no project-function error.
Deterministic master-SQL verification passed. Migration 55 was then applied directly to local
Supabase and its focused plan passed 15 assertions. These results do not apply migrations 52–55,
seeds 55–56 or any Auth setting/hook to hosted Supabase.

The generated legacy BMC staging pack imports 114 source records across ten source tables, preserves six
documented warnings, and creates source-backed BMC authority/zone/operational-ward/office/
department/role/officer/assignment/contact/boundary/category evidence. Its four generated files are
applied in order: `50_bmc_demo_governance.generated.sql`,
`51_bmc_demo_governance_checksum.generated.sql`, `52_bmc_demo_routing.generated.sql`, and
`53_bmc_demo_routing_verification.generated.sql`.

For an existing pre-V1 Local Wellness schema whose seed rows are absent, the generated
`supabase/deploy/bmc-mobile-demo/` directory repackages that data into four SQL Editor-sized,
transaction-atomic parts: baseline categories/core, official boundaries, ward crosswalk/governance
verification, and routing activation/verification. It does not alter the canonical Maharashtra
inputs, hide a partial schema, populate the migration ledger, or approve external delivery.
The schema must first be complete through migration 43: use the compact current-session bundle only
from a verified migration-38 baseline, or stop/reconcile and use the adaptive master parts as
appropriate before running BMC parts 01–04. This is a bootstrap-only path: afterward apply exact
migrations 44–46, the current V1 artifact for migrations 47/48 plus seed 54, and then migrations
49–50. Apply migration 51 plus seed 55 only through the later taxonomy deployment path. Never
replay the legacy bootstrap into an already-pruned project. Apply migration 52 afterward to add
the service-only citizen confirmed-phone check, followed by migration 53 for the email-required
Auth creation hook. Apply migration 54 plus seed 56 only through the generated BMC intake
deployment after the taxonomy and 312-row ward matrix are present.

The routing activation makes only `garbage_dump`, `missed_sweeping`, and `mosquito_breeding`
operational. One confidence-policy version, three category-specific duplicate-policy versions, and
66 immutable direct route-rule versions cover exactly 22 one-to-one ward/category combinations.
Rules target the source-backed BMC authority, appropriate department, durable Ward Assistant
Commissioner role, and matching ward office without inventing assets or fallback chains. The other
nine categories remain draft/unverified/non-routable; their canonical BMC references all require
verified asset inventories and ownership. Split `K/S`, `K/N`, `P/E`, and `P/W` units and legacy K/P
boundary anchors remain excluded.
No complaint-intake contact is delivery-approved, so verified internal routing does not claim that
Local Wellness lodged a complaint in BMC's official grievance system.

The prior clean local reset applied all 42 migrations and reviewed seeds. All 1,513 assertions across 43
pgTAP plans passed, including the 20-assertion BMC internal-routing activation plan and the
nine-assertion invitation-options plan. At that historical cutoff, generated database types and the 42-migration master
artifacts were regenerated and passed drift checks. These results are local; they do not show that
any BMC seed or route exists in a managed Supabase project.

The compact current-session artifact was separately exercised against a local database stopped at
migration 38. It applied migrations 39–43 successfully in one transaction, and an immediate second
execution safely detected and skipped all five completed migrations. Focused plans 038, 039, 040,
042, and 044 then passed 90 pgTAP assertions covering the five upgraded migrations. This does
not claim a hosted execution; the separate full 43-migration aggregate result is recorded above.

The additive migration-44 verification adds rollback-isolated plan
`045_bmc_complaint_submission_integration.test.sql`. Its focused run passes 35 assertions covering
the BMC A-Ward draft/location/media/duplicate/routing/submission path, exact replay, protected V2
ACL, granular mismatch classification, and internal-only delivery. A separate in-process NestJS
smoke completes category lookup, draft creation, GPS evidence, duplicate review, routing, and
submission with `201`. These are local results; hosted staging remains pending until the migration
is applied and the read-only runtime audit plus authenticated receipt smoke pass.

Required:

- migration tests;
- RLS tests;
- foreign key tests;
- status transition tests;
- spatial routing tests;
- concurrent complaint assignment tests;
- idempotency tests;
- notification outbox tests.
