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
- Provide reviewed Local and Trending community views with privacy-safe support counts and private
  saved/starred state.
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
- Expo SDK 54.0.36 development builds/Expo Go and Expo Router 6
- Expo Camera, Location, and Audio
- Expo SecureStore
- SQLite-backed complaint draft recovery
- Supabase Auth
- Zod-backed shared runtime contracts

OS-level push notifications are not enabled yet. The implemented notification experience is the
durable in-app history with optional authenticated Socket.IO refresh. Adding `expo-notifications`
requires an approved Expo/EAS project, FCM/APNs credentials, user consent/preferences, destination
verification, and delivery policy.

Planned product-phase additions include:

- TanStack Query
- Zustand
- React Hook Form
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
The mobile workspace is aligned to Expo SDK 54.0.36, React Native 0.81.5, and React 19.1 so the current
Android Expo Go SDK 54 client can open it. After changing SDK dependencies, reinstall from the
lockfile and restart Metro with `pnpm --filter @local-wellness/mobile dev -- --clear`.

### Initial Setup

```bash
git clone git@github-rusaka.com:Gauravrusaka2026/local_wellness_repo.git
cd local_wellness_repo

corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm database:start
pnpm governance:data:check
pnpm database:reset
pnpm database:test

# After filling the root .env with the local URL and keys:
set -a
. ./.env
set +a

pnpm dev
```

If the Corepack installation directory is not writable, install its pnpm shim in a user-owned directory already on `PATH`:

```bash
corepack enable --install-directory "$HOME/.local/bin" pnpm
```

After the local stack starts, read its values with `pnpm exec supabase status -o env` and copy them into the untracked root `.env` file using this mapping:

| CLI output        | Repository variables                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `API_URL`         | `SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_URL`                                     |
| `PUBLISHABLE_KEY` | `SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SECRET_KEY`      | `SUPABASE_SECRET_KEY` only                                                                                     |

The API, mobile client, Citizen Web, Government Dashboard, and Admin Console scripts load this one
repository-root file automatically. Values already exported by a deployment or the current shell
take precedence. Source it explicitly before the full `pnpm dev` command because the remaining
worker processes do not load it implicitly. Do not create app-local `.env.local` copies: a stale
copy can authenticate a browser against one Supabase project while the API reads another. The app
runner rejects supported app-local environment filenames, and Turbo includes the root file plus
injected public client variables in build cache keys. Current CLI stacks may also print legacy
anon/service-role JWTs; the verified Phase 1 stack rejects the
legacy service-role JWT, so prefer the current keys. Never copy `SECRET_KEY`, a hosted secret key,
or a service-role key into any `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variable.

`pnpm dev` starts every persistent workspace, including the workers and realtime server. For routine
API or client development against hosted Supabase, start only the workspaces being exercised. Start
the workers only for notification/SLA/KPI testing and the realtime server only for Socket.IO delivery
testing, then stop them when that test is complete. Their PostgreSQL claim loops use adaptive idle
polling. The repository environment template uses a 10-second base interval: realtime backs off to
15 seconds, while each notification, SLA, and KPI worker backs off to 60 seconds. A successful claim
resets only that loop to its configured base interval. This hardening does not add Redis, BullMQ, or
Sentry.

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

Managed Supabase projects do not need those custom code-only templates. Citizen, government, and
administrator clients accept either a delivered code or the provider's default PKCE magic link.
The trusted government invitation callback also accepts the default Supabase invite fragment,
scrubs it immediately, and still requires the pre-existing database membership and role. Add each
exact application callback to the managed Auth redirect allow-list; use an installed mobile
development/release build for `localwellness://auth/callback` rather than relying on Expo Go's
temporary `exp://` URL.

### Testing the three account experiences

- Citizen Web uses email/password. Its login and account pages show the exact active account,
  provide a sign-out/switch-account path, and distinguish optional Phone MFA rollout from a
  verified phone factor.
- Government Dashboard uses an existing authorized identity. Production officials enter through
  the invitation email flow; pre-provisioned staging identities may use their generated password.
  The UI treats authentication, personal TOTP verification, and database authority membership/
  scoped role as three separate gates.
