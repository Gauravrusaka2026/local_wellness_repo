# PROJECT_OVERVIEW.md

## Summary

The project is a Maharashtra-first civic complaint reporting and government accountability platform.

Citizens will report local issues using live media, verified current location, typed or voice descriptions and structured categories. The system will resolve the relevant municipality, ward, department and responsible officer role, then create a trackable complaint with status updates, escalation, resolution evidence and citizen feedback.

The application name will be decided later.

## Product vision

Create one clear civic interface through which a citizen can report a problem without needing to know:

- which municipality controls the location;
- which ward applies;
- which department owns the issue;
- which officer role is accountable;
- which portal or helpline should be used;
- how to follow up or escalate.

The platform should understand government structure on behalf of the citizen.

## Initial geography

V1 focuses on Maharashtra but launches through one controlled municipal pilot.

Recommended city expansion order:

1. Mumbai
2. Pune
3. Nagpur
4. Thane
5. Nashik
6. Navi Mumbai
7. Pimpri-Chinchwad
8. Chhatrapati Sambhajinagar
9. Kolhapur
10. Solapur

Recommended pilot size:

- one municipality;
- five to ten wards;
- eight to twelve complaint categories;
- verified ward polygons;
- verified department ownership;
- verified officer-role and escalation mapping.

Pune Municipal Corporation is the Phase 3 reference municipality for architecture and synthetic
integration testing. It is not hardcoded into the routing engine, and it is not an activated pilot
until official ward geometry, ownership, department, officer-role, assignment, confidence, and
fallback evidence has passed review. The same data-driven engine must support any later selected
authority without an application release containing municipality-specific routing branches.

## Core problems addressed

- fragmented complaint portals;
- uncertainty about the responsible authority;
- incorrect ward or department routing;
- repeated transfers;
- missing acknowledgement;
- unclear status;
- unverified closure;
- poor escalation transparency;
- inaccessible reporting for voice-first users;
- no comparable ward or department performance data.

## User groups

### Citizens

Create, track, support, discuss, verify and reopen complaints.

### Government officers

Acknowledge, inspect, assign, transfer, update and resolve complaints.

### Municipal administrators

Configure departments, wards, officers, categories, SLAs and escalation rules.

### Platform administrators

Manage jurisdiction data, routing, moderation, integrations and audits.

### Public observers

View non-sensitive public complaints, maps, locality trends and aggregate performance.

## V1 citizen features

### Authentication

- email/password account creation and sign-in;
- password recovery;
- staged phone OTP verification through a verified Supabase Phone MFA factor;
- profile and owner-private profile image;
- language preference;
- device registration;
- secure session management.

Citizen phone verification remains in observe mode until a real SMS provider, recovery path,
abuse controls, and representative-device validation are operational. Government and platform
administrators retain invitation-controlled entry and require TOTP/AAL2 when privileged MFA is
enforced.

### Complaint capture

- live photo;
- live video;
- supplementary gallery media;
- automatic GPS capture;
- current-location verification;
- map confirmation;
- typed description;
- voice recording;
- speech-to-text;
- category and subcategory;
- urgency screening;
- nearby duplicate check;
- final review.

### Tracking

- complaint number;
- current status;
- status timeline;
- municipality;
- ward;
- department;
- acknowledgement deadline;
- target resolution deadline;
- transfer and escalation history;
- resolution evidence.

### Citizen actions

- follow;
- support an existing complaint;
- add evidence;
- comment;
- private complaint communication where permitted;
- confirm or reject resolution;
- rate satisfaction;
- reopen;
- report abuse.

### Maps

- nearby complaint map;
- category filters;
- status filters;
- ward view;
- clustering;
- Reddit-like reviewed locality feed;
- privacy-preserving reviewed hotspot heatmap.

## V1 government features

### Operations dashboard

- new queue;
- unassigned queue;
- assigned queue;
- urgent complaints;
- overdue complaints;
- reopened complaints;
- transferred complaints;
- complaints awaiting citizen verification.

