# Authentication

## Purpose

This document defines authentication and authorization for Local Wellness.

Supabase Auth is the V1 identity provider.

---

## User Types

### Citizen

Authentication options:

- email/password account creation and sign-in;
- provider-managed password recovery;
- phone OTP as a staged Supabase Phone MFA verification factor.

Citizen entry no longer depends on a code-only email template. Government and administrator email
entry may still accept a six-digit `Token`, a secure link, or both. Government invitations remain
one-time and must pass the application membership and role checks after authentication. Citizen
phone verification requires a verified Phone MFA factor and an `aal2` session when enforced; a
profile phone value is not sufficient.

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

Phase 1 provides the one-time bootstrap for the first platform administrator and access-gates the
admin console. Phase 10 adds TOTP enrollment/challenge UX and API assurance enforcement behind an
observe/enforce rollout gate. Existing-user assignment lifecycle remains tracked pre-launch work.

### Portal account context

Every web authentication surface makes the active identity understandable without exposing whether
another account exists. Citizen Web shows the current email/phone label and an explicit
switch-account action. The Government Dashboard and Admin Console display the exact verified email
after a session exists, including MFA, authorized, denied, and dependency-error states.

Privileged screens describe three independent gates:

1. Supabase Auth verifies the invited email identity.
2. That same identity completes its own TOTP enrollment or returning challenge and reaches AAL2.
3. The API/database verifies the current authority membership and scoped role.

First-time TOTP enrollment is the only state that displays a QR code. Returning users are told to
enter the code from their existing authenticator entry and not scan another QR. Wrong-account and
lost-authenticator paths sign out or enter reviewed administrator-mediated recovery; there is no
client-side bypass.

---

## Identity Model

Supabase Auth owns authentication identities.

Application tables extend identity data.

### `profiles`

- Supabase Auth user ID;
- display name;
- owner-private profile-image object path and server-owned version timestamp;
- normalized Auth phone and email copies;
- preferred language (`en`, `hi`, or `mr`);
- account status;
- onboarding completion timestamp.

An idempotent private migration repairs legacy Auth identities that predate successful application
profile provisioning. It creates only a missing profile and missing non-privileged global citizen
role, normalizes bounded email/phone/name/language metadata, and never overwrites an existing
profile or reactivates an existing revoked citizen role.

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

### Citizen Email Password and Phone Verification

```text
User creates an account with email and password
        |
        v
Supabase session and application profile are created
        |
        v
User enrolls an E.164 phone as a Supabase Phone MFA factor
        |
        v
Configured SMS provider delivers and verifies the challenge
        |
        v
Session reaches aal2
        |
        v
API independently verifies factor and assurance policy
```

Phone enrollment is optional while all citizen MFA modes are `observe`. Switch the web, mobile,
and API modes to `enforce` together only after the SMS provider, recovery, abuse controls, and
hosted device tests pass. Supabase Storage or an Edge Function cannot act as an SMS carrier, and a
custom OTP table must not replace Supabase Auth factors.

### Mobile Email Password Modes

The Expo client presents three explicit email/password modes:

- **Sign in** authenticates an existing account;
- **Create account** validates password confirmation and is the only mode that provisions an Auth
  identity;
- **Forgot password** requests a provider recovery link with a generic response, and the reviewed
  callback exchanges the recovery code before allowing a new password.

Passwords are sent only to Supabase Auth over TLS and are never logged, stored in application
tables, or placed in resume state. Recovery responses remain generic, and a citizen cannot select
a privileged application role during registration.

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

The trusted API creates invitations through Supabase Auth, then persists the invited authority
membership and scoped role assignment. The caller must already hold active `platform_admin` access
or active `municipal_admin` access for the same authority. Client applications cannot submit
`granted_by`, membership status, or privileged role state. The Admin Console loads names through a
service-role-only catalog that admits only active, verified, non-placeholder, routing-eligible
authority, ward, and authority-department records. Municipal administrators receive only their own
authority choices. Operators do not manually enter or see raw UUID fields; the authorized selector
values carry the opaque IDs required by the API.

Supabase administrator invitations do not originate a PKCE verifier. The government callback—the
only configured destination for this invitation workflow—therefore supports the reviewed one-time
`token_hash` invite link and a complete default Supabase fragment only when its provider type is
exactly `invite`. Citizen and administrator callbacks reject fragment sessions. Callback completion
establishes only the Supabase session: it does not create an authority membership, assign a role,
or bypass the database access gate. The invitation workflow must persist the reviewed membership
and role before the recipient can enter the restricted application. Subsequent government and
administrator sign-in requests keep `shouldCreateUser` disabled and accept either a delivered
`email` OTP or PKCE secure link.

