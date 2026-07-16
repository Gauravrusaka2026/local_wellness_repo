# Supabase Setup

## Purpose

This guide defines the verified local Supabase workflow and the separate operator steps required to activate managed environments.

The goal is to prevent environment confusion, key exposure, schema drift, and migration conflicts.

---

## 1. Create Supabase Projects

Create three managed projects:

- `local-wellness-dev`
- `local-wellness-staging`
- `local-wellness-prod`

Local development should use the Supabase CLI local stack.

Do not use the production project for development.

---

## 2. Install Supabase CLI

```bash
corepack enable
pnpm install --frozen-lockfile
```

Verify:

```bash
pnpm exec supabase --version
```

Login:

```bash
pnpm exec supabase login
```

The CLI version and `supabase/config.toml` are committed through the repository workflow. Do not install or initialize a second unpinned CLI configuration.

---

## 3. Link Development Project

```bash
pnpm exec supabase link --project-ref <development-project-ref>
```

Do not link production by default on developer machines.

Use explicit scripts for each environment.

---

## 4. Enable Required Extensions

Enable:

- PostGIS;
- `btree_gist` for concurrency-safe temporal exclusion constraints;
- pgcrypto;
- uuid-ossp only if required;
- pg_trgm for text similarity;
- unaccent for search;
- pg_net only if required;
- vector later only if semantic search is introduced.

Recommended migration:

```sql
create extension if not exists postgis;
create extension if not exists btree_gist;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
```

---

## 5. Configure Authentication

Enable:

- email/password for citizen clients;
- Advanced Phone MFA enrollment and verification for staged citizen verification;
- TOTP MFA for government and platform-administrator assurance;
- reviewed invitation/PKCE flows for government users.

Google and Apple providers are deferred until an approved product phase requests them.

Configure:

- site URL;
- development redirect URLs;
- staging redirect URLs;
- production redirect URLs;
- mobile deep links;
- password-recovery redirects;
- OTP expiry;
- rate limits;
- email templates;
- SMS provider.

Recommended mobile scheme:

```text
localwellness://auth/callback
```

Use a final scheme after naming is finalized.

The local redirect allow-list includes the citizen web, government dashboard, admin console and mobile callback routes. Each managed environment must replace these with its exact deployed HTTPS origins while retaining only required development URLs in non-production projects.

Citizen account creation/sign-in uses email/password, and password recovery uses the managed
recovery email plus an exact allow-listed callback. Turn **Confirm Email** off only when verified
phone MFA is intentionally the account-verification step; otherwise signup may return no usable
session until email is confirmed. Government/admin code and provider-default link templates remain
supported. Template editing is optional, but redirect configuration and delivered-flow testing are
not. Local template files do not update a hosted project automatically.

The authenticated citizen account page reads the application profile through the NestJS
`GET /api/v1/me` endpoint; it does not read a fabricated profile from Auth metadata. Configure
`NEXT_PUBLIC_API_URL`, start/deploy that API, and ensure the citizen web, API, and Supabase Auth URL
all refer to the same environment. Apply the Phase 1 profile trigger and the idempotent identity
backfill migration before testing signup. The backfill creates only missing profiles/global citizen
roles, never overwrites application identity data, and does not reactivate an existing revoked
citizen role. Do not weaken the API check or add a client-side metadata fallback.

### Government Invite Template

