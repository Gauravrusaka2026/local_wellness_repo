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

- React Native
- TypeScript
- Expo development builds and Expo Router
- Expo SecureStore
- Supabase Auth

Planned product-phase additions include:

- TanStack Query
- Zustand
- React Hook Form
- Zod
- Expo Camera
- Expo Location
- SQLite
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

1. `AGENTS.md`
2. `README.md`
3. `PROJECT_OVERVIEW.md`
4. `PLAN.md`
5. `docs/architecture.md`
6. `docs/database.md`
7. `docs/authentication.md`
8. `docs/api.md`
9. `docs/deployment.md`
10. `docs/supabase-setup.md`
11. applicable ADRs in `docs/adr/`
12. `docs/TASKS.md`

---

## Local Development

### Prerequisites

- Node.js LTS
- pnpm
- Docker
- Git
- Android Studio or Xcode as needed

The repository pins the Supabase CLI and Expo toolchain as project dependencies.

### Initial Setup

```bash
git clone git@github-rusaka.com:Gauravrusaka2026/local_wellness_repo.git
cd local_wellness_repo

corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm database:start
pnpm database:reset
pnpm database:test

# After filling .env.local with the local URL and keys:
set -a
. ./.env.local
set +a

pnpm dev
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
pnpm database:reset
pnpm database:test
pnpm test:auth:e2e
pnpm database:types
EXPO_NO_TELEMETRY=1 NEXT_TELEMETRY_DISABLED=1 pnpm build
docker compose --file infrastructure/docker/compose.dev.yml config --quiet
pnpm audit --prod
```

The local Auth test always validates email magic-link sign-in when Supabase is running. Its phone case is intentionally provider-gated: configure a local SMS provider and set `LOCAL_SUPABASE_SMS_ENABLED=true` before expecting that case to run.

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
pnpm database:reset
pnpm exec supabase db diff
pnpm database:test
pnpm database:types
```

No production schema change should be performed only through the Supabase dashboard.

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
- local Supabase configuration, migration tests, RLS tests, API tests, and client build validation are part of CI;
- Redis, BullMQ, and Sentry are intentionally outside the V1 topology;
- previously exposed development credentials still require owner rotation before hosted integration;
- phone delivery, hosted callbacks, MFA enforcement, device-bound session invalidation, and real-device behavior remain documented pre-launch follow-ups;
- pilot municipality selection pending.

See `PLAN.md` for implementation phases.
