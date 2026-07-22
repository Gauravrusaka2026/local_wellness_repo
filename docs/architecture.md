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

The authenticated Expo shell exposes five stable destinations: Home, Complaints, the central Report
action, Community, and More. Home aggregates the owner's complaint history and provides honest
empty, loading, refresh, and API-error states; Complaints adds filter, pagination, detail, and
timeline navigation; Community provides Local, Trending, and Heat views; More groups profile,
verified governing-body lookup, language, notification, device-help, and sign-out actions. Primary
cards and actions use short labels and state badges while accessibility hints retain fuller context
outside the visible hierarchy. Authentication has explicit email/password sign-in, create-account,
and password-recovery
modes plus staged Phone MFA. Observe mode keeps access usable before SMS activation; enforce mode
requires a verified phone factor and `aal2` at both client and API boundaries.

Phase 4 implements resumable drafts, current-location evidence through Expo Location, live
photo/video/voice capture through Expo Camera and Audio, private upload, duplicate review,
submission receipt, and owned complaint history. Category-required attributes and media counts are
database-driven end to end; they are not duplicated as municipality/category constants in the
client. A protected category-catalog projection exposes every non-placeholder category with an
explicit selection-availability flag derived from the verified operational projection. Mobile
renders unavailable categories as disabled and both client and server continue to reject their IDs;
an available category still undergoes location-specific routing before submission. Asset-dependent
categories use an authenticated database-driven nearby-asset picker and
remain unavailable unless the category, jurisdiction, asset/version, ownership, and owner scope are
current, verified, non-placeholder, and routable. The client advances only when server-derived
location evidence is `verified` or `partially_verified`. V1 requires at most 50 metre accuracy and
keeps captured media within 50 metres of the selected issue point in both client and PostgreSQL.

The Expo presentation renders category/details, location/asset, evidence, duplicate review, and
final confirmation as sections of one scrollable form. The reducer's persisted stage, resumable
draft, idempotency keys, signed upload, duplicate evidence, and server routing transaction remain
unchanged internal lifecycle controls. A pure client projection lists every unmet submission gate,
including unsaved details, required asset, pending upload, duplicate/emergency/voice acknowledgement,
and connectivity; it does not relax the authoritative API or PostgreSQL checks. Mutating controls
are disabled while a draft request is in flight to prevent overlapping one-page form updates. A
complaint-wide exclusive mutation guard also serializes category, details, location, asset, media,
duplicate, discard, and submit work below the presentation layer; repeated submit taps share the
same in-flight promise.

The profile surface reuses the same Expo permission discipline for avatar capture. A citizen may
take a photo with Expo Camera or select one from the media library; the resulting image still passes
the existing private profile-image validation, owner-scoped Storage upload, and short-lived signed
preview boundary. A separate current-area action requests one high-accuracy foreground location and
calls the verified governance-body resolver. Only derived ward/local-body/authority labels,
verification date, and official source URL are held in component memory. The slice persists neither
the exact profile coordinate nor a street address, and ambiguous, inaccurate, or unsupported
results fail closed.

Phase 6 adds durable in-app notification history/read state and private complaint messages. Its
optional Socket.IO connection refreshes REST-backed state and does not replace durable history.
OS-level push is deliberately not installed until an Expo/EAS project, FCM/APNs credentials,
consent/preferences, destination verification, and delivery policy are approved. Phase 7 adds
private before/after resolution review, policy-driven outcome ratings and confirmation, and
policy-controlled reopening with live additional evidence. Phase 8 adds provider-neutral public
transparency views; mobile presents reviewed ongoing reports as Local and Trending feeds and
aggregate hotspots as a tile-provider-free Heat view. Signed-in citizens can contribute one support
per current reviewed projection and retain an account-private star. Only aggregate support is
public, no supporter identity is exposed, and engagement never changes the official complaint
workflow. Phase 9 adds private policy-derived SLA clocks, overdue escalation, and
persisted organizational KPI snapshots; background governance normalization and a third-party
native basemap remain deferred.

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
the same Supabase environment. Citizen access uses email/password sign-up and sign-in plus
provider-managed password recovery. Phone verification is staged through Supabase Phone MFA with
the same observe/enforce policy used by the API, so the web app does not create or store OTPs.
Profile images use an owner-private Storage bucket, API-owned metadata, and short-lived signed
display URLs; they never enter public transparency projections.

