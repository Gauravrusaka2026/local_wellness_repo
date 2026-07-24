# Authentication

## Purpose

This document defines authentication and authorization for Local Wellness.

Supabase Auth is the V1 identity provider.

---

## User Types

### Citizen

Authentication options:

- email/password account creation and sign-in;
- provider-managed email recovery followed by a fresh OTP to the account's confirmed phone;
- mandatory confirmed phone through ordinary Supabase Phone Auth for private citizen use;
- signed-in password change only after a fresh phone challenge.

Citizen entry no longer depends on a code-only email template. Government and administrator email
entry may still accept a six-digit `Token`, a secure link, or both. Government invitations remain
one-time and must pass the application membership and role checks after authentication. Citizen
phone verification requires current `auth.users.phone` and `phone_confirmed_at`; citizen `aal2` and
profile metadata are not sufficient or required. Citizen Web public-only mode remains available,
and latent full mode follows the same confirmed-phone gate.

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

Production onboarding remains invitation-first. A bounded staging-only exception may pre-provision
synthetic identities and expiring roles through the trusted operator script in ADR-0025. Those
identities can use password sign-in because the reserved test addresses cannot receive email. The
exception does not permit a browser to create an identity or grant itself access.

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

Every active web authentication surface makes the identity understandable without exposing whether
another account exists. Citizen Web protected surfaces are disabled in public-only mode; its latent
full mode retains the current email/phone label and switch-account action for future parity. The
Government Dashboard and Admin Console display the exact verified email after a session exists,
including MFA, authorized, denied, and dependency-error states.

Privileged screens describe three independent gates:

1. Supabase Auth verifies the existing authorized identity through its invitation email or
   pre-provisioned staging password.
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
User requests an E.164 phone change through ordinary Supabase Phone Auth
        |
        v
Configured Twilio Verify provider delivers the phone_change OTP
        |
        v
Client verifies the same user, confirmed phone and confirmation timestamp
        |
        v