- Admin Console is only for a platform or municipal administrator. It shows the active email,
  supports password or email verification for an existing identity, labels first-time QR
  enrollment separately from later authenticator-code challenges, and creates official invitations
  from named verified operational authority, ward, and department choices.

Each official must use an individual account and enroll their own authenticator. Signing in or
scanning a QR code never grants a government role. An authorized administrator must create the
membership and scoped role through the Admin Console/API. Managed MFA recovery still requires the
reviewed administrator process documented in `docs/authentication.md`. For now, invite a new
official-controlled email; assigning government access to an email that already exists remains the
audited lifecycle task tracked as `AUTH-001`.

The portals normalize Supabase's short-lived TOTP SVG before rendering it and bypass Next image
optimization for that private data URL. If a setup page was closed before verification, reload it
and choose **Restart authenticator setup**; the portal removes only its own unfinished factor before
creating a new QR code.

All three web portals and the API must use the same root `.env` and the same migrated Supabase
project. Their local scripts now load that file automatically and preserve explicitly injected
deployment values; builds are invalidated when that configuration changes. If a session was
created before configuration was corrected, sign out, clear
the old portal session, restart the affected portal, and sign in again with the email shown on its
login screen.

### Synthetic staging privileged accounts

For a bounded non-production demonstration, a trusted operator may provision separate synthetic,
expiring identities after the staging schema and reviewed BMC authority/scopes are present:

```bash
pnpm access:provision-staging-demo -- \
  --acknowledge-staging \
  --project-ref <20-character-project-ref> \
  --authority-name "Brihanmumbai Municipal Corporation" \
  --expires-in-days 30
```

The command refuses a non-matching hosted project URL, ambiguous reviewed scope, partial access
state, or unexpected active platform administrator. It creates distinct platform, municipal,
government-operator, ward, and department identities, preassigns their roles through trusted
database functions, and verifies their generated passwords. Privileged assignments expire in 1–90
days; 30 days is the default.

Credentials are written only to the gitignored local file
`.local/staging-demo-accounts.<project-ref>.json`, which is forced to mode `0600`. The command does
not print passwords, server keys, OTPs, or authenticator secrets. Treat this artifact as sensitive:
share no account between testers, enroll a separate TOTP for each account used, and delete the local
artifact and revoke/disable synthetic identities after the demonstration.

Password sign-in does not create an account, assign a role, or bypass MFA. Both privileged portals
continue through TOTP/AAL2 and current database authorization. Production onboarding remains
invitation-first with unique official-controlled email addresses. The staging helper does not close
the existing-user assign/revoke/renew gap tracked as `AUTH-001`; see ADR-0025 and
`docs/authentication.md`.

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
NOTIFICATION_WORKER_ID
NOTIFICATION_BATCH_SIZE
NOTIFICATION_LEASE_SECONDS
NOTIFICATION_POLL_INTERVAL_MS
SLA_ESCALATION_WORKER_ID
SLA_ESCALATION_BATCH_SIZE
SLA_ESCALATION_LEASE_SECONDS
SLA_ESCALATION_POLL_INTERVAL_MS
KPI_CALCULATION_WORKER_ID
KPI_CALCULATION_BATCH_SIZE
KPI_CALCULATION_LEASE_SECONDS
KPI_CALCULATION_POLL_INTERVAL_MS
EMAIL_SMTP_HOST
EMAIL_SMTP_PORT
EMAIL_SMTP_USER
EMAIL_SMTP_PASSWORD
EMAIL_FROM

EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_PHONE_MFA_MODE

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE
```

Only public client-safe variables may use `EXPO_PUBLIC_` or `NEXT_PUBLIC_`.

Use publishable and secret keys for current Supabase projects; anon and service-role variables remain legacy fallbacks. Preferred variables may be left empty when a legacy value is intentionally used. Either server credential must exist only in trusted server or worker environments.
`GOVERNANCE_SYNC_DISPATCH_SECRET` is a separate high-entropy server/Edge secret used only by the
environment scheduler; never expose it to a browser/mobile bundle, source registry row, or log.
The optional ward-email sender runs only in the trusted workers process. Configure `EMAIL_SMTP_HOST`,
`EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, and `EMAIL_SMTP_PASSWORD` there; `EMAIL_FROM` may override the
authenticated mailbox used in the From header. When those SMTP values are absent, the ward-email
loop remains disabled while the other worker loops continue. Never use any `EXPO_PUBLIC_*` or
`NEXT_PUBLIC_*` variable for SMTP credentials.

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

