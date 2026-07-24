# API

## Purpose

This document defines the API design conventions for Local Wellness.

The primary API is a versioned REST API implemented with NestJS.

Base path:

```text
/api/v1
```

---

## General Conventions

### Content Type

```text
application/json
```

### Authentication

```text
Authorization: Bearer <supabase_jwt>
```

Mobile citizens obtain bearer sessions through Supabase email/password sign-up, sign-in, and
provider-managed recovery, then confirm a phone through ordinary Supabase Phone Auth. Phone
verification is not an application OTP endpoint. `API_CITIZEN_PHONE_VERIFICATION_MODE=enforce`
rejects a citizen whose current Auth row has no confirmed phone with
`PHONE_VERIFICATION_REQUIRED`; citizen AAL2 is not required. Production startup rejects a missing
or non-enforcing citizen setting. Government or privileged users are evaluated separately through
`API_PRIVILEGED_MFA_MODE` and receive `MFA_REQUIRED` when that independent policy is enforced.
Phone Auth signup capability remains enabled because Supabase also uses it to gate OTP for an
existing linked phone. The separately activated Before User Created Auth Hook rejects any new Auth
user without an email; this provider boundary is not an HTTP endpoint in this API.

Passwords and OTPs never cross this API. Signed-in and recovered clients use an isolated,
non-persistent Supabase Phone Auth session for the fresh OTP and immediate password update. After
success, the client attempts global provider sign-out and clears its persistent local session. The
best-effort `password_changed` event remains telemetry rather than credential-change authority.

An already provisioned government or administrator identity may establish its bearer session by
password or by the existing email code/link flow. Those methods differ only at the Supabase Auth
entry point: each session follows the same TOTP/AAL2 policy and every privileged request is
reauthorized against current database membership, role, and scope. Password entry never signs up a
user, assigns access, or changes the `MFA_REQUIRED` contract.

For the managed project's asymmetric access tokens, the API authenticates a request with
`supabase.auth.getClaims()` rather than the former redundant `getUser()` plus `getClaims()` path.
It requires a valid signature and expiry, the authenticated audience and role, a UUID subject, and
an `aal1` or `aal2` assurance claim. Email and phone claims are treated only as verified identity
hints; citizen phone confirmation is read independently from current `auth.users` state.
Application authorization remains database-current: profile status, role/membership scope, and
the applicable privileged MFA or citizen confirmed-phone policy are read for the request. Only identical
concurrent actor-context reads share the same unfinished promise; success and failure both remove
it, and neither completed authorization state nor bearer tokens are cached. See
[ADR-0026](adr/0026-use-verified-jwt-claims-for-api-authentication.md).

### Request ID

Clients may send:

```text
X-Request-Id
```

The server must generate one when missing.

### Idempotency

Phase 4 requires this header for routing resolution, complaint-draft creation, media upload-intent
creation, and complaint submission:

```text
Idempotency-Key
```

Keys contain 16–128 safe ASCII characters. The server hashes the raw key and stores a canonical
operation-specific request fingerprint. Exact retries replay the stored result; reuse with a
different actor, operation, or payload fails closed. `X-Request-Id` is for correlation only and is
never substituted for this header. Media finalization is independently exact-replay safe against
the verified object evidence.

Every Phase 5 government mutation also requires `Idempotency-Key` plus an
`expectedWorkflowVersion` in its strict body. Exact actor/key/action/payload retries replay the
stored response. A conflicting key returns `COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT`; a stale workflow
version returns `COMPLAINT_WORKFLOW_VERSION_CONFLICT` so the dashboard reloads current state.

Phase 7 feedback, reopen-evidence reservation/finalization, and reopen mutations use the same two
headers and body workflow version. PostgreSQL binds every accepted request to the authenticated
complaint owner, exact resolution, approved policy version, and request fingerprint. Exact retries
return the stored result; conflicting key reuse, stale workflow versions, expired policy windows,
ineligible statuses, and unavailable policy data fail closed.

---

## Response Format

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

Error:

