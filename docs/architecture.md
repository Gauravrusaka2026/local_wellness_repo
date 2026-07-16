# Architecture

## Purpose

This document defines the technical architecture for the Local Wellness platform.

The system is designed as a modular monolith for V1, with clear package and application boundaries that allow later service separation.

---

## Architectural Goals

- fast V1 development;
- strong domain separation;
- secure public-service workflows;
- scalable complaint routing;
- traceable government actions;
- reliable realtime communication;
- configurable city and ward data;
- Maharashtra-first, India-ready design.

---

## High-Level Architecture

```text
Citizen Mobile App
Citizen Web
Government Dashboard
Admin Console
        |
        v
API Gateway / NestJS API
        |
        +-------------------+
        |                   |
        v                   v
Complaint Services     Realtime Server
Routing Engine         Socket.IO
Location Service
Authority Service
        |
        v
Supabase PostgreSQL + PostGIS
Supabase Auth
Supabase Storage
        |
        v
Workers
Notifications
Media Processing
SLA Escalations
Analytics Aggregation
Government Integrations
```

---

## Runtime Components

### Mobile Application

Responsibilities:

- citizen onboarding;
- authentication;
- location permissions;
- live media capture;
- complaint creation;
- complaint tracking;
- notifications;
- feedback;
- reopening;
- nearby complaint map.

Phase 4 implements the signed-in home, resumable complaint draft, current-location evidence, live
photo/video/voice capture, private upload, duplicate review, submission receipt, and owned
complaint history slice. Phase 6 adds durable in-app notification history/read state and private
complaint messages. Its optional Socket.IO connection refreshes REST-backed state and does not
replace durable history. Phase 7 adds private before/after resolution review, policy-driven outcome
ratings and confirmation, and policy-controlled reopening with live additional evidence. Reopen
windows, rating bounds, reason codes, evidence requirements, and escalation thresholds come from
the server-resolved policy rather than mobile constants. Maps, background synchronization,
push/email delivery, and public complaint views remain later-phase work. Asset-dependent categories use an authenticated,
database-driven nearby-asset picker and remain unavailable unless the category, jurisdiction,
asset/version, ownership, and owner scope are current, verified, non-placeholder, and routable.
The client advances only when server-derived location evidence is `verified` or
`partially_verified`.

### Citizen Web

Responsibilities:

- public complaint views;
- complaint tracking;
- account access;
- locality map;
- public transparency pages.

The current account slice treats Supabase Auth and the application profile as separate boundaries.
The SSR callback establishes the session; the page then loads the validated profile through the
NestJS API. It renders explicit onboarding, missing-profile, and API-unavailable states rather than
showing a blank account or trusting Auth metadata as application state. Web, API, and Auth must use
the same Supabase environment.

### Government Dashboard

Responsibilities:

- complaint queue;
- ward and department views;
- assignment;
- status updates;
- internal notes;
- citizen communication;
- resolution evidence;
- SLA monitoring;
- KPI dashboards.

Phase 5 implements the authenticated, server-rendered complaint queue and detail workspace. Queue
filters and cursor pagination are evaluated inside the actor's current role assignment. The detail
view includes private complaint/location/media evidence, routing and assignment summaries, immutable
timeline/history, inspections, work references, dependencies, internal notes, and private
resolution evidence. The UI renders only the actions returned by the server for the selected current
role/scope and workflow state.

Actions cover acknowledgement, versioned assignment or same-authority transfer, approved status
transitions, private notes, inspection scheduling/completion, work references, external dependency
creation/closure, private evidence upload/finalization, and resolution submission. Exact coordinates
are shown only to an authorized government user as text. The interactive map remains an explicit
placeholder until a provider, key, and coordinate-sharing/privacy policy are reviewed. SLA/KPI
analytics remain later work. Phase 6 adds the complaint's private conversation. Server-rendered
history is reconciled through authenticated REST, while the browser supplies its session token to
an optional realtime connection at runtime rather than serializing it into page markup.

Phase 7 requires a captured completion location for each new resolution and allows an existing work
reference to be linked. The dashboard also renders the authorized resolution, citizen feedback,
reopen, and escalation history. It does not infer policy, verification, or allowed workflow action
from displayed data.

### Admin Console

Responsibilities:

- municipality setup;
- ward configuration;
- department configuration;
- officer assignments;
- routing rules;
- SLA rules;
- escalation policies;
- moderation;
- audit inspection.

### API