Protected Citizen Web complaint pages use the existing owner-scoped list, detail, timeline, and
resolution-accountability APIs. The list is paginated; detail shows current status, immutable
timeline, safe routing/location summaries, and the public portion of government action/resolution
evidence. Feedback and reopen actions bind the server-returned current resolution/workflow context
rather than accepting those identities from browser input. When an approved reopen policy requires
new location-bound media, the web surface directs the citizen to mobile instead of weakening the
evidence rule. Exact coordinates, private object paths, internal routing IDs, and government-only
notes remain outside rendered data.

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
placeholder until a provider, key, and coordinate-sharing/privacy policy are reviewed. Phase 6 adds
the complaint's private conversation. Server-rendered
history is reconciled through authenticated REST, while the browser supplies its session token to
an optional realtime connection at runtime rather than serializing it into page markup.

Phase 7 requires a captured completion location for each new resolution and allows an existing work
reference to be linked. The dashboard also renders the authorized resolution, citizen feedback,
reopen, and escalation history. It does not infer policy, verification, or allowed workflow action
from displayed data.

Phase 9 adds a complaint SLA panel and an organizational accountability page. The former renders
only database-materialized clocks, pauses, deadlines, and escalation evidence; the latter reads the
latest completed municipality/ward/department KPI snapshots at their explicit source cutoff. Both
re-authorize the selected government scope. Missing/ambiguous policy is an explicit unavailable
state, and no view ranks an individual officer.

The assignment summary distinguishes internal queue routing from external contact readiness. A
verified assignment scope places the complaint in the authorized government queue even when a
current named incumbent or approved external channel does not exist. Optional readiness metadata
may report a manually verified, complaint-intake-approved officer or governing-body contact scope,
but it exposes no address or phone value and never claims automatic outbound delivery.

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

Protected REST requests validate asymmetric Supabase access tokens with
`supabase.auth.getClaims()`. The API accepts only signature-verified, unexpired authenticated
claims with a UUID subject and recognized assurance level; it does not repeat that work with a
`getUser()` network request. Verified JWT identity proves authentication only. Current profile,
role, membership, and MFA-policy state continues to come from PostgreSQL authorization reads.
Identical concurrent reads for one actor share only the unfinished request and are removed when it
settles, so no completed security context or bearer token is cached. This boundary is recorded in
[ADR-0026](adr/0026-use-verified-jwt-claims-for-api-authentication.md).

The non-user-specific routing-category catalog is the sole process-local application-data cache in
this path. A NestJS instance retains it for 30 seconds and coalesces an identical in-flight load.
Exact-coordinate jurisdiction results, routing decisions, profiles, MFA state, roles, memberships,
drafts, complaints, and status are never retained in that cache. Complaint submission performs a
fresh location-specific route resolution even when the form used a cached catalog entry.

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
When no delivery is claimed, the pump doubles its polling delay up to 15 seconds; claiming work
immediately restores the configured base interval. This adaptive idle backoff reduces empty
database polling without changing lease, authorization, or delivery semantics.

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

Several entries remain target responsibilities. Phase 6 implements the notification-outbox
materialization worker: it polls narrow service-only RPCs, claims PostgreSQL jobs with bounded
leases, materializes data-minimized per-user notifications and channel rows, and records bounded
retry or terminal state. In-app history is operational in engineering; realtime rows are consumed
by the Socket.IO process. Push and email rows are explicitly `unsupported` until providers and
consent/preferences are approved.

Phase 9 extends the same trusted worker process with independently configured SLA-escalation and
KPI-calculation loops. Both use narrow service-only PostgreSQL leases, idempotent execution,
bounded retry/dead state, and structured logs that omit lease tokens and complaint content. A clean
shutdown stops polling and waits for active batches. No loop invents policy: absent or ambiguous
approved configuration produces no clock or automatic action.