Administrator invitations do not create a PKCE verifier. Local Auth keeps the committed
`supabase/templates/invite.html` token-hash link for deterministic coverage:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=invite"> Accept invitation </a>
```

Managed projects may keep the default **Invite user** template with `{{ .ConfirmationURL }}`. The
government callback accepts a complete fragment only when the provider type is exactly `invite`,
removes it from browser history before session persistence, and then applies the same current
membership/role/API/RLS checks. Citizen and admin callbacks reject fragment sessions. Add the exact
government dashboard callback to the project's redirect allow-list and smoke-test the delivered
invitation, one-time verification, SSR cookie creation, and effective access scope before enabling
government users.

---

## 6. Configure Citizen Phone MFA

Enable Advanced Phone MFA enrollment and verification, then select a supported SMS provider or a
reviewed Send SMS Hook backed by a real carrier. Supabase Storage and Edge Functions do not deliver
SMS by themselves and must not be used as a custom OTP credential store.

Before production:

- verify Indian delivery;
- verify sender rules;
- configure rate limits;
- configure abuse controls;
- test OTP resend;
- test expired OTP;
- test invalid OTP;
- monitor cost.

Keep `API_CITIZEN_PHONE_MFA_MODE`, `NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE`, and
`EXPO_PUBLIC_PHONE_MFA_MODE` at `observe` until these checks and a recovery test pass. Then switch
all three to `enforce` together and rebuild/restart the clients and API.

Do not rely on Supabase test OTP settings in production.

The committed local configuration reserves one development-only phone/OTP mapping for repeatable tests. Supabase CLI Auth still disables phone sign-in unless an SMS provider is configured, so the phone E2E case is skipped by default and runs only when a real local provider is available and `LOCAL_SUPABASE_SMS_ENABLED=true`. Never copy the reserved mapping into a hosted environment.

---

## 7. Configure Storage Buckets

Phase 4, Phase 5, and Phase 10 migrations create and maintain these private buckets:

```text
complaint-originals-private
complaint-thumbnails
resolution-evidence-private
voice-recordings-private
profile-images-private
```

The complaint API reserves owner/draft/media-scoped object paths and returns transient signed
upload tokens for originals or voice recordings. It inspects the stored object and verifies MIME
type, byte size, and SHA-256 before finalization. `complaint-thumbnails` is reserved for a later
processor. Phase 5 uses `resolution-evidence-private` for server-reserved government completion
evidence, with signed upload, server integrity verification, and scope-authorized short-lived signed
read access. Complaint-evidence buckets have no broad client policy. `profile-images-private` is a
separate owner-private surface limited to a 5 MiB JPEG/PNG/WebP object at the exact Auth-user avatar
path; owner CRUD uses Storage RLS and display uses a short-lived signed URL.

These buckets are later-phase plans and are not created by Phase 4:

```text
complaint-public-media
government-documents-private
```

Never create `complaint-public-media` or publish an original merely to make a client preview work.
Public derivatives require a later privacy/moderation decision and migration.

Phase 3 migrations also create:

```text
governance-raw-snapshots
```

This bucket is private and reserved for immutable, content-addressed official-source snapshots. It
is not a client upload surface and does not replace the read-only repository bootstrap CSVs. No
retrieval is activated by creating the bucket. The `governance-sync-fetch` Edge Function implements
the generic reviewed HTTPS fetch/Storage adapter, but the ten PMC/BMC pilot sources are seeded as
draft and unverified and there is no committed Cron job.

Policies:

- originals private;
- voice private;
- resolution evidence private until processed;
- any future public media contains only separately approved processed copies;
- signed URLs for private access;
- object path must include authorized owner or complaint context.

---

## 8. Configure Database Schemas

Phase 1 migrations create the unexposed `private` helper schema and keep exposed identity tables in
`public` for Supabase data-API RLS. Phase 2 creates `governance`, but intentionally leaves it out of
the `[api].schemas` allow-list. Its tables use forced RLS and explicit grants as defense in depth;
server-side imports and the jurisdiction resolver use trusted database/service-role access. Phase 3
creates the similarly unexposed, forced-RLS `routing` schema and adds synchronization tables to
`governance`. The retrieval/contact slice keeps its leases, events, evidence, and contact versions
in that same unexposed forced-RLS schema and exposes only four service-role retrieval RPCs. Phase 4
creates the unexposed, forced-RLS `complaints` schema. Phases 5–9 extend that private schema with
government workflow, communication, citizen accountability, reviewed public projections, SLA/
escalation, and KPI evidence. Narrow `public` wrappers provide service-role-only operations without
granting clients any private schema. Future integrations/audit schemas must be created only by their
committed migrations when implemented.

Phase 5 extends `complaints` rather than exposing a new schema. It adds database capability and
transition records, exact-replay government action/audit records, versioned assignment history,
private notes/inspections/work/dependencies, private resolution evidence and versioned resolutions,
and the transaction notification outbox. Narrow service-only wrappers provide scoped queue/detail,
assignment options, actions, and evidence operations. The API supplies the verified Auth actor, but
each wrapper independently rechecks current identity, membership, role/scope, capability, workflow
version/state, and verified governance evidence.

Do not pre-create schemas only through a dashboard, and do not expose every schema automatically.

---

## 9. Configure Row Level Security

Enable RLS on every table accessible through Supabase APIs.

Create policies for:

- citizen self-access;
- public complaint access;
- ward officer scope;
- department scope;
- municipality admin scope;
- platform admin scope;
- internal-only tables.

Do not use broad policies such as:

```sql
using (true)
```

unless the table is intentionally public.

Phase 4 grants no direct complaint-schema access to `anon`, `authenticated`, or `service_role`.
All nine tables have RLS enabled and forced. Only reviewed `public` security-definer wrappers are
executable by the service role, and the NestJS API supplies the bearer-token actor ID. Storage also
has no direct anonymous/authenticated object policy for complaint originals, voice recordings,
thumbnails, or resolution evidence. Test both SQL/RPC ACL denial and Storage privacy in every
managed environment; a private bucket flag alone is not a substitute for access-control review.

Phase 5 enables and forces RLS on all 12 added government-workflow/outbox tables and preserves the
same no-direct-access rule. The service role is transport only and receives execute access to the
reviewed wrappers, not table access. Test global/authority/ward/department/read-only scope,
cross-scope denial, inactive/revoked membership, placeholder target exclusion, workflow conflicts,
append-only history, and signed evidence access in every managed environment.

Phases 6–8 preserve the same forced-RLS/no-direct-table-access boundary for communication,
resolution accountability, and transparency records. Phase 8 public reads still execute only
through NestJS/service wrappers; `anon` cannot execute the database functions directly. Duplicate-
group review and withdrawal are service-only and never infer publication from a private match.

Phase 9 forces RLS on all 19 SLA/escalation/KPI tables. Only platform-admin publication, trusted
worker claim/execute/fail, and actor-scoped government read wrappers receive service-role execute
grants. Test atomic version supersession, missing/ambiguous-policy fail-closed behavior, worker
lease tokens, complaint/scope reauthorization, transactional escalation/outbox evidence, and
organizational KPI isolation in every managed environment.

---

## 10. Create Service Roles Carefully

The current Supabase secret key (or a legacy service-role key) is server-only.

It may be used by:

- API;
- workers;
- secure admin jobs;
- migrations where necessary.

It must not be used by:

- mobile;
- browser;
- public web client;
- shared screenshots;
- real values in `.env.example`.

The first platform administrator is bootstrapped only after its Auth identity is verified. Run the one-time operator command from a trusted environment with server-only variables:

```bash
SUPABASE_URL=<environment-url> \
SUPABASE_SECRET_KEY=<server-only-key> \
pnpm access:bootstrap-platform-admin -- <auth-user-uuid>
```

The function refuses this bootstrap once any active platform administrator exists. Later privileged access changes must use a reviewed server-side management workflow.

---

## 11. Set Up Local Supabase

Start:

```bash
pnpm database:start
```

Reset:

```bash
pnpm database:reset
```

Stop:

```bash
pnpm database:stop
```

Local Supabase should be the default environment for Codex-generated migrations and tests.

Current CLI output includes `PUBLISHABLE_KEY`/`SECRET_KEY` alongside legacy `ANON_KEY`/`SERVICE_ROLE_KEY`. Use the current key pair for this repository's local stack; the verified CLI/Auth version rejects its emitted legacy service-role JWT with `bad_jwt`. The application keeps legacy environment-name fallbacks for older managed projects, but never exposes either privileged key format to clients.

---

## 12. Migration Workflow

Codex must:

1. create migration file;
2. update database documentation;
3. update generated types;
4. update RLS policies;
5. add tests;
6. run local reset;
7. run migration validation.

Commands:

```bash
pnpm exec supabase migration new <name>
pnpm database:reset
pnpm database:lint
pnpm exec supabase db diff
pnpm database:test
pnpm database:types
pnpm database:types:check
pnpm governance:data:check
```

After the incremental migration is final, regenerate the optional single-file empty-database
bootstrap and verify that it matches the ordered sources:

```bash
pnpm database:master:generate
pnpm database:master:check
```

`supabase/master.sql` excludes `supabase/seed/` and must not be applied to a database with existing
Local Wellness migration history. Normal local, staging, and production upgrades continue to use
the immutable files under `supabase/migrations/`.

---

## 13. Database Types

Generate the current local `public`, `governance`, `routing`, and `complaints` schema types with the repository script:

```bash
pnpm database:types
pnpm database:types:check
```

For remote development project:

```bash
pnpm exec supabase gen types typescript \
  --project-id <project-ref> \
  --schema public,governance,routing,complaints \
  > packages/database/src/database.types.ts
