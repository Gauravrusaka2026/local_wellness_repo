# Local Wellness

Local Wellness is a Maharashtra-first civic complaint reporting and accountability platform.

The platform enables residents to capture location-verified civic complaints, upload images or videos, submit typed or voice descriptions, and route complaints to the correct municipality, ward, department, and officer role.

The initial version focuses on selected Maharashtra municipal bodies and wards, with architecture designed for later expansion across India.

---

## Core Product Goals

- Allow citizens to report local civic issues from their current location.
- Support live image and video capture.
- Support typed and voice complaints.
- Verify GPS location before complaint submission.
- Route complaints to the correct local authority.
- Track complaint status through a complete timeline.
- Support officer assignment, transfer, escalation, and resolution evidence.
- Allow citizens to confirm, reject, rate, or reopen resolutions.
- Provide nearby complaint maps.
- Provide ward, department, and municipality KPI dashboards.

---

## Initial Geography

V1 is Maharashtra-first.

Recommended pilot cities:

1. Pune
2. Mumbai
3. Thane
4. Pimpri-Chinchwad
5. Nagpur
6. Nashik
7. Navi Mumbai

The initial implementation should begin with one municipality and 5 to 10 verified wards.

---

## Technology Stack

### Mobile

- React Native 0.81.5
- TypeScript 5.9.3
- Expo SDK 54.0.33 development builds/Expo Go and Expo Router 6
- Expo Camera and Expo Location
- Expo SecureStore
- SQLite-backed complaint draft recovery
- Supabase Auth

Planned product-phase additions include:

- TanStack Query
- Zustand
- React Hook Form
- Zod
- React Native Maps

### Web

- React
- Next.js
- TypeScript
- Supabase SSR and PKCE cookie sessions

Planned product-phase additions include:

- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### Backend

- NestJS
- TypeScript
- REST API
- Socket.IO

### Core Platform

- Supabase PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Storage
- Supabase Row Level Security
- Supabase Edge Functions where appropriate

### Observability

- structured logging
- request correlation
- health checks
- uptime monitoring
- OpenTelemetry later

Redis, BullMQ, and Sentry are intentionally deferred beyond V1. See ADR-0007.

---

## Repository Structure

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
│
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
│
├── supabase/
│   ├── migrations/
│   ├── seed/
│   ├── functions/
│   ├── policies/
│   └── tests/
│
├── resources/
│   └── governance/
│       ├── csv/
│       ├── manifests/
│       └── MH_MASTER_GOVERNANCE_DATA_v1.xlsx
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── monitoring/
│
├── docs/
│   ├── adr/
│   ├── api.md
│   ├── architecture.md
│   ├── authentication.md
│   ├── database.md
│   ├── deployment.md
│   └── supabase-setup.md
│
├── AGENTS.md
├── PROJECT_OVERVIEW.md
├── PLAN.md
└── README.md
```

---

## Documentation Reading Order

Before implementing any feature, contributors and coding agents should read:

1. `README.md`
2. `PROJECT_OVERVIEW.md`
3. `PLAN.md`
4. `docs/architecture.md`
5. `docs/database.md`
6. `docs/authentication.md`
7. `docs/api.md`
8. `docs/deployment.md`
9. `docs/supabase-setup.md`
10. applicable ADRs in `docs/adr/`
11. `docs/TASKS.md`
12. `docs/PROGRESS.md`
13. `docs/CHANGELOG.md`
14. `docs/DECISIONS.md`
15. `docs/KNOWN_ISSUES.md`

---

## Local Development

### Prerequisites

- Node.js LTS
- Corepack-provided pnpm 11
- Docker
- Git
- Android Studio or Xcode as needed

The repository pins the Supabase CLI and Expo toolchain as project dependencies.
The mobile workspace is aligned to Expo SDK 54, React Native 0.81.5, and React 19.1 so the current
Android Expo Go SDK 54 client can open it. After changing SDK dependencies, reinstall from the
lockfile and restart Metro with `pnpm --filter @local-wellness/mobile dev -- --clear`.

### Initial Setup

```bash
git clone git@github-rusaka.com:Gauravrusaka2026/local_wellness_repo.git
cd local_wellness_repo

corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm database:start
pnpm governance:data:check
pnpm database:reset
pnpm database:test

# After filling .env.local with the local URL and keys:
set -a
. ./.env.local
set +a

pnpm dev
```

If the Corepack installation directory is not writable, install its pnpm shim in a user-owned directory already on `PATH`:

```bash
corepack enable --install-directory "$HOME/.local/bin" pnpm
```

After the local stack starts, read its values with `pnpm exec supabase status -o env` and copy them into the untracked environment file using this mapping:

| CLI output        | Repository variables                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `API_URL`         | `SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_URL`                                     |
| `PUBLISHABLE_KEY` | `SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SECRET_KEY`      | `SUPABASE_SECRET_KEY` only                                                                                     |

Source the root file before running workspace commands because the NestJS process does not load it implicitly. Current CLI stacks may also print legacy anon/service-role JWTs; the verified Phase 1 stack rejects the legacy service-role JWT, so prefer the current keys. Never copy `SECRET_KEY`, a hosted secret key, or a service-role key into any `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable.

### Repository Validation

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm governance:data:check
pnpm database:reset
pnpm database:lint
pnpm database:test
pnpm test:auth:e2e
pnpm database:types
pnpm database:types:check
EXPO_NO_TELEMETRY=1 NEXT_TELEMETRY_DISABLED=1 pnpm build
docker compose --file infrastructure/docker/compose.dev.yml config --quiet
pnpm audit --prod
```

The local Auth test validates delivery and verification of a six-digit, code-only citizen email OTP
when Supabase is running. The committed confirmation and magic-link templates intentionally contain
no sign-in link. Its phone case is provider-gated: configure a local SMS provider and set
`LOCAL_SUPABASE_SMS_ENABLED=true` before expecting that case to run.

---

## Environments

The project uses separate environments:

- local
- development
- staging
- production

Each environment must use a separate Supabase project or local Supabase instance.

Never point local development directly at the production Supabase project.

---

## Required Environment Variables

Example categories:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
GOVERNMENT_INVITE_REDIRECT_URL
API_ALLOWED_ORIGINS
GOVERNANCE_SYNC_DISPATCH_SECRET

EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
```

Only public client-safe variables may use `EXPO_PUBLIC_` or `NEXT_PUBLIC_`.

Use publishable and secret keys for current Supabase projects; anon and service-role variables remain legacy fallbacks. Preferred variables may be left empty when a legacy value is intentionally used. Either server credential must exist only in trusted server or worker environments.
`GOVERNANCE_SYNC_DISPATCH_SECRET` is a separate high-entropy server/Edge secret used only by the
environment scheduler; never expose it to a browser/mobile bundle, source registry row, or log.

### First Platform Administrator

After an operator creates and verifies the first Supabase Auth user in an isolated environment, bootstrap that one account from a trusted shell:

```bash
SUPABASE_URL=<environment-url> \
SUPABASE_SECRET_KEY=<server-only-key> \
pnpm access:bootstrap-platform-admin -- <auth-user-uuid>
```

The database function is service-role-only, appends an audit record, and refuses to create a second active platform administrator through this bootstrap path.

---

## Database Workflow

All database changes must be created through SQL migrations.

```bash
pnpm exec supabase migration new <migration_name>
pnpm governance:data:check
pnpm database:reset
pnpm database:lint
pnpm exec supabase db diff
pnpm database:test
pnpm database:types
pnpm database:types:check
```

No production schema change should be performed only through the Supabase dashboard.

Phase 2 governance data is generated from the hash-pinned canonical CSVs. Use `pnpm governance:data:validate` for a read-only audit, `pnpm governance:data:generate` after an intentionally reviewed source/manifest change, and `pnpm governance:data:check` in ordinary development and CI. Never hand-edit the canonical CSVs, the generated main seed, its checksum companion or the machine report; see `docs/governance-data.md`.

