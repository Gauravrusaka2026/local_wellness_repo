# Supabase Setup

## UI benchmark setup

The token/localisation/mobile-progress work requires no SQL Editor execution or hosted schema
change. Do not run master or BMC seed artifacts for this UI slice; empty/unavailable states remain
expected when reviewed transparency or routing data is not active.

The later detailed complaint-taxonomy slice is different: it has its own generated migration/seed
artifact documented under **Hosted SQL Editor: JagrukSetu complaint taxonomy** below.
The subsequent full BMC intake mapping and protected official actions have a second generated
artifact documented under **Hosted SQL Editor: JagrukSetu BMC intake**.

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
- the ordinary Phone provider, phone confirmations and Twilio Verify for citizen phone verification;
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

Citizen account creation/sign-in uses email/password, then requires a confirmed phone through
ordinary Supabase Phone Auth before protected citizen access. Citizen sessions remain AAL1.
Password recovery uses the managed recovery email plus an exact allow-listed callback and then a
fresh OTP sent to the account's already confirmed phone. An account without that phone fails closed
into reviewed support recovery. Choose the Confirm Email policy independently; signup may return no
usable session until email is confirmed when it remains enabled.
Government/admin code and provider-default link templates remain supported. Template editing is
optional, but redirect configuration and delivered-flow testing are not. Local template files do
not update a hosted project automatically.

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

Apply `20260716119000_government_invitation_scope_options.sql` before using the current Admin
Console. Verify that `public.list_government_invitation_options(uuid[])` is executable only by
`service_role`, that `anon` and `authenticated` are denied, and that the API options endpoint returns
only named active/verified/non-placeholder/routable choices within the caller's authority. The
Admin Console must not be replaced with manually entered authority, ward, or department UUIDs.

Onboard one official as follows:

1. Sign in to the Admin Console with the administrator's exact email and complete that account's
   TOTP challenge.
2. Select the named authority, government role, and named ward or department scope, then invite a
   unique official-controlled email.
3. Have that official accept the newest invitation and sign in to the Government Dashboard with
   the same email.
4. On first access, the official enrolls their own authenticator from the QR code; later access uses
   the existing six-digit authenticator entry and does not scan another QR.
5. Confirm the dashboard shows the expected current email, authority membership, and scoped role.

An email that already exists in Supabase Auth intentionally conflicts until the audited
assign/revoke/renew lifecycle under `AUTH-001` is implemented. Do not work around that gap by
editing Auth metadata or copying another user's authenticator factor.

### Staging-only synthetic privileged accounts

When a bounded portal demonstration cannot depend on email delivery, a trusted operator may create
the fixed synthetic staging matrix after the current migrations and reviewed BMC invitation choices
are present:

```bash
pnpm access:provision-staging-demo -- \
  --acknowledge-staging \
  --project-ref <20-character-project-ref> \
  --authority-name "Brihanmumbai Municipal Corporation" \
  --expires-in-days 30
```

The root environment must provide the matching hosted `SUPABASE_URL`, a server-only
secret/service-role key, and a publishable/anonymous key. The project-ref and URL guard is
mandatory, the access lifetime must be 1–90 days, and the command fails on ambiguous reviewed
scope, partial existing state, or an unexpected active platform administrator. Do not run this
helper against production.

The helper creates separate confirmed synthetic Auth identities and preassigns their platform,
municipal, operator, ward, and department roles through the existing trusted database functions.
Do not send another Admin Console invitation to these accounts: they are already provisioned for
their bounded staging scopes. Generated passwords are verified, not printed, and written only to
`.local/staging-demo-accounts.<project-ref>.json`, a gitignored file forced to mode `0600`. Keep the
artifact local to the operator and remove it after the demonstration.

Each account that is exercised must enroll and challenge its own TOTP factor. Password sign-in is
only a Supabase Auth entry method and does not bypass AAL2 enforcement or current database
authorization. Role and membership expiry removes effective access, but disabling/removing the
synthetic Auth identities remains an explicit trusted teardown step. Production onboarding stays
invitation-first, and arbitrary existing-user assignment, renewal, additional scope, and revocation
remain incomplete under `AUTH-001`.

---

## 6. Configure Citizen Phone Verification

Enable the ordinary Phone provider and configure Twilio Verify under
**Authentication → Sign In / Providers → Phone**. Keep credentials only in Supabase/provider secret
storage. Enable phone confirmations and Phone Auth signup capability. Supabase rejects
`signInWithOtp({ phone, shouldCreateUser: false })` with `phone_provider_disabled` when that
provider signup gate is off, including for an existing linked email/password account. Apply
`20260724100000_require_email_identity_for_auth_signup.sql`, then activate
`public.hook_require_email_identity` under the managed project's **Before User Created** Auth Hook.
The hook rejects every new user without a non-empty email, so phone-only creation fails while OTP
sign-in for an existing linked phone remains available. Supabase Storage and Edge Functions do not
deliver SMS by themselves and must not be used as a custom OTP credential store. Advanced Phone
MFA Enrollment/Verification can remain disabled for citizens; privileged TOTP stays enabled
separately.

If the app reports `sms_send_failed`, inspect Twilio Verify delivery rather than changing database
schema. Wrong/expired OTPs, rate limits, disabled phone confirmations and identity mismatches have
separate application errors.

