# Deployment

## UI benchmark delivery

The benchmark ships with the existing web and Expo builds and adds no service, worker, map
provider, secret, or migration. Acceptance still requires dependency installation, lint,
strict type-check, production builds, responsive browser QA, and representative device capture.

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
- with the committed environment template, an empty or failed delivery claim backs off from the
  10-second base interval to at most 15 seconds; claimed work resets the loop to its configured base;
- start this service only while testing or operating realtime delivery, not for an API/client-only
  development session;
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
- with the committed environment template, each notification, SLA, and KPI loop backs off
  independently from a 10-second base interval to at most 60 seconds while idle or failing; any
  claimed work resets that loop to its configured base;
- start the process only while testing or operating notification materialization, SLA escalation, or
  KPI calculation;
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

### V1 BMC ward/contact SQL Editor deployment

For a reconciled non-production target that already has the existing complaint/routing schema and
BMC governance prerequisites, run `supabase/deploy/v1-simple-ward-routing.sql` once through
**Supabase Dashboard → SQL Editor → New query**. The generated artifact contains migration
`20260720100000_v1_simple_ward_routing.sql`, forward migration
`20260720103000_v1_ward_email_provenance.sql`, and seed `54` in that order; it is safe to rerun.
Verify it before execution with `pnpm governance:bmc:v1-routing:deploy:check`.

The deployment creates a private 312-row ward/category contact matrix and an idempotent ward-email
outbox. Seed generation joins immutable phone/WhatsApp/category input
`resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` with immutable ward-email/office input
`resources/local_wellness_bmc_ward_directory_2026-07-20.zip`. It preserves raw email-source
status/provenance separately from owner-approved staging activation, including direct K/N and P/E
emails and K/S→K/E plus P/W→P/N operational mappings. It activates all 12 pilot categories only
for the database-driven BMC facade. It neither modifies either archive or the canonical Maharashtra
CSV/workbook nor installs a sender, Cron job, Redis, BullMQ or Sentry. After execution, smoke one
authenticated report and confirm a complaint, assignment and `pending` outbox row. Do not mark the
row sent or claim BMC delivery until a trusted email provider worker returns a provider message ID.

The latest local database verification applied all 54 migrations and current seeds and passed all
50 pgTAP files (1,640 assertions), application-schema lint, generated-type drift, and master-SQL
drift verification. The local Auth E2E passes all five email OTP, phone link/confirmation,
existing-phone SMS password change, phone-only-signup denial, and government-invite cases. At the
current citizen-client checkpoint, all 23 mobile test suites, mobile type-check/lint and the
1,293-module Android export pass; repository-wide tests/type-check/lint also pass. At the preceding
integrated checkpoint, the BMC
generator reconciled 26 emails, 12 categories and 312 routes. The focused
artifact is 286,915 bytes and its ordered payload SHA-256 is
`bf3f3ee8a902160ab726484468f0996639816dece02ef47ec8b6ac6ee1d1bb72`. These results verify local
generation only; they do not claim hosted execution or external email delivery.

### V1 deferred-subsystem prune — hosted SQL Editor runbook

ADR-0031 physically removes the 14-table undeployed governance synchronization/versioned-contact
subsystem plus unused `complaints.complaint_comments`. At that migration boundary, custom
application tables fall from 129 to 114. The later protected-handoff registry brings the current
application-owned count to 115. The active complaint, BMC ward/category routing, email outbox,
owner Community, government workflow, private messaging, notifications, accountability,
transparency, SLA and KPI contracts remain.

This is a destructive forward migration. Do not run it against a hosted project until all of these
preconditions are true:

1. In **Supabase Dashboard → Database → Backups**, confirm a restorable backup exists. If Point-in-
   Time Recovery is enabled, record a recovery point immediately before the change. Supabase
   database backups do not restore deleted Storage objects, so retain any required raw snapshot
   files separately.
2. Confirm `routing.ward_issue_contacts` contains a complete owner-approved matrix: at least 26
   wards × 12 categories, with every active row carrying the migration-48 email provenance and
   owner approval. When any retired governance table contains historical rows, the migration
   rejects an empty, partial, non-rectangular or unapproved replacement matrix. A clean bootstrap
   may prune empty legacy tables before seed 54 runs.