For a clean database bootstrap that requires one SQL file, use `supabase/master.sql`. For an
existing database created from an earlier Local Wellness master, run `supabase/master.part-1.sql`
and then `supabase/master.part-2.sql`. Together they contain all 48 migrations, detect and skip a
coherent completed prefix, and apply only missing migrations in two transaction-atomic parts. They
deliberately exclude seed data and fail on partial or non-contiguous schema fingerprints.

If an existing non-production target is confirmed complete through
`20260716115000_phase_10_profile_images.sql` (migration 38), run the compact 77,849-byte
`supabase/deploy/current-session/01_migrations_39_through_43.sql` in **SQL Editor → New query**.
It applies the exact missing migrations 39–43 atomically, skips a coherent completed prefix,
verifies migration 43 plus readiness, and is safe to rerun after success. It neither updates the
Supabase migration ledger nor loads seed data. On any baseline, partial, or non-contiguous-state
error, stop: reconcile the target or use `master.part-1.sql` followed by `master.part-2.sql` when a
coherent earlier Local Wellness prefix is present. Never edit the guards or add broad
`IF NOT EXISTS` clauses.

```bash
pnpm database:master:generate
pnpm database:master:check
pnpm database:current-session:generate
pnpm database:current-session:check
```

Do not add any master artifact to `supabase/migrations/`, apply `master.sql` to an existing database,
or bypass an adaptive-part preflight with blanket `IF NOT EXISTS`. Dashboard execution does not populate
Supabase's migration-history ledger; reconcile that ledger before any later CLI migration workflow.

No production schema change should be performed only through the Supabase dashboard.

Phase 2 governance data is generated from the hash-pinned canonical CSVs. Use `pnpm governance:data:validate` for a read-only audit, `pnpm governance:data:generate` after an intentionally reviewed source/manifest change, and `pnpm governance:data:check` in ordinary development and CI. Never hand-edit the canonical CSVs, the generated main seed, its checksum companion or the machine report; see `docs/governance-data.md`.

The separate Maharashtra Batch 0 ZIP is an immutable source/hierarchy enrichment bundle. Validate
or regenerate its review-gated report and seeds with
`pnpm governance:mh:batch0:check` / `pnpm governance:mh:batch0:generate`. It records all source rows
but applies only Maharashtra plus 35 exact district LGD enrichments; it does not activate wards,
contacts, officers, geometry, routes, synchronization, or delivery. Existing Supabase targets use
the three ordered files under `supabase/deploy/maharashtra-batch0/` after schema and canonical Phase
2 data prerequisites are reconciled.

The validation report now includes a per-file outcome matrix. The current 901-row canonical bundle
classifies 41 rows as accepted, 691 as unverified, 169 as quarantined, and zero as rejected.
Accepted means structurally importable, not automatically production-verified; placeholders and
incomplete evidence remain explicitly non-routable.

Phase 3 adds the private `routing` schema and a review-gated governance-synchronization
foundation. The canonical Phase 3 taxonomy seed creates the 12 pilot records as draft, unverified,
and non-routable engineering data before any optional municipality pack is applied. This is
intentional: the authenticated routing API returns no operational category or route until verified
database evidence is reviewed and activated. See `docs/governance-synchronization.md` before adding
or refreshing an official source.

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

An optional, separately generated BMC staging/demo pack now creates source-backed BMC operational
wards, offices, departments, roles, officers, assignments, contacts, legacy boundary crosswalks,
pilot categories, and internal routing evidence. Generate/check it with
`pnpm governance:bmc:generate` and `pnpm governance:bmc:check`, then apply
seeds `50`, `51`, `52`, and `53` in filename order only to a reviewed non-production target. It
never modifies the Maharashtra canonical inputs. The routing seed activates only `garbage_dump`,
`missed_sweeping`, and `mosquito_breeding`: 66 database rules cover the 22 one-to-one operational
wards. The other nine pilot categories remain visible but unavailable; all nine BMC-specific
routing references require reviewed asset ownership, and none is promoted merely to complete a
demo. Split wards
`K/S`, `K/N`, `P/E`, and `P/W` and their legacy boundary anchors have no
executable route. External/production complaint delivery remains false, so a Local Wellness queue
record must not be represented as a complaint lodged in BMC's official system.

