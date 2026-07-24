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
- eight to thirteen operational routing profiles selected from the broader citizen taxonomy;
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
- phone-gated password recovery and signed-in password change;
- mandatory phone OTP confirmation through ordinary Supabase Phone Auth;
- profile and owner-private profile image;
- English, Marathi, and Hindi language preference across the core mobile experience;
- device registration;
- secure session management.

Citizen mobile, Citizen Web full mode and API access fail closed until the email/password account
has a confirmed phone in Supabase Auth. Citizen sessions remain `aal1`; every supported password
change requires a fresh ordinary phone OTP on an isolated, non-persistent Supabase client. Email
recovery begins with the provider link and also requires the account's already confirmed phone.
Accounts without that phone use reviewed support recovery rather than an email-only password
fallback. Government and platform administrators retain invitation-controlled entry and their
independent TOTP/AAL2 policy. Supabase Phone Auth signup capability remains enabled because it
also gates OTP for an existing linked phone; a Before User Created Auth Hook rejects actual
phone-only account creation by requiring every new Auth user to carry an email.

### Complaint capture

- live photo;
- live video;
- live voice note;
- automatic GPS capture;
- current-location verification;
- typed description;
- primary-category and subcategory/issue-type dropdowns;
- derived workflow type and routing-readiness summary;
- urgency screening;
- nearby duplicate check;
- final review and submission on the same autosaving page.

Contextual civic-area screens reuse one bounded, memory-only foreground location for up to five
minutes when it is non-mocked and accurate to 100 metres. Complaint issue and media evidence never
use that cache: each evidence action obtains a fresh high-accuracy fix and retains the 50-metre
policy. The app may request foreground permission automatically once per process session when the
first relevant feature is entered; after denial, only an explicit retry or settings action can
request recovery.

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
- resolution evidence;
- verified current ward/local-body context and a bounded directory of official public offices.

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

The current mobile implementation uses a first-party schematic area surface rather than external
map tiles. Community keeps the owner's recent private complaints separate from reviewed-public
Local/Trending feeds and loads aggregate Heat data only when that mode is opened.

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

## Citizen complaint taxonomy

JagrukSetu V1 provides a discoverable classification system with 17 primary categories, 340
subcategories and 19 derived workflow types. The mobile form uses two dropdowns: primary category
and subcategory/issue type. The source contains no concrete issue-variant rows, so workflow type is
read-only and a third selector is deferred.

Classification is separate from operational routing. For the generated BMC V1 intake, 13
specialised leaves retain the 12 stable specialised profiles and 243 additional ordinary leaves
reuse one `general_ward_complaint` profile. This makes 256 leaves internally submittable through 13
operational profiles. Mobile never chooses an authority, department, office, officer, recipient or
routing rule.

The other 84 private or emergency-private leaves use `protected_handoff` and remain unavailable to
normal complaint submission. They expose only reviewed official `call` actions or credential-free
HTTPS pages. Opening one of those actions does not create a complaint number, assignment, ward
email, or Community post. `COR` — Corruption, Bribery & Public Integrity — contributes 20 of these
protected leaves and retains its independent-oversight and whistleblower/privacy boundary.

## Initial operational routing profiles

The current BMC V1 intake retains 12 specialised profiles and adds one general ward-intake profile.
The citizen-facing issue label remains the selected taxonomy label even when the general profile is
used internally.

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

Only profiles with verified ownership should be activated in the pilot. A taxonomy entry being
visible does not make it operational.

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
- canonical import provenance;
- private BMC ward/category contact routes.

The undeployed governance synchronization and versioned-contact subsystem is retired for V1 under
ADR-0031. Its 14 tables, Edge fetch boundary, lifecycle RPCs and pilot seeds are physically removed.
Canonical imported governance rows, effective-dated boundaries and officer assignments remain. A
future synchronization product requires a new architectural decision and migration rather than
restoring the retired pipeline implicitly.

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

The mobile Community screen also provides a deliberately separate signed-in **Your reports**
preview. It reads the same actor-scoped private history used by Complaints, refreshes on focus, and
does not require a locality lookup. It gives the owner immediate access to a successful submission
without converting that complaint into a public projection, exposing it to other citizens, placing
it on Heat/Local/Trending, or enabling public support/star actions.

### Routing

- citizen classification taxonomy and explicit operational-profile mappings;
- routing rules;
- asset ownership;
- routing decisions;
- fallback routes.

The Phase 3 implementation keeps operational routing configuration in a private, forced-RLS
schema. PostgreSQL/PostGIS supplies current verified evidence; a pure TypeScript evaluator applies
eligibility, deterministic ranking, confidence, ambiguity, and fallback behavior; and the NestJS
API exposes only authenticated, sanitized results. Placeholder or unverified records can support
engineering fixtures but cannot become an operational route.

The citizen taxonomy reuses the existing routing-category registry without replacing the 12
specialised operational identifiers. It adds one general ward-intake profile, for 13 operational
profiles in total. An explicit database-owned mapping is the only bridge from a taxonomy
subcategory to an operational profile. The selected primary code, subcategory code and derived
workflow type are retained as validated draft attributes; submission revalidates that tuple and
the current mapping.

For the current V1 BMC staging scope, the runtime uses a deliberately smaller database facade:
captured location → PostGIS ward → category → durable municipal intake role → ward recipient.
The existing append-only decision, complaint, assignment, history, and RLS boundaries remain
authoritative. A private ward/profile matrix contains 338 contacts: the existing 26 wards × 12
specialised profiles plus one general profile per ward. The 256 ordinary leaves can queue a ward
email after complaint assignment; the 84 protected handoffs cannot. No municipality or contact is
hardcoded in application source.
The immutable issue-contact archive supplies category, phone and WhatsApp evidence, while the
immutable 2026-07-20 ward-directory archive supplies ward-office email and office evidence. Direct
K/N and P/E mailboxes and the K/S→K/E and P/W→P/N operational mappings are resolved during
generation. Raw source status/provenance remains separate from the owner's staging approval.
Phone, WhatsApp, email and exact location remain server-only. Provider delivery is a separate
operational step and a queued job is not represented as sent. Owner complaint views, Government
Dashboard views, and ward email use the taxonomy-aware issue label rather than replacing it with
the internal general-profile name.

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

Mobile location acquisition is purpose-scoped. Community, Profile, and Nearby governance may share
a non-mocked, memory-only current-area fix for at most five minutes when its accuracy is 100 metres
or better; explicit refresh bypasses that cache. Complaint issue and live-media evidence never use
the current-area or operating-system last-known cache and continue to require a fresh high-accuracy
foreground fix. The app has no periodic/background location task and persists no ambient coordinate
history.

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
