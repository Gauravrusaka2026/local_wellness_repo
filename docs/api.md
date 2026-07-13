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

Complaint submission, payment-like actions, media finalization, and message creation should support:

```text
Idempotency-Key
```

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
    "code": "COMPLAINT_LOCATION_MISMATCH",
    "message": "The complaint location does not match the verified device location.",
    "details": {}
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

---

## Error Codes

Examples:

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
- `COMPLAINT_DUPLICATE`
- `INVALID_STATUS_TRANSITION`
- `MEDIA_UPLOAD_FAILED`
- `MEDIA_NOT_READY`
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
  "data": [],
  "meta": {
    "nextCursor": "string-or-null",
    "hasMore": true
  }
}
```

---

## Implemented Phase 1 Endpoints

Phase 1 implements only the following identity endpoints:

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

The remaining routes in this document are planned contracts for their later implementation phases.

## Phase 2 API Boundary

Phase 2 adds no HTTP, realtime, map, complaint, dashboard, or governance-administration endpoint. It introduces the server-managed governance registry, canonical authority foreign keys, validation/seed tooling, RLS, and a service-role-only PostgreSQL jurisdiction resolver. The existing identity store now obtains effective roles and memberships through service-only database functions that filter inactive/placeholder authorities and invalid ward/department ownership; it does not create a parallel HTTP contract. The jurisdiction function is exercised with synthetic geometry but is not exposed as the planned `POST /api/v1/jurisdictions/resolve` route.

Routing rows imported in Phase 2 are historical/source references only. They stay draft, unresolved, and non-routable, so no API may use them to assign a complaint. The planned endpoints below remain contracts for their designated later phases.

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

### Authentication Audit

```text
POST /api/v1/auth/audit-events
```

The endpoint attaches the authenticated actor and subject on the server. It accepts only self-session event types, validates device and authority ownership, stamps `metadata.source` as `client_reported`, and rejects secret-bearing or unrecognized metadata. These records are best-effort client reports; Supabase Auth remains the authoritative identity-provider log.

### Planned: Categories

```text
GET /api/v1/categories
GET /api/v1/categories/:categoryId
```

### Planned: Jurisdiction Check

```text
POST /api/v1/jurisdictions/resolve
```

Request:

```json
{
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracyMeters": 12,
  "capturedAt": "2026-07-11T08:00:00Z"
}
```

The later API implementation must call the trusted jurisdiction boundary and routing layers server-side. A client coordinate, ward ID, authority ID, department ID, or routing rule is evidence/input only and never an official assignment decision.

### Planned: Complaint Draft

```text
POST   /api/v1/complaints/drafts
GET    /api/v1/complaints/drafts/:id
PATCH  /api/v1/complaints/drafts/:id
DELETE /api/v1/complaints/drafts/:id
```

### Planned: Media Upload

```text
POST /api/v1/media/upload-intents
POST /api/v1/media/:mediaId/finalize
GET  /api/v1/media/:mediaId/status
```

### Planned: Complaint Submission

```text
POST /api/v1/complaints/:draftId/submit
```

### Planned: Complaint Tracking

```text
GET /api/v1/complaints
GET /api/v1/complaints/:complaintId
GET /api/v1/complaints/:complaintId/timeline
GET /api/v1/complaints/:complaintId/routing
```

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

---

## API Versioning

Breaking changes require:

- new API version;
- migration plan;
- updated client;
- updated documentation;
- ADR when architecture changes.

Non-breaking additions may remain within `/api/v1`.