3. Stop/delete any manually deployed `governance-sync-fetch` Edge Function invocation and disable
   every external or Supabase Cron schedule that calls it. The repository did not activate one,
   but a hosted operator may have done so outside Git.
4. Confirm `governance.sync_source_leases` contains no active unexpired row. The migration takes an
   access-exclusive lock on that table and refuses to run while an active lease exists; do not
   bypass that preflight. Review any expired rows as historical data before accepting their removal.
5. Confirm `complaints.complaint_comments` is empty. The table had no runtime API, but the migration
   refuses to delete it if any historical row exists. Preserve/migrate those rows before retrying.
6. Keep API, email worker and clients on the current release. Their supported RPC contracts remain
   compatible; only the unused synchronization RPCs are retired.

In **Supabase Dashboard → SQL Editor → New query**, run the complete file:

```text
supabase/migrations/20260723110000_prune_deferred_v1_subsystems.sql
```

SQL Editor execution does not repair or populate `supabase_migrations.schema_migrations`. Record the
operator, project reference, file SHA-256, start/end time and result in the private deployment log.
Do not rerun historical synchronization migrations after this prune; the private marker exists so
adaptive master generation can distinguish intentional removal from an incomplete schema.

Verify the marker and current repository table count:

```sql
select
  pg_catalog.to_regprocedure(
    'private.v1_deferred_subsystems_pruned()'
  ) is not null as prune_marker_exists,
  private.v1_deferred_subsystems_pruned() as prune_marker_value;

select count(*) as custom_application_tables
from pg_catalog.pg_tables
where schemaname = any(array[
  'public',
  'private',
  'governance',
  'routing',
  'complaints'
]::text[]);
```

Immediately after the prune and before the protected-handoff migration, the count is `114`; after
migration `20260724110000_v1_bmc_general_intake_and_handoffs.sql`, it is `115`. A project with
operator-created tables may be higher; investigate rather than forcing the count.

Verify that all 15 retired relations are absent:

```sql
with retired(relation_name) as (
  values
    ('governance.source_endpoints'),
    ('governance.sync_runs'),
    ('governance.raw_snapshots'),
    ('governance.sync_run_snapshots'),
    ('governance.sync_candidates'),
    ('governance.sync_change_items'),
    ('governance.sync_review_items'),
    ('governance.sync_review_events'),
    ('governance.sync_scope_targets'),
    ('governance.sync_source_leases'),
    ('governance.sync_events'),
    ('governance.source_evidence'),
    ('governance.contact_channels'),
    ('governance.contact_channel_versions'),
    ('complaints.complaint_comments')
)
select relation_name
from retired
where pg_catalog.to_regclass(relation_name) is not null;
```

The query must return no rows. Confirm the retired public synchronization RPCs are absent:

```sql
select namespace.nspname as schema_name, procedure.proname
from pg_catalog.pg_proc as procedure
inner join pg_catalog.pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = any(array[
    'claim_due_governance_sync_sources',
    'heartbeat_governance_sync_lease',
    'record_governance_sync_snapshot',
    'fail_governance_sync_run'
  ]::text[]);
```

That query must also return no rows. Confirm the V1 surfaces remain:

```sql
select
  pg_catalog.to_regclass('routing.ward_issue_contacts') is not null
    as ward_routes_present,
  pg_catalog.to_regclass('complaints.ward_email_outbox') is not null
    as ward_email_outbox_present,
  pg_catalog.to_regprocedure(
    'public.claim_v1_ward_emails(text,integer,integer)'
  ) is not null as ward_email_claim_present;

select count(*) as active_bmc_ward_category_routes
from routing.ward_issue_contacts
where is_active;
```

Base seed 54 has 312 active routes; after intake seed 56 the same query returns 338. Finish with one
authenticated complaint smoke, owner-only complaint read, Government Dashboard scoped read and
email-outbox claim/complete test.
Never use a real recipient during a staging sender smoke unless that mailbox owner has approved it.

