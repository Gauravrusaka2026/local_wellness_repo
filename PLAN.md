# PLAN.md

## V1 objective

Build and launch a controlled Maharashtra civic complaint pilot supporting:

- citizen authentication;
- current-location complaint submission;
- live media;
- typed and voice complaints;
- structured categories;
- municipality and ward routing;
- department and officer-role assignment;
- status timelines;
- government resolution workflows;
- resolution evidence;
- feedback and reopening;
- nearby maps;
- ward and department KPIs.

V1 validates the complete lifecycle in one municipality before wider rollout.

## V1 technology constraints

- Supabase PostgreSQL, Auth, Storage and RLS remain the core platform.
- Redis, BullMQ and Sentry are deferred beyond V1 and must not be introduced without an explicit owner request and a new architectural decision.
- V1 observability remains vendor-neutral through structured logs, request correlation, health checks and platform metrics.

## Recommended pilot

Pune Municipal Corporation is the Phase 3 architecture and test reference municipality. This
selection does not make the current Pune bootstrap records production-ready and does not permit
Pune-specific branches in application code. Routing remains generic and resolves municipality,
ward, department, role, assignment, asset ownership, policy, and fallback only from current
database records.

Limit initial coverage to:

- 5–10 wards;
- 8–12 categories;
- one verified authority hierarchy;
- one approved escalation chain;
- verified ward polygons and contacts.

Recommended categories:

- garbage dump;
- missed sweeping;
- pothole;
- blocked drain;
- sewage overflow;
- water leakage;
- broken streetlight;
- fallen tree;
- open manhole;
- mosquito breeding;
- illegal construction;
- encroachment.

Only activate categories with confirmed ownership.

For the immediate V1 staging release, BMC is the operational data pilot while Pune remains the
generic architecture/test reference. The BMC path is intentionally reduced to PostGIS ward
resolution plus a private ward/profile recipient matrix for 13 operational profiles and 256
public/restricted taxonomy leaves. It retains
the complaint ledger, assignment history and security controls, but defers asset-owner specificity
and outbound provider activation. Expansion outside the configured BMC ward geometry remains
fail-closed and data-driven.

# Phase 0 — Foundation

## Goals

- initialize monorepo;
- define standards;
- establish environments;
- connect Supabase;
- set up CI/CD and documentation.

## Tasks

- initialize Turborepo;
- create all `apps/` and `packages/` directories;
- configure strict TypeScript;
- configure ESLint and Prettier;
- configure shared tsconfig;
- configure commit hooks;
- add environment validation;
- create development, staging and production Supabase projects;
- enable PostGIS, Auth and Storage;
- configure GitHub Actions for lint, type-check, tests, builds and migration validation;
- add README, project overview, plan, architecture, API, deployment, authentication and database docs.

## Exit criteria

- every application builds;
- shared packages resolve;
- CI passes;
- Supabase CLI works locally;
- first migration applies successfully.

# Phase 1 — Identity and access

## Goals

Implement citizen and government authentication with scoped authorization.

## Tasks

- email/password citizen account creation and sign-in;
- phone-gated password recovery and signed-in password change;
- mandatory ordinary Supabase Phone Auth confirmation for citizen access after the Phone provider,
  phone confirmations and SMS transport are active;
- profile setup;
- private profile images;
- preferred language;
- secure session storage;
- device registration;
- government invitation flow;
- authority membership;
- role assignment and expiry;
- access audit events;
- RLS for profiles, roles and authority scope.

## Tables

- profiles;
- devices;
- roles;
- user_roles;
- authority_memberships;
- auth_audit_events.

## Exit criteria

- citizens can authenticate;
- government users see only assigned authority scope;
- role escalation attempts fail;
- service keys never reach clients.

# Phase 2 — Maharashtra governance model

## Goals

Create jurisdiction, municipality, ward, department and officer-role data.

## Tasks

- create states, districts, local bodies, administrative units, wards and offices;
- create authorities, departments, officer roles, officers and assignments;
- import Maharashtra, pilot district and municipality;
- import pilot wards and boundaries;
- import verified municipal contacts;
- add spatial indexes;
- version all boundaries and assignments.

## Exit criteria

- a pilot coordinate resolves to municipality and ward;
- inactive boundaries do not route;
- historic boundaries remain queryable;
- officer assignments are versioned.

# Phase 3 — Taxonomy and routing

## Goals

Create structured categories and deterministic routing.

## Tasks

