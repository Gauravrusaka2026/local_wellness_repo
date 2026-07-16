# Deployment

## Purpose

This document defines environment, release, infrastructure, and Supabase deployment practices.

---

## Environments

Use four environments:

```text
local
development
staging
production
```

### Local

- Supabase CLI local stack;
- local API;
- local workers;
- local realtime server;
- Expo development build.

### Development

- shared development Supabase project;
- non-production cloud deployments;
- synthetic data;
- developer testing.

### Staging

- production-like Supabase project;
- production-like infrastructure;
- anonymized or synthetic data;
- release candidate validation.

### Production

- production Supabase project;
- production API;
- production realtime;
- production workers;
- monitoring and alerting;
- restricted access.

---

## Supabase Project Strategy

Create separate Supabase projects for:

- development;
- staging;
- production.

Never reuse one project for all environments.

Each project should have:

- separate database;
- separate Auth users;
- separate Storage buckets;
- separate API keys;
- separate secrets;
- separate redirect URLs;
- separate monitoring.

---

## Deployment Targets

### Mobile

- Expo EAS Build;
- Android Play Console;
- Apple App Store later.

The current mobile compatibility baseline is Expo SDK 54.0.36, React Native 0.81.5, React 19.1,
and TypeScript 5.9.3. Local Android Expo Go testing requires an SDK 54-capable client. Every mobile
SDK change must pass `expo install --check`, strict type-checking, and an Android export before a
device or EAS release is attempted.

Expo Go development must source the repository root `.env`. Override
`EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_REALTIME_URL` with the laptop's current LAN address when testing
on a phone; loopback resolves to the device and is rejected by the native runtime diagnostic. Do
not maintain an app-local environment copy or put a secret/service-role credential in any
`EXPO_PUBLIC_*` value.

### Web

- Vercel or equivalent;
- separate projects for citizen web, government dashboard, and admin console.

### API

- containerized NestJS application;
- Railway, Fly.io, Render, AWS ECS, or equivalent.
- `GET /health/live` checks process liveness and `GET /health/ready` checks the narrow identity/
  private-Storage database dependency before traffic is admitted.

### Realtime

- containerized Socket.IO server;
- one instance for the V1 pilot, with authenticated private rooms and a PostgreSQL-leased delivery
  pump;
- `GET /health/live` confirms process liveness and `GET /health/ready` confirms the delivery pump
  has successfully reached its database claim boundary;
- horizontal scaling requires a later reviewed delivery mechanism and ADR.

### Workers

- containerized worker process;
- Phase 6 continuously materializes the complaint notification outbox through bounded PostgreSQL
  lease/retry RPCs;
- Phase 9 runs independently configured SLA-escalation and KPI-calculation loops in the same
  trusted process, also through bounded PostgreSQL lease/retry RPCs;
- run independently from the API and realtime process so a materialization failure cannot terminate
  request handling;
- supervise and restart the process, drain active batches on SIGINT/SIGTERM, and alert on expired
  leases, retry/dead jobs, failed calculation runs, and stale KPI snapshots;
- no Redis or BullMQ dependency in V1.

---

## CI/CD Pipeline

Recommended stages:

1. install;
2. canonical governance source/hash and generated-seed drift check;
3. lint;
4. type-check and generated-database-type drift check;
5. unit test;
6. integration and pgTAP migration/RLS/seed/spatial test;
7. clean local migration/seed reset and schema lint;
8. build;
9. security scan;
10. deploy;
11. smoke test.

---

## Database Deployment

### Development

```bash
supabase link --project-ref <dev-project-ref>
supabase db push
```

### Staging

Apply migrations through CI.

### Production

Production migration requires:

- reviewed SQL;
- staging success;
- backup confirmation;
- migration plan;
- rollback or forward-fix plan;
- deployment approval.

Phase 2 governance deployments additionally require the reviewed manifest, canonical source checksums, machine-readable validation report, generated main-seed/checksum-companion pair, and explicit review of additions/removals, verification promotions, hierarchy changes, and temporal-version closures. Apply migrations before both generated seed files. Do not hand-edit governance rows in a hosted dashboard or silently replace a canonical CSV. Placeholder/template data must remain non-routable and excluded from effective authority access in every environment.