NestJS modular application.

Core modules:

- auth;
- profiles;
- devices;
- governance;
- jurisdictions;
- departments;
- officers;
- complaints;
- media;
- location;
- routing;
- assignments;
- statuses;
- feedback;
- reopening;
- notifications;
- moderation;
- analytics;
- integrations;
- audit.

### Realtime Server

The Phase 6 Socket.IO server verifies a Supabase access token supplied in handshake auth, checks the
application profile is active, and disconnects the socket when that token expires. It maintains a
private per-user delivery room and database-authorized complaint, authority, ward, and department
subscriptions. Room participation rows are audit evidence, not authorization; access is derived
again from the current complaint owner or effective government scope.

Persistent message, read-receipt, status, and notification events use strict shared schemas and
versioned envelopes. Message creation and read advancement persist in PostgreSQL before any room
broadcast. Typing signals are deliberately ephemeral but still require a fresh complaint access
check. Exact-origin allowlisting, a bounded HTTP buffer, disabled compression, per-socket operation
limits, and a maximum room count constrain the transport boundary.

A PostgreSQL-leased delivery pump emits queued events to the intended user only after rechecking
active-account and complaint access. Stable event identifiers support deduplication, and clients
reconcile through REST because Socket.IO delivery is at-least-once rather than durable storage. The
V1 pilot remains single-instance; Redis adapters and multi-instance presence are not implemented.

### Workers

Responsibilities:

- media processing;
- speech transcription;
- notification delivery;
- SLA scheduling;
- escalations;
- duplicate detection;
- analytics aggregation;
- government portal synchronization;
- contact data refresh jobs.

Most entries remain target responsibilities. Phase 6 implements the notification-outbox
materialization worker: it polls narrow service-only RPCs, claims PostgreSQL jobs with bounded
leases, materializes data-minimized per-user notifications and channel rows, and records bounded
retry or terminal state. In-app history is operational in engineering; realtime rows are consumed
by the Socket.IO process. Push and email rows are explicitly `unsupported` until providers and
consent/preferences are approved.

Phase 4 duplicate evaluation still runs synchronously through PostgreSQL plus the pure routing
package. Transcription, media processing/moderation, private-object cleanup, SLA processing, and
analytics workers are not operational. Governance retrieval runs separately through a Supabase
Scheduled Edge Function; its source schedule is inactive by default. No Redis, BullMQ, or Sentry
dependency backs any of these boundaries.

### Governance Synchronization

The permanent synchronization subsystem uses this review-gated topology:

```text
official government source
  -> Supabase Cron
  -> custom-secret governance-sync-fetch Edge Function
  -> PostgreSQL FOR UPDATE SKIP LOCKED claim + short lease
  -> exact-host allowlisted HTTPS retrieval
  -> immutable content-addressed private Storage snapshot
  -> source-specific parser
  -> pure normalizer and validator
  -> entity matching and change detection
  -> attributed human review
  -> versioned production record
```

The implemented Edge function owns only claim, fetch, and snapshot preservation. PostgreSQL is the
coordination and audit source of truth: it permits exactly one source claim per dispatch, prevents
concurrent claims, fails and backs off expired leases without immediately reclaiming them, links
conditional `304` responses to prior evidence, and records bounded retry backoff. Edge leases are
300–900 seconds (300 by default), the trusted database boundary permits 180–900 seconds, and the
function heartbeats before and after Storage persistence.

Each source contract has a deterministic SHA-256. Activation requires exact approval of the current
hash by an active global platform administrator; supported MIME types, HTTPS port 443, no fragments,
and exact hosts are database invariants. Snapshot finalization verifies the corresponding
`storage.objects` size/MIME metadata, referenced objects become immutable, and the Edge adapter
retains content-addressed bytes after a failed or ambiguous finalization. Grace-period reconciliation
checks for a late database commit before removing a true orphan, avoiding an eager-delete race. The
source-contract hash is introduced with nullable/backfill/`NOT NULL` migration sequencing so
populated databases upgrade safely. The environment-specific Cron job and dispatch secret are
deployment configuration. No pilot source is active in the repository seed, and DNS/private
resolved-address enforcement, reconciliation, parsers, matching, review API/UI, and publication
remain production gates.