For Twilio Verify, confirm an `AC…` Account SID, current Auth Token and `VA…` Verify Service SID
(not a Messaging Service SID), active service, India geographic permissions and any trial
recipient restrictions. Store no value in Git or the client bundle.

Before production:

- verify Indian delivery;
- verify sender rules;
- configure rate limits;
- configure abuse controls;
- test OTP resend;
- test expired OTP;
- test invalid OTP;
- monitor cost.

Set `API_CITIZEN_PHONE_VERIFICATION_MODE=enforce`,
`EXPO_PUBLIC_PHONE_VERIFICATION_MODE=enforce`, and
`NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE=enforce`. Production API startup rejects any weaker
citizen setting. The former `*_PHONE_MFA_MODE` names are deprecated compatibility inputs.
Rebuild/restart clients and the API after changing these values.

Signed-in and recovery password changes always start a fresh ordinary phone OTP on an isolated
client with `shouldCreateUser: false`. That option remains a required client control but does not
replace the server-side creation hook. A lost confirmed phone has no email-only bypass. Use
reviewed support recovery; do not delete or edit Auth rows directly. Test invalid, expired and
resent codes, provider throttling, exact user/phone matching, global sign-out, old-session
rejection, an allowed existing-linked-phone OTP, and a denied new phone-only account on a physical
device before release.

Do not rely on Supabase test OTP settings in production.

When using the SQL Editor fallback, run
`supabase/deploy/citizen-phone-verification-without-mfa.sql` as one query. The artifact commits both
functions, requests an immediate PostgREST schema reload and returns five boolean installation and
grant checks; all five must be `true`. Creating the hook function does not activate it: separately
select `public.hook_require_email_identity` under **Authentication → Hooks → Before User Created**.
If the API still logs `determine verified phone state`, probe
`public.user_has_verified_phone(uuid)` through the service role and treat `PGRST202` as an
unapplied migration or stale schema-cache condition, not a Twilio delivery error.

The committed local configuration reserves deterministic development-only phone/OTP mappings and
a non-secret placeholder `[auth.sms.twilio_verify]` block. GoTrue disables phone login when no SMS
provider block exists, so the placeholder enables only the local deterministic test path; it does
not deliver SMS and must never be copied to a hosted environment. Hosted projects require real
Twilio Verify credentials in managed secret storage.

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

Historical Phase 3 migrations created:

```text
governance-raw-snapshots
```

This bucket was private and reserved for immutable, content-addressed official-source snapshots. It
was never a client upload surface and did not replace the read-only repository bootstrap CSVs.
ADR-0031 retires that undeployed synchronization runtime for V1 and removes its database metadata,
but SQL intentionally leaves any existing bucket and objects untouched. After retention review,
remove objects only through the Supabase Storage API or Dashboard and remove the empty bucket if
desired. Never delete `storage.objects` rows with SQL.

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
creates the similarly unexposed, forced-RLS `routing` schema. Historical Phase 3 synchronization
and versioned-contact tables in `governance` are removed by
`20260723110000_prune_deferred_v1_subsystems.sql`; V1 uses the private
`routing.ward_issue_contacts` matrix instead. Phase 4 creates the unexposed, forced-RLS
`complaints` schema. Phases 5–9 extend that private schema with
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

After the incremental migration is final, regenerate the optional empty-database bootstrap
artifacts and verify that they match the ordered sources:

```bash
pnpm database:master:generate
pnpm database:master:check
```

`supabase/master.sql` is the complete clean-database artifact. For an existing project created from
an earlier Local Wellness master, run `supabase/master.part-1.sql` and then
`supabase/master.part-2.sql`. Part 1 ends at the complete Phase 5 boundary; Part 2 contains the
remaining ordered migrations. They fingerprint completed migrations, skip them as whole units, and
execute only missing exact sources. Keep applications stopped between parts and run at low traffic.
Stop on any `LOCAL_WELLNESS_*` error; it indicates partial or non-contiguous state that blanket
`IF NOT EXISTS` would conceal.

Each part is one advisory-locked transaction and validates its target before commit. The check
command validates all generated files, and all exclude `supabase/seed/`. Dashboard execution does
not populate the Supabase migration ledger. Normal managed deployments should use immutable files
under `supabase/migrations/` once direct/CLI access and the ledger are reconciled.

For the current hosted target, prefer the compact
`supabase/deploy/current-session/01_migrations_39_through_43.sql` only after confirming migration
38 (`20260716115000_phase_10_profile_images.sql`) is complete. The 77,849-byte query is one
advisory-locked transaction: it skips a coherent completed 39–43 prefix, executes exact missing
source migrations, verifies migration 43/readiness, and is safe to rerun after success. It does not
load seeds or repair `supabase_migrations.schema_migrations`. A baseline, partial, or
non-contiguous-state error means stop and reconcile; use Part 1 followed by Part 2 only when their
adaptive coherent-prefix checks are appropriate.

The compact file intentionally ends at migration 43. If the current BMC data is already loaded but
complaint submission reaches routing and returns `DEPENDENCY_UNAVAILABLE`, run the complete
`supabase/migrations/20260718100000_complaint_routing_evidence_diagnostics.sql` next in **SQL
Editor → New query**. It is an additive, rerunnable function repair; it does not reload BMC data or
update the official migration ledger. Then run the read-only
`supabase/deploy/diagnostics/bmc_submission_runtime_audit.sql` and retry the authenticated saved
report.

