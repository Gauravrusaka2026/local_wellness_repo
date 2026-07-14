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
- `COMPLAINT_DUPLICATE_POLICY_NOT_FOUND`
- `COMPLAINT_DUPLICATE_ACKNOWLEDGEMENT_REQUIRED`
- `COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT`
- `COMPLAINT_DUPLICATE`
- `INVALID_STATUS_TRANSITION`
- `MEDIA_UPLOAD_FAILED`
- `MEDIA_NOT_READY`
- `MEDIA_INTEGRITY_MISMATCH`
- `MEDIA_FINALIZATION_CONFLICT`
- `OFFICER_ASSIGNMENT_REQUIRED`
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
POST   /api/v1/admin/government-invitations
```

Phase 3 adds these authenticated category and routing-resolution endpoints. Resolution appends a
routing audit record but creates no complaint or official assignment:

```text
GET  /api/v1/routing/categories
GET  /api/v1/routing/categories/:categoryId
POST /api/v1/jurisdictions/resolve
POST /api/v1/routing/resolve
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

Maps, public complaint views, government workflows, realtime, governance administration, and
human review/publication routes remain planned contracts for later phases.

## Governance Synchronization Runtime Boundary

Governance retrieval is not a citizen or NestJS REST API. An environment-specific Supabase Cron
job may send `POST` to the `governance-sync-fetch` Edge Function with a dedicated high-entropy
`x-governance-sync-secret`. JWT verification is disabled for this one function only because the
function performs constant-time custom-secret validation before claiming work. The secret and
service credential are server-only and must never enter a client bundle, source row, response, or
log.

The optional JSON body accepts only `limit: 1` and `leaseSeconds` from 300–900, defaulting to 300.
Exactly one source can be claimed per dispatch; the underlying trusted database RPC permits a
180–900 second lease and also enforces `limit = 1`. A successful response contains aggregate
`claimed`, `snapshotted`, `notModified`, and `failed` counts; it never returns lease tokens, raw
source bytes, contacts, or parser output. The function heartbeats its lease after retrieval and
again after a Storage write. Claims and finalization use service-role-only PostgreSQL functions.
Anonymous and authenticated roles have no execute or table access.

The Edge operation stops at immutable snapshot preservation. HTTP `304` reuses the prior source
snapshot. A `200` finalization must match the exact private `storage.objects` row, byte size, MIME
type, source path, and SHA-256 contract; referenced snapshot objects then become immutable. The Edge
function deliberately retains a new content-addressed object when finalization fails or its outcome
is ambiguous, because eager deletion could race a late database commit. Grace-period reconciliation
must confirm that no snapshot link appeared before removing a true orphan. Safe failures close the
run and schedule bounded retry; an expired lease is backed off and is not reclaimed in the same
claim call. Source-specific parsing,
normalization persistence, matching, change review, contact publication, and complaint-delivery
approval do not occur through this endpoint. There is no public governance-contact API in this
slice, and none of the ten draft/unverified PMC/BMC sources is active by default.

Pilot synchronization scope is also not a public REST contract. The service-only, forced-RLS
`governance.sync_scope_targets` registry selects canonical authority/local-body/ward rows for future
jobs. Anonymous and authenticated clients cannot read or mutate it. Scope activation requires an
active global platform-administrator review and never activates routing; routing remains independently
gated by the referenced canonical entity. The ten seeded Pune/Brihanmumbai ward targets are draft,
unverified, placeholder-backed, and non-routable.

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

`PATCH /me` accepts only display name, preferred language and onboarding completion. Device registration accepts an installation digest over authenticated TLS, hashes it again before persistence, and never returns the identifier hash or push token. Registration and soft revocation commit their device mutation and audit event atomically; direct authenticated table mutation is denied. Repeating an owned revocation is idempotent and does not duplicate its audit event, while a revoked identifier cannot silently re-register.

The citizen-web account page validates the `/me` payload before rendering and shows explicit
signed-in, onboarding, profile-unavailable, and API-unavailable states. Authentication alone does
not make this endpoint available: the citizen web and API must point to the same Supabase
environment, the Phase 1 profile trigger/migration must exist there, and the NestJS API configured
by `NEXT_PUBLIC_API_URL` must be reachable. A valid Auth session with no corresponding `profiles`
row returns `PROFILE_NOT_FOUND`; the client does not fabricate a profile or bypass the API.

### Authentication Audit

```text
POST /api/v1/auth/audit-events
```

The endpoint attaches the authenticated actor and subject on the server. It accepts only self-session event types, validates device and authority ownership, stamps `metadata.source` as `client_reported`, and rejects secret-bearing or unrecognized metadata. These records are best-effort client reports; Supabase Auth remains the authoritative identity-provider log.

### Routing Categories

```text
GET /api/v1/routing/categories
GET /api/v1/routing/categories/:categoryId
```

Both routes require a valid bearer token and return only database categories whose domain and
category are active, verified, non-placeholder, and routing-eligible. The Phase 3 seed therefore
returns an empty list, and identifier lookup returns `ROUTING_CATEGORY_NOT_FOUND`, for its 12
taxonomy records: they are intentionally draft, unverified, and non-routable.

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