- domains, categories, subcategories and issue types;
- a deterministic citizen taxonomy with separate operational-profile mappings;
- mobile primary-category and subcategory/issue-type dropdowns with derived read-only workflow;
- severity, media and location requirements;
- asset types and owners;
- routing rules and fallbacks;
- routing decision audit table;
- routing-engine package;
- jurisdiction, ward, category, asset, department, role, assignment and SLA selection;
- unsupported area and missing mapping handling;
- routing confidence and explanation.
- a bounded V1 ward-recipient facade and idempotent external-email outbox that preserve the
  canonical complaint assignment/audit boundary;

## Exit criteria

Engineering completion and pilot-data readiness are separate gates.

Engineering completion requires:

- 17 primary categories, 340 subcategories and 19 workflow types generated from the reviewed
  JagrukSetu source without replacing the twelve operational category identifiers;
- an authenticated, public-safe taxonomy catalog and server-validated draft tuple;
- 13 specialised and 243 general-ward mappings covering all 256 public/restricted leaves, with
  route readiness derived from active rules and complete ward-contact coverage;
- official call/browser handoffs for all 84 private/emergency-private leaves, with no ordinary
  complaint, Community or ward-email side effect;
- deterministic, data-driven jurisdiction, category, asset-owner, department, role, assignment,
  confidence, ambiguity, and fallback resolution;
- service-only PostGIS and routing query boundaries;
- append-only, privacy-restricted routing-decision evidence;
- duplicate-scoring primitives ready for the complaint phase;
- unit, integration, migration, and RLS coverage for synthetic verified fixtures and rejected
  placeholder evidence.

Pilot-data readiness additionally requires:

- verified Pune Municipal Corporation and ward polygons;
- reviewed category, authority-department, officer-role, assignment, asset-ownership, confidence,
  and fallback records;
- pilot categories activated only after their source-specific ownership is confirmed;
- known Pune coordinate and ward cases to pass without placeholder evidence.

Phase 3 engineering may be complete while the pilot-data gate remains pending.

# Cross-cutting workstream — V1 database reduction

## Goals

Keep the operational schema proportional to the current BMC pilot while preserving complaint
history, security and every active user-visible workflow.

## Current reduction

- physically remove the undeployed 14-table governance synchronization/contact pipeline;
- physically remove the unused public-comments table;
- remove the corresponding Edge fetcher, RPCs, triggers, pilot seeds and generated types;
- preserve delivery-readiness responses through the private `routing.ward_issue_contacts` matrix;
- preserve imported governance records, PostGIS boundaries, all 12 categories, complaint/media/
  email/Community/government behavior, private messaging, notifications, SLA and KPI behavior;
- keep historical migrations immutable and make adaptive SQL Editor bundles prune-aware.

This first forward prune reduces the custom application schema from 129 to 114 tables. The later
protected-handoff registry adds one focused table, so the current application-owned count is 115.
This does not claim to resolve database CPU by itself; request-rate control remains the performance
requirement.

## Later reduction gates

- replace generalized asset/rule/confidence routing before dropping its legacy relations;
- combine complaint workflow/event tables only after ID-preserving backfill and compatibility RPCs;
- replace transparency, messaging, notification and SLA/KPI clusters before removing any visible
  mobile or dashboard behavior;
- validate complaint replay, ward routing/email, owner isolation, Community privacy, government
  scope and RLS before every physical drop.

The removed governance synchronization design is historical after ADR-0031. Reintroducing scheduled
official-source synchronization requires a new product decision, ADR and forward migration.

# Phase 4 — Citizen complaint capture

## Goals

Build the complete mobile submission flow.

## Screens

- home;
- create complaint;
- camera/video;
- permission and location verification;
- typed/voice description;
- category selection;
- duplicate suggestions;
- review;
- receipt.

## Location tasks

- capture latitude, longitude, accuracy, timestamps and provider;
- coordinate purpose-scoped foreground acquisition so non-evidentiary current-area screens can
  reuse a bounded five-minute in-memory fix without background polling or persistent coordinates;
- coalesce identical concurrent native requests and let explicit context refresh bypass caches;
- keep complaint issue and every live-media location on fresh high-accuracy acquisition, never the
  context/last-known cache;
- freshness validation;
- distance validation;
- media-to-complaint distance;
- supported boundary check;
- spoof-risk indicator;
- verification score.

## Media tasks

- signed upload URLs;
- direct Supabase Storage upload;
- progress and retry;
- image compression;
- video constraints;
- checksum;
- thumbnails;
- processing and moderation state.

## Voice tasks

- audio recording;
- private upload;
- transcription;
- user confirmation;
- normalized description.

## Exit criteria

Engineering completion and operational pilot readiness are separate gates.

Engineering completion requires:

- the mobile flow to capture exact-location evidence and private media without allowing the client
  to select an official assignment;
