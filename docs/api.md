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
POST /api/v1/routing/assets/nearby
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

Phase 5 adds the authenticated, scope-aware government queue, detail, assignment and workflow
surface documented below. Phase 6 adds the private message and durable in-app notification routes
documented below. Maps, public complaint views/comments, governance administration, analytics, and
human review/publication routes remain later-phase contracts.

```text
GET  /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages
POST /api/v1/complaints/:complaintId/messages/read
GET  /api/v1/notifications
POST /api/v1/notifications/:notificationId/read
```

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

### Other Planned Complaint Actions

```text
POST /api/v1/complaints/:complaintId/follow
DELETE /api/v1/complaints/:complaintId/follow
POST /api/v1/complaints/:complaintId/support
POST /api/v1/complaints/:complaintId/comments
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

There is no `comment:create`/`comment:created` contract in Phase 6. Public comments remain disabled
until complaint visibility, moderation, abuse controls, and privacy policy are approved.

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
are never returned or logged. Per-socket rate limits supplement—but do not replace—the broader HTTP
rate-limit work tracked for launch.

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