`assetId` is optional unless the database category requires an identified asset. All other target
fields are server-owned. The server resolves current jurisdiction and routing evidence, evaluates
eligibility/confidence/fallbacks, appends the decision audit using the authenticated user and
request ID, and returns one of `routed`, `manual_review`, `mapping_required`, or `unsupported_area`.

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
`assetId`, a trimmed description of at most 4,000 characters, and strict current-location evidence:

```json
{
  "categoryId": "uuid",
  "description": "Water is leaking beside the footpath.",
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

The server returns a private draft with its database-derived location verification status and
owner-visible media metadata. Unknown properties—including authority, ward, department, officer,
status, visibility, storage path, and routing fields—fail strict validation. Updates use database
revision checks; terminal, expired, missing, cross-owner, and conflicting drafts fail closed.
`DELETE` records a retained discard transition and is replay-safe.

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
`COMPLAINT_UNSUPPORTED_AREA`; manual-review/mapping-required or unavailable routes do not create a
complaint.

The database atomically creates the private complaint, server-derived initial assignment, first
status-history event, terminal draft transition, and stored response. An exact actor/key/body retry
returns the original receipt; conflicting reuse returns
`COMPLAINT_SUBMISSION_IDEMPOTENCY_CONFLICT`. The receipt includes the complaint number, status,
category, submitted time, and sanitized routing summary, not exact coordinates, original media,
duplicate internals, or officer contacts.

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

### Planned: Complaint Actions

```text
POST /api/v1/complaints/:complaintId/follow
DELETE /api/v1/complaints/:complaintId/follow
POST /api/v1/complaints/:complaintId/support
POST /api/v1/complaints/:complaintId/comments
POST /api/v1/complaints/:complaintId/feedback
POST /api/v1/complaints/:complaintId/reopen
```

### Planned: Map

```text
GET /api/v1/map/complaints
GET /api/v1/map/wards
GET /api/v1/map/hotspots
```

---

## Government Endpoints

### Effective Access Scope

```text
GET /api/v1/government/access-scope
```

Only current, active, non-expired government roles backed by an active authority membership are returned.

### Planned: Queue

```text
GET /api/v1/government/complaints
GET /api/v1/government/complaints/:complaintId
```

### Planned: Complaint Actions

```text
POST /api/v1/government/complaints/:complaintId/acknowledge
POST /api/v1/government/complaints/:complaintId/assign
POST /api/v1/government/complaints/:complaintId/transfer
POST /api/v1/government/complaints/:complaintId/status
POST /api/v1/government/complaints/:complaintId/internal-notes
POST /api/v1/government/complaints/:complaintId/inspection
POST /api/v1/government/complaints/:complaintId/resolution
```

### Planned: Analytics

```text
GET /api/v1/government/analytics/ward
GET /api/v1/government/analytics/department
GET /api/v1/government/analytics/municipality
```

---

## Admin Endpoints

```text
POST   /api/v1/admin/government-invitations
```

Government invitation creation is available only to active platform administrators or municipal administrators for their own authority. The API selects the role definition, grantor, status and redirect URL; clients cannot choose privileged persistence fields. Authorization, provider and unreconciled persistence failures are recorded as best-effort server audit events, while successful membership, role and audit persistence is atomic in PostgreSQL.

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

## Planned Realtime Events (Phase 6)

### Client to Server

```text
complaint:join
complaint:leave
message:create
comment:create
typing:start
typing:stop
message:read
```

### Server to Client

```text
complaint:updated
complaint:status_changed
complaint:assigned
message:created
comment:created
typing:changed
notification:created
```

Every Socket.IO event must use a validated payload schema.

---

## API Security

Phase 1 implements bearer-token verification, application-account checks, identity input validation, current role/authority authorization, mass-assignment prevention, identity auditing, exact-origin CORS, request correlation, and server-secret isolation.

Phase 4 complaint controllers apply the same bearer guard to every draft, media, duplicate,
submission, list, detail, and timeline route. The API derives the actor from the verified token and
uses service-only database functions; a body cannot choose another user. Strict schemas reject
unknown official fields. CORS allows `Idempotency-Key` only from configured exact origins. Logs
retain correlation and safe identifiers/statuses but omit description, exact coordinates, bearer/
signed tokens, checksums, object bytes, spoof evidence, and internal duplicate/routing graphs.

Original media and voice recordings stay in private Storage. Signed upload targets are short-lived
and scoped to a server-reserved path; successful upload alone is not finalization. There is no
public complaint or original-media response in Phase 4.

The following list is the V1 security target across all later endpoint groups. Endpoint rate limits and quotas remain tracked in `AUTH-004` rather than being claimed as a Phase 1 control.

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

The local engineering path is verified with synthetic rollback-isolated positive data, but the
normal bootstrap returns zero operational categories. A real complaint must remain unavailable
until verified Pune category, jurisdiction, duplicate-policy, and routing evidence exists. Hosted
RLS/Storage smoke, physical-device capture, and provider-backed transcription/moderation are
separate activation requirements.

---

## API Versioning

Breaking changes require:

- new API version;
- migration plan;
- updated client;
- updated documentation;
- ADR when architecture changes.

Non-breaking additions may remain within `/api/v1`.