Pilot synchronization coverage is database data, not an application branch. The service-only,
forced-RLS `governance.sync_scope_targets` registry selects canonical authority, local-body, or ward
targets with immutable hierarchy. Activation requires an active global platform-administrator
review. Routing eligibility remains a separate gate and can become true only when the referenced
canonical entity is independently active, verified, non-placeholder, and routable. The bootstrap
selects five Pune and five Brihanmumbai ward targets only as draft/unverified/non-routable
engineering scope. Their canonical ward rows and V1 scope rows remain placeholder audit history.
The next reviewed pilot scope must use official BMC administrative wards `A`–`E` and Pune's current
official numeric wards `1`–`5`, each backed by authoritative identity and geometry evidence. The
system must never ordinal-map `BRIH-W01`–`BRIH-W05` to BMC's lettered wards; reviewed records and a
new scope version are required.

---

## Monorepo Boundaries

### Applications

Applications contain runtime-specific code.

Business logic should not be implemented directly inside React components.

### Shared Packages

#### `packages/database`

- generated database types;
- database helpers;
- migration utilities;
- query abstractions;
- test fixtures;
- governance-synchronization stage, lifecycle, publication-eligibility, and pure contact-normalizer
  contracts.

#### `packages/api-client`

- platform-neutral authenticated HTTP client;
- injected token and fetch boundaries;
- strict response decoders supplied by each consumer;
- idempotency-key propagation, cancellation, and safe error normalization.

#### `packages/types`

- shared domain interfaces;
- discriminated unions;
- constants;
- event types.

#### `packages/validation`

- Zod schemas;
- request validation;
- environment validation;
- import validation.

#### `packages/routing-engine`

- GIS and routing data-provider abstractions;
- evidence eligibility;
- category and asset-ownership routing;
- department, officer-role, and assignment resolution;
- database-materialized fallback candidate ranking;
- confidence and ambiguity evaluation;
- routing explanation;
- configurable duplicate scoring.

#### `packages/design-system`

- shared tokens;
- reusable components;
- accessibility primitives.

#### `packages/localization`

- Marathi;
- Hindi;
- English;
- translation keys;
- date and number formatting.

#### `packages/config`

- environment parsing;
- feature flags;
- application configuration.

#### `packages/observability`

- logging;
- tracing;
- error reporting;
- metrics;
- correlation IDs.

---

## Domain Model

### Identity Domain

- Supabase Auth identities;
- citizen profiles and preferred language;
- hashed device registrations;
- immutable system roles;
- time-bound scoped role assignments;
- authority memberships;
- append-only authentication audit events.

Supabase Auth proves identity. Current database state determines authorization so revoked or expired access does not remain valid until a JWT refresh. Client applications receive only the public project URL and publishable key (or legacy anonymous key); the secret/service-role key exists only in the trusted API runtime. The API verifies each bearer token with Supabase Auth, reauthorizes ownership and scope, and performs identity writes through audited database operations. RLS and column privileges remain a second boundary for direct data-API access.

Device registration and soft revocation are atomic with their audit events. Sensitive device hashes and push tokens remain server-only. Client session events are explicitly marked as client-reported; provider logs and server-generated access events carry the authoritative security meaning.

### Governance Domain

- canonical authority supertype for grantable government scope;
- state, district, taluka, local body, multi-district coverage, administrative unit, and ward hierarchy;
- department, authority-department, office, utility, and emergency-contact catalogs;
- durable officer roles, real officers, and versioned officer assignments;
- versioned PostGIS jurisdiction boundaries;
- versioned, non-operational complaint-routing references;
- append-only import batches, source files, raw records, checksums, and normalization dispositions.

Phase 2 implements this domain in an unexposed `governance` schema. The hash-pinned CSV exports are the machine-readable input and the workbook is the human reference. A deterministic repository pipeline validates and renders the seed; it never rewrites either canonical source. Verified directory rows may be read only through explicit RLS grants, while placeholders, unresolved routing labels, import provenance, officers, and assignments remain restricted to their authorized management scope. No Phase 2 client write surface or public governance endpoint exists.

State, state-agency, district, local-body, and utility identities reference the authority supertype. Phase 1 memberships and scoped roles now use restrictive foreign keys to that registry; any pre-Phase-2 identifier is retained as an explicitly marked, non-routable legacy placeholder until reconciled and is excluded from effective access. Structured parent types are enforced, parent/scope keys are immutable, and row plus whole-graph checks reject authority cycles. Taluka, local-body, ward, office, and assignment relationships are independently constrained so a supplied child scope cannot silently point outside its supplied parent.

