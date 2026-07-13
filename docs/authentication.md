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

Avoid storing privileged tokens in local storage.

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

- citizen reads own private complaints;
- public reads public complaints;
- officer reads scoped complaints;
- client cannot assign official department;
- client cannot set resolution status.

### Messages

- room member may read room messages;
- sender may create message after membership check;
- internal officer notes are separate from citizen-visible messages.

### Officer Assignments

- citizen cannot write;
- municipal admin may write within authority;
- platform admin may manage onboarding.

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