The invitation endpoint intentionally returns a non-enumerating conflict when the email already
exists in Supabase Auth. Until the audited assign/revoke/renew lifecycle under `AUTH-001` is
implemented, use a new official-controlled email for onboarding. Do not grant access through Auth
metadata, manual client state, or another user's authenticator factor.

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

The mobile adapter stores the Supabase session only in Expo SecureStore. Recovery callbacks
accept one PKCE authorization code or a reviewed `email`, `magiclink`, or `signup` token hash. They
reject recovery/invite types, duplicate or ambiguous parameters, provider errors, and raw
access/refresh token pairs. A PKCE link must be opened in the same installed app that requested it
because the verifier is device-local. The app
stores a locally generated installation identifier separately and sends only its SHA-256 digest to
the API for device registration.

The stable mobile callback is `localwellness://auth/callback`. Use an installed development or
release build for callback testing. Expo Go generates environment-specific `exp://` URLs and is not
a reproducible authentication callback target. The native application identifier and associated
Android/iOS link configuration must be finalized before distributable builds are released.

At startup, mobile configuration checks detectable Supabase URL/public-key project alignment
without including either configured value in an error. Native runtimes also reject loopback API or
realtime URLs because `localhost` on a phone is the phone itself. Local Expo Go runs must inherit
one root environment and receive a LAN-reachable API URL; app-local environment copies are not an
approved credential source.

### Web

Use the official Supabase SSR PKCE integration and cookies shared by browser and server clients. Authenticated pages are dynamic and validate the current user or claims rather than trusting an unverified cookie payload.

Citizen web account creation/sign-in uses Supabase email/password and password recovery uses the
SSR PKCE callback. Government and administrator email entry may be completed by entering a
six-digit code or opening a secure link. Their code entry uses Supabase `verifyOtp` with the `email`
type; ordinary browser links use the SSR client's PKCE flow. Each browser callback accepts exactly
one reviewed method and rejects incomplete, duplicate, ambiguous, unsupported, or provider-error
callbacks. Citizen and administrator callbacks reject raw fragment sessions. The government
callback additionally accepts a
complete access/refresh fragment only for the default `invite` flow, removes it from browser history
before establishing the session, and then reloads through the existing role/membership guard.
Government and administrator requests set `shouldCreateUser` to false, so those surfaces cannot
register a privileged identity; citizen creation is enabled only in the explicit create-account
flow.

Template choice is an operator setting, not an application security boundary. A managed email
template may expose `{{ .Token }}`, `{{ .ConfirmationURL }}`, or both. Every environment must test
its actual delivered email, expiry/rate limits, session cookie, and authenticated landing page in a
real browser. Email security scanners can consume a one-time link before its recipient; the user
must request the newest email when a link is expired, reused, or prefetched.

### Managed redirect configuration

Use exact callback URLs in the Supabase Auth redirect allow-list; do not rely on a wildcard:

- citizen web development: `http://localhost:3000/auth/callback`;
- government dashboard development: `http://localhost:3003/auth/callback`;
- admin console development: `http://localhost:3004/auth/callback`;
- installed mobile builds: `localwellness://auth/callback`;
- staging and production: the corresponding exact HTTPS callback for each deployed web origin.

Set the managed project's Site URL to the primary HTTPS citizen origin, then add each separate
citizen, government, administrator, and mobile callback to the redirect allow-list. Keep local URLs
only in non-production projects. Authentication callback success never implies authorization: the
API, RLS, active account state, invitation membership, role, and scope checks remain authoritative.

After callback completion, the citizen account page still depends on the application profile API.
Citizen web, NestJS API, and Supabase Auth must target the same environment; the API configured by
`NEXT_PUBLIC_API_URL` must be reachable and that database must include the Phase 1 Auth-to-profile
trigger. A valid Auth session with no matching `public.profiles` row is a provisioning error, not an
empty profile. The page renders explicit signed-in, onboarding, profile-unavailable, and
API-unavailable states and offers retry/sign-out; it never trusts Auth metadata as a replacement for
the server-authorized profile.

For local development, the API, mobile, and three portal package scripts load the untracked
repository-root `.env`. Shell/deployment values take precedence. Do not add an app-local
`.env.local`: Next.js gives it higher priority and it can split Auth from the API even when both
commands appear to start normally. The local runner fails fast if a supported app-local environment
file exists, and build cache inputs include root/public-client configuration. After correcting an
environment mismatch, rebuild/restart the portal and create a fresh session rather than reusing
cookies issued by the previous project.