Boundary, assignment, and routing-reference versions retain UTC effective periods and append history instead of replacing it. PostgreSQL temporal exclusion constraints prevent overlapping non-draft versions, and PostGIS `MultiPolygon` geometry uses SRID 4326, valid longitude/latitude bounds and GiST indexing. Because the supplied data has no usable polygons, the baseline seed creates no boundary version and therefore cannot claim real jurisdiction routing.

Phase 3 establishes the permanent governance-synchronization foundation without turning source
retrieval into automatic publication. The current operational slice adds reviewed-source claims,
short PostgreSQL leases, safe generic HTTPS retrieval through a custom-secret Supabase Edge
Function, immutable raw Storage snapshots, conditional `304` reuse, bounded retry scheduling, and
append-only events/evidence. Source definitions, runs, normalized candidates, detected changes,
review items, contact versions, and review events remain inside the private governance boundary.
The typed `@local-wellness/database/governance-sync` contracts keep retrieval, preservation,
normalization, matching, change detection, review, and transactional publication as separate ports.

Synchronization follows a mandatory review gate:

```text
queued -> retrieving -> snapshot_preserved -> normalizing -> matching
       -> detecting_changes -> awaiting_review -> approved -> publishing -> published
```

Rejected and failed runs are terminal; a retry creates a new run. Source claims and matching scores
cannot verify data automatically. Placeholder evidence may only remain quarantined and
non-routable. The repository CSV bootstrap stays immutable and separate from official-source
snapshots.

Official contact identity is separated from changing values. `contact_channels` binds one durable
authority, local body, ward, department, office, role, officer, assignment, utility, or emergency
contact to a channel type, visibility, and intended use. `contact_channel_versions` append values
with effective periods and exact snapshot/record provenance. Source verification only stages a
value. Public visibility requires an active, non-placeholder, manually reviewed published version;
complaint delivery additionally requires a separately approved public-official complaint-intake
channel. Existing contact columns are migration-only and cannot be overwritten.

The seed registers ten PMC/BMC pilot endpoints as draft/unverified contracts. No source is
scheduled or claimable. The Edge function stops after `snapshot_preserved`; source-specific
HTML/PDF parsers, candidate orchestration, matching, publisher, review API/UI, and Storage-orphan
reconciliation are pending.

As of 2026-07-14, the dedicated staging database contains all 23 migrations through
`20260714124000` and all six reviewed non-production seeds. Its fail-closed state is 12 categories
with zero operational and 11 synchronization endpoints with zero active. This validates only the
managed database baseline: applications, the Edge Function, Cron, source/scope activation,
official ward records or geometry, routes, complaints, and production remain undeployed or
inactive.

### Complaint Domain

- resumable complaint draft;
- append-only exact-location evidence;
- private media reservation and verified finalization;
- submitted private complaint;
- server-derived initial assignment;
- append-only status history;
- durable submission replay record;
- append-only duplicate-check run and matches;
- private resolution evidence and versioned government resolution records;
- effective-dated resolution policy versions;
- append-only citizen feedback, reopen requests, additional evidence, and escalation events.

Phase 4 stores complaint capture state in an unexposed, forced-RLS `complaints` schema. Clients do
not receive schema access and use authenticated NestJS endpoints only. Narrow service-role RPCs
revalidate actor ownership and lifecycle relationships; the client cannot choose official status,
visibility, complaint number, storage path, authority, ward, department, officer role or
assignment, routing rule, or routing decision.

Every complaint remains private. Exact coordinates, descriptions, original media, checksums, spoof
signals, duplicate evidence, signed-upload tokens, internal notes, and internal routing evidence are
not public contracts. Phase 5 extends the same private boundary with versioned assignments,
capability/transition rules, exact-replay action requests, append-only action audit, inspections,
work references, dependencies, private resolution evidence, versioned resolution records, and a
data-minimized notification outbox. Phase 7 adds a separate exact-replay citizen-action ledger,
database-resolved accountability policy, captured completion location, owner-only evidence review,
immutable feedback, policy-controlled reopening, and repeated-reopen escalation. Public visibility,
processed public derivatives, and maps are not implemented.

### Routing Domain

- issue domain, category hierarchy, and aliases;
- category-to-asset requirements;
- stable assets with versioned spatial records;
- versioned asset ownership;
- stable routing rules with versioned scope, targets, and fallback paths;
- versioned confidence and duplicate-detection policies;
- append-only routing decisions;
- SLA and escalation rules in later phases.