The notification-outbox, SLA-escalation, and KPI-calculation loops use adaptive idle polling. An
empty or failed claim doubles the delay up to 60 seconds, while any claimed batch resets the next
delay to the configured base interval. Work remains database-leased and immediately discoverable
at the base cadence after activity; no Redis scheduler or completed-work cache is introduced.

The V1 BMC overlay adds one optional SMTP ward-email loop to this trusted process. It claims the
private ward-email outbox through lease-checked RPCs, maps each database row into a data-minimized
message containing complaint number, ward, category, submission time, and description, and records
the provider message ID before marking delivery `sent`. The loop is disabled when server-only SMTP
configuration is absent. Its credentials and recipient values never enter a client contract or
structured log, and a provider send result does not imply government acknowledgement.

Phase 4 duplicate evaluation still runs synchronously through PostgreSQL plus the pure routing
package. Transcription, media processing/moderation, and private-object cleanup remain
unimplemented. Governance retrieval runs separately through a Supabase Scheduled Edge Function;
its source schedule is inactive by default. No Redis, BullMQ, or Sentry dependency backs any of
these boundaries.

### Immutable Governance Source-Bundle Intake

Repository-supplied research bundles enter through a deterministic intake adapter before the
permanent synchronization lifecycle. The adapter verifies the outer archive hash, safe member
paths and expansion limit, exact inventory, internal member hashes, CSV headers/counts/keys, and
canonical identity reconciliation. It records immutable raw file/row evidence and emits additive
SQL; it never changes the canonical Phase 2 CSV/workbook or directly publishes a sync candidate.

The Maharashtra Batch 0 adapter applies only null-to-value LGD enrichment for Maharashtra and 35
exact existing district matches. It preserves all current verification, provenance, and routing
state. Ambiguous aliases, conflicts, stale documents, and header-only operational datasets remain
review evidence. Sensitive transient URL query parameters are excluded from generated artifacts
while the original row hash and immutable archive retain auditability. This is a bootstrap-intake
path, not a municipality-specific application branch or an alternative to human-reviewed
synchronization publication.

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
- owner-private profile images and server-owned image versions;
- hashed device registrations;
- immutable system roles;
- time-bound scoped role assignments;
- authority memberships;
- append-only authentication audit events.

Supabase Auth proves identity. Current database state determines authorization so revoked or expired access does not remain valid until a JWT refresh. Client applications receive only the public project URL and publishable key (or legacy anonymous key); the secret/service-role key exists only in the trusted API runtime. The API verifies each bearer token with Supabase Auth, reauthorizes ownership and scope, and performs identity writes through audited database operations. RLS and column privileges remain a second boundary for direct data-API access.

Citizens use Supabase email/password and provider-managed recovery; phone verification is a
Supabase Phone MFA factor rather than application metadata or a custom OTP table. Government and
administrator email delivery remains template-compatible. Their callback pages consume one
reviewed method and reload through current authorization. Citizen/admin callbacks reject implicit
fragments; only the government invitation callback accepts a complete default fragment typed
`invite`, and authentication still cannot create membership or role. Mobile stores sessions only
in SecureStore. Privileged TOTP and citizen phone-factor policies are independently verified by the
API and use observe/enforce rollout modes.

The three web portals expose the verified account context instead of leaving identity implicit.
Citizen Web shows the current citizen email or phone label and an explicit switch-account path.
The Government Dashboard and Admin Console show the exact signed-in email on MFA, authorized,
denied, and dependency-error states. Privileged screens describe Auth identity, per-user TOTP/AAL2,
and current database membership/scoped role as separate gates. A QR code appears only while
enrolling a new TOTP factor; returning users challenge the existing factor. Account recovery never
bypasses current role or authority checks.

Government onboarding remains a trusted API operation. The Admin Console loads a named selector
catalog through `GET /api/v1/admin/government-invitations/options`; the API reauthorizes the caller
and invokes a service-role-only database projection containing only active, verified,
non-placeholder, routing-eligible authorities, wards, and authority departments. Municipal
administrators are restricted to their own authority. Opaque IDs remain transport values rather
than operator-entered fields, and clients still cannot choose grantor, status, or privileged role
state.