- unsupported areas and insufficient location evidence to be blocked or held for review;
- signed private-media upload, integrity validation, retry, and draft recovery;
- advisory duplicate suggestions without automatic merging;
- one server-orchestrated, idempotent submission transaction that prevents duplicate complaints;
- local migration, RLS, API, package, and mobile validation.

Operational pilot readiness additionally requires:

- at least one verified routable category and its reviewed jurisdiction, ownership, department,
  officer-role, assignment, confidence, and fallback evidence;
- production transcription and media-moderation providers;
- physical-device validation of permissions, location accuracy, camera, upload recovery, poor
  connectivity behavior, current-area reuse, explicit refresh after movement,
  sign-out/account-switch invalidation, and fresh complaint/media evidence;
- hosted-environment authentication, Storage, API, and submission verification.

The current bootstrap intentionally exposes zero verified routable categories, so the
valid-submission production exit remains data-gated even though the local Phase 4 engineering path
is implemented. Transcription, moderation, physical-device, and hosted checks remain pending, and
no hosted deployment has been performed. Redis, BullMQ, and Sentry remain excluded under the V1
technology constraints.

# Phase 5 — Government dashboard

## Goals

Enable municipal staff to receive and process complaints.

## Tasks

- login;
- complaint queues;
- filters and map;
- complaint detail;
- acknowledge;
- assign and reassign;
- transfer;
- inspection scheduling;
- internal notes;
- status updates;
- work reference;
- external dependency;
- resolution evidence;
- submit resolution;
- audit logging;
- ward, department and municipality access scopes.

## Exit criteria

- officers see only assigned scope;
- transfers preserve history;
- every action is audited;
- invalid status transitions fail.

# Phase 6 — Realtime and notifications

## Goals

Add persistent communication and realtime delivery.

## Tasks

- Socket.IO authentication;
- validated complaint, user, authority, ward and department rooms;
- single-instance realtime delivery for the V1 pilot;
- public comments;
- private complaint conversations;
- message persistence and receipts;
- notification outbox;
- in-app, push and email delivery;
- retry and deduplication.

## Notify on

- submission;
- assignment;
- acknowledgement;
- transfer;
- message;
- status update;
- resolution;
- reopen;
- escalation.

## Exit criteria

- messages persist before broadcast;
- unauthorized joins fail;
- offline users receive notifications;
- duplicate notifications are prevented.

# Phase 7 — Resolution, feedback and reopening

## Goals

Complete the accountability loop.

## Tasks

- before/after evidence;
- officer completion note;
- completion timestamp and location;
- work reference;
- citizen resolution confirmation;
- partial/not resolved/temporary fix/wrong location outcomes;
- satisfaction, speed, quality and communication ratings;
- reopen reason and additional evidence;
- repeated-reopen escalation.

## Exit criteria

- valid resolution evidence is required;
- citizens can reopen within policy;
- repeated reopen triggers escalation;
- feedback is linked and auditable.

# Phase 8 — Nearby map and transparency

## Goals

Provide locality awareness without exposing sensitive information.

## Tasks

- map markers and clustering;
- ward boundaries;
- category, status and date filters;
- hotspot view;
- duplicate groups;
- public complaint page;
- locality-first Local and Trending report views;
- signed-in owner report preview kept separate from reviewed-public Community results;
- one support per active account with aggregate-only public counts;
- account-private star/follow state;
- approximate public coordinates;
- sensitive-category hiding;
- processed media only;
- moderation controls.

## Exit criteria

- sensitive exact coordinates remain private;
- private complaints remain private;
- owner-visible private reports never enter public map, heat, ranking, or engagement results without
  the existing reviewed-public publication workflow;
- public pages exclude internal notes;
- supporter identity and private star/follow state remain private;
- community signals never alter official routing, status, escalation, SLA, or KPI evidence;
- map performance is acceptable.

# Phase 9 — SLA, escalation and KPI

## Goals

Add measurable accountability.

## Tasks

- acknowledgement, inspection and resolution SLA policies;
- calendar and category overrides;
- escalation rules and events;
- durable scheduled work and retries without Redis or BullMQ;
- ward, department and municipality KPI snapshots;
- acknowledgement compliance;
- resolution compliance;
- citizen-confirmed resolution;
- reopening rate;
- misrouting rate;
- backlog;
- evidence and communication quality.

## Exit criteria

- overdue complaints escalate automatically;
- KPI calculations are reproducible;
- external-dependency complaints are segmented;
- no public individual-officer ranking exists.

# Phase 10 — Hardening and launch

## Security

- penetration test;
- RLS audit;
- PostgreSQL-backed API rate limits without Redis;
- citizen confirmed-phone enforcement with rehearsed lost-phone recovery and privileged TOTP/AAL2
  enforcement;