The current V1 staging overlay supersedes that bounded demo path for citizen complaint capture. It
merges two immutable, operator-supplied archives without rewriting either one:

- `resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` supplies the 12-category matrix, primary and
  secondary telephone contacts, `1916` fallback, official WhatsApp, durable roles and their source
  evidence; and
- `resources/local_wellness_bmc_ward_directory_2026-07-20.zip` supplies ward-office email and
  office provenance, including direct K/N and P/E mailboxes and the K/S→K/E and P/W→P/N parent-
  office mappings.

Their deterministic merge generates a private 26-ward × 12-category matrix (312 rows). Raw email-
source status and record locators remain distinct from the owner's staging-routing approval; that
approval does not promote the source record or prove production recipient acceptance. The server
resolves the captured PostGIS point to a configured BMC ward, records the normal auditable routing
decision and complaint assignment, and queues one idempotent email-delivery job for the ward
mailbox. All email, telephone, WhatsApp and detailed provenance values remain private operational
data and are never returned to citizen clients. Generate/check the seed with
`pnpm governance:bmc:v1-contacts:generate` / `pnpm governance:bmc:v1-contacts:check`.

For an existing staging project, run `supabase/deploy/v1-simple-ward-routing.sql` in **Supabase
Dashboard → SQL Editor → New query** after the prior schema/BMC governance prerequisites are
present. Check the generated file with `pnpm governance:bmc:v1-routing:deploy:check`. The bundle
includes the base facade migration, forward email-provenance migration
`20260720103000_v1_ward_email_provenance.sql`, and generated seed. It adds the private contact
matrix and email outbox; it does not configure or run an email provider, so `pending` means queued
locally, not delivered to BMC.

For an existing Supabase project whose BMC data is absent, first bring its schema through migration 43. When migration 38 is confirmed complete, run the current-session upgrade above; otherwise stop
and reconcile or use the adaptive master parts as appropriate. Then use the generated SQL Editor
bundle under `supabase/deploy/bmc-mobile-demo/` and run
`01_baseline_categories_and_core.sql`, `02_official_boundaries.sql`,
`03_ward_crosswalk_and_governance_verify.sql`, and `04_routing_activation_and_verify.sql` in that
exact order. Each part is transaction-atomic and generated from the reviewed seed inputs. The
bundle exposes all 12 categories, enables only the three internal-demo categories above, covers the
22 one-to-one wards, preserves the K/P split exclusions, and leaves external delivery disabled.
Nothing is fetched on a schedule, published, made routable, approved for complaint delivery, or
activated by the original synchronization-source/scope seed. Current source contracts are SHA-256
pinned and require an active global
platform-administrator's exact-hash approval. Each dispatch can claim one source and
uses a heartbeat-protected lease around immutable private Storage. Failed or ambiguous snapshot
finalization retains content-addressed bytes for grace-period reconciliation rather than risking an
eager-delete race. Source-specific parsers, entity matching, review APIs/UI, transactional
publishers, DNS-resolution hardening, snapshot reconciliation, environment secrets, and Cron
activation remain required. See
`docs/governance-synchronization.md` and ADR-0012.

The previous Supabase staging target was initialized on 2026-07-14 with all 23 migrations through
`20260714124000` and the six reviewed non-production seed files. The existing citizen identity was
reconciled by the profile backfill. Staging contains 12 categories with zero operational categories
and 11 synchronization endpoints (the repository bootstrap plus ten PMC/BMC contracts) with zero
active endpoints. This is a database-only staging deployment: no application, Edge Function, Cron,
source, route, ward, complaint, or production deployment/activation is implied.

The owner has since selected a replacement staging project and reports loading a generated master
SQL artifact. Because that target's database connection and migration ledger were not available for
this session, do not infer which master revision, seeds, Auth identities, or role assignments it
contains. Reconcile it against all 48 current migrations through `20260720103000` before enabling
managed features.