### Complaint handling

- acknowledge;
- assign and reassign;
- transfer;
- schedule inspection;
- add internal notes;
- communicate with citizen;
- add work-order reference;
- mark external dependency;
- upload resolution evidence;
- submit resolution;
- escalate.

### Administration

- municipalities;
- zones and wards;
- departments;
- officer roles;
- officer assignments;
- office contacts;
- category mappings;
- routing rules;
- SLA rules;
- escalation rules;
- visibility rules.

### Analytics

- complaint volume;
- acknowledgement time;
- resolution time;
- SLA compliance;
- reopening rate;
- citizen-confirmed resolution;
- misrouting rate;
- backlog;
- ward performance;
- department performance;
- issue hotspots.

## Initial categories

### Sanitation

- garbage dump;
- overflowing bin;
- missed pickup;
- missed sweeping;
- dead animal;
- illegal waste burning.

### Roads and public infrastructure

- pothole;
- damaged road;
- damaged footpath;
- open manhole;
- missing road sign.

### Drainage and sewerage

- blocked drain;
- sewage overflow;
- waterlogging;
- damaged manhole cover.

### Water

- leakage;
- no water;
- contamination;
- broken public tap.

### Street lighting and electrical

- broken streetlight;
- exposed wire;
- sparking pole;
- damaged electrical box.

### Public safety and environment

- fallen tree;
- dangerous tree;
- unsafe excavation;
- construction dust;
- noise;
- mosquito breeding.

### Enforcement

- illegal construction;
- encroachment;
- blocked public access.

### Traffic

- signal failure;
- damaged signal;
- unsafe junction.

Only categories with verified ownership should be activated in the pilot.

## Emergency policy

The platform is not an emergency dispatch service.

For fire, violent crime, serious medical emergencies, live electrical hazards, collapse, trapped persons or immediate danger, the app must prominently direct users to 112 and relevant emergency channels.

A normal complaint submission must never imply guaranteed emergency response.

## Technology stack

This section describes the intended V1 target stack. `README.md` and `docs/PROGRESS.md` distinguish the components already implemented from later-phase additions.

### Mobile

- React Native;
- TypeScript;
- Expo development builds;
- Expo Router;
- TanStack Query;
- Zustand;
- React Hook Form;
- Zod;
- Expo Camera;
- Expo Location;
- Expo SecureStore;
- SQLite;
- React Native Maps.

### Web

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- TanStack Query;
- React Hook Form;
- Zod;
- MapLibre GL JS or Google Maps.

### Backend

- NestJS;
- TypeScript;
- REST API;
- Socket.IO.

### Core platform

- Supabase PostgreSQL;
- PostGIS;
- Supabase Auth;
- Supabase Storage;
- Row Level Security;
- Supabase Edge Functions where appropriate.

### Observability

- structured logs;
- request correlation;
- health checks;
- uptime monitoring;
- OpenTelemetry later.

Redis, BullMQ and Sentry are intentionally deferred beyond V1 and may be introduced only through a later approved architectural decision.

## Repository structure

```text
local-wellness/
├── apps/
│   ├── mobile/
│   ├── citizen-web/
│   ├── government-dashboard/
│   ├── admin-console/
│   ├── api/
│   ├── realtime-server/
│   └── workers/
├── packages/
│   ├── database/
│   ├── api-client/
│   ├── types/
│   ├── validation/
│   ├── routing-engine/
│   ├── design-system/
│   ├── localization/
│   ├── config/
│   └── observability/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   ├── functions/
│   ├── policies/
│   └── tests/
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── monitoring/
└── docs/
    ├── adr/
    ├── worklogs/
    ├── architecture.md
    ├── authentication.md
    ├── database.md
    ├── api.md
    ├── deployment.md
    └── supabase-setup.md
```

## Architectural style

V1 is a modular monolith with:

- one main API;
- one realtime server;
- one worker application;
- one Supabase project per environment.

This provides rapid delivery while preserving future service boundaries.

## Core domain modules

### Identity