- managed evidence that the ordinary Phone provider, Twilio Verify, phone confirmations and Phone
  Auth signup capability are active, and that the Before User Created hook rejects phone-only
  account creation; Advanced Phone MFA is not required for citizens;
- storage-policy audit;
- dependency and secret scanning;
- abuse controls;
- session review.

## Reliability

- load tests;
- upload stress tests;
- worker retry tests;
- backup restore test;
- disaster recovery runbook;
- uptime and error monitoring;
- rollback procedure.

## Operations

- support workflow;
- moderation workflow;
- municipal onboarding guide;
- officer training;
- incident response;
- data correction;
- ward/contact update process.

## Legal

- privacy policy;
- terms;
- content policy;
- location consent;
- media consent;
- retention policy;
- government data-processing agreement.

## Pilot release

- verify production seed data;
- verify every routing rule and contact;
- verify queue assignment separately from any approved external contact-delivery channel;
- internal test;
- physical-device test of the compact one-page report, contextual location permission/recovery,
  live evidence capture, result routing, Community lists, and civic-office actions in English,
  Marathi, and Hindi;
- officer test;
- closed citizen beta;
- limited public launch.

## Exit criteria

- no critical security findings;
- all critical flows pass;
- routing accuracy target is met;
- rollback is tested;
- support and moderation are ready;
- municipal ownership is confirmed.

# Database milestones

## A — Identity

- profiles;
- devices;
- roles;
- user_roles;
- authority_memberships;
- auth_audit_events.

## B — Governance

- states;
- districts;
- local_bodies;
- administrative_units;
- wards;
- departments;
- offices;
- officer_roles;
- officers;
- officer_assignments.

## C — Complaints

- complaints;
- complaint_media;
- complaint_location_evidence;
- complaint_status_history;
- complaint_assignments.

## D — Routing

- issue_categories;
- asset_types;
- assets;
- routing_rules;
- routing_decisions;
- sla_policies;
- escalation_rules.

## E — Communication

- conversation_rooms;
- room_members;
- messages;
- message_receipts;
- notifications;
- notification_outbox.

Public complaint comments are deferred for V1. Their unused structural table was removed by
ADR-0031; a future moderated public-discussion model requires an explicit privacy/abuse decision
and a new forward migration.

## F — Accountability

- complaint_feedback;
- complaint_reopen_requests;
- escalation_events;
- KPI snapshots;
- audit events.

# Required owner inputs before coding

## Pilot decisions

- municipality;
- wards;
- categories;
- expected beta users;
- public/private complaint rules.

## Governance data

- ward boundaries;
- departments;
- officer roles;
- official contacts;
- escalation chain;
- SLA rules;
- official complaint channels;
- known asset ownership.

## Accounts

- Supabase;
- GitHub organization;
- Expo;
- Google Cloud and Maps;
- Google Play Console;
- Apple Developer;
- email provider;
- SMS provider;
- domain and DNS.

## Policies

- privacy;
- terms;
- emergency disclaimer;
- moderation;
- retention;
- visibility;
- reopening.

## Branding

- citizen-facing product name: JagrukSetu;
- core mobile languages: English, Marathi, and Hindi;
- compact mobile visual direction using restrained civic green, saffron, white, and blue;
- logo later.

# V1 completion definition

A citizen can:

1. authenticate;
2. capture live media;
3. verify current location;
4. submit a structured complaint;
5. receive a complaint number;
6. see municipality, ward and department;
7. track the timeline;
8. receive notifications;
9. view resolution evidence;
10. provide feedback;
11. reopen;
12. see their own reports in Community without publishing them;
13. view verified current-area public office contacts when the governance registry provides them.

An officer can:

1. authenticate securely;
2. access only assigned scope;
3. acknowledge;
4. assign or transfer;
5. update status;
6. communicate;
7. upload evidence;
8. submit resolution;
9. view SLA and escalation;
10. view aggregate KPIs.

The platform can:

1. route pilot complaints accurately;
2. preserve immutable history;
3. enforce RLS;
4. protect private media;
5. prevent arbitrary transitions;
6. audit government actions;
7. escalate overdue complaints;
8. work under poor connectivity;
9. recover failed jobs;
10. support production monitoring.

### Phase 2 Inputs

Required datasets:

- `MH_MASTER_GOVERNANCE_DATA_v1.xlsx` as the human reference copy
- `csv/` exports as the machine-readable source of truth
- District reference
- Taluka reference
- Municipal Corporation reference
- Ward reference
- Department reference
- Officer Role reference
- Utility reference
- Routing reference

These datasets are stored under:

resources/governance/

and are considered the canonical source for Maharashtra governance.