API independently verifies current confirmed-phone state
```

Mobile and API citizen modes default to `enforce`. A missing or unconfirmed phone keeps the user on
the phone-verification route, and the API independently rejects the citizen request with
`PHONE_VERIFICATION_REQUIRED`. Citizen sessions remain `aal1`; no `auth.mfa.*` call or Phone MFA
factor is involved. Supabase Storage or an Edge Function cannot act as an SMS carrier, and a custom
OTP table must not replace Supabase Auth.

Configure the ordinary Phone provider/SMS transport under
**Authentication → Sign In / Providers → Phone**. Enable phone confirmations and Phone Auth
signup capability. Supabase applies that provider gate even to an existing linked user's
`signInWithOtp({ shouldCreateUser: false })` request. Activate
`public.hook_require_email_identity` as the Before User Created Auth Hook so actual phone-only user
creation is rejected, then verify both the allowed existing-user OTP and denied phone-only-signup
cases. Review OTP expiry, rate limits and abuse controls. Advanced Phone MFA Enrollment and Phone
Verification are not required for citizens.

For `sms_send_failed`, verify the Twilio Verify Account SID, current Auth Token and **Verify Service
SID**, service state, Indian geographic permissions and any trial-recipient restriction. Never put
those values in application configuration or logs. Wrong, expired, throttled and provider-disabled
ordinary OTP errors are translated into actionable messages. The local deterministic test OTP
cannot prove hosted carrier delivery.

### Mobile Email Password Modes

The Expo client presents three explicit email/password modes:

- **Sign in** authenticates an existing account;
- **Create account** validates password confirmation and is the only mode that provisions an Auth
  identity;
- **Forgot password** requests a provider recovery link with a generic response, and the reviewed
  callback exchanges the recovery code. The account must already have a confirmed phone and then
  complete a fresh ordinary SMS OTP. An account without that phone fails closed into reviewed
  support recovery.
- **Change password** is available to a signed-in citizen but always challenges the current
  confirmed phone. Delivery uses `shouldCreateUser: false`; verification and the password update
  run immediately on an isolated, non-persistent Supabase client after exact user/phone matching.

Passwords are sent only to Supabase Auth over TLS and are never logged, stored in application
tables, routed through NestJS, or placed in resume state. After an accepted update, the client
immediately attempts global sign-out, falls back to local sign-out if necessary, then waits no more
than two seconds for the best-effort `password_changed` audit before returning to sign-in. Recovery
responses remain generic, and a citizen cannot select a privileged application role during
registration. A successful phone verification does not wait for the non-critical
`otp_verified` audit request to finish.

Supabase emits `USER_UPDATED` when the phone-change request is accepted. The mobile confirmation
screen keys its initial authoritative inspection by stable user ID so that expected same-user event
cannot reset an in-progress code-entry challenge. A different account still starts a new
inspection. This is a UI lifecycle rule and does not replace the API's service-owned
`phone_confirmed_at` check.

The pinned Supabase Auth SDK coordinates refresh concurrency internally, so mobile uses its
lockless default and does not supply the deprecated `processLock`. That legacy option made the
auto-refresh tick attempt an immediate zero-millisecond lock acquisition and log warnings during
ordinary Auth work. Mobile keeps `onAuthStateChange` short by deferring authoritative `getUser()`
inspection until the callback returns. A newer event cancels and invalidates older scheduled work,
while sign-out or provider unmount prevents a stale session from restoring access.

The reset-password screen owns the lifetime of its isolated recovery client. If navigation
unmounts the screen after email recovery establishes a session but before phone inspection or
password completion finishes, cleanup locally signs out that isolated session. This prevents a
late recovery exchange from leaving an unintended credential session alive on the device.

The ordinary audit route uses the same confirmed-phone citizen guard as other protected API
routes. The former zero-factor recovery exception is removed because no supported no-phone
password update remains. Audit rows are deliberately labelled client-reported and cannot prove the
Supabase password mutation.

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

### Synthetic Staging Privileged Provisioning

ADR-0025 permits one trusted non-production helper for repeatable staging demonstrations. The
helper creates separate confirmed `@localwellness.test` identities for a platform administrator,
BMC municipal administrator, government operator, A Ward officer, K West Ward officer, Solid Waste
Management department officer, and Public Health department officer. It resolves every non-global
scope from the verified, non-placeholder, routing-eligible invitation catalog and persists the
existing membership/role records before a portal session is used.

Provisioning requires all of the following:

- an explicit `--acknowledge-staging` flag;
- the exact 20-character project reference and matching HTTPS `<ref>.supabase.co` URL;
- the exact reviewed authority name;
- a server-only secret/service-role key and a public key loaded from the root environment;
- an access lifetime from 1 to 90 days, defaulting to 30 days;
- no unexpected active platform administrator, ambiguous scope, or partially provisioned account.

Passwords are non-deterministic and verified through Supabase Auth after creation. Existing
synthetic identities fail closed unless the operator explicitly requests password rotation.
Credentials are written to the gitignored local artifact
`.local/staging-demo-accounts.<project-ref>.json` with mode `0600`; passwords and server keys are not
printed or logged. The file is operator material, not an application configuration file, and must
never be committed, copied into a client environment, or shared as one common team credential.

The portal password forms call `signInWithPassword` only for an existing identity and then route to
the same MFA path used by email-code/link authentication. Every account exercised must enroll and
use its own TOTP factor. Privileged API enforcement still requires AAL2 when enabled, and database
authorization still requires a current role/membership/scope. Expired assignments deny access even
if Supabase Auth can still establish an AAL1 session.

After testing, delete the local credential artifact and use a trusted operator process to revoke or
disable the synthetic identities. Automatic Auth-user teardown is not implemented. Production
officials continue to use unique official-controlled invitations. This helper handles only its
fixed synthetic staging matrix and does not implement arbitrary existing-user assignment,
additional scopes, renewal, or revocation under `AUTH-001`.

---

## Session Handling

### API bearer verification

The NestJS API validates Supabase bearer tokens with `supabase.auth.getClaims()`. For the managed
project's asymmetric signing key this verifies the signature and expiry against Supabase's bounded
public-key cache without the former additional `getUser()` network request. The API then requires
the authenticated audience and role, a UUID subject, and a recognized `aal1` or `aal2` claim before
constructing the authenticated actor. Email and phone are accepted only from the same verified
claims. Unverified decoding is never authentication.

JWT claims establish identity and assurance, not application authorization. Profile status,
current role and authority membership, and the applicable privileged MFA or citizen
confirmed-phone policy remain
database reads. When several requests for the same actor arrive together, they may share only the
same unfinished actor-context read. That entry is removed on success or failure; there is no
completed profile, role, membership, phone-policy, or bearer-token cache. Application deactivation
therefore remains immediately effective, while session-only revocation follows the bounded access-
token expiry. See
[ADR-0026](adr/0026-use-verified-jwt-claims-for-api-authentication.md).

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

User-initiated HTTPS references open through Expo's in-app browser after rejecting non-HTTPS URLs
and embedded credentials. The adapter never includes the URL in an error. Auth/recovery deep links,
internal routes, native settings and the emergency telephone action do not use this browser path.

The mobile current-area cache is bound to the active Auth identity. Sign-out, loss of the current
user, or replacement with another user clears the memory-only location and invalidates its request
generation so a late native result cannot repopulate state for the next account. Exact coordinates
are not placed in the Supabase session, SecureStore, SQLite, logs, or authentication audit. The
separate complaint-evidence path never reads this cache.

Foreground location permission may be requested automatically only once per application process,
across all current-area and complaint features. Clearing an identity's coordinate cache does not
reset that prompt gate. If the request is denied, route focus cannot re-prompt; the citizen must use
an explicit retry or operating-system settings action. This is a device-permission UX boundary, not
an authentication claim, and no permission outcome is copied into JWT/profile authorization.

### Web

Citizen Web currently uses `NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only`. Its public home,
transparency, and directory placeholder work without a session. Authentication/callback, account,
reporting, complaint, and unknown future routes redirect to a query-free mobile-app notice before
session mutation or protected API work.

The prior citizen SSR implementation remains behind explicit `full` mode for future parity and must
not be deployed until it adopts this ADR's fresh-phone password flows. Government and
administrator entry may use a password already attached to a
pre-provisioned identity, a six-digit email code, or a secure link. Password entry never calls a
signup API. Email code entry uses Supabase `verifyOtp` with the `email` type; ordinary browser links
use the SSR client's PKCE flow. Each browser callback accepts exactly one reviewed method and rejects
incomplete, duplicate, ambiguous, unsupported, or provider-error callbacks. Citizen and
administrator callbacks reject raw fragment sessions. The government
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

When explicit full mode is used in future development, the citizen account page still depends on
the application profile API.
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

### Retired governance synchronization machine boundary

ADR-0031 removes the undeployed `governance-sync-fetch`/Cron boundary, its synchronization
tables and its claim/heartbeat/finalization/failure RPCs. There is therefore no V1 dispatch secret,
lease token, machine identity or synchronization authorization path to configure.

This change does not weaken user authentication, citizen confirmed-phone verification, privileged TOTP/AAL2,
database-current role/membership checks, or service-role isolation. Current BMC ward/contact
routing remains a private service-only database path through `routing.ward_issue_contacts` and
never exposes recipient values to a citizen token.

If an old Edge Function or external Cron invocation was deployed manually, disable it before
applying `20260723110000_prune_deferred_v1_subsystems.sql`. Reintroducing automated governance
retrieval requires a new authentication/threat-model decision.

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
- ordinary authenticated and anonymous database roles have no direct access to private routing,
  ward-recipient records, email outbox rows or exact-location decision evidence; the former
  governance synchronization tables/functions are physically removed by ADR-0031.
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

Supabase Auth returns the TOTP QR as a short-lived SVG data URL. The portals trim provider control
characters and render that private URL with a fixed-size native image rather than Next image
optimization; the setup secret is never logged or persisted by the application. `listFactors().all`
is checked for this portal's own unverified friendly name. An explicit **Restart authenticator
setup** action removes only those unfinished factors before enrolling again; unrelated or verified
factors are never removed automatically.

Citizens use ordinary Supabase Phone Auth separately.
`API_CITIZEN_PHONE_VERIFICATION_MODE=enforce` requires a current non-empty Auth phone with
`phone_confirmed_at` for citizen-only accounts; citizen `aal2` is not required. Production API
startup rejects a missing/non-enforcing citizen setting. Editable profile metadata and JWT phone
claims do not satisfy this server-side policy. The ordinary Phone provider, phone confirmations and
Twilio Verify transport must be configured in each managed project. Advanced Phone MFA is not
required for citizens.

An existing citizen can nevertheless carry a verified TOTP factor from an earlier portal or test
workflow. Supabase evaluates that factor independently of JagrukSetu roles and returns HTTP `401`
with `insufficient_aal` when an AAL1 session tries to change the phone. Under ADR-0034, the mobile
flow conditionally asks for the current authenticator code, calls `challengeAndVerify`, and
requires the same user at AAL2 before returning to ordinary phone entry. A citizen with no
verified factor skips this step and continues directly to `phone_change` SMS. The client never
enrolls, deletes or persists a factor as part of phone confirmation. This TOTP code is generated
inside the previously enrolled authenticator application and is never sent by SMS, so it has no
resend action. The mobile screen states that distinction and explains that a lost authenticator
requires an attributed administrator factor reset.

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

- provider-managed generic email password-recovery request;
- one reviewed recovery session established by PKCE code or recovery token hash;
- a fresh ordinary phone OTP for the account's already confirmed phone;
- no email-only password update when the account has no confirmed phone;
- immediate global sign-out after password update;
- reviewed support recovery when a confirmed phone is lost.

Password-recovery requests return a generic acknowledgement whether or not an account exists.
Recovery links, codes, OTPs and bearer tokens are one-time or
sensitive provider credentials and must never enter logs. An unavailable verified phone never
silently falls back to email-only recovery.

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
- phone-verification-required citizen operation rejected without a current confirmed phone;
- privileged MFA-required operation rejected without the required factor and assurance level;
- anonymous user blocked from private complaint.

Identity coverage includes self/cross-user/cross-authority RLS, expiry/revocation, sensitive-column
isolation, audit immutability, profile-image ownership, privileged TOTP/AAL policy, citizen
confirmed-phone policy, email/password client behavior, and recovery input handling. Ordinary
phone verification remains provider-gated because real delivery requires an SMS provider. Hosted
recovery, redirect allow-lists, phone confirmation, device/session revocation, and real-device
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

The mobile completion suite additionally verifies that password OTP delivery cannot create a phone
user, verification is bound to the expected user and phone, recovery cannot bypass a missing or
different confirmed phone, detectable Supabase project mismatch fails without echoing values, and
a native runtime rejects loopback service URLs.
Delivered Twilio OTPs and physical-device session/profile transitions remain environment-gated.

## Complaint-routing contact privacy

### UI benchmark authentication boundary

Report creation remains authenticated email/password plus mandatory confirmed-phone verification; signed-out
users use the existing login flow. Citizen Web protected examples are unavailable in public-only
mode. Public/guest/private examples in the benchmark are not enabled account modes.

Authentication and authorization behavior is unchanged by the V1 BMC ward-contact facade. The API
derives the actor from the verified bearer token and the database derives every ward, assignment and
recipient. Citizen requests cannot provide or read a recipient email, phone number, WhatsApp number,
durable role, source status/locator, owner staging approval, exact outbox state or provider
identifier. Those values remain in forced-RLS private schemas and are accessible only through
narrowly granted service operations. A service key must never be placed in Expo, Citizen Web, the
Government Dashboard, or the Admin Console. Joining the immutable issue-contact and ward-email
archives changes routing data only; it does not change identity, MFA, membership or role policy.

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

The mobile Community **Your reports** preview is not anonymous transparency. It renders only when a
signed-in mobile session has an access token and calls the existing bearer-authenticated,
actor-scoped complaint-list route. Focus cleanup and request-generation checks prevent a late
response from an earlier screen/account lifecycle from replacing current state. Signing out hides
the preview; no owner result is cached into the reviewed-public feed.