- profiles;
- devices;
- roles;
- user-role assignments;
- authority memberships;
- authentication audit events.

### Governance

- states;
- districts;
- local bodies;
- administrative units;
- wards;
- departments;
- offices;
- officer roles;
- officers;
- officer assignments;
- utilities and emergency contacts;
- official source registry and immutable snapshots;
- staged synchronization candidates, changes, evidence and reviews;
- versioned official contact channels.

Governance synchronization is a permanent backend capability, distinct from the hash-pinned CSV
bootstrap. The implemented operational slice can claim due reviewed sources with PostgreSQL leases,
fetch bounded official HTTPS evidence through an Edge Function, preserve exact raw snapshots,
normalize contact candidates, and retain effective-dated contact history. PMC and BMC are the first
source-registry targets, but their ten seeded endpoints remain draft, unverified, and inactive.
Source-specific parsers, entity matching, review surfaces, transactional publication, hosted Cron,
and production data verification remain pending. An official response can establish provenance but
never automatically establish manual verification, routing eligibility, or complaint-delivery
approval.

### Complaints

- complaints;
- media;
- location evidence;
- assignments;
- status history;
- supporters;
- feedback;
- reopen requests.

Phase 4 complaint-capture engineering is implemented locally through the mobile client, NestJS API,
private Supabase Storage, and private complaint schema. The flow records exact-location evidence,
uses signed private-media uploads, presents advisory duplicate suggestions, and completes complaint
creation through an idempotent server-side submission boundary. Client input cannot choose an
official assignment or bypass database-driven routing.

Engineering completion does not activate an operational pilot. The canonical bootstrap currently
contains zero verified routable categories, so production-valid submission remains intentionally
data-gated. Speech transcription and media-moderation providers, physical-device validation, and
hosted-environment validation remain pending; no hosted application deployment has been performed.
Redis, BullMQ, and Sentry remain outside the V1 topology.

The reviewed public community layer is deliberately separate from complaint ownership and official
workflow state. A current reviewed projection may receive one support per active account and an
account-private star/follow state. Only the aggregate support count is public and may order the
bounded Trending view; support and stars never change routing, assignment, status, escalation,
SLA, or KPI evidence. Local and Trending lists plus the aggregate Heat view contain no citizen
identity, exact location, original media, or unreviewed report. Public comments remain disabled.

### Routing

- taxonomy;
- routing rules;
- asset ownership;
- routing decisions;
- fallback routes.

The Phase 3 implementation keeps operational routing configuration in a private, forced-RLS
schema. PostgreSQL/PostGIS supplies current verified evidence; a pure TypeScript evaluator applies
eligibility, deterministic ranking, confidence, ambiguity, and fallback behavior; and the NestJS
API exposes only authenticated, sanitized results. Placeholder or unverified records can support
engineering fixtures but cannot become an operational route.

For the current V1 BMC staging scope, the runtime uses a deliberately smaller database facade:
captured location → PostGIS ward → category → durable municipal intake role → ward recipient.
The existing append-only decision, complaint, assignment, history, and RLS boundaries remain
authoritative. A private ward/category matrix contains 26 wards × 12 categories and queues a ward
email after complaint assignment; no municipality or contact is hardcoded in application source.
The immutable issue-contact archive supplies category, phone and WhatsApp evidence, while the
immutable 2026-07-20 ward-directory archive supplies ward-office email and office evidence. Direct
K/N and P/E mailboxes and the K/S→K/E and P/W→P/N operational mappings are resolved during
generation. Raw source status/provenance remains separate from the owner's staging approval.
Phone, WhatsApp, email and exact location remain server-only. Provider delivery is a separate
operational step and a queued job is not represented as sent.

### Communication

- reviewed-public support counts and private account stars/follows;
- public comments (planned; disabled pending moderation and privacy policy);
- complaint conversation rooms;
- messages;
- read receipts;
- notifications.

### Operations

- SLAs;
- escalations;
- work references;
- external dependencies;
- audit logs.