ADR-0025 adds password authentication for an already provisioned privileged identity; it does not
add a new authorization path. Password and email code/link entry converge on the same personal
TOTP/AAL2 gate and current database membership, role, and scope checks. The portal forms never
create an identity or assign access. Production onboarding remains invitation-first.

A separate trusted operator script can create a fixed matrix of synthetic, expiring staging
identities after reviewed BMC scopes are available. It resolves scopes through the same verified
invitation catalog, persists roles and memberships through the existing trusted functions, and
writes generated credentials only to a gitignored local `0600` artifact. This is an operator
provisioning boundary, not an API endpoint or application runtime dependency. Role expiry removes
effective database access; Auth-identity teardown and artifact deletion remain explicit operator
steps. The helper cannot be used as production onboarding and does not implement the arbitrary
existing-user assign/revoke/renew lifecycle tracked by `AUTH-001`.

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

The optional BMC staging/demo pack is a separate reviewed bootstrap path, not automatic
synchronization output. It creates official-source BMC operational wards, zones, offices,
departments, durable roles, versioned incumbents/assignments/contacts, legacy boundary crosswalks,
categories, and internal routing records. Its separate activation seed makes exactly three
asset-independent categories operational—garbage dump, missed sweeping, and mosquito breeding—and
creates 66 rules for their category/ward pairs across the 22 one-to-one ward relationships. The
other nine pilot categories remain unavailable; their canonical BMC routing references all require
reviewed asset inventory and ownership evidence. Split `K/S`, `K/N`, `P/E`, and `P/W` units and
legacy K/P boundary anchors have no executable route. External production
delivery stays false, and applying the seed does not claim integration with BMC's grievance system.

An official MCGM ArcGIS discovery manifest now maps candidate road, drain, sewer/manhole, water,
streetlight, building, right-of-way, and tree layers to those nine categories. It is not an import
or publication source by itself. Immutable snapshot preservation, bounded parsing, identifier and
geometry validation, ownership/entity matching, human review, versioned publication, and routing
activation remain separate gates.

As of 2026-07-14, the dedicated staging database contains all 23 migrations through
`20260714124000` and all six reviewed non-production seeds. Its fail-closed state is 12 categories
with zero operational and 11 synchronization endpoints with zero active. This validates only the
managed database baseline: applications, the Edge Function, Cron, source/scope activation,
official ward records or geometry, routes, complaints, and production remain undeployed or
inactive.

That paragraph records a historical managed-environment observation, not the current repository
cutoff. The incremental schema now contains 43 migrations through
`20260717100000_public_complaint_engagements.sql`; each managed target must reconcile its own
migration ledger before activation. The preceding BMC relationship-version migration and generated
demo seed provide source-backed internal queue data while keeping external complaint delivery
explicitly disabled.

The citizen-facing governance directory is a separate narrow projection over this private domain:

```text
Expo foreground location
        |
        v
authenticated NestJS endpoint
        |
        v
service-role-only PostGIS projection
        |
        v
verified official-source names and provenance only
```

`POST /api/v1/governance/bodies/resolve` accepts bounded location evidence and returns only a
verified hierarchy name/type, last-verification date, and official source URL. The projection
requires active, verified, routing-eligible, non-placeholder entities and official active sources
for the matched jurisdiction and boundaries. It exposes no UUIDs, geometry, officers, phone/email
contacts, or private office data. Accuracy over 100 metres fails before the query; zero and multiple
matches remain explicit `unsupported` and `ambiguous` outcomes. Mobile clients never query
governance tables/functions directly and no Pune/Mumbai fallback is hardcoded. The additive
projection migration and reviewed official geometry are still required in staging before the
directory can resolve a real location.

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
immutable feedback, policy-controlled reopening, and repeated-reopen escalation. Phase 8 leaves
those source records private and introduces separately reviewed, immutable public projections.
Phase 9 adds exact policy bindings, materialized milestone clocks, pause intervals, deadline
history, escalation evidence/jobs, and reproducible KPI runs/snapshots without widening complaint
table access.

### Public Transparency Boundary