```

The repository script generates to a temporary file, formats it, and only then replaces the committed type file. Its check mode compares fresh local output without writing. Generate remote types only from the intended reviewed environment and never use shell redirection in CI where a failed CLI call could truncate the committed file.

---

## 14. Configure Edge Functions

Use Edge Functions only for appropriate short-lived server-side tasks.

Examples:

- secure webhook receiver;
- small notification bridge;
- signed media helper;
- lightweight government API callback.

Do not place the entire backend inside Edge Functions if NestJS is the primary API.

### Governance retrieval

Deploy `supabase/functions/governance-sync-fetch`. It is deliberately limited to claiming reviewed
due sources, safe HTTPS retrieval, immutable private Storage preservation, and snapshot/failure RPC
finalization. It does not parse, match, review, publish, or send complaints.

The committed local configuration sets:

```toml
[functions.governance-sync-fetch]
verify_jwt = false
```

Keep that exception scoped to this function. It validates a dedicated high-entropy dispatch secret
in constant time before it can call the claim RPC. Test POST rejection with no/incorrect secret,
method rejection, body limits, and an empty claim result before activating a schedule.

After deploying the migrations and function in a non-production project:

1. create a unique `GOVERNANCE_SYNC_DISPATCH_SECRET` of at least 32 characters;
2. store it as a Supabase Edge Function secret;
3. store the Cron caller copy in the managed environment's encrypted secret/Vault facility, not in
   a migration, source row, shell history, or committed SQL;
4. create a Supabase Cron HTTP POST to the deployed `governance-sync-fetch` URL with
   `x-governance-sync-secret` and an optional `{"limit":1,"leaseSeconds":300}` body;
5. keep the Cron job disabled until at least one source has completed endpoint/parser/cardinality,
   retention, and security review;
6. activate sources one at a time with attributed approval and a future `next_sync_at`, then verify
   claim, snapshot, `304`, failure/backoff, and audit behavior in development and staging.

The server key is supplied by the Edge runtime (`SUPABASE_SECRET_KEY`, with the legacy
`SUPABASE_SERVICE_ROLE_KEY` fallback). Never provide either key in the Cron request. The function
claims exactly one source per dispatch and accepts a 300–900 second lease, defaulting to 300; the
trusted database RPC accepts 180–900 seconds. It heartbeats after retrieval and after a Storage
write. Expired claims are failed and backed off rather than reclaimed in the same call. The function
accepts only exact allowlisted HTTPS port 443 hosts without fragments and manually validates every
redirect, expected supported MIME, timeout, and response-size limit. Raw objects use
`<source-endpoint-id>/<sha256>.<extension>` in `governance-raw-snapshots` with no overwrite.

The database computes a deterministic SHA-256 for every source contract. Source activation requires
the stored approval hash to match the current contract exactly and attributes approval to a user
with a current global `platform_admin` role. Snapshot finalization checks the exact
`storage.objects` size and MIME metadata; referenced objects are immutable. The Edge function
retains newly uploaded bytes after a failed or ambiguous finalization because eager deletion could
race a late commit. Operators must run grace-period orphan reconciliation that rechecks database
links before removal.

The migration introduces `source_contract_sha256` using nullable/backfill/`NOT NULL` sequencing:
existing endpoint rows are deterministically hashed by the trigger before the constraint is applied.
Keep the root migration-safety regression in the release gate for upgrades from a populated Phase 3
database.

---

## 15. Configure Secrets

Set function secrets:

```bash
supabase secrets set KEY=value
```

For governance retrieval, set `GOVERNANCE_SYNC_DISPATCH_SECRET` independently in every managed
environment. Rotate both the Edge secret and encrypted Cron caller value together. A rotation must
not edit source registry rows or expose either value in synchronization audit events.

Use environment-specific secrets.

Never copy production secrets into development.

---

## 16. Configure Backups

For production:

- enable point-in-time recovery if plan supports it;
- define backup retention;
- test restore;
- document incident recovery;
- restrict backup access.

---

## 17. Configure Branching Carefully

If Supabase branching is available in the selected plan, use it for preview environments.

Otherwise:

- local for feature development;
- shared dev for integration;
- staging for release candidates;
- production for live use.

---

## 18. Required Repository Files

The database workflow uses these committed repository assets:

```text
supabase/config.toml
supabase/migrations/
supabase/seed/
supabase/functions/
supabase/policies/
supabase/tests/
.env.example
```

---

## 19. Recommended Environment Variables

### `.env.example`

Only names and safe placeholders:

```text
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_PHONE_MFA_MODE=observe

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_REALTIME_URL=http://localhost:3002
NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE=observe