Phase 3 stores these records in a private, forced-RLS `routing` schema. The 12 pilot taxonomy rows
are engineering records only: draft, unverified, and non-routable. Pune Municipal Corporation is a
reference municipality for architecture and tests, not an application branch or verified routing
dataset.

### Communication Domain

- one private room per submitted complaint;
- effective-dated participation evidence that never grants access by itself;
- immutable, idempotent private messages;
- monotonic per-user read-through receipts;
- data-minimized per-user in-app notifications and read state;
- transactional outbox jobs and channel-specific delivery/attempt history;
- structural public-comment storage with no create/read contract until public visibility and
  moderation are approved.

---

## Core Workflow

```text
Citizen selects a database-driven category and describes the issue
        |
        v
Current GPS evidence verified against PostGIS/category thresholds
        |
        v
Live media uploads privately and passes server integrity checks
        |
        v
Citizen reviews advisory duplicate suggestions
        |
        v
Server claims an idempotent submission and resolves routing:
municipality / ward / department / officer role
        |
        v
Complaint, initial assignment, first history event, and receipt commit atomically
        |
        v
Authorized officer handles complaint through the Phase 5 workflow
        |
        v
Private resolution evidence finalized and resolution submitted
        |
        v
Citizen reviews owner-authorized before/after evidence and current policy
        |
        +--> resolved feedback confirms the resolution
        |
        +--> adverse feedback remains auditable without silently changing status
        |
        +--> policy-eligible reopen appends evidence/history and derives reopened or escalated
```

---

## Routing Architecture

Phase 3 splits spatial and relational evidence loading from deterministic evaluation:

```text
authenticated location + category request
        |
        v
service-only PostGIS jurisdiction RPC
        |
        v
service-only current routing-candidate RPC
        |
        v
pure @local-wellness/routing-engine evaluator
        |
        +--> routed
        +--> manual_review
        +--> mapping_required
        +--> unsupported_area
        |
        v
append-only decision evidence + sanitized API result
```

The `governance` and `routing` schemas are not exposed through PostgREST. Narrow `public` RPCs are
executable only by the server service role. `ST_Covers` supplies exact boundary inclusion, while
accuracy-aware `ST_DWithin` queries treat all verified boundaries within the reported uncertainty
radius as evidence. Multiple viable jurisdictions remain ambiguous instead of being resolved by an
arbitrary ordering. Location evidence above 5,000 metres is rejected before database access. GiST
geography indexes support jurisdiction-radius and asset-radius queries.

Candidate loading resolves all identifiers from current database records:

1. verified state, optional district/taluka, municipality and optional ward boundary versions;
2. verified category and optional required asset type/asset;
3. current spatial asset version and asset-owner version;
4. current authority and authority-department availability;
5. durable department and officer role;
6. optional current verified officer assignment;
7. current rule version, confidence policy, priority, and fallback path.

The service adapter requires the candidate's full hierarchy and five-level boundary-version vector
to equal the independently resolved jurisdiction. Asset candidates retain the exact asset version,
distance and ownership version. SQL caps candidate output at 100 rows using a stable ordering to
bound runtime work; conflicting policy versions for one applicable context fail closed.

The evaluator independently rejects inactive, expired, unverified, placeholder, or non-routable
evidence. It prefers direct rules before fallbacks, then more specific asset/ward scope, configured
priority, and confidence. A database-provided weighted policy determines automatic, manual-review,
and mapping-required thresholds. Competing targets inside the configured ambiguity delta require
manual review; a stable identifier is used only for deterministic output ordering.

Every decision retains the actor, request ID, exact point, accuracy, capture/resolution times, full
state/district/taluka/local-body/ward context and boundary versions, exact asset version/distance,
selected target/version identifiers, confidence, fallback depth, ambiguity count, and sanitized
explanation metadata. The API requires a real `Idempotency-Key`; an exact actor/key/input replay
returns the stored decision and a conflicting reuse is rejected. A complaint submission owns a
stable routing request ID and reuses the same stored routing decision across an exact submission
retry. Exact coordinates and internal candidate evaluations remain service-only. Citizen-facing
responses contain the selected target, score band, reason, policy/version, boundary versions,
selected rule/version, and fallback summary, but no officer contact or candidate rejection graph.