The migration intentionally leaves any existing private `governance-raw-snapshots` bucket and
objects untouched. After retention review, inspect it in **Storage**. Remove objects only through
the Supabase Storage API or Dashboard, then remove the empty bucket if desired. Never delete
`storage.objects` rows with SQL; doing so can orphan the underlying files. See the official
[backup](https://supabase.com/docs/guides/platform/backups) and
[Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects)
documentation.

This repository documents and locally verifies the migration; it does **not** claim that any hosted
project has applied it.

### JagrukSetu complaint-taxonomy SQL Editor deployment

The detailed citizen taxonomy is an additive classification layer, not an operational routing-data
replacement. Apply it only after the target is reconciled through
`20260723110000_prune_deferred_v1_subsystems.sql` and contains the existing 12 V1 operational
routing profiles.

In **Supabase Dashboard → SQL Editor → New query**, run the complete generated file:

```text
supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql
```

The artifact applies `20260723120000_jagruksetu_complaint_taxonomy.sql` followed by generated seed
`55_jagruksetu_complaint_taxonomy.generated.sql`. Validate drift before execution with
`pnpm taxonomy:check`; regenerate only from the reviewed Markdown source with
`pnpm taxonomy:generate`.

After execution, verify:

- 17 taxonomy primary rows, 340 taxonomy subcategory rows and 19 distinct workflow types;
- `public.list_complaint_taxonomy()` returns 340 public-safe rows to the trusted service role;
- exactly 13 taxonomy leaves map to the 12 stable operational profiles;
- all 20 `COR` leaves are private, `protected_pending`, non-public and unmapped;
- a mapped mobile draft can resume and submit only through fresh location-specific routing;
- an unmapped/protected draft can resume but fails closed at submission.

Deploy the matching API before the mobile build because the client reads authenticated
`GET /api/v1/routing/categories/taxonomy`. SQL Editor execution does not update
`supabase_migrations.schema_migrations`; record the operator and source hashes in the private
deployment log. The repository has not applied this artifact to hosted Supabase.

### JagrukSetu BMC intake SQL Editor deployment

Apply this second generated layer only after all of the following exist:

- the 312-row V1 matrix from `supabase/deploy/v1-simple-ward-routing.sql`;
- migration `20260723110000_prune_deferred_v1_subsystems.sql`;
- the detailed taxonomy migration and seed from
  `supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql`; and
- migrations `20260723130000_citizen_phone_verification_without_mfa.sql` and
  `20260724100000_require_email_identity_for_auth_signup.sql`.

In **Supabase Dashboard → SQL Editor → New query**, run the complete generated file:

```text
supabase/deploy/jagruksetu-bmc-intake-v1.sql
```

It contains the exact bytes of migration
`20260724110000_v1_bmc_general_intake_and_handoffs.sql` followed by generated seed
`56_jagruksetu_bmc_intake.generated.sql`, with source hashes in its header. Validate drift with
`pnpm governance:jagruksetu:intake:check`; regenerate only from the reviewed taxonomy and versioned
overlay CSVs with `pnpm governance:jagruksetu:intake:generate`.

The expected final state is:

- 340 taxonomy leaves classified exactly once;
- 13 specialised plus 243 general-ward leaves, for 256 submittable leaves;
- 84 private/emergency-private leaves with protected official handoffs;
- 13 operational profiles and 338 active private ward/profile contacts;
- 29 approved call or credential-free HTTPS actions; and
- 115 current application-owned tables on a repository-matching target.

Protected handoffs do not submit a JagrukSetu complaint, enqueue ward email or create a Community
record. They expose only the sanitized action contract to the trusted API. Deploy the matching API
before the mobile build, then smoke one specialised submission, one general submission, one
protected call and one protected browser action. SQL Editor execution does not populate
`supabase_migrations.schema_migrations`; record the exact artifact hash and result privately. This
repository has not applied the bundle to hosted Supabase.

### Civic-area office directory SQL Editor deployment

After the target is reconciled through
`20260724110000_v1_bmc_general_intake_and_handoffs.sql`, apply
`20260724120000_verified_civic_area_office_contacts.sql` through the normal migration workflow.
When direct migration access is unavailable, run the complete byte-identical artifact in
**Supabase Dashboard → SQL Editor → New query**:

```text
supabase/deploy/civic-area-office-contacts.sql
```

The artifact is rerunnable: it creates the partial office lookup index with `if not exists` and
replaces the existing service-role projection without changing its SQL signature. It loads no
office seed data. Only already-present active, verified, non-placeholder offices with an active
official HTTPS source, a verification date, and at least one published address, phone, or email can
appear. Exact-ward offices and municipality-wide wardless offices explicitly scoped to the
resolved local body are returned, at most 25 per match.

Deploy the matching API before the mobile build, then smoke an authenticated “Your civic area”
lookup for a point inside a verified ward. Confirm that public office fields are omitted when null,
call/email/source actions use only the returned public values, another ward's office is absent, and
`anon`/`authenticated` still cannot execute the database function directly. Confirm the response
contains no internal IDs, officer mobiles, WhatsApp values, private complaint recipients, routing
evidence, or `routing.ward_issue_contacts` data. SQL Editor execution does not populate
`supabase_migrations.schema_migrations`; reconcile the ledger before a later CLI push. This
repository has not applied the artifact to hosted Supabase.

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

For the current Admin Console, apply
`20260716119000_government_invitation_scope_options.sql` before onboarding officials. The API uses
its service-role-only projection to populate named active, verified, non-placeholder, routable
authority, ward, and department choices; raw UUID entry is not an operational fallback. A platform
or municipal administrator signs in with their own exact email and TOTP, selects the reviewed scope,
and invites one unique official-controlled email. The official accepts the newest invite, signs in
with that same address, enrolls their own authenticator once, and is then reauthorized from current
membership and role records on every request. Existing Auth emails still require the audited
`AUTH-001` lifecycle; never grant access through Auth metadata or manual client state.

### Synthetic privileged accounts for staging demonstrations

Production officials must continue to use individual official-controlled invitations. Only a
trusted operator may create the fixed synthetic staging matrix, and only after the target is
confirmed non-production, the current identity/governance migrations are reconciled, and the
reviewed BMC authority, ward, and department choices appear in the invitation projection:

```bash
pnpm access:provision-staging-demo -- \
  --acknowledge-staging \
  --project-ref <20-character-project-ref> \
  --authority-name "Brihanmumbai Municipal Corporation" \
  --expires-in-days 30
```

The exact project reference must match the configured hosted Supabase URL. The root environment
must contain a server-only secret/service-role key and a public key, and no unexpected active
platform administrator or partially provisioned synthetic account may exist. The helper creates
confirmed identities, uses the existing trusted role/membership functions, assigns an expiry from
1 to 90 days, and verifies each generated password without printing it. It is not an API endpoint
or a production deployment step.

The credentials are written to the gitignored local file
`.local/staging-demo-accounts.<project-ref>.json` with mode `0600`. Keep that artifact on the
operator machine, never put it in CI output or a client environment, never share one identity
between testers, and enroll a separate TOTP factor for every exercised account. Password sign-in
does not bypass TOTP/AAL2 or current database authorization. After the demonstration, delete the
artifact and revoke or disable the synthetic Auth identities through a trusted operator process;
role and membership expiry is automatic, but Auth-user teardown is not. This helper does not
provide arbitrary existing-user assignment, renewal, additional scope, or revocation under
`AUTH-001`.

Historical Phase 3 deployments installed the governance synchronization foundation and inactive
pilot endpoint/scope seeds. ADR-0031 supersedes that runtime for V1 and the forward-prune migration
removes its tables, RPCs, triggers and seeds. Do not apply the old synchronization migrations or
`40_governance_sync_pilot_sources.sql` / `41_governance_sync_pilot_wards.sql` to an already-pruned
V1 project. The unused `@local-wellness/database/governance-sync` export and source/tests are
removed; `@local-wellness/database/governance-import` remains the canonical offline import tooling.
Canonical Phase 2 governance imports and BMC routing seeds remain separate and retained.

For a non-production BMC internal-routing bootstrap on a project that has not yet applied the V1
ward facade or prune migration, use the legacy generated SQL Editor bundle under
`supabase/deploy/bmc-mobile-demo/`. Never run this bundle after migrations 47 or 50. In
**SQL Editor → New query**,
first confirm that `20260716115000_phase_10_profile_images.sql` (migration 38) is complete and run
the complete 77,849-byte
`supabase/deploy/current-session/01_migrations_39_through_43.sql`. It atomically applies only the
missing exact migrations, verifies migration 43/readiness, and safely skips all five on a rerun.
If it reports `LOCAL_WELLNESS_MIGRATION_38_BASELINE_REQUIRED`, a partial migration, or a
non-contiguous history, stop and reconcile the target; use `master.part-1.sql` followed by
`master.part-2.sql` only when their coherent-prefix contract applies. Then run each complete BMC
file in this exact order:

1. `01_baseline_categories_and_core.sql`
2. `02_official_boundaries.sql`
3. `03_ward_crosswalk_and_governance_verify.sql`
4. `04_routing_activation_and_verify.sql`

Each file is transaction-atomic and retry-safe after a complete successful run. If Part 1 reports
`BMC_MOBILE_DEMO_SCHEMA_NOT_CURRENT`, reconcile the target through the current 43-migration cutoff
first and retry the bundle. Do not run the broad Phase 2 seed afterward unless all four BMC parts
are rerun immediately, because that older bootstrap intentionally restores non-routable category
state. The bundle preserves numeric placeholders as audit history, exposes all 12 pilot categories,
and activates only garbage dump, missed sweeping, and mosquito breeding through 66 internal rules
over 22 one-to-one wards. The other nine categories remain unavailable; their canonical BMC
references all require reviewed asset ownership. K/S, K/N, P/E, and P/W remain fail closed. Verify
`automaticOutboundDelivery = false` before starting applications. Bind invited test officials to
durable roles through the trusted invitation/access workflow; never copy officer contacts into Auth
metadata or claim that an internal queue item was registered with BMC. After this bootstrap, apply
exact migrations 44, 45 and 46 in order, run `supabase/deploy/v1-simple-ward-routing.sql` for
migrations 47/48 plus seed 54, reconcile migrations 49 and 50, and use the current V1 verification
steps above.

After the schema and BMC data are present, apply the complete additive
`supabase/migrations/20260718100000_complaint_routing_evidence_diagnostics.sql` in **SQL Editor →
New query**. Then run `supabase/deploy/diagnostics/bmc_submission_runtime_audit.sql` and require an
authenticated complaint receipt. This function repair is rerunnable, does not reload BMC data, and
does not update the official migration ledger.

A credential-safe hosted read audit on 2026-07-17 found API readiness healthy and all five expected
private Storage buckets present but initially returned zero category projections and no tested BMC
jurisdiction rows. That data observation is superseded: a later clean hosted smoke returned 12
catalog categories, three operational categories, finalized private media, K/W jurisdiction, and a
deterministic route. Final complaint completion remains blocked until migration `20260718100000` is
applied; do not infer that repair from health, Storage, or routing success.

The compact upgrade path was rehearsed locally from an exact migration-38 baseline: migrations
39–43 applied successfully, the immediate rerun skipped all five safely, and focused plans 038,
039, 040, 042, and 044 passed 90 assertions. This verifies the artifact's local upgrade behavior,
not its execution on hosted staging.

With migration 45, the clean local database passes all 47 pgTAP files/1,612 assertions,
application-schema lint, generated-type drift, and 45-migration master-artifact checks. These local
gates do not apply either migration or data to hosted staging.

To stage the reviewed Maharashtra Batch 0 hierarchy/source bundle on a reconciled existing target,
first require the canonical Phase 2 seed and schema through
`20260718100000_complaint_routing_evidence_diagnostics.sql`. Then open a fresh SQL Editor query for
each file under `supabase/deploy/maharashtra-batch0/` and run them in order:

1. `01_source_bundle_import_support.sql`
2. `02_batch0_reference_and_lgd_seed.sql`
3. `03_batch0_seed_checksum.sql`

Part 1 applies migration `20260718110000` only from a wholly absent state, skips only a complete
prior application, and rejects partial schema. Part 2 preserves all 160 rows and enriches only
Maharashtra plus 35 exact district LGD matches; it aborts on missing canonical rows or conflicting
codes. It does not install municipal, ward, geometry, contact, officer, asset, routing, public, or
delivery data. `Mumbai`/LGD `482` stays quarantined. Part 3 records the exact generated seed hash.
Running this package does not update Supabase's migration ledger, resolve the Batch 0 data issues,
or make statewide complaint routing available.

Historical deployments may contain the `governance-sync-fetch` Edge Function or a Cron caller, but
ADR-0031 retires both for V1. Stop any such caller before applying the prune migration. Do not set a
new synchronization dispatch secret or reactivate historical source rows. The current import path
is the reviewed offline `@local-wellness/database/governance-import` tooling plus committed
governance data and migrations.

Current V1 recipient selection comes only from the generated private
`routing.ward_issue_contacts` matrix and its retained source/provenance columns. Complaint
submission snapshots the resolved ward email into `complaints.ward_email_outbox`; a provider
message ID, not queue creation, proves sender acceptance. Historical versioned-contact publication
tables and their legacy-column guards are removed by ADR-0031 and must not be used as a parallel
runtime.

The prune intentionally leaves an existing private `governance-raw-snapshots` bucket untouched.
After retention review, remove objects only through the Supabase Storage API or Dashboard and then
remove the empty bucket if desired. Never delete `storage.objects` rows with SQL.

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

Local API/mobile/portal scripts load the single repository-root `.env`, while environment variables
injected by the deployment platform take precedence. Do not deploy or retain app-local environment
files. Validate that the public Supabase URL/key used to build each web portal belongs to the same
project as the server-only API URL/key, then restart/rebuild the clients after any project change.

The identity forward fix repairs missing application profiles/global citizen roles for existing
Auth users without overwriting existing state. Citizen recovery uses the managed recovery link;
government/admin entry remains compatible with provider-default links or reviewed codes. Configure
exact recovery/invite callbacks. Mobile/API and Citizen Web full mode fail closed on current
confirmed-phone state when `EXPO_PUBLIC_PHONE_VERIFICATION_MODE`,
`API_CITIZEN_PHONE_VERIFICATION_MODE`, and
`NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE` are `enforce`. Production API startup rejects a
missing or weaker setting. A local template file does not update a hosted project.

In each managed Supabase project, configure the ordinary Phone provider/Twilio Verify transport
under **Authentication → Sign In / Providers → Phone**, enable phone confirmations and Phone Auth
signup capability, and activate `public.hook_require_email_identity` as the Before User Created
Auth Hook. The provider gate must be enabled for existing linked-phone OTP requests; the hook
rejects actual phone-only user creation. Review OTP expiry, SMS rate limits, CAPTCHA/abuse controls
and phone/password change notifications. Advanced Phone MFA is not required for citizens. A
`sms_send_failed` response means Twilio delivery must be checked; no SQL migration can configure
hosted provider credentials or activate the hosted hook. Record only configuration evidence, never
provider secrets.

Production complaint activation additionally requires:

- verified, staging-tested Pune category, boundary, duplicate-policy, department/role, rule,
  confidence, fallback, and any required asset/ownership records;
- successful managed-development and staging migration, RLS, RPC, private Storage, Auth, signed
  upload/finalization, idempotent submission, and owner-isolation smoke tests;
- a physical-device development build covering foreground GPS, mock-location signals, camera,
  short video, microphone, interrupted upload resume, SecureStore/SQLite restore, and deep links;
- physical-device confirmation that Community, Nearby, and Profile reuse one valid current-area
  fix for at most five minutes, explicit Refresh bypasses reusable memory/last-known results,
  movement across a ward boundary is reflected after refresh/expiry, and Auth identity changes
  clear the cached area without background tracking or persisted exact coordinates;
- sequential complaint issue/photo/video/voice evidence capture must still perform fresh
  high-accuracy acquisitions and satisfy the independent five-minute/50-metre/mock/proximity
  checks; a current-area result must never satisfy complaint evidence;
- submit a report as one installed-app account, open Community, and verify it appears immediately
  under **Your reports** without location permission; verify the card opens owner detail, another
  account cannot see it, public-feed failure does not hide it, and it is absent from
  Local/Trending/Heat/support/star until separately reviewed and published;
- approved capture thresholds, media limits, privacy/retention consent, emergency wording, and
  duplicate-acknowledgement policy;
- approved transcription and moderation/processing providers before claiming those states advance
  beyond `pending`, plus a durable expiry/retention cleanup design that does not use Redis/BullMQ.

The current hosted target now has bounded BMC private media and internal routing evidence, but no
successful complaint receipt has been recorded after the migration-44 repair. This does not prove a
production Pune flow or external BMC-system delivery. Rollback-isolated synthetic tests are not
deployment data.

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

The current citizen release contract requires
`API_CITIZEN_PHONE_VERIFICATION_MODE=enforce`,
`EXPO_PUBLIC_PHONE_VERIFICATION_MODE=enforce`,
`NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only`, and
`NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE=enforce`. The last value protects the latent web implementation;
public-only mode must remain enabled until authenticated web parity is approved.

---

## Environment Variable Categories

### Public mobile

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_REALTIME_URL
EXPO_PUBLIC_PHONE_VERIFICATION_MODE
EXPO_PUBLIC_MAPS_KEY
```

### Public web

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_REALTIME_URL
NEXT_PUBLIC_CITIZEN_ACCESS_MODE
NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE
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
API_CITIZEN_PHONE_VERIFICATION_MODE
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
EMAIL_SMTP_HOST
EMAIL_SMTP_PORT
EMAIL_SMTP_USER
EMAIL_SMTP_PASSWORD
EMAIL_FROM
```

Prefer `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` for current projects. Anon and service-role variables are supported as legacy fallbacks. Secret/service-role values must never appear in a client-visible environment.

Realtime and worker processes require the server-only secret/service-role credential for narrow
RPC execution. Public realtime URLs contain no credential. General Phase 6 push/email notification
channels remain `unsupported` until a provider and notification policy are approved. The separate
V1 ward-email loop is enabled only when all required `EMAIL_SMTP_*` values are present in the
trusted worker environment. `EMAIL_FROM` is optional and defaults to `EMAIL_SMTP_USER`; no SMTP
value belongs in a client bundle, log, migration, seed, or committed environment file.

Run ward email independently from notification/SLA/KPI work when only complaint delivery is
required:

```bash
pnpm --filter @local-wellness/workers dev:ward-email
```

For a controlled smoke or recovery action, the one-shot command claims at most one oldest eligible
row and exits:

```bash
pnpm --filter @local-wellness/workers ward-email:send-once
```

SMTP configuration alone is inert. Supervise exactly one intended continuous sender in each
environment and retain provider-message-ID, retry, and dead-letter evidence.

The Phase 9 SLA loop defaults to a 25-row batch and 60-second lease; the KPI loop defaults to a
10-row batch and 120-second lease. Both use a 10,000 ms active/base poll interval, independently
back off to 60 seconds after empty or failed claims, and reset to the base interval after claimed work.
The notification loop follows the same adaptive timing. Each loop accepts an independently
identifiable worker ID. Keep those values in the trusted worker environment only; the service
credential and lease tokens must never enter a browser/mobile bundle or log.

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

Use `/health/live` for frequent liveness probes. Configure `/health/ready` at a 30–60 second cadence;
readiness may cross the database boundary and must not be used as a high-frequency heartbeat.

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

### Hosted database performance triage

When hosted database CPU or latency is elevated, run
`supabase/deploy/diagnostics/database_performance_audit.sql` privately in **Supabase Dashboard → SQL
Editor** while the issue is observable. The script opens a read-only transaction and reports database
statistics, costly normalized statements, active work, and table/index activity. Its query text and
results are operationally sensitive; do not paste them into public tickets, chat, or logs.

Correlate that snapshot with Dashboard **Observability** and **Query Performance**, confirm which
statements and services are responsible, and review idle worker/realtime processes and health-probe
cadence before resizing compute. Adaptive polling reduces avoidable idle claims but is not evidence
that hosted metrics have improved. Redis, BullMQ, and Sentry remain outside this V1 diagnostic and
runtime topology.

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
migrations in repository order, including the `20260716105000` RPC/ACL forward fix,
`20260716106000` duplicate-group migration, and additive
`20260717100000_public_complaint_engagements.sql`; regenerate types and repeat forced-RLS,
direct-ACL, spatial, privacy, aggregate-only, and official-workflow-separation tests in managed
development and staging. Before any
publication, approve an effective transparency policy, sensitive-category and field-redaction
rules, minimum aggregation cohort, withdrawal/retention/abuse runbook, and reviewed pilot ward
geometry. Exercise publish, anonymous read, withdrawal, cache behavior, and private-field non-
disclosure with non-production records.

Duplicate groups require a separate human review after every member already has a current public
projection. Verify the 100-member bound, canonical membership, exact replay/conflict behavior,
public-ID-only detail payload, and versioned withdrawal. Do not build an automatic publication path
from private similarity results, and do not activate the service-only review RPC without an
authorized moderation workflow and audit runbook.

Support and star/follow state is available only for an active authenticated profile and a current
reviewed public projection. Verify one support per account, aggregate-only public output, private
account star state, lookup/mutation quotas, withdrawal behavior, and `recent|trending` ordering.
These signals must not update official routing, assignment, status, escalation, SLA, or KPI state.
Public comments, supporter identities, public avatars, engagement notifications, and any automatic
government-priority effect remain disabled.

The provider-neutral client makes no external map/tile request. Do not add a basemap key or permit
coordinates to leave Local Wellness infrastructure until a provider, billing/key ownership,
domain/application restrictions, data-transfer/privacy terms, accessibility, and retention decision
is recorded. Do not activate processed public media until full decode, malware scanning,
EXIF/face/plate/address redaction, moderation, deletion, and orphan cleanup are operational.

## Phase 9 SLA, Escalation, and KPI Activation

Engineering support for private SLA clocks, escalation, and organizational KPI snapshots exists in
the repository and passes the current clean local aggregate verification. Deployment alone must
remain non-operational because no approved calendar, target, override, escalation rule, or
production KPI schedule is seeded.

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
dashboard/history, private profile image, category-aware report form, compact primary navigation,
reviewed Local/Trending community views, privacy-safe aggregate Heat view, and Nearby directory are
locally implemented. Before a managed demo or release:

- deploy the matching API and apply both additive directory migrations through the ordinary
  incremental workflow: `20260716104000_verified_governing_body_projection.sql`, then
  `20260724120000_verified_civic_area_office_contacts.sql`. If SQL Editor is required for the
  latter, use only `supabase/deploy/civic-area-office-contacts.sql`; never apply the master
  bootstrap to an already migrated project;
- source one reviewed root environment, confirm the public Supabase URL/key belong to the same
  staging project, and use a LAN-reachable API/realtime URL for Expo Go;
- run a physical-device signed-out → email/password → mandatory phone enrollment/challenge →
  dashboard → fresh-OTP password change → profile camera/library image → current civic-area lookup
  → Local/Trending/Heat → authenticated
  support/star → Nearby → live
  photo/video/voice → draft
  resume smoke, including denied permissions, weak GPS accuracy, network interruption, and logout;
- review the known pilot UX limits: an individual finalized draft attachment cannot yet be removed,
  submitted original media has no owner signed-read view, and mobile notification history currently
  loads the newest 100 records (`COMPLAINT-004`, `COMPLAINT-005`, `NOTIFY-004`);
- keep Nearby honestly unsupported until official, reviewed, current, non-placeholder jurisdiction
  geometry and governance records are active. Office cards additionally require eligible
  `governance.offices` rows and may honestly be empty; do not load synthetic pgTAP fixtures,
  publish private routing contacts, or hardcode a municipality for a demo;
- keep OS push disabled until the Expo/EAS project, FCM/APNs credentials, consent/preferences,
  destination verification, privacy-safe templates, and retry/fallback policy are approved. Durable
  in-app history and optional Socket.IO refresh remain the implemented notification channels.

The profile current-area result is intentionally ephemeral and contains verified governance labels,
not a stored coordinate or street address. A persistent address requires a separately reviewed
private data model and retention/access policy.

Citizen Web currently runs with `NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only`. Its public home,
transparency and directory routes must render without starting a protected Supabase session or
issuing protected API requests; protected/auth/callback routes redirect to the query-free
unavailable notice. Before setting the mode to `full`, complete an authenticated managed smoke of
complaint list pagination, detail and timeline, government resolution/action rendering,
policy-unavailable behavior, feedback exact replay, reopen exact replay, and the mobile handoff
when new location-bound evidence is required. The browser must use the same root
environment/project as the API and must never read the private complaint schema directly.

The migrations, managed API/client deployment, verified pilot geometry/data, and physical-device/
browser smokes are pending; local engineering results do not imply those environment steps passed.

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