GOVERNMENT_INVITE_REDIRECT_URL=
API_ALLOWED_ORIGINS=
API_PRIVILEGED_MFA_MODE=observe
API_CITIZEN_PHONE_MFA_MODE=observe
GOVERNANCE_SYNC_DISPATCH_SECRET=

EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_REALTIME_URL=http://localhost:3002

REALTIME_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003,http://localhost:3004
REALTIME_DELIVERY_BATCH_SIZE=25
REALTIME_DELIVERY_LEASE_SECONDS=30
REALTIME_DELIVERY_POLL_INTERVAL_MS=1000
REALTIME_EVENT_RATE_LIMIT_PER_MINUTE=120
REALTIME_MAX_HTTP_BUFFER_SIZE_BYTES=65536
REALTIME_MAX_ROOMS_PER_SOCKET=32

NOTIFICATION_WORKER_ID=notification-worker:local
NOTIFICATION_BATCH_SIZE=25
NOTIFICATION_LEASE_SECONDS=60
NOTIFICATION_POLL_INTERVAL_MS=1000

SLA_ESCALATION_WORKER_ID=sla-escalation-worker:local
SLA_ESCALATION_BATCH_SIZE=25
SLA_ESCALATION_LEASE_SECONDS=60
SLA_ESCALATION_POLL_INTERVAL_MS=1000