### Analytics

- ward metrics;
- department metrics;
- municipality metrics;
- category metrics;
- trend snapshots.

## Routing model

```text
location
→ state
→ district
→ municipality or rural body
→ ward or administrative unit
→ category
→ asset type
→ asset owner
→ department
→ officer role
→ current assignment
→ SLA
→ escalation chain
```

The routing result must include confidence, matched rule, authority, administrative unit, department, officer role, current assignment, fallback and explanation metadata.

V1 may route to a durable municipal intake role without requiring a current named incumbent or an
asset-owner lookup. The more granular asset-owner and incumbent model remains available for later
reviewed categories, but it is not on the BMC V1 complaint-submission critical path.

## Location verification

V1 permits complaint submission only near the user's current location.

Store:

- latitude and longitude;
- GPS accuracy;
- capture timestamp;
- location provider;
- device and server timestamps;
- mock-location indicator where available;
- media capture coordinate;
- complaint coordinate;
- verification score.

Outcomes:

- verified;
- partially verified;
- low accuracy;
- location mismatch;
- suspected spoofing;
- unsupported area;
- manual review required.

## Data integrity principles

- PostgreSQL is the source of truth.
- complaint history is immutable.
- officer assignments are versioned.
- ward boundaries are versioned.
- routing rules are versioned.
- sensitive media is private by default.
- public location may be generalized.
- clients cannot assign departments or officers.
- clients cannot directly change official statuses.
- government actions are audited.

## Complaint lifecycle

```text
draft
→ submitted
→ validation_pending
→ validated
→ routing_pending
→ assigned
→ acknowledged
→ inspection_scheduled
→ inspection_completed
→ work_order_created
→ work_in_progress
→ resolution_submitted
→ citizen_verification_pending
→ resolved
→ closed
```

Alternative states include transferred, waiting for material, waiting for an external agency, reopened, rejected, cancelled and escalated.

## Public and private data

### Potentially public

- category;
- approximate location;
- public description;
- processed media;
- status;
- public timeline;
- ward and municipality;
- public resolution evidence.

### Private

- citizen identity;
- phone and email;
- raw device metadata;
- precise location history;
- original sensitive media;
- officer internal notes;
- moderation data;
- security risk signals.

## KPI model

Recommended V1 score:

- 20% acknowledgement SLA compliance;
- 20% resolution SLA compliance;
- 15% citizen-confirmed resolution;
- 15% low reopening rate;
- 10% low misrouting rate;
- 10% resolution evidence quality;
- 10% communication quality.

Segment by severity, category, complaint volume, municipality, ward, department and period.

Do not publish individual officer rankings in V1.

## V1 non-goals

- all-India coverage;
- direct emergency dispatch;
- blockchain;
- financial rewards;
- public individual officer rankings;
- livestreaming;
- autonomous AI closure;
- public direct messaging between citizens;
- legal adjudication.

## Success metrics

### Citizen

- complaint completion rate;
- location-verification rate;
- median creation time;
- duplicate merge rate;
- satisfaction response rate;
- reopen rate.

### Government

- acknowledgement SLA compliance;
- median assignment time;
- median resolution time;
- transfer and misrouting rate;
- backlog;
- resolution evidence completion.

### Platform

- routing accuracy;
- uptime;
- upload success;
- notification delivery;
- realtime latency;
- crash-free sessions.

## Pilot readiness

Do not launch until:

- municipality and wards are selected;
- ward boundaries are imported;
- departments and officer roles are verified;
- escalation and SLA rules are approved;
- emergency and privacy policies are published;
- RLS and lifecycle tests pass;
- moderation and audit logging are active;
- dashboard and rollback procedures are ready.

## Long-term expansion

1. more wards;
2. more Maharashtra municipalities;
3. rural Gram Panchayat workflows;
4. cross-agency asset ownership;
5. state-level integrations;
6. citizen web portal;
7. open-data dashboards;
8. additional states;
9. multilingual expansion;
10. advanced routing and duplicate intelligence.