The validation report now includes a per-file outcome matrix. The current 901-row canonical bundle
classifies 41 rows as accepted, 691 as unverified, 169 as quarantined, and zero as rejected.
Accepted means structurally importable, not automatically production-verified; placeholders and
incomplete evidence remain explicitly non-routable.

Phase 3 adds the private `routing` schema and a review-gated governance-synchronization
foundation. A local reset seeds the 12 pilot taxonomy records as draft, unverified, and
non-routable engineering data. This is intentional: the authenticated routing API returns no
operational category or route until verified database evidence is reviewed and activated. See
`docs/governance-synchronization.md` before adding or refreshing an official source.

The permanent governance synchronization workstream now includes database-backed due-source
claims/leases, a bounded `governance-sync-fetch` Edge Function, private content-addressed raw
snapshots, source audit events, immutable contact versions, and a pure contact normalizer. A local
reset registers ten PMC/BMC official endpoints only as draft, unverified, inactive definitions.
It also selects five canonical Pune and five canonical Brihanmumbai ward records in a service-only
synchronization scope. Those ten rows and their underlying wards remain draft/unverified,
placeholder-backed, unapproved, and non-routable. They are retained as V1 bootstrap/audit history,
not promoted as official identities. The reviewed pilot direction is BMC administrative wards
`A`–`E` and Pune's current official numeric wards `1`–`5`; both require official evidence and new
reviewed scope records before activation. Never infer an ordinal mapping from `BRIH-W01`–`BRIH-W05`
to BMC's lettered wards.
Nothing is fetched on a schedule, published, made routable, approved for complaint delivery, or
activated by that seed. Current source contracts are SHA-256 pinned and require an active global
platform-administrator's exact-hash approval. Each dispatch can claim one source and
uses a heartbeat-protected lease around immutable private Storage. Failed or ambiguous snapshot
finalization retains content-addressed bytes for grace-period reconciliation rather than risking an
eager-delete race. Source-specific parsers, entity matching, review APIs/UI, transactional
publishers, DNS-resolution hardening, snapshot reconciliation, environment secrets, and Cron
activation remain required. See
`docs/governance-synchronization.md` and ADR-0012.

The dedicated Supabase staging project was initialized on 2026-07-14 with all 23 migrations through
`20260714124000` and the six reviewed non-production seed files. The existing citizen identity was
reconciled by the profile backfill. Staging contains 12 categories with zero operational categories
and 11 synchronization endpoints (the repository bootstrap plus ten PMC/BMC contracts) with zero
active endpoints. This is a database-only staging deployment: no application, Edge Function, Cron,
source, route, ward, complaint, or production deployment/activation is implied.

Phase 4 adds the local mobile complaint-capture flow and authenticated complaint API. For local
engineering, run the API and mobile workspaces after starting and resetting Supabase:

```bash
pnpm --filter @local-wellness/api dev
pnpm --filter @local-wellness/mobile dev
```

The flow captures exact location evidence, discovers database-driven nearby assets when a category
requires one, uploads media through private signed Storage targets, shows advisory duplicate
suggestions, and completes submission through an idempotent server-side operation. The mobile flow
advances only with `verified` or `partially_verified` location evidence. Asset discovery and routing
both exclude inactive, unverified, placeholder, non-routable, or out-of-jurisdiction records.

Phase 5 adds a server-rendered government queue and complaint workspace. Start it beside the API:

```bash
pnpm --filter @local-wellness/api dev
pnpm --filter @local-wellness/government-dashboard dev
```

The dashboard reads only the current user's database-authorized scope and exposes only server-
calculated actions. It supports filtered queues, complaint detail, versioned assignment/transfer,
acknowledgement and status changes, private notes, inspections, work references, external
dependencies, private resolution evidence, and resolution submission. Every mutation is
idempotent, workflow-version checked, scope/capability checked, and audited. Status changes append a
data-minimized notification outbox record in the same transaction; Phase 5 does not deliver those
records. Exact coordinates are rendered as authorized text only because no external map provider or
coordinate-sharing policy has been selected.

The current bootstrap intentionally exposes zero verified routable categories, so a valid
production-style submission and a real government queue remain blocked until reviewed pilot
routing data is activated. Speech transcription, media moderation, physical-device verification,
hosted-environment verification, and provider-backed notification delivery remain pending. No
hosted application deployment is part of the current repository state.

