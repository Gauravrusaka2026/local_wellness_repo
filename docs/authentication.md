# Authentication

## Purpose

This document defines authentication and authorization for Local Wellness.

Supabase Auth is the V1 identity provider.

---

## User Types

### Citizen

Authentication options:

- phone OTP;
- email OTP;
- email magic link.

Google and Apple sign-in are not part of Phase 1.

### Government User

Government users are invitation-only.

Requirements:

- approved authority membership;
- assigned role;
- assigned scope;
- official email preferred;
- MFA-ready account design;
- audit logging;
- periodic access review.

### Platform Administrator

Before pilot launch, platform administrators must use:

- restricted, server-controlled onboarding and assignment;
- mandatory MFA enforcement;
- least-privilege access;
- audit logging;
- short-lived privileged sessions where possible.

Phase 1 provides the one-time bootstrap for the first platform administrator and access-gates the admin console. Later administrator assignment lifecycle and mandatory MFA enforcement remain tracked pre-launch work.

---

## Identity Model

Supabase Auth owns authentication identities.

Application tables extend identity data.

### `profiles`

- Supabase Auth user ID;
- display name;
- normalized Auth phone and email copies;
- preferred language (`en`, `hi`, or `mr`);
- account status;
- onboarding completion timestamp.

### `roles`

Examples:

- citizen;
- government_operator;
- ward_officer;
- department_officer;
- municipal_admin;
- platform_admin;
- moderator.

These codes are immutable system data. Clients may read role definitions but cannot create or assign them.

### `user_roles`

Role assignment must include:

- role;
- scope type;
- scope ID;
- effective dates;
- granted by;
- status.

A user may have multiple roles.

Each government role is evaluated against its active date range, assignment status, scope and corresponding active authority membership. A role stored in Supabase user metadata is never treated as authorization.

Phase 2 makes `governance.authorities` the canonical target for authority memberships, non-global role assignments, and authority-attributed audit events. State, district, local-body, and utility records own typed authority rows. A forward migration preserves any pre-existing arbitrary Phase 1 identifier as a clearly marked, non-routable legacy placeholder rather than dropping access history or treating it as verified; service-only effective-access functions exclude those placeholders until they are explicitly reconciled. New authority, ward, and department scopes are validated against governance lifecycle and ownership before a role row is accepted.

---

## Authorization Model

Authorization is scope-based.

Examples:

- citizen may read their own private complaints;
- citizen may read public complaints;
- ward officer may read complaints assigned to their ward;
- department officer may read complaints assigned to their department;
- municipal admin may read complaints for their municipality;
- platform admin may access configured platform scope;
- moderator may access content moderation scope.

---

## Authentication Flow

### Citizen Phone OTP

```text
User enters phone number
        |
        v
Supabase sends OTP
        |
        v
User verifies OTP
        |
        v
Supabase session created
        |
        v
Profile created or loaded
        |
        v
Device registered
```

### Government Invitation

```text
Admin creates invitation
        |
        v
API creates the Auth invitation
        |
        v
Membership and role persist atomically
        |
        v
User receives invitation
        |
        v
User verifies the one-time invite token hash
        |
        v
Current role and membership scope evaluated
```

The trusted API creates invitations through Supabase Auth, then persists the invited authority membership and scoped role assignment. The caller must already hold active `platform_admin` access or active `municipal_admin` access for the same authority. Client applications cannot submit `granted_by`, membership status, or privileged role state.

Supabase administrator invitations do not originate a PKCE verifier. The invite email therefore links to the government callback with a one-time `token_hash` and `type=invite`; the server verifies that hash and writes the SSR session cookies. Subsequent government and administrator magic-link requests use the normal PKCE callback.

---

## Session Handling

### Mobile

Use secure device storage.

Recommended:

- Expo SecureStore;
- refresh token persistence;
- automatic session refresh;
- forced logout on account disable;
- device registration.

The Phase 1 mobile adapter stores the Supabase session only in Expo SecureStore. Auth callbacks accept PKCE authorization codes or supported token hashes, never raw access/refresh token pairs. The app stores a locally generated installation identifier separately and sends only its SHA-256 digest to the API for device registration.

### Web

Use the official Supabase SSR PKCE integration and cookies shared by browser and server clients. Authenticated pages are dynamic and validate the current user or claims rather than trusting an unverified cookie payload.