The duplicate-detection package scores configurable category, distance, time, text-similarity,
media-hash, and asset evidence. Phase 4 connects it to capped, versioned-policy candidate loading,
append-only run/match persistence, and an authenticated advisory endpoint. The response exposes
only a complaint reference, category, coarse distance, public status, timestamp, and aggregate
score. Suggestions are acknowledged before a separate submission; no record is merged or promoted
automatically.

The bootstrap has no verified Pune polygons, assignments, operational rules, or confidence policy.
The engine can be exercised with rollback-isolated synthetic verified records, but it must return
no production route from placeholder data. Engineering completion therefore remains separate from
pilot-data validation.

Before an operational routing bundle is activated, the service-only
`report_routing_confidence_policy_conflicts` report detects overlapping eligible rule versions that
would apply different confidence-policy versions to the same category/scope/asset context. Runtime
routing still fails closed independently. Asset-dependent complaint capture calls a separate
service-only PostGIS discovery function through `POST /api/v1/routing/assets/nearby`; it returns only
sanitized identifiers, labels, and measured distances for current verified assets with verified
ownership inside the independently resolved jurisdiction.

---

## Complaint Capture Architecture

Phase 4 keeps client capture, private object transfer, routing, and official persistence as separate
trust boundaries:

```text
signed-in mobile client
        |
        +--> resumable server draft + exact location evidence
        |
        +--> signed upload intent --> private Storage object
        |                              |
        |                              v
        |                     API size/MIME/SHA-256 verification
        |
        +--> advisory duplicate check
        |
        v
durable submission claim + stable routing request ID
        |
        v
stored routing decision
        |
        v
atomic complaint + assignment + first history event + replay receipt
```

Draft creation, media reservation, routing, and submission use operation-specific idempotency
keys. The API stores a SHA-256 of each raw key plus a separate operation-scoped canonical request
fingerprint; exact retries replay and conflicting reuse fails closed. Request-correlation
identifiers are not substituted for idempotency keys. Complaint creation succeeds only when the
stored draft, verified or partially verified PostGIS location evidence, active verified category,
finalized media, duplicate acknowledgements, optional emergency acknowledgement, and routed
decision all agree.

The API reserves owner/draft/media-scoped opaque paths and returns a transient private signed-upload
token. It then downloads/inspects the stored object and compares MIME type, byte size, and SHA-256
with both reservation and finalization evidence before marking it finalized. Original photo/video
and voice objects remain private. Processing and moderation states exist, but transcription,
moderation, public derivatives, thumbnails in Storage, and retention cleanup are not operational.

Mobile SQLite stores only workflow pointers, non-secret idempotency keys, pending local-file
metadata, and checksums. It stores no bearer token, signed-upload token, complaint description, or
exact coordinate. An interrupted upload's capture location is held separately in device-only
SecureStore. Offline resume is supported, but network operations run only while the app is active
and connected.

The local bootstrap exposes zero operational categories because verified Pune polygons, routes,
duplicate policies, and related governance evidence are unavailable. Rollback-isolated synthetic
tests prove the positive workflow without making placeholder data routable. Hosted activation,
physical-device capture, provider-backed processing, and final operational policy validation remain
pending.

---

## Government Complaint Workflow Architecture

Phase 5 keeps the dashboard, NestJS orchestration, private database state, and private Storage as
separate trust boundaries:

```text
government dashboard + verified Supabase session
        |
        v
NestJS strict request validation + bearer actor
        |
        v
service-only security-definer RPC
        |
        +--> current role + membership + authority/ward/department scope
        +--> role capability + current status transition
        +--> expected workflow version + idempotency fingerprint
        +--> current verified non-placeholder assignment evidence
        |
        v
workflow mutation + status history + audit + outbox commit atomically
```

The private, forced-RLS `complaints` schema remains outside the Data API allow-list. The service key
does not bypass business authorization: each public wrapper receives the actor from the verified
session and rechecks the active profile, role assignment, authority membership, scope, capability,
current assignment, and workflow state. A `platform_admin` may operate globally; municipal roles are
authority-scoped; ward and department roles are restricted to their exact current scope; moderators
are read-only. Placeholder, unverified, inactive, or non-routable governance evidence cannot become
a government workflow target.