The baseline contains no pilot geometry or verified incumbents. A successful deployment therefore proves schema/import integrity only; it must not be represented as production jurisdiction coverage or a current officer directory. Redis, BullMQ, and Sentry remain absent from the V1 deployment topology.

### Staging database record — 2026-07-14

The owner confirmed that the connected Supabase project is dedicated staging and that its
privileged API/database credentials are newly generated replacements. All 23 existing migrations
through `20260714124000` and these six reviewed non-production seed files were applied successfully:

- `20_phase_2_governance.generated.sql`;
- `21_phase_2_governance_checksum.generated.sql`;
- `30_phase_3_pilot_categories.sql`;
- `40_governance_sync_pilot_sources.sql`;
- `41_governance_sync_pilot_wards.sql`;
- `roles.sql`.

The existing citizen identity was reconciled by the idempotent application-profile backfill.
Post-seed verification found 12 categories with zero operational and 11 synchronization endpoints
with zero active. This record covers only the staging database. No application, Edge Function,
Cron, official source or ward-scope activation, route, verified ward/geometry, complaint, or
production deployment was performed.

The first government invitation was subsequently accepted. A trusted atomic staging transaction
then moved the two demo privileged scopes onto existing confirmed owner-controlled Auth identities,
revoked the temporary alias assignments and membership without deleting history, and verified
exactly one active global platform administrator plus one active Pune municipal administrator. This
operator correction does not implement the broader existing-user access lifecycle tracked by
`AUTH-001` and does not activate any governance or routing record.

Phase 3 deployments apply the routing schema, governance-synchronization foundation, security/RPC
migration, and engineering-category seed after the Phase 2 artifacts. The 12 category rows must
remain draft, unverified, and non-routable in every environment until a separately reviewed data
change supplies record-specific operational evidence. Pune Municipal Corporation is the reference
municipality for architecture and tests only; deployment must not add a Pune-specific application
configuration or claim verified Pune coverage.

The synchronization migrations create the private `governance-raw-snapshots` bucket, retrieval
leases/audits/evidence, and versioned contact tables. The pilot seed registers ten official PMC/BMC
endpoint contracts as draft and unverified. Applying these assets does not activate retrieval.
The source-contract hash migration is safe for an existing populated Phase 3 registry only because
it adds the column nullable, deterministically backfills through the trigger, and then applies
`NOT NULL`; keep the root migration-safety regression in the release gate.

Apply `20260714112000_governance_sync_scope.sql` after the retrieval RPC migration, then apply
`41_governance_sync_pilot_wards.sql` after the pilot-source seed. The scope seed selects five
canonical Pune and five canonical Brihanmumbai wards only as draft, unverified, unapproved,
non-routable V1 audit targets. It does not activate source retrieval or routing. Preserve those rows
and their placeholder ward records as bootstrap history. The replacement pilot scope is BMC's
official administrative wards `A`–`E` and Pune's current official numeric wards `1`–`5`, only after
authoritative identity and geometry evidence is reviewed. Never treat `BRIH-W01`–`BRIH-W05` as an
ordinal mapping to the BMC letters; create reviewed records and a new scope version.

The generic HTTPS fetch/snapshot adapter ships as the `governance-sync-fetch` Supabase Edge
Function. A managed deployment must deploy that function, set an environment-specific
`GOVERNANCE_SYNC_DISPATCH_SECRET` plus the platform-provided server credentials, and configure a
Supabase Cron POST using the same secret. Never commit the secret or schedule authorization value.
`verify_jwt = false` is intentional only for this custom-secret machine boundary. Confirm that an
unauthorized request cannot claim work before enabling a schedule.

Each Cron invocation must request `limit: 1`. The Edge lease range is 300–900 seconds and defaults
to 300; the lower-level trusted RPC accepts 180–900 seconds. The function renews the lease after
retrieval and after a Storage write. Expired work is failed and backed off instead of being reclaimed
immediately, so monitoring must treat that delay as expected safety behavior rather than queue loss.