Avoid storing privileged tokens in local storage.

### Realtime

The Socket.IO client supplies the current Supabase access token only in handshake auth. The
realtime server validates its structure/expiry, calls Supabase Auth `getUser` for authoritative
verification, and then checks `public.profiles.status = 'active'` through a narrow service-only
function. A decoded token payload is never sufficient authentication. The socket joins only its
server-derived `user:<uuid>` room and disconnects at JWT expiry; refresh requires a new connection
with a refreshed token.

Room joins accept a typed complaint, authority, ward, or department UUID, never an arbitrary room
name. The database derives access from current complaint ownership or active role/membership/scope
records. Every persistent queued emission rechecks active account and complaint access, so a role or
membership revoked after connection does not authorize the pending event. Typing signals are
ephemeral but still require a fresh complaint-room authorization. Tokens, socket auth payloads,
service credentials, and lease tokens are not logged.

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
- profile-image metadata is updated through the API and constrained to the same Auth user ID;
- private Storage policies allow only the owner exact `<user-id>/avatar.<type>` path, and display
  uses a short-lived signed URL;
- profile images, object paths, and signed URLs are absent from public complaint projections;
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

### Government complaint workflow

- every queue/detail/action endpoint requires a verified bearer session and active application
  profile;
- the database derives access from the actor's current role assignment and active authority
  membership, never from JWT metadata or a client-provided role name;
- platform administrators may use global scope; municipal roles stay within their authority; ward
  and department roles stay within their exact current scope; moderators are read-only;
- a caller may select one of their own current role-assignment IDs to disambiguate scope but cannot
  invent or broaden it;
- every action rechecks the current verified, non-placeholder, routable governance assignment,
  role capability, workflow transition, expected workflow version, and idempotency fingerprint;
- internal notes, inspections, work/dependency details, exact location, originals, and resolution
  evidence remain private government data;
- resolution evidence uses a server-reserved private path, verified upload finalization, and short-
  lived signed read access after a fresh scope check;
- assignment and transfer append versions, while action audit, resolution history, evidence links,
  and status history are retained rather than deleted.

### Citizen resolution accountability

- resolution context, feedback, evidence access, and reopening require the complaint owner's
  verified bearer session and active profile;
- the API derives the citizen actor and the database rechecks exact complaint ownership, latest
  resolution, workflow version, and the single approved policy version effective at that
  resolution's server completion time;
- clients cannot select the policy version, reopen window, attempt count, escalation threshold,
  official status, object path, or evidence relationship;
- a short-lived signed read is issued only for finalized before, after, or reopen evidence already
  related to that owned complaint; bucket-wide access and durable URLs are never granted;
- feedback and reopen operations use separate hashed idempotency/action ledgers and append
  data-minimized audit history;
- PostgreSQL derives `resolved`, `reopened`, or `escalated` and commits status history/outbox
  evidence atomically; adverse feedback alone cannot silently reopen a complaint;
- missing, ambiguous, expired, or unapproved policy data fails closed. The mobile client has no
  fallback rating scale, deadline, reason list, or threshold.

### Messages

- messages are available only to the complaint owner or a government actor with current access to
  the active complaint assignment;
- `room_members` is participation/audit evidence and never grants access independently;
- REST derives the sender from the verified bearer token and Socket.IO derives it from the verified
  handshake; clients cannot choose another sender or recipient;
- creation is idempotent by sender/client-message UUID plus request fingerprint, and a persistent
  message commits before broadcast;
- read receipts may advance only monotonically within the same private complaint room;
- internal officer notes remain separate from citizen-visible private messages;
- public comments have no read/create function or grant until public complaint visibility and
  moderation policy are approved.

### Notifications

- durable notification history is readable only by its recipient while they retain complaint
  access;
- notification/outbox metadata is data-minimized and cannot contain private message text,
  description, exact coordinates, contacts, object locators, or tokens;
- the worker and realtime server use narrow service-role RPCs plus bounded PostgreSQL lease tokens,
  not direct table access;
- recipient access is rechecked before a realtime delivery is claimed/emitted;
- push/email delivery remains unsupported until provider, consent/preference, destination, and
  privacy controls are implemented.

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

Government and platform users enroll a Supabase TOTP factor. Restricted clients redirect an
`aal1` privileged session through challenge/verification and the API independently requires `aal2`
when `API_PRIVILEGED_MFA_MODE=enforce`. The MFA screen displays the exact signed-in email, labels
new enrollment and returning challenge separately, and offers a sign-out/switch-account path.
Observe mode avoids locking existing operators out while managed recovery and browser smoke testing
remain incomplete.