Assignment changes close the previous row and append a new version, preserving the original routing
decision and every later transfer. Transfers remain inside the complaint's authority and select
only current verified officer assignments returned by the database. If an incumbent tenure ends,
the complaint stays visible in its stored authorized scope, the stale officer is hidden from the
current recipient summary, and authority/global operators can reassign it; historical assignment
versions retain the former officer provenance. A scheduled inspection or active dependency blocks
transfer and manual status exit so its child workflow cannot be stranded. Dependencies must be
closed before resolution. Resolving one of several active dependencies keeps the complaint in its
current waiting state; only the final closure advances it to work in progress. Resolution submission
requires one or more finalized, integrity-checked private evidence objects and appends a versioned
resolution/evidence relationship. Evidence linked to a prior resolution or uploaded under a
superseded assignment remains in history with `availableForResolution: false` and cannot be selected
again. Bounded public messages may enter citizen-visible status history; internal notes and
completion notes remain private.

Every mutation requires an `Idempotency-Key` and the detail's `workflowVersion`. Exact retries replay
the prior response, conflicting reuse fails, and stale versions force a reload. Successful status
changes append a minimal `notification_outbox` event in the same transaction. Phase 5 deliberately
provides persistence only; Phase 6 consumes it from a separate worker/realtime boundary. Redis,
BullMQ, Redis adapters, and caches remain absent.
Structured NestJS logs and append-only database audit events provide the current observability
boundary; Sentry remains deferred.

Every government-workspace response is explicitly `private, no-store`. Resolution evidence uses a
15-minute reservation and a complaint-level cap of 20 current unlinked reservations/finalized
objects. Before downloading, the API rechecks the authorized locator's workflow version, upload
status, expiry, and declared size/checksum. An exact replay of an already completed finalization
uses its stored verification result without downloading again.

For a first finalization, the API downloads at most 50 MiB and verifies exact size, SHA-256, Storage
content type, and a dependency-free, bounded binary signature for JPEG, PNG, WebP, HEIC/HEIF, MP4,
QuickTime, or WebM. A mismatch removes the reserved object and fails closed. Signature checks reduce
content-type spoofing but are not full decoding, malware scanning, or moderation. Authorized reads
are five-minute signed URLs forced to download, and a structured access log records safe actor,
complaint, and evidence identifiers without logging the URL or object path. Bounded service-only
database functions can expire or fail reservation rows; scheduling and reconciling/removing expired
private Storage objects remain follow-up work.

---

## Resolution Accountability Architecture

Phase 7 extends the existing complaint transaction boundary without making complaint or resolution
evidence public:

```text
government submits finalized after evidence + completion location
        |
        v
versioned resolution + citizen_verification_pending + history/outbox
        |
        v
owner reloads current resolution + approved policy + private evidence metadata
        |
        +--> short-lived owner-only signed evidence access
        +--> immutable outcome/ratings feedback
        +--> private additional evidence reservation/finalization
                        |
                        v
              policy-bound reopen transaction
                        |
                        +--> reopened
                        +--> escalated at configured repeat threshold
```

Stable policy identities are separated from effective-dated versions. Scope matching may use the
complaint authority and category; the most specific single approved version effective at the
immutable resolution completion time governs every later review action for that resolution.
Missing, out-of-period, overlapping, or unapproved policy evidence disables feedback/reopening
rather than selecting an application fallback. Phase 7 seeds no operational policy because its
window, rating scale, evidence rule, attempt cap, and escalation threshold remain owner inputs.

Original finalized complaint media is the before record. Government evidence explicitly linked to
one resolution is the after record. Citizen follow-up evidence is separately reserved against the
latest resolution and cannot be reused by another reopen request. All object paths remain private;
the API reauthorizes the complaint owner and returns a short-lived signed URL only for an eligible
object. Exact locations, hashes, paths, signed URLs, comments, and ratings never enter notification
payloads or structured logs.

Feedback and reopening are intentionally separate. A `resolved` outcome advances the complaint to
`resolved`; an adverse outcome is retained without an automatic state change. A reopen mutation
checks owner, workflow version, latest resolution, approved policy, deadline, reason, attempt count,
and finalized evidence atomically. PostgreSQL derives `reopened` or `escalated`, appends citizen
action audit, status history, escalation evidence when applicable, and the existing Phase 6 outbox
event in the same transaction. Exact idempotency replay returns the stored result.

---

## Realtime Architecture

Phase 6 connects the private complaint transaction boundary to authenticated Socket.IO delivery
without changing the source of truth:

```text
complaint transaction / persisted private message
        |
        +--> immutable data-minimized notification outbox event
                  |
                  v
        PostgreSQL-leased materialization worker
                  |
                  +--> durable per-user in-app notification
                  +--> realtime delivery row
                  +--> unsupported push/email intent (when applicable)
                                  |
                                  v
                    Socket.IO delivery pump
                                  |
                                  v
                authenticated per-user room + REST reconciliation
```