The Phase 8 public read model is not a filtered view over private complaints. An approved,
effective-dated transparency policy plus an attributed review must create a sanitized projection in
the unexposed, forced-RLS `complaints` schema. PostgreSQL derives its approximate position from a
current verified ward boundary; a client cannot submit a public coordinate. Withdrawal closes the
current projection without deleting its audit history.

Anonymous nearby, hotspot, verified-boundary, and detail requests enter through bounded NestJS
routes and service-only database functions. The functions query only current published projections
and return strict JSON allowlists. They never join private text, citizen identity, exact complaint or
routing points, original media, private evidence, internal notes, routing evidence, moderation
evidence, object locators, or contact data into a response. Missing or ambiguous policy, geometry,
review, or publication evidence yields an empty result.

Public duplicate groups are distinct reviewed, versioned records; private similarity results never
merge or publish complaints automatically. A service-role reviewer can group at most 100 reports
only after every member has a current public projection. Public detail returns the canonical public
ID, related public IDs excluding the viewed report, and total group size—never internal complaint
IDs or review evidence. Withdrawal ends the active group version. Processed-media derivative
storage is structural and remains
unavailable until full decode, malware/moderation, privacy-redaction, retention, and delivery policy
are approved. Comments remain disabled. Client rendering uses a first-party provider-neutral plot
and accessible list, so no coordinate or tile request leaves Local Wellness infrastructure; a
third-party basemap requires a later provider/privacy decision.

Account engagement is a second private read model over the same current reviewed projections. One
forced-RLS row per complaint/account stores independent support and private follow/star state.
Bearer-authenticated NestJS operations derive the actor and use service-only database functions;
ordinary clients receive no table or direct RPC access. Public list/detail output gains only an
aggregate support count. The authenticated account may retrieve its own `supported` and `starred`
flags for at most 100 public IDs or set them idempotently. Projection withdrawal immediately removes
the item from public feed and engagement operations while retaining the private row as history.

The public feed supports `recent` and `trending` inside the same bounded viewport. Trending orders
current projections by support count, publication time, and public ID; because support is live,
cursor pages are not a frozen ranking snapshot. Local, Trending, and Heat clients still receive only
reviewed generalized data. A support or star has no path into official routing, assignment, status,
escalation, SLA, or KPI records, and comments remain separately disabled.

### SLA, Escalation, and KPI Accountability Boundary

Phase 9 stores operational policy and materialized evidence in the unexposed, forced-RLS
`complaints` schema. Stable calendar, policy, escalation-rule, and KPI identities are separated
from reviewed versions. Platform-admin publication is a service-role operation: it validates
verified provenance and temporal/configuration integrity, locks the candidate and one eligible
approved predecessor, atomically closes and supersedes that predecessor at the candidate's
`effective_from`, then approves the new version. Conflicting, backdated, same/older-version, or
multiple-overlap publication fails as one transaction.

An initial routed complaint assignment selects exactly one effective approved policy/calendar/
category override and persists that evidence in a cycle binding. It materializes acknowledgement,
optional inspection, and resolution clocks in UTC while evaluating working time in the calendar's
IANA timezone. Missing, ambiguous, or invalid configuration persists an explicit fail-closed
binding and creates no clock. Status history completes milestones; eligible external-dependency
history pauses/resumes configured clocks and appends deadline changes. Clients cannot submit
targets, pause duration, breach state, escalation level, or policy IDs.

```text
approved policy/calendar/rules
  -> routed assignment binding
  -> materialized milestone clocks and deadline history
  -> bounded PostgreSQL lease
  -> idempotent escalation action
  -> status history + escalation event + notification outbox (one transaction)

versioned KPI definition + explicit source cutoff/window
  -> bounded PostgreSQL lease
  -> immutable calculation run
  -> municipality/ward/department snapshots by delay segment
  -> government-scope-authorized API/dashboard read
```

Escalation and KPI work use independent bounded PostgreSQL leases in the existing trusted worker
process. Retries are idempotent and terminal failures remain available for operator review. An
escalation action may record evidence or derive the reviewed `escalated` status; its status history,
append-only escalation event, and data-minimized notification outbox row commit together before any
delivery worker can observe them.