Before activating an official source, operators must separately review its exact HTTPS allowlist,
expected MIME type, timeout/size limit, cadence, parser key/version, minimum cardinality/layout
fixtures, retention policy, and publication scope. Set attributed source approval and a future
`next_sync_at`; approval must store the exact current deterministic contract SHA-256 and be
attributed to an active global `platform_admin`. Do not bulk-promote the ten seed rows. Only the
supported MIME allowlist and exact HTTPS port 443 URLs without fragments are accepted. Fetch success
proves only that immutable official-source evidence was preserved. Source-specific parsing, entity
matching, review, and transactional publication remain required before any production record
changes.

Contact publication has three distinct gates: source evidence may stage a `source_verified` value;
an attributed human review may publish it as `manually_verified` and public-official; and a separate
flag may approve a public complaint-intake channel for delivery. Legacy office/officer/utility/
emergency contact columns cannot be updated. Deployments must append and close contact versions.

Because Storage upload precedes database snapshot finalization, deploy a reviewed reconciliation
and retention procedure before production activation to detect content-addressed objects that have
no database row. The Edge function intentionally retains bytes after a failed or ambiguous
finalization because eager cleanup could race a late database commit. Reconciliation must wait an
approved grace period and recheck snapshot links before removing a true orphan. Database
finalization validates the exact object size/MIME metadata and referenced snapshot objects are
immutable. No publisher or review UI ships with this slice.

Production routing activation additionally requires a staging-verified bundle of current Pune
municipality/ward polygons, category mappings, authority departments, durable officer roles,
current assignments where available, assets/owners where required, confidence policies, routing
rules, and fallback paths. Placeholder evidence must never be included in that activation bundle.

Phase 4 deployments then apply the complaint-capture and complaint-security/RPC migrations. They
create the unexposed forced-RLS `complaints` schema, service-only functions, and four private
Storage buckets. Review bucket privacy, MIME/size limits, direct-object ACL denial, RPC execution
grants, exact-location isolation, and signed-upload expiry before deploying the complaint API. Do
not add anonymous/authenticated Storage policies or expose the `complaints` schema in PostgREST.

Deploy the API before enabling the corresponding mobile build because draft, media, routing, and
submission contracts are server orchestrated. The mobile client requires the environment's exact
API and Supabase URLs and client-safe publishable key. A physical device cannot reach a laptop API
through `localhost`; use a reviewed LAN address or development tunnel and do not expose a service
key in Expo configuration.

Citizen web account testing likewise requires the web deployment and NestJS API to use the same
Supabase environment and the correct reachable `NEXT_PUBLIC_API_URL`. Apply the identity migrations
and profile-provisioning trigger before allowing email/password signup. A successful Auth session without a
profile row is an environment/provisioning failure that the account UI reports explicitly; do not
mask it with Auth metadata or an empty profile.

The identity forward fix repairs missing application profiles/global citizen roles for existing
Auth users without overwriting existing state. Citizen recovery uses the managed recovery link;
government/admin entry remains compatible with provider-default links or reviewed codes. Configure
exact recovery/invite callbacks. Keep all citizen Phone MFA modes in `observe` until Advanced Phone
MFA, a real SMS provider, recovery, abuse limits, and hosted device tests pass; then switch web,
mobile, and API enforcement together. A local template file does not update a hosted project.

Production complaint activation additionally requires:

- verified, staging-tested Pune category, boundary, duplicate-policy, department/role, rule,
  confidence, fallback, and any required asset/ownership records;
- successful managed-development and staging migration, RLS, RPC, private Storage, Auth, signed
  upload/finalization, idempotent submission, and owner-isolation smoke tests;
- a physical-device development build covering foreground GPS, mock-location signals, camera,
  short video, microphone, interrupted upload resume, SecureStore/SQLite restore, and deep links;
- approved capture thresholds, media limits, privacy/retention consent, emergency wording, and
  duplicate-acknowledgement policy;
- approved transcription and moderation/processing providers before claiming those states advance
  beyond `pending`, plus a durable expiry/retention cleanup design that does not use Redis/BullMQ.