Message creation is accepted through authenticated REST or `message:create`. Both paths call the
same private database function, use a client message UUID for exact replay/conflict detection, and
commit the message plus outbox source before returning or broadcasting. Read positions advance
monotonically and cannot move backwards. Conversation access comes from current complaint ownership
or the government workflow's active scoped assignment authorization; membership rows do not grant
access.

The outbox worker claims a mutable job projection with `FOR UPDATE SKIP LOCKED`, a 15–300 second
lease, opaque claim token, five-attempt cap, and bounded exponential retry. Materialization uses
unique outbox/recipient and notification/channel/destination keys, so a replay cannot create a
second logical notification. The realtime pump applies an independent 5–300 second lease and
records every claim, success, failure, and expired claim. A zero-socket delivery may complete
because the durable in-app record is the offline fallback.

Socket handshakes use network-verified Supabase Auth, active-profile checks, exact-origin policy,
and expiry disconnect. User, complaint, authority, ward, and department rooms are server-derived;
clients cannot name arbitrary Socket.IO rooms. Persistent delivery rechecks current recipient
access before emission. Event envelopes use `schemaVersion: 1`, a stable `eventId`, and
`occurredAt`. Transport is at-least-once, so clients must tolerate repeated hints and reload durable
REST state; stable event IDs permit explicit duplicate suppression where a client needs it.

Public comments are not part of this architecture slice. Their table is structural only and has no
create/read RPC or client route while complaint visibility, moderation, abuse controls, and privacy
policy remain unresolved.

The V1 pilot runs one realtime instance. If horizontal scaling is introduced after V1:

- select and document a reviewed cross-instance delivery mechanism;
- use sticky sessions if the selected transport requires them;
- define shared presence semantics explicitly;
- preserve database-first persistence.

---

## Background Work Architecture

Redis and BullMQ are not part of V1. Phase 6 uses the existing PostgreSQL transaction outbox plus
leased job and delivery projections as documented by ADR-0014. This is a bounded V1 mechanism, not
a general replacement for every later background workload. A future job category must demonstrate
that the same retry, concurrency, retention, and operational model fits before reusing it.

Background work must be:

- idempotent;
- retryable;
- observable;
- persisted before delivery;
- dead-lettered after terminal failure.

---

## Security Architecture

This is the V1 target security architecture. Phase 1 implements identity, current-scope
authorization, RLS, audit, request correlation, and secret isolation. The identity forward fix also
backfills missing application profiles/global citizen roles for existing Auth identities without
overwriting existing profile state or reactivating a revoked role. Phase 4 adds forced-RLS complaint
persistence, owner-scoped server orchestration, exact-replay idempotency, and private signed media
uploads with server-side object verification. Phase 5 adds database-enforced government scope,
capability and transition checks, optimistic workflow versions, exact-replay action ledgers,
append-only audit, private resolution evidence, and transaction-outbox persistence. Phase 6 adds
network-verified socket authentication, database-authorized room access, persistence-before-
broadcast, forced-RLS communication state, data-minimized notification payloads, lease-scoped
service RPCs, bounded per-socket limits, and recipient reauthorization before queued delivery.
Phase 7 adds approved effective-dated policy resolution, complaint-owner evidence reauthorization,
separate citizen exact-replay/audit records, immutable feedback/reopen/escalation history, and
database-derived status changes.
Broader HTTP rate limits, provider-specific controls, and device-risk enforcement remain tracked
hardening work.

- Supabase Auth for identity;
- JWT verification at API;
- RLS on every exposed table;
- server-side authorization;
- scoped government access;
- private storage buckets;
- signed media URLs;
- append-only audit records;
- rate limiting;
- device risk checks;
- secret isolation;
- structured security logs.

---

## Deployment Architecture

V1:

```text
Mobile app → Expo/EAS
Web apps → Vercel or equivalent
API → container platform
Realtime server → container platform
Workers → container platform
Supabase → managed
Monitoring → V1 target: structured logs, health checks, uptime and platform metrics
```

Redis, BullMQ and Sentry are explicitly deferred beyond V1 by ADR-0007.

---

## Architectural Decision Records

Any architectural change must create an ADR.

See `docs/adr/`.

The `AGENTS.md` file defines mandatory ADR creation rules.