```json
{
  "error": {
    "code": "COMPLAINT_LOCATION_NOT_VERIFIED",
    "message": "The complaint request conflicts with its current state or prior request.",
    "details": {}
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

## Error Codes

Representative current and later-phase contract codes:

- `AUTH_REQUIRED`
- `ACCESS_DENIED`
- `ACCOUNT_INACTIVE`
- `ACCOUNT_UNAVAILABLE`
- `VALIDATION_ERROR`
- `PROFILE_NOT_FOUND`
- `PROFILE_IMAGE_PATH_INVALID`
- `DEVICE_NOT_FOUND`
- `DEVICE_BLOCKED`
- `DEVICE_REVOKED`
- `ROLE_SCOPE_INVALID`
- `GOVERNMENT_INVITATION_CONFLICT`
- `DEPENDENCY_UNAVAILABLE`
- `LOCATION_PERMISSION_REQUIRED`
- `LOCATION_LOW_ACCURACY`
- `LOCATION_MISMATCH`
- `UNSUPPORTED_AREA`
- `ROUTING_UNAVAILABLE`
- `ROUTING_CATEGORY_NOT_FOUND`
- `ROUTING_ASSET_REQUIRED`
- `ROUTING_CONFIGURATION_UNAVAILABLE`
- `ROUTING_IDEMPOTENCY_CONFLICT`
- `LOCATION_CAPTURED_IN_FUTURE`
- `LOCATION_TIMESTAMP_MISMATCH`
- `COMPLAINT_DRAFT_NOT_FOUND`
- `COMPLAINT_DRAFT_REVISION_CONFLICT`
- `COMPLAINT_DRAFT_IDEMPOTENCY_CONFLICT`
- `COMPLAINT_INCOMPLETE`
- `COMPLAINT_LOCATION_NOT_VERIFIED`
- `COMPLAINT_UNSUPPORTED_AREA`
- `COMPLAINT_ROUTE_UNAVAILABLE`
- `COMPLAINT_DUPLICATE_POLICY_NOT_FOUND`
- `COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED`
- `COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT`
- `COMPLAINT_ROUTING_DECISION_NOT_FOUND`
- `COMPLAINT_ROUTING_ACTOR_MISMATCH`
- `COMPLAINT_ROUTING_REQUEST_MISMATCH`
- `COMPLAINT_ROUTING_STATUS_MISMATCH`
- `COMPLAINT_ROUTING_CATEGORY_MISMATCH`
- `COMPLAINT_ROUTING_ASSET_MISMATCH`
- `COMPLAINT_ROUTING_LOCATION_MISMATCH`
- `COMPLAINT_ROUTING_ACCURACY_MISMATCH`
- `COMPLAINT_ROUTING_CAPTURE_TIME_MISMATCH`
- `COMPLAINT_ROUTING_EVIDENCE_MISMATCH`
- `COMPLAINT_DUPLICATE`
- `INVALID_STATUS_TRANSITION`
- `MEDIA_UPLOAD_FAILED`
- `MEDIA_NOT_READY`
- `MEDIA_INTEGRITY_MISMATCH`
- `MEDIA_FINALIZATION_CONFLICT`
- `OFFICER_ASSIGNMENT_REQUIRED`
- `OFFICER_ASSIGNMENT_INVALID`
- `GOVERNMENT_ACCESS_REQUIRED`
- `COMPLAINT_INSPECTION_NOT_FOUND`
- `COMPLAINT_EXTERNAL_DEPENDENCY_NOT_FOUND`
- `COMPLAINT_WORKFLOW_VERSION_CONFLICT`
- `COMPLAINT_ACTION_IDEMPOTENCY_CONFLICT`
- `COMPLAINT_ACTION_IN_PROGRESS`
- `RESOLUTION_EVIDENCE_NOT_FOUND`
- `RESOLUTION_EVIDENCE_NOT_READY`
- `RESOLUTION_EVIDENCE_UPLOAD_EXPIRED`
- `RESOLUTION_EVIDENCE_LIMIT_REACHED`
- `RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH`
- `GOVERNMENT_COMPLAINT_REQUEST_INVALID`
- `COMMUNICATION_ACCESS_DENIED`
- `MESSAGE_NOT_FOUND`
- `MESSAGE_IDEMPOTENCY_CONFLICT`
- `MESSAGE_READ_POSITION_INVALID`
- `NOTIFICATION_NOT_FOUND`
- `MFA_REQUIRED`
- `PHONE_VERIFICATION_REQUIRED`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

## Pagination

Cursor-based pagination is preferred.

Example:

```text
GET /api/v1/complaints?cursor=<cursor>&limit=25
```

Response:

```json
{
  "data": {
    "items": [],
    "nextCursor": "string-or-null",
    "hasMore": true
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

## Implemented Endpoints

The unversioned operational endpoints are intentionally outside the `/api/v1` application prefix:

```text
GET /health/live
GET /health/ready
```

Liveness proves that the API process can serve a request and does not query dependencies. Readiness
uses a short-cached, service-only database probe for the citizen role and five required private
Storage buckets; incomplete evidence returns `503 DEPENDENCY_UNAVAILABLE`. Both responses are
`Cache-Control: no-store` and disclose no schema, bucket, credential, or failure detail.

Phase 1 implements the following identity endpoints:

```text
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/devices
POST   /api/v1/me/devices
DELETE /api/v1/me/devices/:deviceId
GET    /api/v1/me/access
POST   /api/v1/auth/audit-events
GET    /api/v1/government/access-scope
GET    /api/v1/admin/government-invitations/options
POST   /api/v1/admin/government-invitations
```

Phase 3 adds these authenticated category and routing-resolution endpoints. Resolution appends a
routing audit record but creates no complaint or official assignment:

```text
GET  /api/v1/routing/categories
GET  /api/v1/routing/categories/catalog
GET  /api/v1/routing/categories/:categoryId
POST /api/v1/routing/assets/nearby
POST /api/v1/jurisdictions/resolve
POST /api/v1/routing/resolve
```

The mobile citizen-experience completion slice adds one authenticated verified-directory endpoint:

```text
POST /api/v1/governance/bodies/resolve
```

Phase 4 adds these authenticated, owner-scoped complaint-capture endpoints:

```text
POST   /api/v1/complaints/drafts
GET    /api/v1/complaints/drafts/:draftId
PATCH  /api/v1/complaints/drafts/:draftId
DELETE /api/v1/complaints/drafts/:draftId
POST   /api/v1/complaints/drafts/:draftId/duplicate-check

POST   /api/v1/media/upload-intents
POST   /api/v1/media/:mediaId/finalize
GET    /api/v1/media/:mediaId/status

POST   /api/v1/complaints/:draftId/submit
GET    /api/v1/complaints
GET    /api/v1/complaints/:complaintId
GET    /api/v1/complaints/:complaintId/timeline
```

Phase 5 adds the authenticated, scope-aware government queue, detail, assignment and workflow
surface documented below. Phase 6 adds the private message and durable in-app notification routes.
Phase 8 adds anonymous reviewed-transparency reads, and Phase 9 adds government-scoped SLA/KPI
accountability reads. The later community slice adds authenticated support/star state over current
reviewed projections. Public comments, governance administration, and human review/publication HTTP
routes remain later-phase contracts.

```text
GET  /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages/read
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read

GET /api/v1/transparency/complaints
GET /api/v1/transparency/wards
GET /api/v1/transparency/hotspots
GET /api/v1/transparency/complaints/:publicId
POST /api/v1/transparency/engagements/lookup
PUT  /api/v1/transparency/complaints/:publicId/engagement

GET /api/v1/government/accountability/complaints/:complaintId/sla
GET /api/v1/government/accountability/kpis
```

## Retired Governance Synchronization Runtime Boundary

[ADR-0031](adr/0031-prune-deferred-database-subsystems-for-v1.md) retires the undeployed
governance synchronization runtime. V1 has no `governance-sync-fetch` endpoint, synchronization
Cron contract, synchronization lease API or source-activation REST surface.

Migration `20260723110000_prune_deferred_v1_subsystems.sql` removes these former service-role RPCs:

- `claim_due_governance_sync_sources`;
- `heartbeat_governance_sync_lease`;
- `record_governance_sync_snapshot`; and
- `fail_governance_sync_run`.

No current citizen, mobile, Admin Console, Government Dashboard, worker or realtime contract calls
them. All other supported public RPC and HTTP contracts remain intact. The current BMC runtime
continues to use `resolve_v1_ward_route`, `claim_v1_ward_emails`,
`complete_v1_ward_email` and `fail_v1_ward_email`; contact values remain private.

The unused `@local-wellness/database/governance-sync` package export and source/tests are removed
with this subsystem. `@local-wellness/database/governance-import` remains the canonical offline,
source-validated import tooling and is not a network synchronization API.

Any externally deployed old Edge Function or Cron caller must be stopped before the hosted prune,
otherwise it will receive errors from intentionally retired RPCs. Reintroducing synchronization
requires a new ADR and API/schema design rather than restoring this historical contract.

## Phase 2 API Boundary

Phase 2 added no HTTP, realtime, map, complaint, dashboard, or governance-administration endpoint. It introduced the server-managed governance registry, canonical authority foreign keys, validation/seed tooling, RLS, and a service-role-only PostgreSQL jurisdiction resolver. The existing identity store now obtains effective roles and memberships through service-only database functions that filter inactive/placeholder authorities and invalid ward/department ownership; it does not create a parallel HTTP contract. Phase 3 exposes jurisdiction resolution only through the authenticated NestJS endpoint. Clients never receive direct execute access to its service-role-only database functions.

Routing rows imported in Phase 2 are historical/source references only. They stay draft, unresolved,
and non-routable, so the Phase 3 candidate query does not use them as executable assignment rules.
The planned endpoints below remain contracts for their designated later phases.

## Citizen Endpoint Details

### Profile

```text
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/devices
POST   /api/v1/me/devices
DELETE /api/v1/me/devices/:deviceId
GET    /api/v1/me/access
```

`PATCH /me` accepts only display name, preferred language, onboarding completion, and the nullable
owner-private `avatarObjectPath`. The path must use the authenticated user UUID and the single
bounded avatar filename accepted by the database. `GET /me` returns that path plus the
server-maintained `avatarUpdatedAt` cache version, but neither field is a public URL. Citizen web
and mobile use the owner-only `profile-images-private` Storage policies and a short-lived signed URL
for display; profile images never enter anonymous transparency responses. Device registration
accepts an installation digest over authenticated TLS, hashes it again before persistence, and
never returns the identifier hash or push token. Registration and soft revocation commit their
device mutation and audit event atomically; direct authenticated table mutation is denied.
Repeating an owned revocation is idempotent and does not duplicate its audit event, while a revoked
identifier cannot silently re-register. At most ten active device records may exist for one user.

Mobile avatar capture and media-library selection are client adapters for this same profile
contract; camera permission does not create a broader API or Storage grant. The mobile current-area
card calls `POST /api/v1/governance/bodies/resolve` and keeps only the returned civic labels and
provenance in component memory. `PATCH /me` does not accept exact coordinates or a street address,
and this slice does not persist either value.

Citizen Web public-only mode rejects `/me` and every other protected call before `fetch`. In its
latent explicit full mode, the account page validates the `/me` payload before rendering and shows
explicit
signed-in, onboarding, profile-unavailable, and API-unavailable states. Authentication alone does
not make this endpoint available: the citizen web and API must point to the same Supabase
environment, the Phase 1 profile trigger/migration must exist there, and the NestJS API configured
by `NEXT_PUBLIC_API_URL` must be reachable. A valid Auth session with no corresponding `profiles`
row returns `PROFILE_NOT_FOUND`; the client does not fabricate a profile or bypass the API.

### Authentication Audit

```text
POST /api/v1/auth/audit-events
```

The endpoint attaches the authenticated actor and subject on the server. It accepts only
self-session event types, including `otp_verified` and `password_changed`, validates device and
authority ownership, stamps `metadata.source` as `client_reported`, and rejects secret-bearing or
unrecognized metadata. These records are best-effort client reports; Supabase Auth remains the
authoritative identity-provider log. The endpoint never accepts a password, OTP, challenge,
recovery credential or factor secret.

The endpoint retains the same confirmed-phone citizen guard as every protected API route. The
former zero-factor `password_changed` exception is removed because supported recovery no longer
updates a password without an already confirmed phone. Bearer verification, strict body validation
and the PostgreSQL-backed `auth_audit_append` quota still run. The event remains telemetry only and
does not prove that the identity provider changed a password.

### Routing Categories

```text
GET /api/v1/routing/categories
GET /api/v1/routing/categories/catalog
GET /api/v1/routing/categories/taxonomy
GET /api/v1/routing/categories/:categoryId
```

All four routes require a valid bearer token. The list and identifier routes return only database
categories whose domain and category are active, verified, non-placeholder, and routing-eligible.
Each result includes its
database-defined minimum/maximum photo-or-video evidence count, required attribute keys, and
recommended media kinds in addition to its identity and routing requirements. The mobile report
form renders and enforces this metadata instead of hardcoding category behavior. The Phase 3 seed
therefore returns an empty list, and identifier lookup returns `ROUTING_CATEGORY_NOT_FOUND`, for its
12 taxonomy records: they are intentionally draft, unverified, and non-routable.

The catalog route returns every non-placeholder database category with an explicit
`submissionAvailability` of `available` or `unavailable`. The API derives that flag by comparing a
bounded full catalog snapshot with the independently filtered operational snapshot; it does not
promote a category based on client input. Placeholder, malformed, duplicate, oversized, or
internally inconsistent results fail closed. Mobile uses this route to show the whole configured
taxonomy while disabling unavailable choices. `available` permits category selection and a later
location-specific routing check; it does not promise that every coordinate has a verified route.

The taxonomy route is the citizen-facing hierarchy. It returns one public-safe row per
subcategory, including primary/subcategory IDs, codes and labels; subcategory description; derived
workflow type; sensitivity; routing state; optional mapped operational profile ID/code/name;
submission availability; the mapped profile's media, attribute, asset, location and emergency
requirements; and camel-case `handoffActions`. It never returns an authority, ward, office,
department, officer, recipient, contact, source-provenance field or routing-rule identifier.

Each action in `handoffActions` has exactly `key`, `kind`, `label`, `description`, `target`, and
`priority`. Ordinary rows return an empty array. A `protected_handoff` row is unavailable for
normal submission and returns one or more actions whose `kind` is `call` with a digits-only target,
or `browser` with a credential-free HTTPS target. The API rejects malformed, duplicate,
credential-bearing or unsupported actions rather than partially exposing them.

The generated BMC V1 catalog has 340 leaves under 17 primaries and 19 workflow types. Thirteen
specialised leaves map to the 12 stable specialised profiles, and 243 ordinary leaves map to the
single general ward profile. Those 256 leaves are internally submittable through 13 operational
profiles. The remaining 84 private or emergency-private leaves return `protected_handoff` and
unavailable submission. They create no normal complaint, assignment, ward email, or Community
post. The 20 `COR` leaves are part of this protected set.

Because the operational and taxonomy catalogs contain no user, coordinate, complaint, or mutable
workflow state, each API process caches each successful projection for 30 seconds and coalesces
concurrent cache misses. A rejected load is not retained. This optimization does not apply to the
identifier/list routes or to exact-coordinate jurisdiction and routing resolution. Complaint
submission always revalidates the taxonomy mapping/category and resolves its current route from the
database.

The historical BMC seeds `50`–`53` expose the earlier three-category internal-demo route family,
and seed `54` provides the 26-ward × 12-specialised-profile contact base. Generated seed `56` adds
one general profile/contact per ward, producing 338 private contact rows, and applies the 340-leaf
split above. Final submission still performs a fresh coordinate-specific PostGIS check;
availability is not coverage outside BMC geometry. External email delivery remains queued until a
sender provider is configured. Owner and government complaint responses use the taxonomy-aware
issue label from the canonical stored tuple; the ward-email worker uses the same label instead of
the internal general-profile name. Repository generation and local verification do not establish
that the generated migration and seed are installed on hosted Supabase.

### Nearby Routing Assets

```text
POST /api/v1/routing/assets/nearby
```

The strict request accepts only `categoryId`, latitude/longitude, `accuracyMeters`, and offset
`capturedAt`. The category must be an operational category that requires asset selection. A
service-only PostGIS query independently resolves one jurisdiction and returns sanitized nearby
options containing only asset ID, display/type name, and measured distance. Asset type, current
spatial version, ownership, owner authority, and any configured office/department/role relationship
must be current, verified, non-placeholder, and routing-eligible. Ambiguous jurisdiction, missing
ownership, placeholder evidence, or no in-radius match produces no selectable option; clients cannot
supply ownership or a routing target.

### Jurisdiction Check

```text
POST /api/v1/jurisdictions/resolve
```

Request:

```json
{
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracyMeters": 12,
  "capturedAt": "2026-07-13T08:00:00+05:30"
}
```

Only the four strict location-evidence fields are accepted. Coordinates must be in range, accuracy
must be between 0 and 5,000 meters, and `capturedAt` must be an offset ISO timestamp no more than
two minutes ahead of server time. Additional client-selected authority, ward, department, role,
assignment, or rule fields fail validation.

The API calls the trusted, accuracy-aware PostGIS resolver server-side. Its result is one of
`resolved`, `ambiguous`, or `unsupported` and includes only entity/version evidence needed for
explanation; it never returns officer names, phone numbers, or email addresses. A coordinate near
multiple eligible boundaries stays ambiguous instead of being assigned arbitrarily.

### Verified Governing Bodies

```text
POST /api/v1/governance/bodies/resolve
Authorization: Bearer <access-token>
```

The strict request is the same four-field location-evidence object used by jurisdiction resolution.
The API rejects an accuracy worse than 100 metres before querying PostGIS and returns one of
`resolved`, `ambiguous`, `unsupported`, or `low_accuracy`:

Community, Profile, and Nearby use one purpose-scoped mobile current-area coordinator before
calling this endpoint. It may reuse a non-mocked, at-most-five-minute-old position with accuracy of
100 metres or better from memory or the operating-system last-known result, and it coalesces
concurrent reads. An explicit Refresh bypasses both reusable sources. The request contract remains
the same four fields, and PostGIS remains authoritative; the cache cannot select or retain a
governing body.

```json
{
  "status": "resolved",
  "reason": "verified_governing_body_match",
  "maximumAccuracyMeters": 100,
  "matches": [
    {
      "state": {
        "kind": "state",
        "name": "Maharashtra",
        "type": "state",
        "verificationStatus": "verified",
        "lastVerifiedOn": "2026-07-16",
        "sourceUrl": "https://official.example.gov.in/source"
      },
      "district": null,
      "taluka": null,
      "authority": {
        "kind": "authority",
        "name": "Verified authority name",
        "type": "municipal_corporation",
        "verificationStatus": "verified",
        "lastVerifiedOn": "2026-07-16",
        "sourceUrl": "https://official.example.gov.in/source"
      },
      "localBody": {
        "kind": "local_body",
        "name": "Verified local-body name",
        "type": "municipal_corporation",
        "verificationStatus": "verified",
        "lastVerifiedOn": "2026-07-16",
        "sourceUrl": "https://official.example.gov.in/source"
      },
      "ward": null,
      "offices": [
        {
          "name": "Citizen Facilitation Office",
          "type": "municipal_head_office",
          "address": "Published civic office address",
          "phone": "02200000000",
          "email": "help@official.example.gov.in",
          "lastVerifiedOn": "2026-07-24",
          "sourceUrl": "https://official.example.gov.in/offices"
        }
      ]
    }
  ]
}
```

The database projection is executable only by the API service role and accepts only active,
verified, routing-eligible, non-placeholder entities and active official sources for every matched
entity/boundary. Each match may also contain a bounded `offices` array. It includes only
already-present active, verified, non-placeholder `governance.offices` rows with an active official
HTTPS source, a verification date, and at least one non-empty published address, phone, or email.
Absent contact fields are omitted rather than returned as null. A ward result includes exact-ward
offices plus wardless offices explicitly scoped to the resolved local body; another ward's office
is never included. The shared response contract keeps `offices` optional for rolling database/API
deployment compatibility, while the current API store normalizes an absent collection to `[]`.

The response deliberately omits all internal UUIDs, coordinates/geometry, officer identities,
officer mobile numbers, WhatsApp values, private complaint recipients, routing evidence, and every
value from `routing.ward_issue_contacts`. Multiple matches remain ambiguous; no application
fallback chooses Pune, Mumbai, a ward, or an authority. Until the additive projection migrations,
matching API/client builds, and reviewed official geometry/data are applied to staging, a real
lookup remains unsupported or may contain no published office contacts.

### Routing Resolution

```text
POST /api/v1/routing/resolve
Idempotency-Key: <client-operation-key>
```

Request:

```json
{
  "categoryId": "00000000-0000-4000-8000-000000000000",
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracyMeters": 12,
  "capturedAt": "2026-07-13T08:00:00+05:30",
  "assetId": "00000000-0000-4000-8000-000000000001"
}
```

`assetId` is optional. All other target fields are server-owned. For the current BMC V1 path the
server calls the service-only ward-routing facade, resolves the PostGIS ward and category against
private database records, and appends the normal decision audit. The private 312-row matrix merges
category/phone/WhatsApp evidence from `Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` with ward-email and
office evidence from `local_wellness_bmc_ward_directory_2026-07-20.zip`; the latter supplies direct
K/N and P/E mailboxes plus K/S→K/E and P/W→P/N parent-office mappings. Raw source status and
staging approval remain server-only. The endpoint returns `routed` or
`unsupported_area`; the advanced candidate engine retains `manual_review` and `mapping_required`
for later non-V1 configurations.

Response data shape:

```json
{
  "status": "routed",
  "categoryId": "uuid",
  "target": {
    "authorityId": "uuid",
    "localBodyId": "uuid",
    "wardId": "uuid-or-null",
    "departmentId": "uuid",
    "authorityDepartmentId": "uuid",
    "officerRoleId": "uuid",
    "officerAssignmentId": "uuid-or-null",
    "assetTypeId": "uuid-or-null",
    "assetId": "uuid-or-null",
    "assetVersionId": "uuid-or-null",
    "assetMatchDistanceMeters": 4.25,
    "assetOwnershipVersionId": "uuid-or-null"
  },
  "confidence": {
    "score": 0.94,
    "band": "high"
  },
  "explanation": {
    "reason": "route_resolved",
    "policyId": "uuid",
    "policyVersionId": "uuid",
    "policyVersion": 1,
    "jurisdictionStatus": "resolved",
    "localBodyBoundaryVersionId": "uuid",
    "wardBoundaryVersionId": "uuid-or-null",
    "selectedRoutingRuleId": "uuid",
    "selectedRoutingRuleVersionId": "uuid",
    "fallbackUsed": false,
    "fallbackDepth": 0
  }
}
```

The public response deliberately omits the internal candidate graph, rejection reasons, weighted
factor explanations, exact-location audit, source retrieval evidence, and officer contacts. A
verified current officer assignment may be referenced by ID; durable officer roles remain separate
from changing assignments. When an asset is selected, its exact spatial version and calculated
match distance are retained with the target; all asset fields are `null` for a non-asset route.

Candidate retrieval is capped and deterministically ordered in PostgreSQL. Every candidate must
match the exact state/district/taluka/local-body/ward hierarchy and boundary-version vector returned
by the preceding jurisdiction resolution. Conflicting confidence-policy versions in one applicable
context fail closed rather than producing incomparable scores.

The API looks up actor/key evidence before evaluation. An exact category/asset/location/capture-time
retry reconstructs the public result from the stored routing decision without recomputing the
server resolution time. Conflicting reuse returns `ROUTING_IDEMPOTENCY_CONFLICT` rather than
creating a second decision. Complaint submission uses a server-owned stable routing request ID so
an exact submission retry resolves to the same decision.

### Duplicate Detection Boundary

Phase 3 introduced strict duplicate evidence and scoring contracts. Phase 4 connects them to
versioned-policy candidate retrieval and append-only audit persistence through the owner-scoped
draft endpoint documented below. Suggestions remain advisory and can never merge, promote, or
silently reject a report.

### Complaint Draft

```text
POST   /api/v1/complaints/drafts
GET    /api/v1/complaints/drafts/:draftId
PATCH  /api/v1/complaints/drafts/:draftId
DELETE /api/v1/complaints/drafts/:draftId
POST   /api/v1/complaints/drafts/:draftId/duplicate-check
```

Draft creation requires `Idempotency-Key`. Create and patch accept only optional `categoryId`,
`assetId`, a trimmed description of at most 4,000 characters, bounded `customAttributes`, and
strict current-location evidence:

```json
{
  "categoryId": "uuid",
  "description": "Water is leaking beside the footpath.",
  "customAttributes": {
    "taxonomy_primary_code": "WTR",
    "taxonomy_subcategory_code": "WTR-001",
    "taxonomy_workflow_type": "MAINTENANCE",
    "visible_landmark": "Beside the public garden gate"
  },
  "location": {
    "latitude": 18.5204,
    "longitude": 73.8567,
    "accuracyMeters": 12,
    "capturedAt": "2026-07-14T08:00:00+05:30",
    "deviceRecordedAt": "2026-07-14T08:00:00+05:30",
    "provider": "fused",
    "isMockLocation": false
  }
}
```

Attribute objects accept at most 20 safe keys and bounded non-empty primitive values. The server
returns a private draft with the same attributes, its database-derived location verification
status, and owner-visible media metadata. Unknown properties—including authority, ward, department,
officer, status, visibility, storage path, and routing fields—fail strict validation. Updates use
database revision checks; terminal, expired, missing, cross-owner, and conflicting drafts fail
closed. `DELETE` records a retained discard transition and is replay-safe.

The three reserved taxonomy attributes are all-or-none and server-validated. Their primary,
subcategory and workflow values must be one canonical tuple. For a mapped leaf, `categoryId` must
equal the database-owned operational profile mapping. For a pending/protected leaf, `categoryId`
must be `null`; the draft can be resumed but cannot be submitted. Updating the primary selection
clears the previous subcategory, operational category and asset. Human labels and official routing
targets are never accepted from the client.

V1 complaint location evidence must report device accuracy of 50 metres or better. The API returns
`LOCATION_LOW_ACCURACY` before persistence when that bound is exceeded, and PostgreSQL enforces the
same category-capped rule. Any recorded media-capture point must also be no more than the
database category's configured distance from the draft's selected issue point; every V1 category
is constrained to a maximum of 50 metres. A mismatch fails closed and cannot be bypassed with a
client-selected ward, authority, or route.

The mobile current-area cache described under Verified Governing Bodies is never complaint
evidence. Issue points and every photo, video, or voice evidence capture request a distinct fresh
high-accuracy native position and retain the existing age, accuracy, mock-location, and proximity
validation. Neither in-flight nor completed evidence results are shared across capture actions.

The duplicate-check route requires a draft with a category and selected location. PostgreSQL loads
capped candidates using exactly one current verified policy and PostGIS distance; the pure routing
package scores them and the database records the run. A suggestion contains only the complaint ID/
number, category, status, submitted time, coarse distance, and aggregate score. It does not expose
description, exact coordinates, media hashes, owner data, or assignment contacts, and never merges
reports automatically.

### Media Upload

```text
POST /api/v1/media/upload-intents
POST /api/v1/media/:mediaId/finalize
GET  /api/v1/media/:mediaId/status
```

Upload-intent creation requires `Idempotency-Key` and accepts an actor-owned `draftId`, media kind
(`photo`, `video`, or `voice`), matching live capture source, allow-listed MIME type, byte size,
lowercase SHA-256, capture time, kind-appropriate dimensions/duration, and optional media-capture
location. Gallery/unknown capture sources and client-selected bucket/object paths are rejected.

The response envelope's `data` value contains owner-safe media metadata plus a transient
signed-upload target:

```json
{
  "media": {
    "id": "uuid",
    "draftId": "uuid",
    "complaintId": null,
    "uploadStatus": "reserved",
    "processingStatus": "pending",
    "moderationStatus": "pending",
    "metadata": {
      "kind": "photo",
      "captureSource": "live_camera",
      "mimeType": "image/jpeg",
      "byteSize": 123456,
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "capturedAt": "2026-07-14T08:15:00+05:30",
      "widthPixels": 1920,
      "heightPixels": 1080,
      "durationMilliseconds": null,
      "captureLocation": null
    },
    "createdAt": "2026-07-14T02:45:00Z",
    "updatedAt": "2026-07-14T02:45:00Z"
  },
  "upload": {
    "bucket": "complaint-originals-private",
    "objectPath": "opaque-server-owned-path",
    "token": "transient-signed-upload-token"
  },
  "expiresAt": "2026-07-14T03:00:00Z"
}
```

After direct upload to the signed target, the client finalizes with the byte size and SHA-256. The
API inspects the stored object and requires MIME, size, and digest to match both reservation and
finalization evidence; a mismatch removes the object and returns `MEDIA_INTEGRITY_MISMATCH`.
Finalization is exact-replay safe. Status responses never return the upload token or private object
locator. `processingStatus` and `moderationStatus` remain pending until later approved providers are
implemented.

There is currently no per-media delete/replace route after a draft attachment is finalized. The
owner may discard the entire draft; `COMPLAINT-004` tracks a future idempotent server-owned private
object lifecycle. Clients must not delete Storage objects directly.

### Complaint Submission

```text
POST /api/v1/complaints/:draftId/submit
Idempotency-Key: <client-operation-key>
```

Body:

```json
{
  "acknowledgedDuplicateSuggestionIds": ["uuid"],
  "emergencyDisclaimerAcknowledged": true
}
```

Both properties are optional unless the current data requires them. Every suggestion in the latest
applicable duplicate run must be acknowledged before a separate complaint is submitted. An
emergency category requires the explicit disclaimer acknowledgement; this endpoint is not an
emergency-dispatch service.

The API first claims a durable submission record and stable routing request ID. It then resolves or
replays routing server-side. Only a stored `routed` decision with matching actor, category, asset,
exact point, accuracy, and capture time can be committed. Unsupported locations return
`COMPLAINT_UNSUPPORTED_AREA`; manual-review/mapping-required or unavailable routes return
`COMPLAINT_ROUTE_UNAVAILABLE` and do not create a complaint. Generic database, Storage, or other
dependency failures retain `DEPENDENCY_UNAVAILABLE` so clients do not mislabel every service
failure as a routing-data gap.

PostgreSQL repeats the canonical taxonomy-tuple/mapping assertion at complaint insertion. A route
mapping changed after draft save therefore fails closed rather than submitting against stale
client state. The 84 `protected_handoff` selections have no normal submission path; mobile opens
only the approved official action, and a stale client cannot turn that action into a complaint.

The API validates candidate hierarchy evidence and requires its exact boundary-version vector to
match the independently verified PostGIS jurisdiction. Candidate explanation metadata does not
need to duplicate boundary evidence already established by that jurisdiction result. Submission
then compares the stored routing decision to the claimed draft at the canonical database gate. An
exact mismatch returns one allow-listed marker for actor, request, routed status, category, asset,
point, accuracy, capture time, or missing decision; it does not relax equality or expose the
differing value. These markers use the normal conflict envelope. Unavailable dependencies retain a
safe operation name and request reference in structured server logs without including provider
messages, coordinates, descriptions, tokens, object paths, or contacts.

The database atomically creates the private complaint, server-derived initial assignment, first
status-history event, terminal draft transition, and stored response. An exact actor/key/body retry
returns the original receipt; conflicting reuse returns
`COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT`. The receipt includes the complaint number, status,
category, submitted time, and sanitized routing summary, not exact coordinates, original media,
duplicate internals, or officer contacts. The outer receipt owns `categoryId`; the nested routing
summary does not duplicate it. Mobile decoding remains backward compatible with the earlier
first-submit shape that included the same nested category ID, but rejects a mismatch or any
undeclared private routing field.

For a `V1_WARD_*` route, the same transaction also queues one private ward-email job. The API does
not return its recipient, phone, WhatsApp, source locator/status, description payload or delivery
state and does not claim that BMC received an email. Delivery completion belongs to a later trusted
SMTP worker; no outbound runtime or SMTP credential is part of the API process.

The mobile client keeps the same submission key for an ambiguous network retry. It rotates that key
after a successful draft/category/location/asset/media/duplicate mutation, or after an explicit
terminal route-unavailable/unsupported-area response, so a later reviewed routing-data activation
cannot replay a stale no-route decision.

The mobile client also serializes every complaint mutation. Category, details, location, asset,
media, duplicate, discard, and submit operations cannot overlap, and repeated submit taps share one
in-flight promise. PostgreSQL idempotency remains authoritative if a transport retry reaches the
server more than once.

### Complaint Tracking

```text
GET /api/v1/complaints
GET /api/v1/complaints/:complaintId
GET /api/v1/complaints/:complaintId/timeline
```

These routes return only records owned by the authenticated citizen. Listing uses an opaque cursor
and a limit of 1–100 (default 25). Detail includes the owner's description, exact location evidence,
safe media status/metadata, and sanitized routing receipt; it does not return signed media access.
The Phase 4 timeline contains the immutable submission event and is designed for later official
status events. There is no separate complaint-routing endpoint in Phase 4.

The Phase 7 evidence-access endpoint applies only to authorized resolution/reopen evidence. It does
not expose original submitted complaint media. An owner-authorized short-lived signed-read endpoint
and mobile viewer for those originals remain tracked under `COMPLAINT-005`; object paths and
persistent/public URLs must stay private.

Citizen Web retains consumers for these three endpoints in latent explicit full mode, but
public-only mode rejects them before network access. Mobile remains the supported owner history and
detail client. No browser mode falls back to direct Supabase complaint-table reads.

### Private Complaint Communication

```text
GET  /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages/read
```

These Phase 6 routes are available to the complaint owner or a government actor with current
workflow access to the active assignment. A room-membership record never grants access by itself.
Every route derives the actor from the verified bearer token, and every response sets
`Cache-Control: private, no-store`.

Message history uses a paired `beforeCreatedAt`/`beforeId` keyset cursor and limit 1–100 (default
25). Message creation accepts only a caller-generated UUID `clientMessageId` and a trimmed body of
1–4,000 characters. The sender/client ID plus a database fingerprint provides exact replay; reuse
for another complaint or body returns `MESSAGE_IDEMPOTENCY_CONFLICT`. The response identifies the
author only as `citizen` or `government` and does not expose an Auth user UUID.

The read route accepts an exact message UUID and creation timestamp. It stores one monotonic
read-through position for the actor; an older read does not move the cursor backwards, and a
mismatched message/timestamp fails closed.

### In-App Notifications

```text
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
```

Notification history uses the same paired keyset cursor and returns only durable notifications for
the signed-in recipient while they retain complaint access. Payloads are restricted to complaint
ID/number, status, and optional message ID; they do not contain complaint descriptions, private
message bodies, exact coordinates, contacts, object locators, or tokens. Marking read is
idempotent. Push and email delivery are not implied by these endpoints.

The current mobile notification screen requests the newest 100 records once even though the API
supports continuation. Older durable rows remain server-side; client cursor pagination is tracked
under `NOTIFY-004`.

### Resolution Review, Feedback, and Reopening

```text
GET  /api/v1/complaints/:complaintId/resolution-context
POST /api/v1/complaints/:complaintId/feedback
POST /api/v1/complaints/:complaintId/reopen-evidence/upload-intents
POST /api/v1/complaints/:complaintId/reopen-evidence/:evidenceId/finalize
POST /api/v1/complaints/:complaintId/evidence/:evidenceId/access
POST /api/v1/complaints/:complaintId/reopen
```

Only the authenticated complaint owner can use these Phase 7 routes. Resolution context contains
the latest versioned public resolution record, policy-derived available actions, immutable feedback
and reopen history, repeated-reopen escalation history, and safe evidence metadata. Government-only
completion notes, object paths, checksums, exact actor identifiers, and signed tokens are excluded.

Feedback records one of `resolved`, `partially_resolved`, `not_resolved`, `temporary_fix`, or
`wrong_location`. When ratings are supplied, all four—satisfaction, speed, quality, and
communication—must be present and within the active policy range. A confirmed `resolved` outcome
advances the complaint to `resolved`; other outcomes remain auditable without silently reopening.
Only one feedback record is accepted per exact resolution.

Reopening is a separate policy-controlled operation. The API accepts only an allowed reason code,
bounded explanation, and finalized follow-up evidence owned by the same citizen and reserved for
the same complaint and resolution. Evidence uploads reuse a private Storage bucket and receive
short-lived signed targets; finalization verifies expiry, workflow version, byte size, SHA-256,
content type, and bounded binary signature before the object can be linked. PostgreSQL derives
`reopened` or `escalated` from the retained complaint-wide attempt history and policy threshold.

Evidence access always performs a fresh ownership and eligibility check and returns a five-minute
signed URL. Original complaint media is `before` evidence, explicitly linked government evidence
is `after` evidence, and citizen follow-up media is `reopen` evidence. Direct Storage access and
public object URLs remain denied. If no unambiguous approved policy applies, the context returns an
explicit unavailable state and all feedback/reopen mutations fail closed.

Citizen Web uses the returned resolution context to construct feedback and reopen actions. Server
actions ignore any browser-supplied workflow, resolution, policy, or actor identity and bind the
mutation to the current server response plus a fresh idempotency key. When the current policy
requires new location-bound evidence, web reopening stays unavailable and directs the owner to the
mobile capture flow; it does not submit an evidence-free workaround.

### Reviewed-Public Community Engagement

```text
POST /api/v1/transparency/engagements/lookup
PUT  /api/v1/transparency/complaints/:publicId/engagement
```

Both routes require a verified bearer session and active application profile. Lookup accepts 1–100
unique current public IDs and returns the current account's private flags plus the public aggregate:

```json
{
  "publicId": "uuid",
  "supportCount": 12,
  "supported": true,
  "starred": false
}
```

Mutation accepts exactly `{ "supported": boolean, "starred": boolean }` and idempotently sets the
one row for that account and current reviewed public projection. The API derives the actor from the
session; bodies cannot name a user or private complaint. A withdrawn/unpublished projection is not
engageable. `supportCount` is public aggregate output, while `supported` and `starred` are private
to the current account and use `Cache-Control: no-store`. Separate PostgreSQL-backed read/mutation
quotas apply.

Support and stars never update official routing, assignment, status, escalation, SLA, or KPI state.
There is no comment endpoint, public supporter list, public avatar, engagement notification, or
automatic government-priority effect in this slice.

### Owner Reports in Mobile Community

The signed-in mobile Community screen reuses:

```text
GET /api/v1/complaints?limit=25
Authorization: Bearer <access-token>
```

It derives a three-item recent preview locally from the actor-scoped complaint list and links each
card to the existing authenticated complaint detail. This is not a transparency endpoint and
introduces no new response contract. It remains independent of current-area permission and public
feed/hotspot failures. The API-derived actor boundary remains authoritative: the client cannot
request another owner's reports, and private results are never adapted into public map items or
engagement mutations.

### Public Nearby and Transparency

```text
GET /api/v1/transparency/complaints
GET /api/v1/transparency/wards
GET /api/v1/transparency/hotspots
GET /api/v1/transparency/complaints/:publicId
```

These are anonymous, read-only NestJS routes over a separately reviewed public projection; they do
not expose the private complaint model. List routes require a bounded WGS84 viewport and support
strict category, public-status, date, cursor, and result-limit filters where applicable. Hotspots
honor the approved policy's minimum cohort, and boundaries include only current verified,
non-placeholder, routing-eligible ward geometry associated with public output.

The complaint list accepts `sort=recent|trending` and defaults to `recent`. Trending orders only
current reviewed projections inside the requested viewport by aggregate support, then publication
time and public ID. Because support counts are live, a later cursor page is not a frozen ranking
snapshot and may shift as accounts change support.

Responses contain only stable public identifiers, sanitized public text, category/status labels,
already-approximate coordinates, public timestamps, the aggregate `supportCount`, other safe
aggregate counts, and explicitly published
duplicate-group relationships. They contain no citizen identifiers, private complaint IDs/numbers,
exact coordinates, descriptions, originals, object paths, hashes, internal notes, contacts,
reviewer identities, or private routing/moderation evidence. The API returns empty lists or `404`
when no current reviewed projection exists; it never falls back to private source data. Responses
are non-cacheable initially so an audited withdrawal takes effect without an application-cache
invalidation dependency.

The mobile Local and Trending views consume the reviewed complaint list, while the provider-neutral
Heat view consumes only minimum-cohort hotspot aggregates. Neither surface queries private
complaint tables, reconstructs exact locations, or requires a third-party map-tile provider. An
empty or unavailable reviewed projection remains an explicit empty/unavailable state rather than a
fallback to private reports. Authenticated support/star controls use the separate no-store routes
above and do not make the anonymous list identity-bearing.

When a current reviewed duplicate group exists, detail adds only:

```json
{
  "duplicateGroup": {
    "canonicalPublicId": "public-id",
    "relatedPublicIds": ["other-public-id"],
    "totalCount": 2
  }
}
```

`relatedPublicIds` is stable-sorted and excludes the report being viewed. The group is `null` until
a service-role reviewer groups no more than 100 reports from one local body/category that all have
current published projections. Private similarity results never auto-publish; internal complaint
IDs, match scores, review notes, and source evidence are never included. Withdrawing the reviewed
group removes the relationship from later detail reads without altering private complaint or
projection history.

---

## Government Endpoints

### Effective Access Scope

```text
GET /api/v1/government/access-scope
```

Only current, active, non-expired government roles backed by an active authority membership are returned.

### Queue and Detail

```text
GET /api/v1/government/complaints
GET /api/v1/government/complaints/:complaintId
GET /api/v1/government/complaints/:complaintId/assignment-options
GET /api/v1/government/complaints/:complaintId/accountability
```

Every route requires an active government access scope and returns only complaints intersecting the
actor's current authority/ward/department role. `scopeRoleAssignmentId` may select one of the
actor's own effective role rows when they have multiple scopes. The queue supports cursor/limit,
named queues, status, category, ward, authority-department, officer-assignment, submitted-time, and
complaint-number search filters. It returns no description, exact location, media, notes, or contact
data.

Authorized detail includes private description, exact verified location, submitted-media metadata,
routing summary, versioned assignment history, status timeline, internal notes, inspections, work
references, external dependencies, and resolution-evidence metadata. It also returns
`workflowVersion`, current state-aware `allowedActions`, and `allowedStatusTransitions`. Assignment
options contain only current verified, non-placeholder, routable officer assignments inside the
complaint authority and indicate whether each can be used for assign and/or transfer. A missing,
inactive, or cross-scope complaint is not disclosed.

An assignment summary may include `deliveryReadiness`. `governmentQueueStatus = verified_scope`
means the persisted complaint assignment is available to the correctly scoped government queue;
it does not require a named incumbent. `externalContactStatus` separately reports
`verified_officer_contact`, `verified_governing_body_contact`, or `not_available`, with only the
approved channel types and owner scope. A contact qualifies only when its current version is
public-official, manually verified, intended for complaint intake, and explicitly delivery
approved. No phone number or email value is returned. `automaticOutboundDelivery` is always
`false`; queue routing does not claim that email, SMS, or a municipal portal submission was sent.
Placeholder or unverified data can satisfy neither readiness boundary.

Each evidence item includes `availableForResolution`. It is true only for finalized evidence from
the complaint's current assignment that is not already linked to a resolution. Evidence from a
superseded assignment and linked items remain visible as retained history but are not offered for
reuse. Every queue, detail, option, action, and evidence response sets `Cache-Control: private,
no-store`.

The Phase 7 accountability route applies the same current assignment scope check and returns
versioned resolution completion records, government-only completion notes, work-reference and
before/after/reopen evidence metadata, citizen feedback, reopen requests, and escalation history.
It never returns object locators, signed tokens, checksums, or direct Storage access.

### Complaint Actions

```text
POST /api/v1/government/complaints/:complaintId/acknowledge
POST /api/v1/government/complaints/:complaintId/assign
POST /api/v1/government/complaints/:complaintId/transfer
POST /api/v1/government/complaints/:complaintId/status
POST /api/v1/government/complaints/:complaintId/internal-notes
POST /api/v1/government/complaints/:complaintId/inspections
POST /api/v1/government/complaints/:complaintId/inspections/:inspectionId/complete
POST /api/v1/government/complaints/:complaintId/work-references
POST /api/v1/government/complaints/:complaintId/external-dependencies
POST /api/v1/government/complaints/:complaintId/external-dependencies/:dependencyId/resolve
POST /api/v1/government/complaints/:complaintId/resolution-evidence/upload-intents
POST /api/v1/government/complaints/:complaintId/resolution-evidence/:evidenceId/finalize
POST /api/v1/government/complaints/:complaintId/resolution-evidence/:evidenceId/access
POST /api/v1/government/complaints/:complaintId/resolution
```

All mutation bodies are strict and include `expectedWorkflowVersion`; all mutations require an
idempotency key. The server derives the actor and rechecks current scope/capability/transition
inside the database. Assignment/transfer appends a version and transfer cannot cross authority.
Private notes never enter the citizen timeline. Status operations may include only a bounded
explicit public message. Inspection completion and dependency resolution require the exact resource
ID from the authorized detail. A resolution is rejected while a dependency is active or unless at
least one finalized evidence item belongs to the current complaint/assignment.

Assignment and transfer require an authority/global capability; ward and department scopes cannot
widen their jurisdiction. If a referenced incumbent tenure expires, the detail treats the complaint
as currently unassigned while retaining the former officer in assignment history. A scheduled
inspection or active dependency suppresses transfer and manual status transitions until its exact
completion/resolve action succeeds.

Adding another dependency while already waiting preserves the current waiting state. Resolving one
of multiple active dependencies also preserves it; only closure of the final active dependency
advances the complaint to `work_in_progress`.

Resolution-evidence intent returns a transient signed upload for the server-owned
`resolution-evidence-private` path. The database permits at most 20 active, unlinked
reserved/finalized evidence records for the current complaint assignment; linked or
superseded-assignment evidence remains history and does not consume that allowance. Replaying an
expired reservation does not mint a new token.

Before downloading for finalization, the API checks the authorized locator's current complaint
workflow version, reservation status/expiry, and declared size/checksum. Exact replay of an already
completed finalization uses stored observed metadata without another download. A first finalization
downloads at most 50 MiB and verifies exact size, SHA-256, Storage content type, and bounded binary
signature detection for JPEG, PNG, WebP, HEIC/HEIF, MP4, QuickTime, or WebM. Content-type/signature,
size, or checksum mismatch removes the reserved object and returns
`RESOLUTION_EVIDENCE_INTEGRITY_MISMATCH`.

Authorized read access returns a five-minute signed URL forced to download rather than render
inline; it never returns a direct public object. Structured access logging records actor,
complaint, and evidence identifiers without the signed URL or object path. Signature detection is
not full decoding, malware scanning, or moderation. Service-only database cleanup functions can
mark expired/failed reservation rows, but scheduled private Storage reconciliation/removal remains
follow-up work. Successful state transitions append status history, audit, and a data-minimized
notification-outbox event atomically. The Phase 5 workflow performs no direct network delivery;
Phase 6 consumes that committed event through separate worker and realtime boundaries.

### SLA and Organizational KPI Accountability

```text
GET /api/v1/government/accountability/complaints/:complaintId/sla
GET /api/v1/government/accountability/kpis
```

Both Phase 9 routes require a verified bearer session, active application profile, and current
government access scope. Responses set `Cache-Control: private, no-store` and are strictly decoded
from narrow service-role RPC payloads; clients receive no direct SLA/KPI table access.

Complaint SLA accepts optional `scopeRoleAssignmentId`. It returns only database-materialized
milestone clocks and escalation history for an authorized complaint. Each clock includes milestone,
cycle, state, policy code/version, business-minute target, UTC start/target/completion/breach/pause
times, and external-dependency segment. If no safe clock exists, `policyApplied` is false and
`unavailableReason` is one of `no_approved_policy`, `ambiguous_policy`,
`invalid_configuration`, or `not_materialized`; the API never invents a deadline.

The KPI route accepts optional `authorityId`, `scopeRoleAssignmentId`, paired `scopeType`/`scopeId`,
`segment`, and up to 20 unique `metricCodes`. Scope type is `municipality`, `ward`, or `department`;
segment is `all`, `external_dependency`, or `no_external_dependency`. The response contains the
latest authorized completed run's ID, window, source cutoff, calculation time, and immutable
snapshot rows with definition version, scope label, numerator, denominator, value, and sample size.
When no completed run exists, run metadata is null and `items` is empty. There is no public KPI
route and no individual-officer dimension or ranking.

Policy/calendar/rule publication, lease claims, escalation execution/failure, and KPI scheduling/
materialization are trusted database/worker operations, not client HTTP endpoints. Publication
atomically supersedes one eligible prior approved interval. Escalation execution commits status
history, append-only escalation evidence, and a data-minimized notification outbox record in one
transaction before asynchronous delivery.

---

## Admin Endpoints

```text
GET    /api/v1/admin/government-invitations/options
POST   /api/v1/admin/government-invitations
```

Both endpoints require a valid bearer session, an active application profile, AAL2 when privileged
MFA enforcement is enabled, and a current platform-administrator or municipal-administrator role.
Responses are `Cache-Control: private, no-store`.

The options endpoint returns three named collections: authorities, wards, and departments. Its
service-role-only database projection admits only active, verified, non-placeholder,
routing-eligible records. A platform administrator receives all currently eligible choices; a
municipal administrator receives only choices belonging to their own active authority. The API
strictly decodes the projection and fails closed on malformed, duplicate, orphaned, or
authority-broadening results. The catalog contains opaque IDs for subsequent API submission, but
the Admin Console does not expose raw UUID entry fields.

```json
{
  "data": {
    "authorities": [
      { "id": "uuid", "code": "BMC", "name": "…", "authorityType": "municipal_corporation" }
    ],
    "wards": [
      { "id": "uuid", "authorityId": "uuid", "code": "A", "name": "A Ward", "type": "ward" }
    ],
    "departments": [
      {
        "id": "uuid",
        "authorityId": "uuid",
        "code": "HEALTH",
        "name": "Public Health",
        "type": "department"
      }
    ]
  },
  "meta": { "requestId": "uuid" }
}
```

Government invitation creation is available only to active platform administrators or municipal
administrators for their own authority. The API selects the role definition, grantor, status and
redirect URL; clients cannot choose privileged persistence fields. Authorization, provider and
unreconciled persistence failures are recorded as best-effort server audit events, while successful
membership, role and audit persistence is atomic in PostgreSQL. Authentication alone never creates
membership or a scoped role, and each official must accept the invitation and enroll/challenge
their own authenticator factor.

The synthetic staging-account provisioner is a trusted operator script, not an HTTP endpoint. It
creates only its fixed non-production account matrix and preassigns expiring roles through the
existing platform-administrator bootstrap and government-invitation persistence functions. Portal
password forms operate only on those or other already provisioned identities and cannot invoke the
provisioner. Production onboarding remains invitation-first, and arbitrary existing-user
assignment, renewal, additional scope, and revocation remain pending under `AUTH-001`.

### Planned: Governance Administration

```text
GET    /api/v1/admin/local-bodies
POST   /api/v1/admin/local-bodies
PATCH  /api/v1/admin/local-bodies/:id

GET    /api/v1/admin/wards
POST   /api/v1/admin/wards
PATCH  /api/v1/admin/wards/:id

GET    /api/v1/admin/departments
POST   /api/v1/admin/departments
PATCH  /api/v1/admin/departments/:id

GET    /api/v1/admin/officers
POST   /api/v1/admin/officers
PATCH  /api/v1/admin/officers/:id

GET    /api/v1/admin/routing-rules
POST   /api/v1/admin/routing-rules
PATCH  /api/v1/admin/routing-rules/:id

GET    /api/v1/admin/sla-policies
POST   /api/v1/admin/sla-policies
PATCH  /api/v1/admin/sla-policies/:id
```

---

## Realtime Events (Phase 6)

Connect to the standalone Socket.IO server with:

```json
{
  "auth": {
    "accessToken": "<supabase_jwt>"
  }
}
```

The server verifies the token through Supabase Auth, requires an active application profile, and
disconnects at token expiry. A client must reconnect with a refreshed token. Exact-origin policy,
per-socket operation limits, maximum room subscriptions, and strict payload schemas apply.

### Client to Server

```text
room:join
room:leave
message:create
typing:start
typing:stop
message:read
```

`room:join` and `room:leave` accept `{roomType, roomId}` where `roomType` is `complaint`,
`authority`, `ward`, or `department`; the server constructs the actual room name after database
authorization. Every client operation supports an acknowledgement shaped as either
`{ok:true, occurredAt, resourceId?}` or `{ok:false, error:{code,message,retryable}}`.

`message:create` accepts the same client message UUID/body as REST and commits through the same
database function before any emission. `message:read` commits its monotonic read position first.
Typing events are ephemeral, omit user identifiers/content, and are sent only to other currently
authorized complaint-room sockets.

### Server to Client

```text
complaint:status_changed
message:created
message:read
typing:changed
notification:created
```

Persistent server events use `{schemaVersion:1,eventId,occurredAt,payload}`. Realtime delivery is
at-least-once. Stable event IDs permit duplicate suppression, while current clients use events as
debounced invalidation hints and reload authenticated REST history. They do not treat an event
payload or a typing signal as durable state. A committed delivery can record zero sockets because
in-app notification history is the offline fallback.

The realtime delivery pump and notification, SLA-escalation, and KPI workers reduce empty
PostgreSQL claims with adaptive idle backoff. Realtime polling doubles up to 15 seconds and worker
polling doubles up to 60 seconds while no work is claimed; either resets to its configured base
interval immediately after a non-empty claim. Leases and durable database state remain the source
of truth, and no Redis queue or cache participates in delivery.

There is no `comment:create`/`comment:created` contract in Phase 6. Public comments remain disabled
until complaint visibility, moderation, abuse controls, and privacy policy are approved.

---

## API Security

Phase 1 implements bearer-token verification, application-account checks, identity input validation, current role/authority authorization, mass-assignment prevention, identity auditing, exact-origin CORS, request correlation, and server-secret isolation.

Bearer authentication follows ADR-0026: verified asymmetric JWT claims replace the redundant
per-request Auth user lookup, while database authorization remains current. The only security-read
optimization is in-flight coalescing for identical concurrent actor-context reads. Profiles, MFA
policy, roles, memberships, complaint ownership, workflow status, jurisdiction, and routing are
not cached after a read completes. The separate 30-second category-catalog cache contains no user
or coordinate state and cannot bypass submission-time route validation.

Phase 4 complaint controllers apply the same bearer guard to every draft, media, duplicate,
submission, list, detail, and timeline route. The API derives the actor from the verified token and
uses service-only database functions; a body cannot choose another user. Strict schemas reject
unknown official fields. CORS allows `Idempotency-Key` only from configured exact origins. Logs
retain correlation and safe identifiers/statuses but omit description, exact coordinates, bearer/
signed tokens, checksums, object bytes, spoof evidence, and internal duplicate/routing graphs.

Original media and voice recordings stay in private Storage. Signed upload targets are short-lived
and scoped to a server-reserved path; successful upload alone is not finalization. There is no
public complaint or original-media response in Phase 4.

Phase 5 government controllers apply the bearer guard to every queue, detail, option, action, and
evidence route. The server passes the verified actor to private-schema service wrappers that
reauthorize current profile, role, membership, scope, capability, workflow state/version, and
verified assignment evidence. The dashboard may choose only a current role-assignment ID or an
assignment option returned by the server; it cannot widen authority/ward/department scope. Private
notes, exact coordinates, original media, evidence object locators, completion notes, dependencies,
and audit metadata are excluded from logs and unauthorized responses. Signed evidence reads are
short-lived, forced-download, and non-cacheable. All government-workspace responses are private and
non-cacheable. Evidence access emits a structured identifier-only log; signed URLs and paths are
never logged. Structured NestJS logging and the action audit/outbox tables are the implemented
observability boundary; Redis, BullMQ, and Sentry are not used.

Phase 6 communication controllers use the same bearer guard and return `private, no-store`.
Database wrappers independently reauthorize the active profile and current citizen/government
complaint access. Message bodies are permitted only in the private message table and authorized
message response; notification/outbox metadata and structured logs omit message text, descriptions,
coordinates, contacts, object locators, and tokens.

The Socket.IO server accepts a token only in handshake auth, verifies it over the Supabase Auth
boundary, checks the application account, and disconnects at expiry. The client cannot join a raw
room name: typed complaint/authority/ward/department targets are resolved through a service-only
authorization RPC. Queued per-user delivery rechecks active account and complaint access before
emission, so a revoked scope does not receive stale payloads. Worker and realtime completion/failure
RPCs require a matching, unexpired PostgreSQL lease token. Those tokens and the service credential
are never returned or logged. Per-socket limits supplement the separate shared HTTP quota boundary.

Phase 8 anonymous transparency routes decode allowlisted public projection DTOs and never fall back
to private complaint queries. Duplicate relationships appear only after service-role review of
already-published projections; public callers cannot create, infer, or withdraw a group.

Phase 9 accountability controllers use the bearer guard and return `private, no-store`. Database
wrappers reauthorize complaint and organizational scope at read time, and strict decoders reject
unexpected/private fields. Clients cannot publish policy, choose policy/clock inputs, lease a job,
trigger escalation, enqueue a KPI run, or rank an officer. Worker logs omit complaint content,
policy review notes, contacts, source evidence, and lease tokens. Atomic escalation persistence
ensures a notification cannot represent an uncommitted status/escalation change.

Phase 10 applies shared PostgreSQL-backed fixed-window quotas to every authenticated mutation and
tighter named policies to complaint submission, media mutations, private messages, device
mutations, government invitations, and authentication-audit writes. Anonymous transparency reads
use a separate client-address quota. The API hashes the subject before database access and stores
no raw user ID or address in the quota table. Responses include `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset`; exhausted windows return `429 RATE_LIMITED` plus
`Retry-After`. Counter cleanup is a bounded service-only database operation. These application
quotas complement, rather than replace, provider-edge abuse controls and Supabase Auth limits.

The following list is the V1 security baseline across endpoint groups.

- verify Supabase JWT;
- reject disabled or suspended application profiles;
- validate role and authority scope;
- validate request body;
- validate complaint ownership;
- validate ward and department access;
- rate limit sensitive endpoints;
- use signed media URLs;
- prevent mass assignment;
- audit government actions;
- never accept client-provided official status authority;
- keep the Supabase secret/service-role credential in the API runtime only and use it only for reauthorized trusted server operations.

The canonical Maharashtra/Phase 3 engineering baseline returns zero operational categories. A full
local reset with the generated BMC non-production pack returns only the three asset-independent
internal-demo categories across 22 unambiguous wards. The other nine categories stay unavailable,
because reviewed asset ownership evidence is absent; split K/P wards also stay unavailable. A
current hosted smoke proves the 12-category catalog, three operational categories, finalized
private media, K/W jurisdiction, and internal routing are present. Final hosted creation remains
blocked until migration `20260718100000_complaint_routing_evidence_diagnostics.sql` is applied and
an authenticated submission returns a receipt. It still does not prove delivery to BMC.
Physical-device capture, external-delivery integration, and provider-backed transcription/
moderation remain separate activation requirements.

---

## API Versioning

### UI benchmark contract boundary

Benchmark surfaces may show progress, route-pending, confidence/provenance, reviewed-public empty
states, and private status timelines only from existing response contracts. They must not invent
contacts, comments, guest submission, notification preferences, exact coordinates, or SLA data.

Breaking changes require:

- new API version;
- migration plan;
- updated client;
- updated documentation;
- ADR when architecture changes.

Non-breaking additions may remain within `/api/v1`.