A later clean hosted smoke superseded the earlier empty-data observation: staging now returns all 12
catalog categories, three operational categories, finalized private media, K/W jurisdiction, and a
deterministic internal route. Final complaint completion is still on the pre-repair hosted function.
The current hosted execution order is therefore: confirm migration 38 → run the compact migrations
39–43 bundle if needed → run BMC parts 01–04 if needed → run
`supabase/migrations/20260718100000_complaint_routing_evidence_diagnostics.sql` → run the read-only
submission audit → require an authenticated complaint receipt. The focused migration is 19 KB and
rerunnable in **SQL Editor → New query**; it does not reload BMC data or update the CLI migration
ledger.

For hosted database performance triage, run
`supabase/deploy/diagnostics/database_performance_audit.sql` privately in **Supabase Dashboard → SQL
Editor** while the slowdown is observable. The script is read-only, but its normalized query text is
operationally sensitive and must not be pasted into a public issue. Inspect Dashboard
**Observability** and **Query Performance** with the audit output before considering a compute resize;
the repository does not claim that the polling hardening has already improved hosted metrics.

Phase 4 adds the local mobile complaint-capture flow and authenticated complaint API. For local
engineering, run the API and mobile workspaces after starting and resetting Supabase:

```bash
pnpm --filter @local-wellness/api dev
pnpm --filter @local-wellness/mobile dev
```

For Expo Go on a physical phone, source the root environment and override loopback service URLs
with the development computer's current LAN address before starting Metro:

```bash
set -a
. ./.env
set +a
EXPO_PUBLIC_API_URL=http://<laptop-lan-ip>:3001 \
EXPO_PUBLIC_REALTIME_URL=http://<laptop-lan-ip>:3002 \
pnpm --filter @local-wellness/mobile dev -- --lan --clear
```

The phone and laptop must be on the same reachable network. A native client cannot use
`localhost` to reach the laptop, and the mobile runtime reports that configuration explicitly.
Keep local client configuration in the root `.env`; do not create an app-local environment copy
that can silently point Expo at a different Supabase project. Only client-safe public values may
use `EXPO_PUBLIC_*`.

The single scrollable complaint form captures exact location evidence, discovers database-driven
nearby assets when a category requires one, uploads media through private signed Storage targets,
shows advisory duplicate suggestions, and completes submission through an idempotent server-side
operation. It keeps the resumable server lifecycle internally but no longer makes citizens navigate
six separate screens. The final action lists every outstanding requirement instead of presenting an
unexplained disabled button. Location-bound evidence still requires a `verified` or
`partially_verified` result. Asset discovery and routing both exclude inactive, unverified,
placeholder, non-routable, or out-of-jurisdiction records.

The mobile profile can take a new avatar with Expo Camera or select one from the library; both paths
reuse the private profile-image validation/upload and short-lived signed preview. Its current-area
card requests a one-time high-accuracy foreground location and displays only the verified civic
area labels and provenance returned by the governance resolver. Exact profile coordinates and a
street address are not persisted by this slice.

Citizen Web now exposes the complaint owner's paginated history plus detail/timeline pages. It
renders current status, public government resolution/action evidence, and safe routing/location
summaries. The owner can submit policy-valid feedback and request reopening from the web; a reopen
that requires new location-bound media sends the user to the mobile capture path. These pages use
the same server-owned workflow and never let browser input choose a resolution, routing target, or
workflow identity.

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

The authenticated report form now lists every non-placeholder category from the database catalog.
After the V1 BMC ward-contact deployment, all 12 pilot categories are selectable and the
location-specific routing check resolves them through the private ward/category matrix across the
26 configured operational wards. The matrix uses the separate immutable phone/WhatsApp/category
and ward-email/office archives described above; contact provenance remains server-only. Selection
alone does not promise coverage outside those
boundaries. K/P split mappings currently use the stored operational crosswalk deterministically
and remain a staging limitation until exact child geometry is loaded. Speech
transcription, media moderation, physical-device verification,
hosted-environment verification, and provider-backed notification delivery remain pending. No
hosted application deployment or external BMC complaint delivery is part of the current repository
state.

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

Use `/health/live` for frequent liveness checks. Probe `/health/ready` every 30–60 seconds so the API
readiness dependency check does not become avoidable hosted database traffic.

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