The Phase 4 migrations and ordinary non-production seeds are present in staging as part of the
database record above. No media object, verified route, complaint, API/client deployment, or hosted
workflow smoke was added. The staged bootstrap exposes zero operational categories and therefore
proves a safe unavailable state, not a production Pune complaint flow. Rollback-isolated synthetic
tests are not deployment data.

Phase 5 deployments apply the government-workflow schema and security/RPC migrations after Phase 4,
regenerate database types, deploy the API, and then deploy the government dashboard. The migrations
version complaint assignments and add the capability/transition matrix, exact-replay action ledger,
action audit, private internal records, private resolution evidence/resolutions, and data-minimized
notification outbox inside the existing unexposed forced-RLS `complaints` schema. Do not expose that
schema through PostgREST or grant dashboard clients direct table/Storage access.

Before enabling a dashboard environment, repeat migration/RLS/RPC tests and smoke-test one role at
each global, authority, ward, department, and read-only moderator boundary. Confirm cross-scope
denial, stale workflow conflicts, exact idempotency replay, append-only assignment/audit/history,
same-authority transfers, dependency closure, private evidence upload/finalization/read, resolution
requirements, and atomic outbox persistence. The queue will remain empty with the repository's
normal bootstrap because it contains no operational category or verified pilot route; use only
rollback-isolated or explicitly approved non-production fixtures.

Phase 5 persists outbox records but does not deliver them. Do not deploy a Redis/BullMQ consumer or
claim citizen notification delivery. The complaint detail renders authorized coordinates as text;
an interactive map requires a separately selected provider/key and approved coordinate-sharing
privacy policy. The two Phase 5 migrations are present in staging as part of the database record
above; no evidence object, dashboard/API build, workflow fixture, hosted smoke, or application
deployment was performed.

Phase 7 deployments apply the accountability schema and security/RPC migrations after Phase 6,
regenerate database types, and deploy the API, mobile build, and government dashboard together.
The migration adds private forced-RLS policy, feedback, citizen replay/audit, reopen-evidence,
reopen-request, and escalation records while extending resolution history additively. Existing
Phase 5 resolutions retain nullable completion-location fields; deployment must never fabricate a
historical completion location or rewrite linked evidence.

Do not activate a managed Phase 7 policy until product owners approve its rating bounds, feedback
and reopen windows, eligible statuses, allowed reason codes, evidence requirement, attempt limit,
and repeated-reopen threshold. A missing, expired, or ambiguous approved policy is the intended
safe unavailable state. Before activation, repeat direct ACL/RLS denial, owner and government-scope
isolation, exact replay/conflict, signed evidence, workflow concurrency, feedback, reopening, and
repeated-escalation tests. Confirm notification payloads contain no ratings, comments, reasons,
coordinates, object locators, hashes, or signed tokens. Phase 7 needs no new worker, Redis, BullMQ,
or Sentry process; its status events reuse the Phase 6 outbox.

The migration provides a bounded service-only function for marking expired citizen reopen-evidence
reservations, but this session does not create a managed schedule or delete orphaned Storage
objects. Configure a reviewed Supabase/PostgreSQL scheduled maintenance path together with the
existing private-media cleanup and scanning work before public operation (`GOVDASH-002`).

Phase 9 deployments apply `20260716110000_phase_9_sla_escalation_kpi_schema.sql` followed by
`20260716111000_phase_9_sla_escalation_kpi_security_and_rpc.sql`, regenerate database types, then
deploy the API, government dashboard, and trusted worker together. The migrations add private
forced-RLS calendar/policy/rule versions, complaint bindings/clocks/history, escalation lease/audit
state, and versioned KPI calculation runs/snapshots. They seed algorithm definitions only—never an
active calendar, target, category override, or escalation rule.

Before activation, verify direct ACL/RLS denial, platform-admin-only publication, atomic version
supersession, fail-closed missing/ambiguous configuration, business-calendar timezone boundaries,
clock completion/pause/deadline history, lease expiry/retry/dead behavior, transactional status/
escalation/outbox persistence, reproducible KPI source cutoffs, and municipality/ward/department
scope isolation. Use rollback-isolated synthetic policy fixtures; they are not operational data.