Phase 6 adds database-first private complaint conversations, durable in-app notification history,
and authenticated single-instance Socket.IO delivery. For local engineering, start Supabase and
the API first, then run only the clients and background processes you need:

```bash
pnpm --filter @local-wellness/api dev
pnpm --filter @local-wellness/workers dev
pnpm --filter @local-wellness/realtime-server dev
pnpm --filter @local-wellness/mobile dev
pnpm --filter @local-wellness/government-dashboard dev
```

Messages are persisted before broadcast. The worker materializes the transaction outbox into
recipient-specific in-app notifications, while Socket.IO events act only as authenticated
invalidation hints over REST-backed history. The V1 realtime topology supports one instance and
uses PostgreSQL leases, bounded retries, stable event IDs, and retained delivery attempts without
Redis or BullMQ. Push and email are recorded as explicitly unsupported until providers, user
preferences/consent, verified destinations, and credentials are approved. Public comments remain
disabled until public visibility, moderation, abuse controls, and privacy policy are reviewed.

Phase 7 adds the private resolution-accountability loop. New government resolutions retain a
server completion time, captured completion location, optional existing work reference, and
explicitly linked after evidence before entering citizen verification. The complaint owner can
review authorized before/after evidence, submit one immutable outcome with four policy-bounded
ratings, upload private follow-up evidence, and request reopening. PostgreSQL selects the approved
effective-dated policy, derives reopened versus escalated state, and commits workflow history,
audit, and the existing notification outbox atomically. Persisted feedback, reopen, and escalation
receipts remain visible after refresh, and complaint realtime hints reload the authoritative
accountability context. The government dashboard shows the full access-scoped accountability
history while keeping internal completion notes private from the citizen.

No operational Phase 7 policy is seeded: the rating scale, review windows, eligible statuses,
reopen reasons, evidence requirement, attempt limit, and repeated-reopen threshold require product
approval. Until an approved policy version is deliberately activated, feedback and reopening fail
closed while existing complaint and resolution history remains readable. Tests may use only
rollback-isolated synthetic policies.

---

## ADR Workflow

Architectural decisions must be documented in `docs/adr/`.

Create an ADR when changing:

- backend framework;
- authentication provider;
- database model;
- routing architecture;
- event delivery mechanism;
- storage strategy;
- public visibility policy;
- security model;
- deployment architecture;
- monitoring strategy;
- major dependency;
- monorepo structure.

ADR file format:

```text
docs/adr/0001-use-supabase-as-core-platform.md
docs/adr/0002-use-nestjs-for-api.md
docs/adr/0003-use-socketio-for-realtime.md
```

---

## Development Principles

- PostgreSQL is the source of truth.
- Every exposed table uses RLS.
- Complaint status history is immutable.
- Officer assignments are versioned.
- Ward boundaries are versioned.
- Routing rules are versioned.
- Sensitive media is private by default.
- The client cannot choose the assigned authority.
- Every government action is audited.
- Emergency complaints must direct users to official emergency services.

---

## Project Status

Current stage:

- product architecture defined;
- Maharashtra-first scope defined;
- Phase 0 pnpm/Turborepo foundation implemented and verified;
- Phase 1 identity schema, RLS, passwordless Auth clients, secure sessions, profile setup, audited device registration, scoped government access, and invitation APIs implemented and locally verified against its exit criteria;
- Phase 2 governance schema, PostGIS/versioning, canonical CSV validation, deterministic normalized seed, governance RLS, canonical authority links, and migration/seed/routing-data tests implemented locally; the supplied baseline remains non-routable where identifiers, contacts, assignments, or geometry are unverified;
- Phase 3 routing schema, deterministic routing and duplicate-scoring packages, authenticated
  routing contracts, accuracy-aware PostGIS candidate queries, append-only decision evidence, and
  review-gated governance-synchronization foundations are implemented and locally verified;
  verified pilot-data activation remains a separate pending milestone;