Phase 8 public detail can show a separately reviewed duplicate group, but never publishes a private
similarity result automatically. Every member must already have a current reviewed public
projection; the response contains only public IDs and a total count. Review and withdrawal remain
service-only, versioned operations, and no public projection or duplicate group is seeded. Current
reviewed reports may also expose an aggregate support count. An active signed-in citizen can set one
support and a private star/follow state through the authenticated API; supporter identity is never
public, withdrawn projections disappear from engagement surfaces, and these signals never alter the
official complaint workflow. Local, Trending, and aggregate Heat views remain provider-neutral;
comments are still disabled.

Phase 9 adds database-enforced business-calendar SLA clocks, auditable overdue escalation, and
versioned municipality/ward/department KPI snapshots. The existing trusted worker process runs
independent PostgreSQL-leased notification, SLA-escalation, and KPI-calculation loops. Government
complaint detail exposes authorized clock/escalation evidence, while `/accountability` reads the
latest completed organizational snapshots without ranking individual officers. Replacing a
calendar, policy, or rule atomically supersedes the prior approved interval; an escalation commits
its status history, escalation event, and data-minimized notification outbox row together.

No operational SLA calendar, target, category override, or escalation rule is seeded. Phase 9
remains safely inactive until reviewed official policy values and verified governance assignments
are published, its migrations and worker are deployed, KPI scheduling is configured, and the
target environment passes migration/RLS/synthetic smoke verification.

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
- Phase 1 identity schema, RLS, secure sessions, profile setup, audited device registration, scoped
  government access, and invitation APIs are implemented; citizen clients now use Phase 10
  email/password plus staged Supabase Phone MFA while privileged invitation callbacks remain;
- Phase 2 governance schema, PostGIS/versioning, canonical CSV validation, deterministic normalized seed, governance RLS, canonical authority links, and migration/seed/routing-data tests implemented locally; the supplied baseline remains non-routable where identifiers, contacts, assignments, or geometry are unverified;
- Phase 3 routing schema, deterministic routing and duplicate-scoring packages, authenticated
  routing contracts, accuracy-aware PostGIS candidate queries, append-only decision evidence, and
  review-gated governance-synchronization foundations are implemented and locally verified;
  verified pilot-data activation remains a separate pending milestone;
- the current BMC V1 staging facade now activates all 12 pilot categories over 26 configured wards
  from a generated private 312-row contact matrix. Phone/WhatsApp/category evidence and ward-email/
  office evidence come from separate immutable archives; the merge retains raw source status and
  owner-approved staging activation. It derives the ward from PostGIS, preserves the complaint
  assignment/audit path, and queues exactly one ward email without exposing contacts or claiming
  provider delivery;
- governance synchronization retrieval engineering now includes PostgreSQL leases/retry state,
  service-only lifecycle RPCs, a bounded Edge fetch/snapshot function, immutable source evidence,
  versioned contacts, and normalization tests. Ten PMC/BMC endpoints remain draft, unverified, and
  inactive. Ten pilot ward scope targets (five per municipality) are also service-only, draft,
  unverified, placeholder-backed, and non-routable; no parser output, record, contact, route, or
  complaint-delivery target is automatically verified or published;
- the older optional BMC staging pack retains its 26 operational wards, 20 departments and 66
  three-category legacy rules for compatibility. The current V1 facade supersedes that route family
  for citizen submission; exact K/P child geometry, hosted activation and external provider
  delivery remain pending;
- Phase 4 mobile complaint capture, exact-location evidence, private signed media upload,
  duplicate suggestions, and idempotent server-orchestrated submission are implemented for local
  engineering. The canonical Maharashtra/Phase 3 baseline alone contains zero verified routable
  categories; the optional BMC local demo seed exposes only the three bounded internal-demo
  categories above, so production activation remains separately data- and deployment-gated;
- the Expo client now has email/password signup/sign-in/recovery, staged Phone MFA, private profile
  images, a compact five-destination shell for Home, Complaints, Report, Community, and More, a
  refreshable owned-complaint dashboard/history, Local/Trending/Heat community views, grouped
  account/help actions, and a data-driven category-aware report form. Reviewed public reports expose
  aggregate support, one support per active account, and account-private starred state without
  affecting official routing, status, escalation, or SLA. Profile images can be
  captured with Expo Camera or selected from the library, and a one-time verified civic-area lookup
  displays governance labels without persisting exact profile coordinates;