KPI results are persisted snapshots rather than mutable request-time aggregates. Every completed
run retains its definition version, source cutoff, reporting window, input fingerprint, exclusions,
scope, segment, numerator, denominator, and sample size. Reads are limited to current authorized
municipality, ward, or department scope. There is no public KPI contract and no individual-officer
dimension or ranking.

No operational calendar, policy, target, category override, or escalation rule is seeded. The
engineering topology remains inactive until reviewed official values, verified target roles,
worker/scheduling deployment, and environment verification are complete.

### Routing Domain

- issue domain, category hierarchy, and aliases;
- category-to-asset requirements;
- stable assets with versioned spatial records;
- versioned asset ownership;
- stable routing rules with versioned scope, targets, and fallback paths;
- versioned confidence and duplicate-detection policies;
- append-only routing decisions;
- Phase 9 SLA and escalation configuration in the private complaint domain.

Phase 3 stores these records in a private, forced-RLS `routing` schema. The 12 pilot taxonomy rows
are engineering records only: draft, unverified, and non-routable. Pune Municipal Corporation is a
reference municipality for architecture and tests, not an application branch or verified routing
dataset.

The generated BMC non-production activation is a deliberately narrower data layer over this generic
engine, not municipality-specific code. It enables one confidence policy, three category-specific
duplicate policies, and 66 direct, non-fallback rules for three asset-independent categories across
22 unambiguous wards. Nine ownership-gated categories, split K/P wards, and external delivery
remain fail-closed. The activation and verification seeds are separate from migrations and must
not be assumed present in any managed environment without an environment-specific verification.

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

The service adapter requires verified evidence for the candidate's full hierarchy and its
five-level boundary-version vector to equal the independently resolved jurisdiction. Boundary
provenance is established by that separate PostGIS jurisdiction result and exact version equality;
candidate explanation metadata does not need to duplicate the already verified local-body/ward
boundary entries. Asset candidates retain the exact asset version, distance and ownership version.
SQL caps candidate output at 100 rows using a stable ordering to bound runtime work; conflicting
policy versions for one applicable context fail closed.

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

Complaint submission turns only a `routed` decision into an initial, versioned complaint
assignment. That assignment identifies the verified authority, local body, optional ward,
department, durable officer role, and optional current officer assignment entirely from database
records. The authorized government dashboard queries that scope, so the complaint reaches the
correct internal government queue even when an incumbent changes or no named officer is available.

External official-contact readiness is evaluated separately from routing. The database searches
only current public-official, manually verified, complaint-intake contact versions with explicit
delivery approval and prefers the most specific owner: officer assignment/officer, then office,
authority department, ward, local body, and authority. The assignment summary exposes only whether
an approved officer or governing-body contact scope exists and which channel types are available.
It does not expose the contact value or perform an outbound send. Placeholder, unverified,
source-only, stale, or superseded records cannot make either routing or delivery readiness appear
operational; `automaticOutboundDelivery` remains false until a separately reviewed delivery
integration is implemented.

### Current V1 ward-routing facade

The current citizen submission path uses a smaller database-driven facade without removing the
durable schemas or weakening complaint history:

```text
captured GPS evidence
        → active PostGIS BMC ward/crosswalk
        → active category
        → routing.ward_issue_contacts
        → append-only routing decision
        → complaint + versioned assignment
        → complaints.ward_email_outbox
```

The contact matrix is generated by joining two immutable operator inputs: the Mumbai ward issue-
contact archive supplies category, phone, WhatsApp, role and issue-source evidence, while the
2026-07-20 ward-directory archive supplies recipient email and office-source evidence. Generation
requires 26 operational wards × 12 categories (312 rows), uses direct K/N and P/E email evidence,
and maps K/S to its K/E parent office and P/W to its P/N parent office. Raw source-reported status,
record locator and dates are retained separately from explicit owner approval for staging routing.

The API invokes only `resolve_v1_ward_route`; clients cannot name the ward, authority, department,
role, recipient or routing rule. The facade retains the existing routing-decision integrity trigger,
stable submission replay and assignment scope used by the Government Dashboard. It avoids asset
discovery and duplicate review as mandatory gates for these V1 categories; duplicate suggestions
remain available and advisory.