Citizens use Supabase Phone MFA separately. `API_CITIZEN_PHONE_MFA_MODE=enforce` requires both a
current verified phone factor and `aal2` for citizen-only accounts. It remains `observe` until
Advanced Phone MFA and real SMS delivery are configured. TOTP does not satisfy the citizen phone-
verification policy, and phone metadata does not satisfy either assurance policy.

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

- provider-managed email password recovery;
- reviewed phone-factor replacement after SMS activation.

Password-recovery requests return a generic acknowledgement whether or not an account exists.
Recovery links and codes are one-time provider credentials and must never enter logs.

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
- MFA-required operation rejected without the required verified factor and assurance level;
- anonymous user blocked from private complaint.

Identity coverage includes self/cross-user/cross-authority RLS, expiry/revocation, sensitive-column
isolation, audit immutability, profile-image ownership, privileged TOTP/AAL policy, citizen verified-
phone/AAL policy, email/password client behavior, and recovery input handling. Phone MFA remains
provider-gated because local Supabase Auth disables it without an SMS provider. Hosted recovery,
redirect allow-lists, managed factor enrollment, device/session revocation, and real-device
SecureStore behavior still require environment-specific validation before launch.

Phase 2 extends those tests with canonical-authority foreign keys, safe legacy placeholder backfill, ward/department ownership checks, and governance RLS isolation. The invitation E2E uses the deterministic seeded Maharashtra authority, so arbitrary client-supplied UUIDs can no longer create government access scope.

Phase 4 adds database and API coverage for anonymous/ordinary-authenticated complaint-schema
denial, cross-user ownership denial, inactive actors, append-only records, strict mass-assignment
rejection, private signed media reservation/finalization, exact idempotency replay/conflicts,
duplicate acknowledgement, and actor-owned complaint history. The mobile flow and callback helper
also have focused tests. Hosted email delivery/SSR-cookie behavior, real SMS, physical-device
SecureStore/location/camera/microphone behavior, and verified Pune positive submission remain
environment-gated and are not claimed as production-validated.

Phase 5 adds migration/RLS, API, store-adapter, validation, and dashboard coverage for current
government scope/capability enforcement, cross-scope denial, read-only moderation, workflow-version
conflicts, exact-replay action idempotency, versioned assignments, guarded status transitions,
private notes/evidence, dependency closure, resolution requirements, audit history, and outbox
persistence. Local synthetic fixtures do not make any placeholder pilot entity verified or prove a
hosted government login/queue.

Phase 6 adds intended database, API, worker, and Socket.IO coverage for inactive accounts,
unauthenticated connections, unauthorized/cross-scope room joins, token expiry, exact private-message
replay/conflict, persistence before broadcast, monotonic reads, recipient-only notification history,
lease ownership/expiry, access revocation before queued delivery, and public-comment denial. The
clean local database and repository verification passed. Hosted/physical-device token-expiry,
reconnect, revoked-scope, and offline-history validation remains environment-dependent and is not
implied by the local result.

Phase 7 adds migration/RLS, API, store-adapter, validation, mobile, and dashboard coverage for
complaint-owner isolation, current-policy failure, stale workflow versions, exact replay/conflict,
private evidence authorization/integrity, rating bounds, immutable feedback, policy windows and
attempt limits, and database-derived reopen/escalation. Synthetic approved policies are rolled back
inside tests and do not activate a managed environment.

The mobile completion suite additionally verifies that sign-in/recovery disable user creation,
create-account permits it, errors remain generic, detectable Supabase project mismatch fails without
echoing values, and a native runtime rejects loopback service URLs. Delivered hosted OTPs and the
physical-device session/profile transition remain environment-gated.

## Anonymous Transparency Reads

Phase 8 permits anonymous access only to the four bounded transparency HTTP reads documented in
`docs/api.md`. Anonymous access does not grant Supabase schema/table access and does not weaken the
existing bearer-authenticated citizen, government, or administrator routes. NestJS calls narrow
service-role functions whose return types originate only from current reviewed public projections.

Publication and withdrawal are privileged operations. PostgreSQL independently verifies the active
global platform-administrator role supplied by the network-verified API actor; a client token,
claimed role, or anonymous request cannot publish. Reviewer Auth UUIDs remain audit data and never
appear in public responses. RLS/direct-ACL tests must continue to prove that anonymous users cannot
read private complaints, exact geometry, identities, media, comments, or projection tables.