For the current V1 BMC routing/contact change, use the focused generated artifact after those
prerequisites are reconciled:

```text
supabase/deploy/v1-simple-ward-routing.sql
```

Run it through **SQL Editor → New query**, then verify 312 active contact rows, 12 operational
categories, a coordinate-specific routed decision, a submitted complaint/assignment and one
`pending` ward-email outbox row. The file applies
`20260720100000_v1_simple_ward_routing.sql`, then
`20260720103000_v1_ward_email_provenance.sql`, then generated seed `54`. That seed merges the
immutable phone/WhatsApp/category archive
`resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` with the immutable ward-email/office archive
`resources/local_wellness_bmc_ward_directory_2026-07-20.zip`; it retains raw email-source status
and record provenance separately from owner-approved staging routing. Direct K/N and P/E email
records are used, while K/S maps to the K/E parent office and P/W maps to the P/N parent office.
Generate/check the seed with
`pnpm governance:bmc:v1-contacts:generate` / `pnpm governance:bmc:v1-contacts:check` and generate/
check the deployment artifact with `pnpm governance:bmc:v1-routing:deploy:generate` /
`pnpm governance:bmc:v1-routing:deploy:check`. The query contains no obsolete source-snapshot
prerequisite and does not update `supabase_migrations.schema_migrations`. Do not run any email claim
RPC repeatedly until a trusted sender provider has been configured.

The latest checked artifact is 286,915 bytes with ordered payload SHA-256
`bf3f3ee8a902160ab726484468f0996639816dece02ef47ec8b6ac6ee1d1bb72`. A clean local reset applied
all 49 then-current migrations and seeds, and all 49 then-current pgTAP files passed 1,649
assertions before the V1 prune migration was added. Re-run the current drift and database checks
immediately before hosted SQL Editor use; local verification is not evidence of hosted application.

### Hosted SQL Editor: prune deferred V1 tables

Migration `20260723110000_prune_deferred_v1_subsystems.sql` removes 14 undeployed governance
synchronization/versioned-contact tables plus unused `complaints.complaint_comments`. On the exact
repository schema it reduces custom application tables from 129 to 114 while retaining complaint
capture, owner Community reads, government workflow, `routing.ward_issue_contacts` and
`complaints.ward_email_outbox`.

Before running it:

1. In **Dashboard → Database → Backups**, confirm a restorable backup exists. If Point-in-Time
   Recovery is enabled, record a recovery point immediately before the change. Database backups do
   not restore deleted Storage objects.
2. Confirm `routing.ward_issue_contacts` contains a complete owner-approved matrix with at least 26
   wards × 12 categories. When retired governance tables contain historical rows, the migration
   rejects an empty, partial, non-rectangular or unapproved replacement matrix. A clean bootstrap
   may prune empty legacy tables before seed 54 runs.
3. Stop any manually deployed `governance-sync-fetch` invocation and disable every external or
   Supabase Cron caller for it.
4. Run this preflight while the old schema still exists; it must return `0`:

   ```sql
   select count(*) as active_sync_leases
   from governance.sync_source_leases
   where expires_at > current_timestamp;
   ```

5. Confirm `complaints.complaint_comments` is empty. Preserve and migrate any existing comment
   history before retrying; the migration refuses to delete it.
6. In **Dashboard → SQL Editor → New query**, paste and run the complete repository file
   `supabase/migrations/20260723110000_prune_deferred_v1_subsystems.sql`. Do not extract only its
   `drop` statements.

SQL Editor does not populate or repair `supabase_migrations.schema_migrations`. Record the operator,
project reference, file checksum and result in the private deployment log. After success, verify:

```sql
select
  pg_catalog.to_regprocedure(
    'private.v1_deferred_subsystems_pruned()'
  ) is not null as marker_exists,
  private.v1_deferred_subsystems_pruned() as marker_value;

select count(*) as custom_application_tables
from pg_catalog.pg_tables
where schemaname = any(array[
  'public',
  'private',
  'governance',
  'routing',
  'complaints'
]::text[]);

select
  pg_catalog.to_regclass('routing.ward_issue_contacts') is not null
    as ward_routes_present,
  pg_catalog.to_regclass('complaints.ward_email_outbox') is not null
    as ward_email_outbox_present,
  pg_catalog.to_regprocedure(
    'public.claim_v1_ward_emails(text,integer,integer)'
  ) is not null as ward_email_claim_present;
```