- governance synchronization retrieval engineering now includes PostgreSQL leases/retry state,
  service-only lifecycle RPCs, a bounded Edge fetch/snapshot function, immutable source evidence,
  versioned contacts, and normalization tests. Ten PMC/BMC endpoints remain draft, unverified, and
  inactive. Ten pilot ward scope targets (five per municipality) are also service-only, draft,
  unverified, placeholder-backed, and non-routable; no parser output, record, contact, route, or
  complaint-delivery target is automatically verified or published;
- Phase 4 mobile complaint capture, exact-location evidence, private signed media upload,
  duplicate suggestions, and idempotent server-orchestrated submission are implemented for local
  engineering; the bootstrap contains zero verified routable categories, so the valid-submission
  production exit remains data-gated;
- the mobile dependency set is aligned to Expo SDK 54.0.33, React Native 0.81.5, React 19.1, and
  TypeScript 5.9.3; the SDK compatibility check, strict type-check, and Android export pass locally;
- citizen web account rendering now shows authenticated identity and explicit onboarding,
  provisioning, profile-unavailable, API-error, and complete states; the web client and API must
  still target the same fully migrated Supabase environment;
- an idempotent local migration repairs missing application profiles and global citizen roles for
  existing Supabase Auth users without overwriting profile data or reactivating a revoked citizen
  role; local citizen email templates now deliver a six-digit OTP without a sign-in link;
- routing activation validation reports overlapping operational rule/policy conflicts, and the
  authenticated nearby-asset endpoint returns only current verified, owned, jurisdiction-matching
  database assets; the mobile capture flow uses that picker and its database verification result;
- the Phase 2 governance audit now records a per-file accepted/unverified/quarantined/rejected
  outcome matrix while leaving the canonical CSV and workbook unchanged;
- Phase 5 government-workflow engineering adds private forced-RLS workflow tables, database-
  enforced scope/capability/transition checks, versioned complaint assignments, exact-replay action
  requests, append-only audit/history, inspections, work references, dependency closure, private
  resolution evidence, versioned resolutions, a transaction outbox, NestJS APIs, and a scoped
  government dashboard queue/detail workspace;
- Phase 6 engineering adds forced-RLS conversations/messages/read receipts, durable in-app
  notifications, PostgreSQL-leased outbox/realtime delivery, authenticated Socket.IO rooms,
  private message/notification APIs, a mobile notification/conversation experience, and the
  government complaint conversation panel. Local reset, pgTAP, lint, type generation, tests, and
  builds pass; the two Phase 6 migrations are not yet deployed to staging;
- Phase 6 does not activate placeholder pilot data, external push/email delivery, public comments,
  multi-instance realtime, or a hosted application. Verified Pune/BMC data, provider policy, and
  managed-environment validation remain separate gates;
- Phase 7 engineering adds versioned resolution policy, completion-location/work-reference
  evidence, citizen feedback and reopening, private follow-up evidence, repeated-reopen escalation,
  strict APIs, and mobile/government client surfaces. No operational policy or production data is
  activated automatically;
- Pune Municipal Corporation is the generic architecture and test reference only; no
  municipality-specific routing logic exists, and verified Pune boundaries, ownership mappings,
  officer-role assignments, confidence policy, and fallback records remain required before an
  operational route can be activated;
- local Supabase configuration, migration tests, RLS tests, API tests, and client build validation are part of CI;
- Redis, BullMQ, and Sentry are intentionally outside the V1 topology;
- the connected Supabase project is confirmed as dedicated staging, and its privileged/database
  credentials are newly generated replacements; production credentials and production deployment
  remain separate and are not present in this repository;
- phone delivery, hosted callbacks, MFA enforcement, device-bound session invalidation, complaint
  transcription and moderation providers, physical-device behavior, and hosted application
  verification remain documented pre-launch follow-ups; the staging database is migrated and
  seeded, but no hosted application or production deployment has been performed;
- verified Pune LGD identifiers, selected ward geometry, and operational ownership mappings remain
  required before the reference pilot can claim real jurisdiction-routing coverage.

See `PLAN.md` for implementation phases.
