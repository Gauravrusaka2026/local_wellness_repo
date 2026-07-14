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

The current mobile compatibility baseline is Expo SDK 54.0.33, React Native 0.81.5, React 19.1,
and TypeScript 5.9.3. Local Android Expo Go testing requires an SDK 54-capable client. Every mobile
SDK change must pass `expo install --check`, strict type-checking, and an Android export before a
device or EAS release is attempted.

### Web

- Vercel or equivalent;
- separate projects for citizen web, government dashboard, and admin console.

### API

- containerized NestJS application;
- Railway, Fly.io, Render, AWS ECS, or equivalent.

### Realtime

- containerized Socket.IO server;
- one instance for the V1 pilot;
- horizontal scaling requires a later reviewed delivery mechanism and ADR.

### Workers

- containerized worker process;
- independent scaling when a V1 phase introduces background work;
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
non-routable targets. It does not activate source retrieval or routing. Keep all ten targets inactive
until a global platform administrator reviews the canonical hierarchy and official evidence. The
underlying wards are placeholders without verified geometry; BMC's numeric bootstrap wards also
require a reviewed crosswalk to the official lettered ward structure.

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
and profile-provisioning trigger before allowing signup. A successful Auth callback without a
profile row is an environment/provisioning failure that the account UI reports explicitly; do not
mask it with Auth metadata or an empty profile.

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

No Phase 4 migration, seed, or media object was uploaded to managed Supabase during local
engineering. The local bootstrap exposes zero operational categories and therefore proves a safe
unavailable state, not a production Pune complaint flow. Rollback-isolated synthetic tests are not
deployment data.

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
EXPO_PUBLIC_MAPS_KEY
```

### Public web

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
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
```

Prefer `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for current projects. Anon and service-role variables are supported as legacy fallbacks. Secret/service-role values must never appear in a client-visible environment.

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

Required before launch; these endpoints are not part of the Phase 1 implementation:

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
- notification-outbox backlog when implemented;
- background-work failures when implemented;
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

Redis, BullMQ and Sentry are intentionally deferred beyond V1. The approved V1 monitoring target is structured logs, request correlation, health checks, uptime checks and provider-native metrics without a Sentry SDK or DSN. Phase 1 implements request correlation and application error logging; health endpoints, uptime checks and hosted metrics remain deployment work.