The count is `114` immediately after the prune and `115` after the later protected-handoff
migration; a target with operator-created tables may be higher.
Use the complete retired-table and retired-RPC checks in
[the deployment runbook](deployment.md#v1-deferred-subsystem-prune--hosted-sql-editor-runbook), then
smoke one authenticated complaint, its owner-only read, a scoped Government Dashboard read and one
email outbox claim/complete cycle.

The migration leaves any private `governance-raw-snapshots` bucket untouched. After retention
review, optionally delete its objects through the Supabase Storage API or Dashboard and then remove
the empty bucket. Never delete `storage.objects` rows with SQL. See Supabase's
[backup](https://supabase.com/docs/guides/platform/backups) and
[Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects)
documentation.

No hosted project is claimed to have applied this migration.

### Hosted SQL Editor: JagrukSetu complaint taxonomy

After the target is reconciled through the prune migration and contains the twelve existing
operational V1 profiles, run the complete generated artifact:

```text
supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql
```

It applies migration `20260723120000_jagruksetu_complaint_taxonomy.sql` followed by generated seed
`55_jagruksetu_complaint_taxonomy.generated.sql`. Check it before execution with
`pnpm taxonomy:check`. At this intermediate step, before the BMC intake artifact, the expected
result is 17 primaries, 340 subcategories, 19 workflows, 13 mapped leaves and 327 pending leaves.
All 20 `COR` leaves remain private, protected and unmapped.

Deploy the corresponding API endpoint and mobile build together. Verify the authenticated catalog,
mapped draft resume/submission and pending/protected fail-closed states. The file does not install
an official contact, activate an independent Corruption recipient, or update the Supabase migration
ledger. This repository has not applied it to hosted Supabase.

### Hosted SQL Editor: JagrukSetu BMC intake

After the taxonomy artifact, 312-row V1 ward matrix and migrations through
`20260724100000_require_email_identity_for_auth_signup.sql` are present, run:

```text
supabase/deploy/jagruksetu-bmc-intake-v1.sql
```

The generated file embeds migration
`20260724110000_v1_bmc_general_intake_and_handoffs.sql` followed by seed
`56_jagruksetu_bmc_intake.generated.sql`. Verify it first with
`pnpm governance:jagruksetu:intake:check`.

Expected final counts are 340 classified leaves, 256 submittable leaves (13 specialised plus 243
general ward), 84 protected official handoffs, 13 operational profiles, 338 active private
ward/profile contacts, 29 approved actions and 115 application-owned tables. A protected handoff
must show only an official call or credential-free HTTPS action; it must not create a complaint,
Community item or email job.

Deploy the matching API before the mobile build. Smoke a specialised submission, a general
submission, a protected telephone action and a protected browser action. The SQL Editor does not
update the migration ledger, and this repository has not applied the artifact to hosted Supabase.

### Hosted SQL Editor: civic-area office contacts

After the target contains migration
`20260724110000_v1_bmc_general_intake_and_handoffs.sql` and the intended
`governance.offices`/official source-reference rows, apply
`20260724120000_verified_civic_area_office_contacts.sql` through the normal managed migration
workflow. When SQL Editor is the only available path, run the byte-identical, rerunnable artifact:

```text
supabase/deploy/civic-area-office-contacts.sql
```

The migration creates no office rows. It makes an office eligible only when the office is active,
verified, non-placeholder, has a verification date, has an active official HTTPS source and has at
least one nonblank public address, public phone or public email. A resolved ward receives its exact
ward offices plus wardless municipality-wide offices explicitly scoped to the resolved local body,
sorted and limited to 25.

The service-role-only projection excludes database identifiers, geometry, officer identities,
officer mobile numbers, WhatsApp numbers, private delivery recipients, routing evidence and
`routing.ward_issue_contacts`. Deploy the matching API and mobile build together, then smoke an
eligible ward, an empty ward, exact-ward scoping, municipality-wide fallback, safe phone/email
actions and direct-client denial. SQL Editor execution does not update
`supabase_migrations.schema_migrations`; record the operator, project, file checksum and result in
the private deployment log. This repository does not claim that the artifact has been applied to
hosted Supabase.

The historical migrations-39-through-43 artifact remains drift-checked with:

```bash
pnpm database:current-session:generate
pnpm database:current-session:check
```

It is not the prune migration and must not be run after the target has reached migration 50.

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

### Retired governance retrieval

Do not deploy or schedule `supabase/functions/governance-sync-fetch` for V1. ADR-0031 retires that
undeployed machine boundary and migration
`20260723110000_prune_deferred_v1_subsystems.sql` removes the database tables and four public RPCs
it required. If a hosted operator deployed the function or configured an external/Supabase Cron
outside this repository, stop that caller before applying the prune migration.

The unused `@local-wellness/database/governance-sync` export and its source/tests are also removed.
`@local-wellness/database/governance-import` remains the canonical offline tooling for
source-validated governance imports. A future automated refresh requires a new ADR and must not
silently recreate the retired schema or custom-secret boundary.

---

## 15. Configure Secrets

Set function secrets:

```bash
supabase secrets set KEY=value
```

The retired governance synchronization runtime does not require
`GOVERNANCE_SYNC_DISPATCH_SECRET`. Remove an obsolete secret only after confirming no manually
deployed caller still depends on it; secret removal is separate from the database migration.

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
EXPO_PUBLIC_PHONE_VERIFICATION_MODE=enforce

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_REALTIME_URL=http://localhost:3002
NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only
NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE=enforce

GOVERNMENT_INVITE_REDIRECT_URL=
API_ALLOWED_ORIGINS=
API_PRIVILEGED_MFA_MODE=observe
API_CITIZEN_PHONE_VERIFICATION_MODE=enforce
GOVERNANCE_SYNC_DISPATCH_SECRET=

EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_REALTIME_URL=http://localhost:3002

REALTIME_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3003,http://localhost:3004
REALTIME_DELIVERY_BATCH_SIZE=25
REALTIME_DELIVERY_LEASE_SECONDS=30
REALTIME_DELIVERY_POLL_INTERVAL_MS=10000
REALTIME_EVENT_RATE_LIMIT_PER_MINUTE=120
REALTIME_MAX_HTTP_BUFFER_SIZE_BYTES=65536
REALTIME_MAX_ROOMS_PER_SOCKET=32

NOTIFICATION_WORKER_ID=notification-worker:local
NOTIFICATION_BATCH_SIZE=25
NOTIFICATION_LEASE_SECONDS=60
NOTIFICATION_POLL_INTERVAL_MS=10000

SLA_ESCALATION_WORKER_ID=sla-escalation-worker:local
SLA_ESCALATION_BATCH_SIZE=25
SLA_ESCALATION_LEASE_SECONDS=60
SLA_ESCALATION_POLL_INTERVAL_MS=10000

KPI_CALCULATION_WORKER_ID=kpi-calculation-worker:local
KPI_CALCULATION_BATCH_SIZE=10
KPI_CALCULATION_LEASE_SECONDS=120
KPI_CALCULATION_POLL_INTERVAL_MS=10000

EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASSWORD=
EMAIL_FROM=
```

Do not place real secrets inside `.env.example`.

The realtime server also requires the server-only Supabase secret/service-role credential and the
client-safe publishable/anon key; all three notification/SLA/KPI worker loops require the server-
only credential.
Neither value belongs in an `EXPO_PUBLIC_` or `NEXT_PUBLIC_` variable. Public realtime URLs are
transport locations, not credentials.

The V1 ward-email loop is a separate trusted-worker channel. It starts only when SMTP host, user,
and password are configured, uses port 587 by default, and records the provider message ID before
an outbox row becomes `sent`. Keep these values only in the ignored root `.env` for local work or
the hosted worker's secret store. A successful SMTP connection or `sent` outbox transition does not
by itself prove that the ward mailbox accepted or acted on the complaint; verify a controlled
recipient delivery before representing external routing as operational.

Start only that channel with:

```bash
pnpm --filter @local-wellness/workers dev:ward-email
```

Use `pnpm --filter @local-wellness/workers ward-email:send-once` only for a deliberate, bounded
one-row smoke. Worker package scripts load the ignored repository-root `.env`; do not create an
app-local environment file and do not start the combined worker merely to activate SMTP.

Use an untracked repository-root `.env` as the single local source, export it into the process
before starting Supabase CLI or the full workspace command, and do not create any app-local
`.env.local`. The API, mobile, Citizen Web, Government Dashboard, and Admin Console package scripts
also load the root file automatically; already-exported shell or deployment values win. On a
physical device, override the public API/realtime URLs with the laptop's current LAN address. The
mobile runtime validates detectable Supabase URL/key project alignment and rejects loopback service
URLs without echoing configured values. Restart affected clients and establish a new session after
changing Supabase projects because old cookies/tokens belong to the prior project.

---

## 20. Local Verification and Hosted Activation

Phase 1 local verification is complete:

- repository-pinned CLI and committed local configuration validated;
- identity migrations reset successfully;
- migration, RLS and generated-type checks pass locally and are enforced by CI;
- citizen email/password, fresh-phone-OTP password change/recovery, and confirmed-phone client
  tests pass;
- privileged TOTP/AAL and citizen confirmed-phone API policy tests pass;
- real phone delivery remains provider-gated for E2E.

Phase 2 local verification is complete for the available baseline:

- `pnpm governance:data:check` against the hash-pinned workbook/CSV manifest and committed generated artifacts;
- a clean `pnpm database:reset`, which applies all governance migrations and the generated baseline seed in order;
- `pnpm database:lint` against application-owned schemas and all pgTAP migration, seed, RLS, hierarchy, temporal, and synthetic PostGIS plans;
- `pnpm database:types:check` for both `public` and `governance`;
- confirmation that placeholder wards/contacts, officer templates, and unresolved routing references are not exposed as verified or routing-eligible;
- confirmation that zero officer assignments and zero real boundary versions are created from the supplied baseline.

These checks pass locally: seven Phase 2 migrations, two generated governance seed files, 22 forced-RLS governance tables and all 194 Phase 2 pgTAP assertions. The canonical source, generated seeds and validation report are reviewed artifacts. Follow `docs/governance-data.md` for refreshes; never modify the CSVs or generated SQL in place.

At the historical Phase 3 checkpoint, three migrations, the engineering-category seed,
routing/synchronization package tests, API tests and pgTAP plans covered routing schema/security,
placeholder exclusion, synchronization lifecycle, PostGIS candidates, fallback behavior and
decision auditing. That checkpoint passed 450 assertions across 11 pgTAP plans, including 102
Phase 3 assertions. Exact historical results remain in
`docs/worklogs/phase-3-routing/testing.md`; they do not describe the pruned V1 schema.

The canonical Maharashtra/Phase 3 baseline remains deliberately non-operational: 12
draft/unverified categories, zero operational categories, no verified Pune rule set, and no route
sourced from a placeholder. The current full local seed glob additionally applies the reviewed BMC
non-production pack described below; it activates only three asset-independent categories and must
not be mistaken for Pune or production coverage. Synthetic test fixtures still run only inside
rolled-back transactions.

Phase 4 adds two complaint migrations, four private Storage buckets, generated complaint-schema
types, authenticated complaint API tests, and four pgTAP plans. The clean local reset and schema
lint passed. All 557 assertions passed across 15 plans; the four Phase 4 plans contribute 107
assertions covering schema/storage, forced RLS/ACL, rollback-isolated routed submission, exact
replay, duplicate checks, and malformed/placeholder/location/media rejection. The generated types
cover `public`, `governance`, `routing`, and `complaints`. Exact observed results are recorded in
`docs/worklogs/phase-4-complaint-capture/testing.md`.

Before retirement, the governance retrieval/contact/scope slice added three forward migrations,
draft-only pilot source/ward-scope seeds, database plans 016–018, Edge fetch-helper tests and pure
contact-normalizer tests. Its final historical clean run passed 657 assertions across 18 pgTAP
plans. ADR-0031 removes that database surface; the inactive pilot seeds, synchronization pgTAP
plans, Edge helper/function and `@local-wellness/database/governance-sync` source/tests are no
longer part of the current V1 reset or release gate. Current plan
`050_v1_database_pruning.test.sql` verifies intentional absence and retained V1 behavior instead.

The positive Pune complaint fixtures are synthetic and transactionally rolled back. The generated
BMC pack is the only non-synthetic local activation: it exposes three asset-independent categories
over 22 one-to-one wards. Nine asset-dependent categories and split K/P wards remain unavailable,
and no placeholder becomes routable. This is limited internal-demo coverage, not verified Pune,
managed-environment, or external BMC delivery coverage.

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

Do not leave the combined workers or realtime process running merely because an API or client is
under test. Start combined workers only for notification/SLA/KPI behavior, the isolated ward-email
worker only when external complaint delivery is intended, and realtime only for Socket.IO delivery
behavior. With the committed environment template, realtime adaptively backs off from a 10-second
base interval to 15 seconds while idle or failing. Each notification, SLA, and KPI loop
independently backs off from 10 seconds to 60 seconds; the isolated ward-email loop uses a fixed
60-second cadence. These PostgreSQL-backed loops do not require Redis, BullMQ, or Sentry.

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
`20260716106000_phase_8_duplicate_group_publication.sql`, and the additive
`20260717100000_public_complaint_engagements.sql`. The duplicate forward migration keeps
review/withdrawal service-only, requires every member to have a current public projection, bounds a
group at 100 reports, and returns only public IDs/counts through detail. The focused plans 029–030
previously passed 91 assertions. With the engagement coverage, plans 029, 030, and 044 pass 120
assertions, and the full clean local run passes 1,542 assertions across 44 plans. No transparency
policy, projection, or duplicate group is seeded.
The engagement migration keeps one private forced-RLS row per complaint/account, publishes only an
aggregate support count, keeps star/follow state private to the authenticated actor, and adds
`recent|trending` reviewed-public ordering. Generated database types, schema lint, and the adaptive
43-migration master artifacts also pass their local drift/validation checks.

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
readiness probes, privileged MFA and citizen phone-verification helpers, the owner-private profile-image
bucket/metadata, 50 m complaint/media proximity constraints, and routing delivery-readiness
metadata. Two later additive migrations add BMC ward relationship versions and the service-only
government invitation selector projection through
`20260716119000_government_invitation_scope_options.sql`. The current repository cutoff is the
55th migration, `20260724120000_verified_civic_area_office_contacts.sql`; the deterministic SQL
Editor split is migrations 1–23 and 24–55. Apply these as
incremental migrations to an existing project; never apply `supabase/master.sql` as an upgrade.

The latest full clean reset before migration 55 covered migration 54, all 50 then-current pgTAP
files/1,640 assertions, application-schema database lint, generated database types and
deterministic master-SQL drift verification. Migration 55 was then applied directly to local
Supabase and its focused plan passed 15 assertions. These local results do not apply the
migrations, Phone-provider settings or Auth Hook binding to hosted Supabase.

The BMC generator now emits governance/checksum seeds `50`/`51` and routing/verification seeds
`52`/`53`. A clean local reset applies all four in order. The routing pair activates only garbage
dump, missed sweeping, and mosquito breeding, with 66 direct rules over 22 one-to-one wards. The
other nine categories remain unavailable, six explicitly because asset ownership evidence is
absent in the generic seed; the canonical BMC references require ownership for all nine, and the
split K/P wards remain fail-closed. The prior 42-migration full local database run
passed 1,513 assertions across 43 pgTAP plans. No managed project is changed by generation, reset,
or those local test results.

The compact current-session SQL was also applied locally from an exact migration-38 database. It
successfully installed migrations 39–43, then safely skipped all five on an immediate rerun.
Focused plans 038, 039, 040, 042, and 044 passed 90 assertions after that path. This validates the compact local
upgrade/rerun behavior but does not claim hosted execution; the full 43-migration clean-reset result
is recorded in the Phase 8 section above.

After adding migration 45 and the Batch 0 seed, a clean local reset and all 47 pgTAP files pass
1,612 assertions. Application-schema lint is clean, and generated database types plus all
45-migration master artifacts are current. These local checks do not apply schema or data to hosted
Supabase.

For an existing reconciled target, the generated `supabase/deploy/maharashtra-batch0/` package is
the SQL Editor path. Run its three complete files in lexical order. The first safely applies/skips
ZIP import metadata support; the second records the immutable archive ledger and applies only the
state plus 35 exact district LGD enrichments; the third records the generated seed checksum. The
target must already contain the canonical Phase 2 seed and schema through migration `20260718100000`.
The package intentionally leaves the ambiguous Mumbai alias and every operational dataset
quarantined and does not alter the Supabase migration ledger.

Before managed Phase 10 activation:

- keep privileged TOTP policy aligned with its separate rollout, but keep mobile/API citizen phone
  verification in `enforce`; do not deploy a production API with a weaker citizen mode;
- retain the ordinary Phone provider and approved Twilio configuration; complete India TRAI/DLT
  requirements, provider/project limits, CAPTCHA, recovery operations and real-device tests;
- apply `20260723100000_password_change_audit_event.sql` through the ordinary migration workflow
  before testing the new password lifecycle; running it in SQL Editor changes schema but does not
  repair the Supabase CLI migration ledger;
- apply `20260723130000_citizen_phone_verification_without_mfa.sql` followed by
  `20260724100000_require_email_identity_for_auth_signup.sql`, then activate the Before User
  Created Auth Hook before enabling the renamed API enforcement setting; when the ordinary
  migration workflow is unavailable, run the complete
  `supabase/deploy/citizen-phone-verification-without-mfa.sql` SQL Editor artifact and reconcile
  the migration ledger separately;
- keep Citizen Web at `NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only` until protected web parity and
  its managed authentication smoke are explicitly approved;
- verify `profile-images-private` remains private, owner Storage policies work, and signed reads do
  not leak into transparency responses;
- on representative Android and iOS builds, verify bounded current-area reuse across Community,
  Nearby, and Profile, explicit-refresh/TTL behavior, permission recovery, Auth cache clearing, and
  fresh complaint/media evidence acquisition. This mobile-only coordination requires no Supabase
  migration, project setting, database schedule, background-location permission, or persisted
  coordinate store;
- after one successful installed-app submission, verify Community shows the complaint in its
  signed-in **Your reports** preview even with location denied or transparency unavailable. Confirm
  a second account cannot read it and that it does not enter public map/heat/ranking/engagement
  results before reviewed publication. This preview reuses the existing complaint API/RLS and
  requires no migration or Supabase setting;
- verify `/health/live` and `/health/ready`, quota concurrency/`Retry-After`, secret scanning, and
  release smoke without logging secrets, OTPs, object paths, or exact locations;
- load only reviewed official pilot geometry, routes, authority memberships, assignments, and
  complaint-intake contacts. Queue routing does not imply automatic email/SMS/contact delivery.

Use `/health/live` for frequent uptime probes and configure `/health/ready` at a 30–60 second cadence.
The readiness path can reach hosted database dependencies and is not intended as a high-frequency
heartbeat.

### Hosted database performance diagnostics

If hosted database CPU or latency is elevated, open **Supabase Dashboard → SQL Editor** and run
`supabase/deploy/diagnostics/database_performance_audit.sql` privately while the issue is observable.
It is a read-only audit, but its normalized statement text and results are operationally sensitive;
do not share them in public issues, public chat, or logs. Review the output together with Dashboard
**Observability** and **Query Performance**, identify the actual high-call or high-cost statements,
and check active worker/realtime instances plus health-probe cadence before resizing compute. Do not
infer or report improved hosted metrics from the adaptive-polling implementation alone.

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
unreconciled: compare `supabase_migrations.schema_migrations` with all 55 current migration files
through `20260724120000_verified_civic_area_office_contacts.sql`, verify schema objects and RLS,
and establish the seed/Auth/profile/role state before enabling any
application, worker, Edge Function, schedule, routing, transparency, SLA, or KPI capability. A
later credential-safe read audit found `/health/ready` healthy and all five expected private
Storage buckets present, so the earlier missing-readiness-RPC failure is no longer current. That
same audit initially returned zero category projections and no tested BMC jurisdiction rows. That
data observation is superseded by a clean hosted smoke returning 12 catalog categories, three
operational categories, finalized private media, K/W jurisdiction, and deterministic routing.
Hosted complaint completion still needs migration `20260718100000`; healthy routing is not evidence
that this unapplied function repair is present.

When `REQUIRE_LOCAL_SUPABASE=true`, the Auth E2E harness accepts only loopback API hosts. This guard
fails before user creation if a generic environment file points at hosted Supabase. Hosted database
migrations and seeds remain an explicit operator action; local reset and test commands do not upload
Phase 3 or Phase 4 governance, routing, complaint data, migrations, or media.

Before managed identity activation, operators must:

- create separate development, staging and production projects;
- link only the intended non-production project from developer environments;
- enable required extensions through reviewed migrations;
- enable citizen email/password and decide whether email confirmation or confirmed phone is the signup-
  verification step;
- configure exact password-recovery/invite redirect allow-lists; custom government/admin code-only
  and token-hash invite templates remain optional;
- enable privileged TOTP, configure the ordinary Phone provider/Twilio Verify, enable phone
  confirmations and Phone Auth signup capability, activate
  `public.hook_require_email_identity` as the Before User Created Auth Hook, prove phone-only
  creation is denied, and retain mandatory citizen enforcement;
- configure SMS/email delivery, provider rate limits and abuse controls;
- select secret storage and restrict production credentials;
- configure environment-specific CI/deployment secrets;
- review the Phase 4 private Storage bucket topology, limits, and access policies;
- document and verify backup/restore strategy;
- run hosted email, SMS, invite, SSR-cookie and effective-scope smoke tests.

The staging credential-replacement prerequisite is satisfied for the current project. Continue to
keep privileged keys and the database URL server-side, and never reuse them for production.

Before managed routing activation, operators must also:

- verify Pune Municipal Corporation and selected ward geometry against approved official sources;
- review category ownership, departments, officer roles, current assignments, assets, confidence
  policy, rules, and fallback records;
- use the retained offline `@local-wellness/database/governance-import` tooling and canonical
  governance files for reviewed source updates; do not reactivate the retired synchronization
  tables, Edge Function, Cron boundary or package export;
- only for a legacy non-production BMC bootstrap that has not applied migrations 47 or 50, open
  **SQL Editor → New query** and run
  `supabase/deploy/current-session/01_migrations_39_through_43.sql` first when migration 38 is
  confirmed complete; if its baseline/partial/non-contiguous guard fails, stop and reconcile or use
  the two adaptive master parts as appropriate; this compact artifact installs schema only and does
  not load BMC seed data;
- after migrations 39–43 are verified, run
  `supabase/deploy/bmc-mobile-demo/01_baseline_categories_and_core.sql`,
  `02_official_boundaries.sql`, `03_ward_crosswalk_and_governance_verify.sql`, and
  `04_routing_activation_and_verify.sql` in that exact order; if Part 1 reports
  `BMC_MOBILE_DEMO_SCHEMA_NOT_CURRENT`, reconcile through all 43 migrations first; verify all 12
  visible categories, three operational categories, 66 rules, 22 one-to-one ward crosswalks,
  unavailable split K/P wards, and disabled external delivery; do not apply the broad Phase 2 seed
  afterward without immediately rerunning all four parts; this legacy bundle aborts if the V1 ward
  facade or prune marker exists;
- after that legacy bootstrap, apply exact migrations 44, 45 and 46 in order, run
  `supabase/deploy/v1-simple-ward-routing.sql` for migrations 47/48 plus the 312-row seed, then
  reconcile migrations 49 and 50; run the read-only submission runtime audit and require an
  authenticated complaint receipt before declaring hosted submission operational;
- apply the taxonomy artifact for migration 51/seed 55, reconcile Auth migrations 52–53, then apply
  `supabase/deploy/jagruksetu-bmc-intake-v1.sql` for migration 54/seed 56; verify 256 ordinary
  submission leaves, 84 protected handoffs and 338 private contacts;
- verify that public visibility still requires reviewed publication and that complaint delivery
  remains a separate provider-confirmed operation;
- run hosted service-role routing smoke tests and confirm that anon/authenticated roles cannot call
  the database RPCs directly;
- confirm that exact routing coordinates and private recipient values are excluded from logs and
  client responses.

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
  workflow and regenerate/check the committed database types; the current master SQL is only
  for a clean database and must not be applied over staging history;
- apply `20260724120000_verified_civic_area_office_contacts.sql` when the optional sanitized office
  list is required, using `supabase/deploy/civic-area-office-contacts.sql` only as the documented
  SQL Editor fallback;
- repeat plan `028_verified_governing_body_projection.test.sql` and application-schema database
  lint in managed development, then verify `anon`/`authenticated` cannot execute the RPC while the
  trusted API service role can;
- deploy the matching NestJS API and smoke authenticated resolved, unsupported, ambiguous,
  low-accuracy, future-capture, and invalid-field requests without logging bearer tokens or raw
  coordinates;
- activate only reviewed current official-source, verified, non-placeholder, routing-eligible
  entity and boundary versions. Until pilot geometry meets that rule, an unsupported result is the
  required staging behavior;
- verify the base response contains no UUID, geometry, officer, contact, routing or placeholder
  field. When optional offices are enabled, permit only their public address/phone/email fields and
  verify that identifiers, officer mobiles, WhatsApp, private recipients and routing evidence
  remain absent before connecting a physical Expo Go client over a LAN-reachable API URL.

This migration and managed/device smoke are not recorded as complete in the current repository
state.

Before managed Phase 8 activation, operators must also:

- apply all Phase 8 transparency migrations in repository order in managed development and staging,
  including the `20260716105000` RPC/ACL forward fix and
  `20260716106000_phase_8_duplicate_group_publication.sql` plus
  `20260717100000_public_complaint_engagements.sql`; regenerate/check database types and
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
- smoke one-support-per-account, private star/follow lookup, aggregate-only public output,
  withdrawn-projection denial, read/mutation quotas, and live `recent|trending` ordering; confirm
  support/star state never changes routing, assignment, status, escalation, SLA, or KPI records;
- keep public comments, supporter identities, public avatars, engagement notifications, automatic
  government-priority effects, and processed media disabled until their independent moderation, abuse,
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