Deploy and supervise one worker process with independently configured notification, SLA, and KPI
loops. Configure the approved Supabase/PostgreSQL scheduling path that creates KPI runs at the
reviewed cadence. Do not publish policy until official targets, calendars, effective dates,
category overrides, escalation actions, and verified target roles are approved. Missing policy
must remain visibly unavailable, not be replaced by hardcoded defaults. No Redis, BullMQ, or Sentry
service is required.

---

## Secrets

Store secrets in:

- GitHub Actions secrets;
- cloud provider secret manager;
- Supabase project secrets;
- EAS secrets;
- Vercel environment variables.

Never store secrets in:

- Git;
- `.env.example`;
- issue comments;
- logs;
- screenshots;
- client bundles.

---

## Environment Variable Categories

### Public mobile

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_REALTIME_URL
EXPO_PUBLIC_PHONE_MFA_MODE
EXPO_PUBLIC_MAPS_KEY
```

### Public web

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_REALTIME_URL
NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE
```

### Server

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
GOVERNMENT_INVITE_REDIRECT_URL
EMAIL_PROVIDER_API_KEY
SMS_PROVIDER_API_KEY
API_PRIVILEGED_MFA_MODE
API_CITIZEN_PHONE_MFA_MODE
REALTIME_ALLOWED_ORIGINS
REALTIME_DELIVERY_BATCH_SIZE
REALTIME_DELIVERY_LEASE_SECONDS
REALTIME_DELIVERY_POLL_INTERVAL_MS
REALTIME_EVENT_RATE_LIMIT_PER_MINUTE
REALTIME_MAX_HTTP_BUFFER_SIZE_BYTES
REALTIME_MAX_ROOMS_PER_SOCKET
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
```

Prefer `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for current projects. Anon and service-role variables are supported as legacy fallbacks. Secret/service-role values must never appear in a client-visible environment.

Realtime and worker processes require the server-only secret/service-role credential for narrow
RPC execution. Public realtime URLs contain no credential. Push/email provider variables are not
part of the active Phase 6 delivery configuration; those channels remain `unsupported` until an
approved provider and notification policy exist.

The Phase 9 SLA loop defaults to a 25-row batch and 60-second lease; the KPI loop defaults to a
10-row batch and 120-second lease. Both default to a 1,000 ms poll interval and accept an
independently identifiable worker ID. Keep those values in the trusted worker environment only; the
service credential and lease tokens must never enter a browser/mobile bundle or log.

---

## Release Process

### Development Release

- merge to development branch;
- deploy development environment;
- run smoke tests.

### Staging Release

- create release candidate;
- deploy staging;
- run end-to-end tests;
- run security checks;
- verify migrations;
- verify mobile build.

### Production Release

- tag release;
- backup database;
- apply migrations;
- deploy API;
- deploy workers;
- deploy realtime;
- deploy web;
- publish mobile build;
- run smoke tests;
- monitor errors.

---

## Health Checks

Required before launch. The API and realtime server implement both endpoints with service-specific
readiness probes:

```text
/health/live
/health/ready
```

Readiness should check:

- database;
- storage dependency;
- any background-work dependency implemented by the active release.

---

## Monitoring

The deployed V1 target must track:

- API error rate;
- API latency;
- database connections;
- notification-outbox and delivery backlog;
- notification materialization and realtime-delivery failures;
- Socket.IO connections;
- message delivery;
- upload failures;
- notification failures;
- crash-free mobile sessions;
- routing failures.

Phase 3 emits structured NestJS routing-decision logs with request correlation, status, and category
identifier only. Exact coordinates, officer contacts, secrets, internal candidate evaluations, and
raw official-source content must not be logged. Sentry remains intentionally absent.