The citizen email request uses the exact, queryless, same-origin `/auth/callback` URL. This avoids
depending on a query-string variant that may not match a managed Supabase redirect allow-list. The
callback still validates PKCE or supported token-hash evidence and writes the SSR session cookie;
it must never accept raw access/refresh tokens from a URL. Each managed environment must allow-list
its exact callback origin and verify a newly delivered link in a real browser before launch.

After callback completion, the citizen account page still depends on the application profile API.
Citizen web, NestJS API, and Supabase Auth must target the same environment; the API configured by
`NEXT_PUBLIC_API_URL` must be reachable and that database must include the Phase 1 Auth-to-profile
trigger. A valid Auth session with no matching `public.profiles` row is a provisioning error, not an
empty profile. The page renders explicit signed-in, onboarding, profile-unavailable, and
API-unavailable states and offers retry/sign-out; it never trusts Auth metadata as a replacement for
the server-authorized profile.

Avoid storing privileged tokens in local storage.

### Governance synchronization machine boundary

The `governance-sync-fetch` Edge Function is not user authentication. Supabase Cron calls it with a
dedicated high-entropy `x-governance-sync-secret`, which is compared in constant time before any
source claim. `verify_jwt = false` is scoped to this function because Cron does not present a user
session; the dispatch secret and service credential remain environment-only server secrets.
Anonymous/authenticated database roles cannot execute the claim/finalization RPCs or read the
private governance tables. Lease tokens are single-run database capabilities and are neither logged
nor returned to the caller.

Synchronization scope targets are also service-only and forced-RLS. An authenticated user cannot
read or activate them directly; activation/manual verification is accepted only when the attributed
reviewer has a current global `platform_admin` role. That approval selects future synchronization
work only and does not grant routing eligibility or change the referenced authority/ward's access
state.

---

## Supabase Keys

### Client-safe

- Supabase project URL;
- publishable key or legacy anon key.

### Server-only

- secret key or legacy service-role key;
- database password;
- JWT signing configuration;
- external API secrets.

The secret/service-role key must never be included in:

- mobile bundle;
- browser bundle;
- public environment variables;
- source control;
- client logs.

---

## Row Level Security

RLS is mandatory on exposed tables.

Examples:

### Profiles

- user reads own profile;
- direct authenticated SQL updates are limited to display name and preferred language;
- onboarding completion is updated through the authenticated profile API;
- account status is server-controlled;
- citizen cannot update roles.

### Devices

- user reads only safe metadata for their own devices;
- registration and soft revocation go through the authenticated API and are audited atomically;
- the raw random installation identifier stays in device SecureStore and is never transmitted to or stored by the server;
- identifier hashes and push tokens are server-only columns;
- risk state is server-controlled;
- revocation is audited.

Registry revocation prevents the same installation identifier from silently re-registering, but Phase 1 does not bind Supabase sessions to a device row or invalidate an already-issued Supabase session. Provider-side session revocation and device-bound enforcement remain pre-launch hardening work.

### Roles and Authority Memberships

- authenticated users may read only their own effective assignments;
- an active authority administrator may read the membership scope they manage;
- assignment and membership writes are server-only;
- expired and revoked records never grant access;
- anonymous access and direct role escalation are denied.

### Authentication Audit Events

- events are append-only;
- actor, subject and device UUIDs are immutable audit snapshots so later identity cleanup does not rewrite attribution;
- users may read their own subject/actor events;
- scoped administrators may read authority events they are authorized to manage;
- OTPs, bearer tokens, cookies, refresh tokens and raw device identifiers are prohibited from event metadata.
- client session events are best-effort reports marked `source: client_reported`; Supabase Auth logs remain authoritative.

### Complaints

- Phase 4 complaint drafts, exact locations, originals, duplicate evidence, submissions, and
  history are private and available only through bearer-authenticated NestJS endpoints;
- the unexposed `complaints` schema has forced RLS and grants no direct table access even to an
  authenticated owner;
- service-only RPCs receive the actor ID from the verified session and recheck active profile,
  ownership, lifecycle, and evidence scope;
- the client cannot assign an authority, ward, department, officer role/assignment, rule, official
  status, visibility, complaint number, bucket, or object path;
- citizen list/detail/timeline routes return only complaints owned by the session user;
- every Phase 4 complaint remains private; public and scoped government complaint reads require
  later policies and endpoints rather than a permissive Phase 4 exception.

