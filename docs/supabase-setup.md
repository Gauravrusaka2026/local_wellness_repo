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

- phone authentication;
- email OTP or magic link.

Google and Apple providers are deferred until an approved product phase requests them.

Configure:

- site URL;
- development redirect URLs;
- staging redirect URLs;
- production redirect URLs;
- mobile deep links;
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

### Government Invite Template

Administrator invitations do not create a PKCE verifier, so their default fragment-based link cannot be completed by the server-side dashboard callback. Local Auth uses the committed `supabase/templates/invite.html`. In every managed Supabase project, set the **Invite user** email template to the equivalent token-hash link:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=invite"> Accept invitation </a>
```

Add the exact government dashboard callback to that project's redirect allow-list. Smoke-test the actual hosted invitation email, one-time `invite` verification, SSR cookie creation and effective access scope before enabling government users. Do not substitute `{{ .ConfirmationURL }}` unless the callback is changed to handle the provider's fragment response safely.

---

## 6. Configure Phone OTP

Select an SMS provider supported by your deployment plan.

Before production:

- verify Indian delivery;
- verify sender rules;
- configure rate limits;
- configure abuse controls;
- test OTP resend;
- test expired OTP;
- test invalid OTP;
- monitor cost.

Do not rely on Supabase test OTP settings in production.

The committed local configuration reserves one development-only phone/OTP mapping for repeatable tests. Supabase CLI Auth still disables phone sign-in unless an SMS provider is configured, so the phone E2E case is skipped by default and runs only when a real local provider is available and `LOCAL_SUPABASE_SMS_ENABLED=true`. Never copy the reserved mapping into a hosted environment.

---

## 7. Configure Storage Buckets

Create:

```text
complaint-originals-private
complaint-public-media
complaint-thumbnails
resolution-evidence-private
voice-recordings-private
profile-images
government-documents-private
```

Policies:

- originals private;
- voice private;
- resolution evidence private until processed;
- public media contains only approved processed copies;
- signed URLs for private access;
- object path must include authorized owner or complaint context.

---

## 8. Configure Database Schemas

Phase 1 migrations create the unexposed `private` helper schema and keep exposed identity tables in `public` for Supabase data-API RLS. Phase 2 creates `governance`, but intentionally leaves it out of the `[api].schemas` allow-list. Its tables use forced RLS and explicit grants as defense in depth; server-side imports and the jurisdiction resolver use trusted database/service-role access. Complaints, communications, operations, analytics, integrations and audit schemas belong to later phases and must be created by their committed migrations when implemented.

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

---

## 13. Database Types

Generate the current local `public` and `governance` schema types with the repository script:

```bash
pnpm database:types
pnpm database:types:check
```

For remote development project:

```bash
pnpm exec supabase gen types typescript \
  --project-id <project-ref> \
  --schema public,governance \
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

---

## 15. Configure Secrets

Set function secrets:

```bash
supabase secrets set KEY=value
```

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

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

GOVERNMENT_INVITE_REDIRECT_URL=
API_ALLOWED_ORIGINS=

EXPO_PUBLIC_API_URL=
```

Do not place real secrets inside `.env.example`.

---

## 20. Local Verification and Hosted Activation

Phase 1 local verification is complete:

- repository-pinned CLI and committed local configuration validated;
- identity migrations reset successfully;
- migration, RLS and generated-type checks pass locally and are enforced by CI;
- local email magic-link and delivered government-invite flows pass;
- phone request/verification has unit coverage and remains provider-gated for E2E.

Phase 2 local verification is complete for the available baseline:

- `pnpm governance:data:check` against the hash-pinned workbook/CSV manifest and committed generated artifacts;
- a clean `pnpm database:reset`, which applies all governance migrations and the generated baseline seed in order;
- `pnpm database:lint` against application-owned schemas and all pgTAP migration, seed, RLS, hierarchy, temporal, and synthetic PostGIS plans;
- `pnpm database:types:check` for both `public` and `governance`;
- confirmation that placeholder wards/contacts, officer templates, and unresolved routing references are not exposed as verified or routing-eligible;
- confirmation that zero officer assignments and zero real boundary versions are created from the supplied baseline.

These checks pass locally: seven Phase 2 migrations, two generated governance seed files, 22 forced-RLS governance tables and all 194 Phase 2 pgTAP assertions. The canonical source, generated seeds and validation report are reviewed artifacts. Follow `docs/governance-data.md` for refreshes; never modify the CSVs or generated SQL in place.

Before managed identity activation, operators must:

- complete credential rotation tracked by `SEC-001`;
- create separate development, staging and production projects;
- link only the intended non-production project from developer environments;
- enable required extensions through reviewed migrations;
- configure Auth providers, exact redirects and the token-hash invite template;
- configure SMS/email delivery, provider rate limits and abuse controls;
- select secret storage and restrict production credentials;
- configure environment-specific CI/deployment secrets;
- plan required Storage buckets for the phase that introduces media;
- document and verify backup/restore strategy;
- run hosted email, SMS, invite, SSR-cookie and effective-scope smoke tests.

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