Phase 4 adds structured draft, upload-intent/finalization, duplicate-check, and submission events
with safe actor/draft/media/complaint/category identifiers and aggregate statuses/counts. Logs must
continue to omit descriptions, exact coordinates, local file paths, object bytes, bearer/signed
tokens, checksums, spoof evidence, and internal duplicate/routing factors. Monitor draft and upload
failures, media integrity mismatches, idempotency conflicts, unavailable routing, and submission
latency through platform logs/metrics; no Sentry SDK is introduced.

Phase 5 adds structured government queue/detail/action and resolution-evidence events containing
only safe request, actor, complaint/action identifiers and aggregate outcomes. Exact coordinates,
complaint text, private notes, contact data, evidence paths/URLs/tokens/checksums, completion notes,
dependency details, and idempotency keys must not be logged. Monitor workflow-version conflicts,
authorization denials, action failures, evidence integrity failures, unresolved dependencies, and
notification-outbox growth with NestJS/Supabase/platform logs and audit tables. No Sentry SDK or
Redis/BullMQ monitoring dependency is introduced.

Phase 6 adds structured worker and realtime events with safe outbox, notification-delivery,
message, complaint, event, and socket identifiers plus aggregate counts/outcome codes. Logs omit
private message text, notification body text, complaint descriptions, recipient contacts, device
push tokens, JWTs, service credentials, and lease/claim tokens. Monitor outbox-job age/count by
state, materialization retry/dead counts, realtime delivery age/count by state, expired leases,
zero-socket deliveries, active connections, authorization failures, and readiness failures. Push/
email success metrics are not meaningful until those channels are implemented.

Phase 9 adds structured SLA/KPI worker events containing safe job/run IDs, aggregate counts,
outcomes, and durations. Logs must omit complaint content, citizen identity, exact locations,
contacts, policy review notes, source evidence, service credentials, and lease tokens. Monitor
active/paused/breached clock counts, oldest due escalation job, retry/dead rates, lease expiry,
calculation-run failures, latest completed source cutoff, snapshot staleness, and worker readiness.
No Sentry, Redis, or BullMQ monitoring dependency is introduced.

Governance retrieval emits structured Edge logs containing only event status, run ID, and source
endpoint ID. PostgreSQL retains append-only sync events with safe error codes, aggregate HTTP
status, duplicate/not-modified state, and retry timing. Never log dispatch/service credentials,
lease tokens, raw source bytes, extracted contact values, response headers, or source content.
Monitor claim failures, lease expiry, layout/cardinality failures, repeated source backoff, Storage
finalization mismatches, and review backlog using Supabase/platform-native logs and audit tables.

---

## Rollback

Rollback strategy:

- application rollback through prior container/image;
- web rollback through prior deployment;
- mobile rollback through feature flags or hotfix;
- database forward-fix preferred;
- disable incomplete feature through feature flag.

Never depend on destructive database rollback as the only recovery strategy.

---

## Phase 8 Transparency Activation

Deploying the Phase 8 code does not activate a public dataset. Apply all Phase 8 transparency
migrations in repository order, including the `20260716105000` RPC/ACL forward fix and
`20260716106000` duplicate-group migration, regenerate types, and repeat forced-RLS/direct-ACL/
spatial/privacy tests in managed development and staging. Before any
publication, approve an effective transparency policy, sensitive-category and field-redaction
rules, minimum aggregation cohort, withdrawal/retention/abuse runbook, and reviewed pilot ward
geometry. Exercise publish, anonymous read, withdrawal, cache behavior, and private-field non-
disclosure with non-production records.

Duplicate groups require a separate human review after every member already has a current public
projection. Verify the 100-member bound, canonical membership, exact replay/conflict behavior,
public-ID-only detail payload, and versioned withdrawal. Do not build an automatic publication path
from private similarity results, and do not activate the service-only review RPC without an
authorized moderation workflow and audit runbook.

The provider-neutral client makes no external map/tile request. Do not add a basemap key or permit
coordinates to leave Local Wellness infrastructure until a provider, billing/key ownership,
domain/application restrictions, data-transfer/privacy terms, accessibility, and retention decision
is recorded. Do not activate processed public media until full decode, malware scanning,
EXIF/face/plate/address redaction, moderation, deletion, and orphan cleanup are operational.