- the authenticated Nearby directory captures foreground location through Expo Location and calls
  the NestJS API for an official-source, verified-only PostGIS governing-body projection. It shows
  explicit low-accuracy, unsupported, and ambiguous states and never substitutes placeholder names,
  contacts, internal IDs, or hardcoded Pune/Mumbai data;
- the mobile dependency set is aligned to Expo SDK 54.0.36, React Native 0.81.5, React 19.1, and
  TypeScript 5.9.3; the SDK compatibility check, strict type-check, and Android export pass locally;
- citizen web account rendering now shows authenticated identity and explicit onboarding,
  provisioning, profile-unavailable, API-error, and complete states. Protected complaint list,
  detail/timeline, government-action, feedback, and policy-controlled reopen views use the same
  owner-scoped API; the web client and API must still target the same fully migrated Supabase
  environment;
- an idempotent local migration repairs missing application profiles and global citizen roles for
  existing Supabase Auth users without overwriting profile data or reactivating a revoked citizen
  role; password recovery stays provider-owned and Phone MFA remains in observe mode until an SMS
  provider and recovery validation are operational;
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
  builds pass; their presence on the replacement staging target still requires ledger
  reconciliation;
- Phase 6 does not activate placeholder pilot data, external push/email delivery, public comments,
  multi-instance realtime, or a hosted application. Verified Pune/BMC data, provider policy, and
  managed-environment validation remain separate gates;
- Phase 7 engineering adds versioned resolution policy, completion-location/work-reference
  evidence, citizen feedback and reopening, private follow-up evidence, repeated-reopen escalation,
  strict APIs, and mobile/government client surfaces. No operational policy or production data is
  activated automatically;
- Phase 8 engineering adds a review-gated public projection boundary, bounded anonymous nearby,
  hotspot, and verified-boundary APIs, plus provider-neutral citizen web/mobile transparency
  surfaces. Exact locations, private complaints, identities, originals, internal notes, and
  placeholder data remain private. Public detail also supports explicitly reviewed, versioned
  duplicate-group relationships made only from current public projections. Account-bound support
  and private star/follow state are stored behind forced RLS; only the aggregate support count is
  public, and trending remains a bounded viewport order over current reviewed projections. No
  public policy, complaint, or duplicate group is activated automatically, and comments remain
  disabled;
- Phase 9 engineering adds effective-dated SLA calendars/policies/rules, materialized complaint
  clocks and deadline history, PostgreSQL-leased escalation/KPI work, transactional escalation
  outbox evidence, immutable organizational KPI runs/snapshots, scoped accountability APIs, worker
  loops, and government dashboard surfaces. Operational targets, schedules, assignments, and
  managed-environment activation remain policy/data/deployment gates;
- Phase 10 engineering adds PostgreSQL-backed API quotas, liveness/readiness, security headers,
  secret scanning, operator runbooks, citizen/privileged MFA modes, owner-private avatars, 50 m
  issue/media proximity, and routing-delivery readiness. A verified government queue is distinct
  from optional approved officer/body contact readiness, and no automatic outbound delivery is
  claimed;
- Pune Municipal Corporation is the generic architecture and test reference only; no
  municipality-specific routing logic exists, and verified Pune boundaries, ownership mappings,
  officer-role assignments, confidence policy, and fallback records remain required before an
  operational route can be activated;
- local Supabase configuration, migration tests, RLS tests, API tests, and client build validation are part of CI;
- Redis, BullMQ, and Sentry are intentionally outside the V1 topology;
- the configured Supabase project is owner-confirmed as dedicated staging and uses replacement
  credentials; its exact migration/seed/Auth state is not inferred from environment variables or
  the owner's master-SQL report and must be reconciled read-only before activation;
- phone delivery, hosted callbacks, MFA enforcement, device-bound session invalidation, complaint
  transcription and moderation providers, physical-device behavior, and hosted application
  verification remain documented pre-launch follow-ups; no current-target managed activation or
  hosted/production application deployment is claimed;
- verified Pune LGD identifiers, selected ward geometry, and operational ownership mappings remain
  required before the reference pilot can claim real jurisdiction-routing coverage.

See `PLAN.md` for implementation phases.