KPI_CALCULATION_WORKER_ID=kpi-calculation-worker:local
KPI_CALCULATION_BATCH_SIZE=10
KPI_CALCULATION_LEASE_SECONDS=120
KPI_CALCULATION_POLL_INTERVAL_MS=1000
```

Do not place real secrets inside `.env.example`.

The realtime server also requires the server-only Supabase secret/service-role credential and the
client-safe publishable/anon key; all three notification/SLA/KPI worker loops require the server-
only credential.
Neither value belongs in an `EXPO_PUBLIC_` or `NEXT_PUBLIC_` variable. Public realtime URLs are
transport locations, not credentials.

Use an untracked repository-root `.env` as the single local source, export it into the process
before starting workspaces, and do not create a second `apps/mobile/.env.local`. On a physical
device, override the public API/realtime URLs with the laptop's current LAN address. The mobile
runtime validates detectable Supabase URL/key project alignment and rejects loopback service URLs
without echoing configured values.

---

## 20. Local Verification and Hosted Activation

Phase 1 local verification is complete:

- repository-pinned CLI and committed local configuration validated;
- identity migrations reset successfully;
- migration, RLS and generated-type checks pass locally and are enforced by CI;
- citizen email/password, recovery, and staged Phone MFA client tests pass;
- privileged TOTP/AAL and citizen verified-phone/AAL API policy tests pass;
- real phone delivery remains provider-gated for E2E.

Phase 2 local verification is complete for the available baseline:

- `pnpm governance:data:check` against the hash-pinned workbook/CSV manifest and committed generated artifacts;
- a clean `pnpm database:reset`, which applies all governance migrations and the generated baseline seed in order;
- `pnpm database:lint` against application-owned schemas and all pgTAP migration, seed, RLS, hierarchy, temporal, and synthetic PostGIS plans;
- `pnpm database:types:check` for both `public` and `governance`;
- confirmation that placeholder wards/contacts, officer templates, and unresolved routing references are not exposed as verified or routing-eligible;
- confirmation that zero officer assignments and zero real boundary versions are created from the supplied baseline.

These checks pass locally: seven Phase 2 migrations, two generated governance seed files, 22 forced-RLS governance tables and all 194 Phase 2 pgTAP assertions. The canonical source, generated seeds and validation report are reviewed artifacts. Follow `docs/governance-data.md` for refreshes; never modify the CSVs or generated SQL in place.

Phase 3 adds three migrations, the engineering-category seed, routing/synchronization package tests,
API tests, and pgTAP plans for routing schema/security, placeholder exclusion, synchronization
lifecycle, PostGIS candidates, fallback behavior, and decision auditing. The clean reset, database
lint, generated-type drift check, and repository-wide validation passed locally. All 450 assertions
passed across 11 pgTAP plans, including 102 Phase 3 assertions, and the generated types cover
`public`, `governance`, and `routing`. Exact observed results are recorded in
`docs/worklogs/phase-3-routing/testing.md`.

The expected post-reset bootstrap state remains deliberately non-operational: 12 draft/unverified
categories, zero operational categories, no verified Pune rule set, and no route sourced from a
placeholder. Synthetic verified fixtures used by database tests must run inside rolled-back test
transactions and must not survive as seed data.

Phase 4 adds two complaint migrations, four private Storage buckets, generated complaint-schema
types, authenticated complaint API tests, and four pgTAP plans. The clean local reset and schema
lint passed. All 557 assertions passed across 15 plans; the four Phase 4 plans contribute 107
assertions covering schema/storage, forced RLS/ACL, rollback-isolated routed submission, exact
replay, duplicate checks, and malformed/placeholder/location/media rejection. The generated types
cover `public`, `governance`, `routing`, and `complaints`. Exact observed results are recorded in
`docs/worklogs/phase-4-complaint-capture/testing.md`.

The governance retrieval/contact/scope slice adds three forward migrations, the draft-only pilot
source and ward-scope seeds, database plans 016–018, Edge fetch-helper tests, and pure
contact-normalizer tests. A reset shows ten PMC/BMC endpoint contracts with zero active/claimable
scheduled sources plus ten service-only ward targets (five per municipality), all draft,
unverified, unapproved, and non-routable. The final clean run passed 657 assertions across 18 pgTAP
plans; plans 016–018 contribute 100 assertions (`44 + 26 + 30`). Eleven Edge helper cases, nine
contact-normalizer cases, all three database-package test files, and the root migration-safety
regression passed. The populated upgrade fixture backfilled its existing source endpoint to a
64-character SHA-256 before `NOT NULL` enforcement.
Database lint reported only PostGIS extension-owned diagnostics. Repeat the clean reset, schema
lint, all pgTAP plans, generated-type drift check, and Edge/package tests after any migration,
contract, or function change.

The positive complaint fixtures are synthetic and transactionally rolled back. With the real seed,
the authenticated operational-category query is still empty, so no user can submit a placeholder
complaint. This is the required fail-closed bootstrap outcome, not verified Pune coverage.

The known-issue forward fixes add safe legacy Auth profile/citizen-role backfill, a service-only
routing confidence-policy conflict report, a verified PostGIS nearby-asset picker, and per-file
governance import outcomes. The current canonical validation matrix covers 901 rows: 41 accepted,
691 unverified, 169 quarantined, and zero rejected. These dispositions preserve uncertainty and do
not verify or activate pilot records.

Phase 5 adds two government-workflow migrations, private forced-RLS/ACL and RPC coverage, strict
NestJS/validation/store tests, and government-dashboard queue/action tests. The local engineering
surface includes scoped queue/detail/options, versioned assignment/transfer, guarded transitions,
private notes/inspections/work/dependencies, private resolution evidence and versioned resolutions,
action audit, and transaction-outbox persistence. Exact aggregate gate results belong in the
current progress tracker/worklog after the full verification run. Local synthetic records do not
constitute a hosted deployment, verified Pune/BMC workflow, provider-backed notification delivery,
or external map.

Phase 6 adds two communication/notification migrations and pgTAP plans 024–025. The engineering
surface includes private complaint rooms/messages/read receipts, durable in-app notifications,
source-bound outbox jobs, PostgreSQL leases/retry state, and realtime delivery attempt history.
Before enabling the worker or realtime process against a managed project, apply both migrations,
regenerate types, run the full pgTAP suite, verify direct table/RPC ACL denial, and confirm that
worker and realtime service credentials exist only in their server secret stores. Locally, a clean
reset applied all 25 migrations and reviewed seeds, all 967 assertions passed across 25 pgTAP plans,
strict application-schema lint reported no errors, and database types were regenerated. These
local results do not deploy or validate the managed environment.

Start one materialization worker and one realtime instance for the V1 pilot. Verify liveness and
readiness independently, then exercise a private message/status event with two authorized test
users and confirm the message/outbox/notification/delivery/attempt chain. Also verify revoked scope,
expired JWT disconnect, disconnected-recipient in-app history, exact message replay, lease expiry,
retry/dead behavior, and no direct public-comment access. Push and email rows must remain explicitly
`unsupported`; do not configure a provider or mark them delivered without the later provider,
consent, preference, privacy, and destination-lifecycle work.

Phase 7 adds two resolution-accountability migrations and pgTAP plans 026–027. They extend
resolution records with nullable historical completion fields, add effective-dated policy and
private citizen accountability tables, and expose narrow service-role RPCs for context, feedback,
follow-up evidence, reopening, escalation, and scoped government history. All new tables remain in
the unexposed forced-RLS `complaints` schema. No public/anonymous/authenticated role receives direct
table or function access, and private evidence buckets gain no public read policy.

The repository intentionally contains no approved operational resolution policy seed. Use
rollback-isolated synthetic policy rows for local tests only. A managed operator must obtain the
approved values and reviewer identity, publish one non-overlapping effective version, then verify
the application still fails closed outside its scope and effective period. Never promote a draft,
placeholder, ambiguous, or expired policy automatically.

Phase 8 adds the transparency schema/security migrations, the `20260716105000` RPC/ACL forward fix,
and `20260716106000_phase_8_duplicate_group_publication.sql`. The duplicate forward migration keeps
review/withdrawal service-only, requires every member to have a current public projection, bounds a
group at 100 reports, and returns only public IDs/counts through detail. The focused plans 029–030
passed 91 assertions. This focused result does not replace the root session's final aggregate
reset/lint/type/test report, and no transparency policy, projection, or duplicate group is seeded.

Phase 9 adds `20260716110000_phase_9_sla_escalation_kpi_schema.sql` and
`20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql`. They introduce 19 private
forced-RLS tables, platform-admin publication with atomic prior-version supersession, materialized
complaint clocks/deadline history, transactional escalation/outbox evidence, PostgreSQL-leased SLA/
KPI work, and immutable organizational snapshots. KPI algorithm definitions are seeded, but no
active calendar, policy target, category override, or escalation rule is seeded. A clean local run
applied all 34 migrations and passed all 1,275 assertions across 32 pgTAP plans; generated types and
the deterministic master SQL also passed drift checks.

Phase 10 adds six migrations through
`20260716117000_phase_10_routing_delivery_readiness.sql`. They add PostgreSQL-backed API quotas and
readiness probes, privileged and citizen MFA verification helpers, the owner-private profile-image
bucket/metadata, 50 m complaint/media proximity constraints, and routing delivery-readiness
metadata. The current clean-bootstrap artifact contains 40 ordered migrations. Apply these as
incremental migrations to an existing project; never apply `supabase/master.sql` as an upgrade.

Before managed Phase 10 activation:

- keep citizen and privileged MFA modes at `observe` while enrollment, recovery, and AAL behavior
  are tested; enable all matching API/client enforcement values together only afterward;
- enable Advanced Phone MFA and configure an approved SMS provider or reviewed Send SMS Hook;
  complete India TRAI/DLT requirements, provider/project limits, CAPTCHA, and real-device tests;
- verify `profile-images-private` remains private, owner Storage policies work, and signed reads do
  not leak into transparency responses;
- verify `/health/live` and `/health/ready`, quota concurrency/`Retry-After`, secret scanning, and
  release smoke without logging secrets, OTPs, object paths, or exact locations;
- load only reviewed official pilot geometry, routes, authority memberships, assignments, and
  complaint-intake contacts. Queue routing does not imply automatic email/SMS/contact delivery.

### Previous dedicated staging deployment — historical record, 2026-07-14

The connected managed project is owner-confirmed as staging, and its privileged/database
credentials are newly generated replacements. The database now contains all 23 repository
migrations through `20260714124000` and all six reviewed non-production seeds: the generated Phase
2 main/checksum pair, Phase 3 categories, pilot synchronization sources, pilot ward scopes, and
roles. The identity backfill reconciled the existing citizen application profile. Verification
found 12 categories with zero operational and 11 synchronization endpoints with zero active.

The first government invitation was accepted. Staging demo access was then reconciled onto two
existing confirmed owner-controlled Auth identities in one trusted transaction. Temporary alias
role/membership rows were revoked with provenance retained; verification found exactly one active
global platform administrator and one active Pune municipal administrator. This does not replace
the product lifecycle still tracked by `AUTH-001`.

This is deliberately a database-only deployment. No application, Edge Function,
`GOVERNANCE_SYNC_DISPATCH_SECRET`, Cron invocation, source/scope activation, official ward record or
geometry, route, complaint, or production environment was deployed. Local reset/test commands
remain isolated; the managed state exists only because the reviewed migrations and seeds were
explicitly applied to staging.

The owner subsequently replaced the configured staging project and reports applying a generated
master SQL file to it. That report does not identify the artifact revision and the database ledger
was not reachable for independent verification in this session. Treat the current target as
unreconciled: compare `supabase_migrations.schema_migrations` with all 40 current migration files,
verify schema objects and RLS, and establish the seed/Auth/profile/role state before enabling any
application, worker, Edge Function, schedule, routing, transparency, SLA, or KPI capability.

When `REQUIRE_LOCAL_SUPABASE=true`, the Auth E2E harness accepts only loopback API hosts. This guard
fails before user creation if a generic environment file points at hosted Supabase. Hosted database
migrations and seeds remain an explicit operator action; local reset and test commands do not upload
Phase 3 or Phase 4 governance, routing, complaint data, migrations, or media.

Before managed identity activation, operators must:

- create separate development, staging and production projects;
- link only the intended non-production project from developer environments;
- enable required extensions through reviewed migrations;
- enable citizen email/password and decide whether email confirmation or phone MFA is the signup-
  verification step;
- configure exact password-recovery/invite redirect allow-lists; custom government/admin code-only
  and token-hash invite templates remain optional;
- enable TOTP plus Advanced Phone MFA, then configure a real SMS provider before enforcement;
- configure SMS/email delivery, provider rate limits and abuse controls;
- select secret storage and restrict production credentials;
- configure environment-specific CI/deployment secrets;
- review the Phase 4 private Storage bucket topology, limits, and access policies;
- document and verify backup/restore strategy;
- run hosted email, SMS, invite, SSR-cookie and effective-scope smoke tests.

The staging credential-replacement prerequisite is satisfied for the current project. Continue to
keep privileged keys and the database URL server-side, and never reuse them for production.

Before managed routing or governance synchronization activation, operators must also:

- verify Pune Municipal Corporation and selected ward geometry against approved official sources;
- review category ownership, departments, officer roles, current assignments, assets, confidence
  policy, rules, and fallback records;
- approve each source endpoint, retrieval cadence, parser contract, secret reference, and raw
  snapshot retention/access policy, storing the exact current contract SHA-256 through an active
  global platform-administrator approval;
- deploy and test the custom-secret Edge retrieval/snapshot adapter, PostgreSQL claim leases,
  `304` reuse, failure backoff, and private content-addressed Storage;
- implement and test source-specific parsing, candidate persistence, matching, review, and
  transactional publication adapters without changing the canonical bootstrap files;
- keep the ten PMC/BMC seed endpoints draft/unverified until each has stable fixtures, reviewed
  cardinality/layout expectations, and attributed activation approval;
- keep the ten pilot ward scope targets draft/unverified/non-routable until each canonical hierarchy,
  official identity, and boundary is reviewed by an active global platform administrator; preserve
  the V1 numeric bootstrap targets as audit history, then create a new reviewed scope for BMC
  administrative wards `A`–`E` and Pune's current official numeric wards `1`–`5`; never ordinal-map
  `BRIH-W01`–`BRIH-W05` to the BMC letters;
- verify that a source-authenticated value remains staged, public visibility requires attributed
  manual verification, and complaint delivery requires its separate explicit approval;
- verify contact publication binds the target owner UUID, value, source URL, evidence-value hash,
  and delivery decision and that each approved review can be consumed only once;
- run hosted service-role routing smoke tests and confirm that anon/authenticated roles cannot call
  the database RPCs directly;
- confirm that exact routing coordinates and raw snapshots are excluded from logs and client
  responses.

Before managed complaint capture activation, operators must also:

- apply the complaint migrations first in managed development and then staging, regenerate/check
  types, and repeat forced-RLS, RPC-grant, cross-owner, private-bucket, and signed-upload tests;
- load only reviewed verified Pune categories, polygons, duplicate policy, department/role and
  routing/fallback evidence; confirm that placeholder or unverified records still cannot route;
- run an authenticated exact-replay draft/upload/routing/submission smoke and a conflicting-key
  negative smoke without logging raw keys, tokens, coordinates, descriptions, or checksums;
- validate camera, short video, microphone, foreground GPS/mock indication, SecureStore, SQLite
  resume, network interruption, and deep links in an Expo development build on physical devices;
- approve capture/location/media/retention/privacy/emergency/duplicate policies and select
  transcription/moderation processing before claiming those capabilities as operational;
- provide a device-reachable reviewed API URL; never put the secret/service-role key in the mobile
  bundle.

Before managed government-dashboard activation, operators must also:

- apply the Phase 5 workflow/security migrations in managed development and staging, regenerate
  types, and repeat forced-RLS/RPC/Storage checks;
- load only reviewed verified non-placeholder pilot category, jurisdiction, routing, authority,
  department, role, assignment, and asset evidence; the ordinary bootstrap must remain non-routable;
- smoke-test platform, authority, ward, department, and read-only moderator access, including
  revoked/expired/cross-scope denials and selection of one of a user's real role assignments;
- exercise workflow-version conflicts, exact idempotency replay, assignment history, same-authority
  transfer, transition guards, inspection/work/dependency flows, and resolution dependency closure;
- verify private resolution-evidence signed upload, server MIME/size/SHA-256 finalization, short-
  lived non-cacheable authorized reads, and denial of direct Storage access;
- verify that every successful status mutation appends history, action audit, and the minimal outbox
  event atomically, with no direct network emission from the workflow transaction;
- select and review an external map provider/key plus coordinate-sharing privacy policy before
  replacing the explicit text-only location/map placeholder.

Before managed Phase 6 activation, operators must also:

- reconcile the target ledger through the Phase 6 migrations, regenerate/check types, and repeat
  forced-RLS, direct-ACL, RPC-grant, lease, retry, revocation, and public-comment denial tests;
- configure one worker identity and one realtime instance with server-only credentials and exact
  browser origins; expose only the public realtime URL to clients;
- verify database-first message creation, exact replay/conflict, monotonic reads, event
  deduplication/reconciliation, token-expiry disconnect, offline in-app history, and a revoked
  government scope before pilot use;
- monitor outbox/delivery age, retry/dead rows, lease expiry, readiness, and zero-socket delivery;
- leave push/email unsupported until providers, consent/preferences, destination verification,
  retention, fallback, privacy, and credential ownership are approved.

Before managed Phase 7 activation, operators must also:

- apply both Phase 7 migrations in managed development and staging, regenerate/check database
  types, and repeat forced-RLS, direct-ACL, service-RPC, ownership, scope, and append-only tests;
- approve and publish the exact policy values through a reviewed operator change; keep feedback
  and reopening unavailable if no single effective policy matches;
- smoke a new resolution with live captured completion location, an existing same-complaint work
  reference, finalized after evidence, citizen feedback, private follow-up evidence, reopening,
  exact retries, and the repeated-reopen escalation threshold;
- verify short-lived owner evidence access and denial for another citizen, stale government scope,
  unrelated evidence, expired reservations, mismatched content, and reused evidence;
- confirm status history, citizen/government audit, and the existing notification outbox commit
  atomically without exposing feedback text, ratings, coordinates, object paths, hashes, or tokens.

Before enabling the mobile verified-governance directory, operators must also:

- apply `20260716104000_verified_governing_body_projection.sql` through the incremental migration
  workflow and regenerate/check the committed database types; the 40-migration master SQL is only
  for a clean database and must not be applied over staging history;
- repeat plan `028_verified_governing_body_projection.test.sql` and application-schema database
  lint in managed development, then verify `anon`/`authenticated` cannot execute the RPC while the
  trusted API service role can;
- deploy the matching NestJS API and smoke authenticated resolved, unsupported, ambiguous,
  low-accuracy, future-capture, and invalid-field requests without logging bearer tokens or raw
  coordinates;
- activate only reviewed current official-source, verified, non-placeholder, routing-eligible
  entity and boundary versions. Until pilot geometry meets that rule, an unsupported result is the
  required staging behavior;
- verify the response contains no UUID, geometry, officer, email, phone, private office, routing, or
  placeholder field before connecting a physical Expo Go client over a LAN-reachable API URL.

This migration and managed/device smoke are not recorded as complete in the current repository
state.

Before managed Phase 8 activation, operators must also:

- apply all Phase 8 transparency migrations in repository order in managed development and staging,
  including the `20260716105000` RPC/ACL forward fix and
  `20260716106000_phase_8_duplicate_group_publication.sql`; regenerate/check database types and
  repeat forced-RLS, direct-ACL, function-grant, approximate-geometry, withdrawal, aggregate-
  threshold, and private-field leakage tests;
- publish no operational policy until public eligibility, sensitive-category handling, sanitized
  text, ward-derived approximation, minimum cohort, retention, withdrawal, and reviewer authority
  are approved;
- import and review current non-placeholder pilot ward geometry; never use canonical placeholder
  rows or synthetic test fixtures as public evidence;
- smoke anonymous bounded list/hotspot/boundary/detail reads, invalid viewports and filters, current
  publication expiry/withdrawal, and denial of direct table/Data API access;
- smoke service-only duplicate review/exact replay/conflict/withdrawal, require every member to be
  currently published, verify the 100-member bound, and assert detail contains public IDs/counts
  only; never auto-promote a private similarity result;
- keep public comments and processed media disabled until their independent moderation, abuse,
  scanning/redaction, retention, and delivery gates are satisfied;
- keep the provider-neutral map mode unless a later ADR approves a basemap and outbound-coordinate
  policy.

Before managed Phase 9 activation, operators must also:

- apply both Phase 9 migrations incrementally and regenerate/check the committed database types;
- repeat forced-RLS/direct-ACL/service-RPC tests, including platform-admin-only publication,
  complaint/organizational scope isolation, and lease-token enforcement;
- approve official business calendars, SLA targets, category overrides, completion/pause rules,
  escalation actions/levels/target roles, and effective dates; publish no placeholder, unverified,
  ambiguous, or inferred policy;
- verify calendar/policy/rule replacement atomically closes and supersedes exactly one eligible
  prior approved interval and rejects conflicting/backdated/same-or-older versions;
- run rollback-isolated assignment/clock/completion/external-dependency pause/resume/breach tests
  and verify status history, escalation evidence, and the minimal notification outbox commit in one
  transaction;
- configure trusted `SLA_ESCALATION_*` and `KPI_CALCULATION_*` worker values, supervise the process,
  and test lease expiry, retry, dead state, and clean shutdown without exposing tokens/content;
- configure the reviewed Supabase/PostgreSQL KPI-run schedule and verify immutable source-cutoff/
  window/definition evidence plus municipality/ward/department scope and delay-segment isolation;
- monitor missing/ambiguous bindings, breached clocks, escalation backlog/dead jobs, failed runs,
  and stale snapshots. An empty/unavailable result is correct until policy and source data pass the
  activation gate.

No Redis, BullMQ, Redis adapter/cache, or Sentry setup is required or permitted for this V1 path.

---

## 21. Recommended Codex Permissions

Codex may:

- create migrations;
- update seed files;
- create RLS policies;
- create database tests;
- generate types;
- create Edge Functions;
- update documentation.

Codex should not:

- directly modify production through dashboard;
- receive production service role keys;
- delete production data;
- disable RLS;
- rotate production secrets;
- change Auth providers without approval;
- apply destructive migrations automatically.

---

## 22. Supabase ADR Requirement

Create an ADR when changing:

- Supabase as the core platform;
- Auth provider;
- schema strategy;
- storage structure;
- RLS strategy;
- migration process;
- Edge Function usage;
- environment strategy;
- backup strategy.