Media upload-intent and finalization endpoints require the same bearer session. The transient
signed-upload token targets only the server-reserved private object path. Finalization downloads or
inspects the object server-side and verifies its MIME type, size, and SHA-256; tokens, original
media, exact coordinates, and internal spoof/duplicate/routing evidence are not exposed in public
contracts or logs.

### Messages

- room member may read room messages;
- sender may create message after membership check;
- internal officer notes are separate from citizen-visible messages.

### Officer Assignments

- citizen cannot write;
- Phase 2 exposes no client write path;
- authenticated users can read person/assignment data only when current authority scope permits it;
- service-side imports and future reviewed administration flows must validate office, department, district, taluka, local-body, and ward ownership;
- officer roles remain durable while incumbent assignments append versions with non-overlapping effective periods.

### Routing Resolution

- Phase 3 category, jurisdiction, and routing endpoints require a valid Supabase bearer session;
- routing resolution and Phase 4 complaint submission additionally require a validated
  `Idempotency-Key`; the raw key is not persisted;
- the client supplies only category, location evidence, and an optional asset identifier and cannot
  choose an authority, department, officer role, officer assignment, confidence policy, or fallback;
- the API resolves those targets through service-only database functions and records the acting Auth
  user plus request identifier in the append-only routing decision audit;
- ordinary authenticated and anonymous database roles have no direct access to private routing or
  governance-synchronization tables, functions, raw snapshots, or exact-location decision evidence.
- a complaint retry reuses its server-owned stable routing request ID and exact stored decision;
  conflicting key or evidence reuse fails closed.

---

## MFA

Government and platform users should use MFA. The Phase 1 data and authorization model is MFA-ready, but mandatory assurance-level enforcement is a pre-launch hardening task rather than a completed Phase 1 control.

V1 preparation:

- design UI for MFA enrollment;
- require MFA for privileged routes when available;
- store assurance level;
- reject sensitive operations with insufficient assurance.

---

## Account States

```text
pending
active
suspended
disabled
deleted
```

Government membership states:

```text
invited
pending_approval
active
expired
revoked
```

---

## Device Security

Store:

- device ID hash;
- platform;
- app version;
- push token;
- last seen;
- risk status.

Potential risk indicators:

- many accounts from one device;
- impossible location movement;
- repeated OTP abuse;
- repeated spam complaints;
- suspicious media uploads.

---

## Password and OTP Security

- use Supabase-managed password hashing;
- rate limit OTP requests;
- rate limit verification attempts;
- do not log OTPs;
- do not expose whether a government email exists;
- monitor repeated login failures.

---

## Account Recovery

Citizen recovery:

- phone OTP;
- email magic link.

Government recovery:

- verified official channel;
- administrator approval;
- forced session revocation;
- audit entry.

---

## Authentication Testing

Required tests:

- citizen profile access;
- citizen role escalation blocked;
- officer cross-ward access blocked;
- municipal cross-authority access blocked;
- disabled account rejected;
- expired role rejected;
- service role not exposed;
- MFA-required operation rejected without MFA (pre-launch coverage tracked by `AUTH-002`);
- anonymous user blocked from private complaint.

Phase 1 implements local migration and pgTAP coverage for the identity tables, including self-access, cross-user and cross-authority denial, expired and revoked assignments, sensitive device-column isolation, anonymous denial, audit immutability and direct escalation attempts. The local email magic-link flow is automated. Phone OTP is provider-gated because the local Supabase Auth service disables phone sign-in without a real SMS provider. Hosted delivery, redirect URLs, device/session revocation, and real-device SecureStore behavior still require environment-specific validation before launch.

Phase 2 extends those tests with canonical-authority foreign keys, safe legacy placeholder backfill, ward/department ownership checks, and governance RLS isolation. The invitation E2E uses the deterministic seeded Maharashtra authority, so arbitrary client-supplied UUIDs can no longer create government access scope.

Phase 4 adds database and API coverage for anonymous/ordinary-authenticated complaint-schema
denial, cross-user ownership denial, inactive actors, append-only records, strict mass-assignment
rejection, private signed media reservation/finalization, exact idempotency replay/conflicts,
duplicate acknowledgement, and actor-owned complaint history. The mobile flow and callback helper
also have focused tests. Hosted email delivery/SSR-cookie behavior, real SMS, physical-device
SecureStore/location/camera/microphone behavior, and verified Pune positive submission remain
environment-gated and are not claimed as production-validated.