The assignment trigger snapshots only the recipient email into a private idempotent outbox. Phone,
secondary contact, `1916`, WhatsApp, source provenance, description and exact location are service-
only. A future sender may claim jobs through bounded PostgreSQL leases and record sent/retry/dead
outcomes; no polling process, Cron job, provider or automatic WhatsApp/phone action is enabled by
this change.
The older candidate engine and normalized governance/synchronization tables remain available for
future expansion but are no longer the BMC V1 citizen-submission critical path.

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

The final database gate compares the routing decision's actor, stable request, routed status,
category, optional asset, exact PostGIS point, accuracy, and capture time. Migration
`20260718100000_complaint_routing_evidence_diagnostics.sql` preserves those exact comparisons while
returning a non-sensitive marker for the first mismatching field through a protected V2 completion
implementation. Its public wrapper remains service-role only; the classifier and implementation
are not client-executable.

The mobile resume record preserves a submission key across ambiguous transport failures, but
rotates it after successful draft-evidence mutations and explicit terminal no-route outcomes. This
keeps exact retries safe without pinning a draft forever to an earlier stored routing decision.
Complaint no-route responses use `COMPLAINT_ROUTE_UNAVAILABLE`; generic dependency errors remain
distinct so dashboard, media, and notification outages are not described as routing failures.

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

The canonical Maharashtra/Phase 3 baseline exposes zero operational categories because verified
Pune polygons, routes, duplicate policies, and related governance evidence are unavailable. The
catalog may display its non-placeholder taxonomy, but every entry remains disabled. A full local
reset additionally applies the generated BMC non-production seeds and therefore makes only the
three reviewed internal-demo categories selectable through their 66 rules. It does not enable the nine
asset-dependent categories, split K/P wards, production routing, or external BMC delivery. Hosted
staging now exposes the same 12-category catalog, three operational categories, finalized private
media, and K/W internal routing. A clean local end-to-end API smoke returns a complaint receipt;
hosted completion still requires migration `20260718100000` and a post-migration submission smoke.
Physical-device capture, provider-backed processing, and final operational policy validation remain
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
ADR-0018 records that Phase 9 escalation and KPI materialization meet that boundary through separate
bounded lease tables, idempotent completion, retained retry/dead state, and independently tuned
worker loops.

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
database-derived status changes. Phase 8 adds a separately reviewed public read model without
widening private complaint access. Phase 9 adds immutable policy bindings/clocks/KPI evidence,
atomic policy supersession, scope-authorized accountability reads, and transactional escalation/
notification evidence.
Phase 10 adds shared PostgreSQL-backed API quotas with hashed subjects, security headers, graceful
shutdown, a narrow database/private-Storage readiness probe, dependency-free smoke/load tooling,
secret scanning, owner-private profile images, and staged MFA assurance enforcement. It also makes
the 50-metre complaint-location/media-proximity limit a client-and-database invariant, gives mobile
reviewed Local/Trending/Heat views, adds account-bound support and private star state behind the
reviewed-public projection boundary, and separates verified government-queue routing from approved
external-contact readiness without performing automatic outbound delivery.
Provider edge controls, managed alerting, full profile-image processing, SMS-provider activation,
and device-to-provider-session revocation remain rollout work.

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

Local API, mobile, Citizen Web, Government Dashboard, and Admin Console entrypoints read one
repository-root `.env` through the shared process runner; explicit shell/deployment variables take
precedence. App-local environment files are rejected so an Auth session cannot silently target a
different Supabase project from the API. Turbo build inputs include the root environment and the
relevant public client variables, preventing a project switch from reusing an incompatible cached
bundle. Managed deployments continue to inject their own variables rather than shipping the local
file.

---

## Architectural Decision Records

### JagrukSetu UI benchmark implementation

The benchmark is an additive client layer over existing domain boundaries. The design-system owns
framework-neutral tokens/contracts and localisation owns locale keys/formatting. The Expo report
remains one scrollable form with progressive section feedback. Public spatial views remain
first-party and privacy-safe; no external tiles, public comments, guest reporting, or contact
exposure is introduced by this UI work.

Any architectural change must create an ADR.

See `docs/adr/`.

The `AGENTS.md` file defines mandatory ADR creation rules.