## Phase 9 SLA, Escalation, and KPI Activation

Engineering support for private SLA clocks, escalation, and organizational KPI snapshots exists in
the repository, subject to the root session's aggregate verification. Deployment alone must remain
non-operational because no approved calendar, target, override, escalation rule, or production KPI
schedule is seeded.

Before enabling Phase 9 in managed development or staging:

- apply both Phase 9 migrations incrementally and regenerate/check database types;
- approve source-backed, effective-dated calendar/policy/rule versions through a current platform
  administrator and verify replacement atomically closes/supersedes the prior approved interval;
- verify every target authority/local body/category/department/ward/officer role is current,
  source-verified or manually verified, non-placeholder, and eligible for the intended operation;
- configure the SLA and KPI worker variables in a trusted secret store, supervise the worker, and
  verify clean shutdown plus lease expiry/retry/dead recovery;
- configure a reviewed Supabase/PostgreSQL schedule for KPI-run creation and document its reporting
  window, source cutoff, cadence, retention, and failure runbook;
- run rollback-isolated synthetic clock, pause/resume, breach, escalation, transactional outbox,
  KPI materialization, and cross-scope denial smokes; then confirm all synthetic policy/data was
  rolled back;
- monitor missing/ambiguous policy bindings, breached clocks, escalation backlog/dead jobs, failed
  runs, and stale snapshots before publishing any operational version.

Do not infer targets from placeholder governance data, hardcode pilot thresholds in a client or
worker, expose KPI snapshots publicly, or add officer rankings. Production activation remains
blocked on approved operational policy/data and environment verification.

## Mobile Citizen Experience and Governance Directory Activation

The current mobile shell, email/password/recovery modes, staged phone verification, complaint
dashboard/history, private profile image, category-aware report form, reviewed locality Feed/
Heatmap, and Nearby directory are locally implemented. Before a managed demo or release:

- deploy the matching API and apply the additive
  `20260716104000_verified_governing_body_projection.sql` migration through the ordinary
  incremental workflow; never apply the master bootstrap to an already migrated project;
- source one reviewed root environment, confirm the public Supabase URL/key belong to the same
  staging project, and use a LAN-reachable API/realtime URL for Expo Go;
- run a physical-device signed-out → email/password → optional phone MFA → dashboard → profile
  image → Feed/Heatmap → Nearby → live photo/video/voice → draft
  resume smoke, including denied permissions, weak GPS accuracy, network interruption, and logout;
- review the known pilot UX limits: an individual finalized draft attachment cannot yet be removed,
  submitted original media has no owner signed-read view, and mobile notification history currently
  loads the newest 100 records (`COMPLAINT-004`, `COMPLAINT-005`, `NOTIFY-004`);
- keep Nearby honestly unsupported until official, reviewed, current, non-placeholder jurisdiction
  geometry and governance records are active; do not load synthetic pgTAP fixtures or hardcode a
  municipality for a demo;
- keep OS push disabled until the Expo/EAS project, FCM/APNs credentials, consent/preferences,
  destination verification, privacy-safe templates, and retry/fallback policy are approved. Durable
  in-app history and optional Socket.IO refresh remain the implemented notification channels.

The migration, managed API deployment, verified pilot geometry/data, and physical-device smoke are
pending; local engineering results do not imply those environment steps passed.

## Infrastructure as Code

Use Terraform later for:

- cloud applications;
- secrets;
- DNS;
- monitoring;
- object storage external services.

Supabase project creation may remain managed manually initially, but configuration must be documented.

---

## Deployment ADRs

Create ADRs when changing:

- hosting provider;
- deployment topology;
- cross-instance realtime or background-work provider;
- Supabase environment strategy;
- mobile distribution;
- infrastructure as code tool;
- secret management approach.

Redis, BullMQ and Sentry are intentionally deferred beyond V1. The approved V1 monitoring target is
structured logs, request correlation, implemented API/realtime health checks, uptime checks and
provider-native metrics without a Sentry SDK or DSN. Hosted alerts and provider metrics remain an
operator activation task.
