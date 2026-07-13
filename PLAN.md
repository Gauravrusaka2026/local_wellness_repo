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

Choose one:

- Pune Municipal Corporation;
- Brihanmumbai Municipal Corporation;
- Thane Municipal Corporation;
- Pimpri-Chinchwad Municipal Corporation.

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

- phone OTP;
- email OTP or magic link;
- profile setup;
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
- severity, media and location requirements;
- asset types and owners;
- routing rules and fallbacks;
- routing decision audit table;
- routing-engine package;
- jurisdiction, ward, category, asset, department, role, assignment and SLA selection;
- unsupported area and missing mapping handling;
- routing confidence and explanation.

## Exit criteria

- pilot categories route correctly;
- each decision is explainable;
- every route has a fallback;
- known ward test cases pass.

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

- valid complaint submits successfully;
- unsupported-area complaint is blocked;
- low GPS accuracy is handled;
- failed upload resumes;
- idempotency prevents duplicate complaints.

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
- approximate public coordinates;
- sensitive-category hiding;
- processed media only;
- moderation controls.

## Exit criteria

- sensitive exact coordinates remain private;
- private complaints remain private;
- public pages exclude internal notes;
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
- rate limits;
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
- internal test;
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

- complaint_comments;
- conversation_rooms;
- room_members;
- messages;
- message_receipts;
- notifications;
- notification_outbox.

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

- working project name;
- language priority;
- visual direction;
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
11. reopen.

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
