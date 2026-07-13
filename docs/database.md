# Database

## Purpose

This document defines the database structure, migration workflow, naming conventions, and Supabase security requirements.

The core database is Supabase PostgreSQL with PostGIS.

---

## Database Principles

- PostgreSQL is the source of truth.
- All exposed tables use RLS.
- UUIDs are used for domain identifiers.
- Timestamps are stored in UTC.
- Historic complaint events are immutable.
- Officer assignments are versioned.
- Ward boundaries are versioned.
- Routing rules are versioned.
- Deactivation is preferred over destructive deletion.
- Database migrations are committed to Git.

---

## Schemas

Recommended schemas:

```text
public
governance
complaints
communications
operations
analytics
integrations
audit
```

Supabase Auth remains under the managed `auth` schema.

---

## Core Tables

### Identity

- profiles;
- devices;
- roles;
- user_roles;
- authority_memberships;
- auth_audit_events.

Phase 1 keeps these tables in `public` because the Supabase data API must enforce authenticated self-service and scoped reads through RLS. Authorization helper functions live in an unexposed `private` schema and use fixed search paths.

### Phase 1 Identity Relationships

- `profiles.id` is the corresponding `auth.users.id` and is provisioned by an Auth trigger;
- `devices.user_id` owns a hashed installation identifier and server-controlled risk state;
- `roles.code` identifies immutable seeded system roles;
- `user_roles` records status, scope, grantor, effective start and optional expiry;
- `authority_memberships` records invitation/approval state and effective authority access;
- `auth_audit_events` records actor, subject, authority, device, outcome and sanitized metadata as append-only history. Actor, subject and device UUIDs are immutable attribution snapshots rather than cascading foreign keys.

Access-lifecycle actor references use restrictive deletion semantics so an administrator identity cannot be deleted while it remains the recorded inviter, approver, grantor or revoker. Deactivate such identities instead of erasing provenance. Revoked memberships preserve any prior approval actor and timestamp.

Authority identifiers intentionally have no foreign key in Phase 1 because the authority entity belongs to Phase 2. The governance migration must add that relationship with a forward-fix migration after creating the canonical authority table.

### Governance

- states;
- districts;
- local_bodies;
- administrative_units;
- wards;
- departments;
- offices;
- officer_roles;
- officers;
- officer_assignments.

### Complaints

- complaints;
- complaint_media;
- complaint_location_evidence;
- complaint_status_history;
- complaint_assignments;
- complaint_supporters;
- complaint_feedback;
- complaint_reopen_requests.

### Routing

- issue_categories;
- asset_types;
- assets;
- routing_rules;
- routing_decisions;
- fallback_routes.

### Communication

- complaint_comments;
- conversation_rooms;
- room_members;
- messages;
- message_receipts;
- notifications;
- notification_outbox;
- notification_deliveries.

### Operations

- sla_policies;
- escalation_rules;
- escalation_events;
- work_orders;
- external_dependencies.

### Analytics

- ward_kpi_snapshots;
- department_kpi_snapshots;
- municipality_kpi_snapshots;
- hotspot_snapshots.

### Audit

- audit_events;
- security_events;
- data_change_events.

---

## Naming Conventions

- tables: snake_case plural;
- columns: snake_case;
- primary key: `id`;
- foreign keys: `<entity>_id`;
- timestamps: `<event>_at`;
- boolean values: `is_` or `has_`;
- enum-like text columns use check constraints;
- database functions use snake_case.

---

## Standard Columns

Most mutable tables should include:

```text
id
created_at
updated_at
created_by
updated_by
status
```

Versioned tables should include:

```text
effective_from
effective_to
version
is_active
source_url
verification_status
last_verified_at
```

---

## Complaint Status History

Complaint status history must be append-only.

A complaint status update must:

1. validate transition;
2. update current complaint status;
3. insert status history;
4. create notification outbox row;
5. create audit event;
6. commit as one transaction.

---

## PostGIS

Enable PostGIS.

Required spatial data:

- complaint points;
- municipality polygons;
- ward polygons;
- district polygons;
- asset points;
- road lines;
- special jurisdiction polygons.

Suggested indexes:

```sql
create index wards_boundary_gix
on governance.wards
using gist (boundary);

create index complaints_location_gix
on complaints.complaints
using gist (location);
```

---

## Routing Query

Example:

```sql
select w.id
from governance.wards w
where w.is_active = true
  and st_contains(
    w.boundary,
    st_setsrid(st_point(:longitude, :latitude), 4326)
  );
```

Use `ST_Covers` where boundary-edge behavior requires inclusion.

---

## Migration Workflow

Create migration:

```bash
supabase migration new create_complaints_schema
```

Apply locally:

```bash
supabase db reset
```

Inspect diff:

```bash
supabase db diff
```

Push to linked environment only after review:

```bash
supabase db push
```

---

## Migration Rules

- never edit an applied production migration;
- create a forward-fix migration;
- avoid destructive changes;
- backfill before adding non-null constraints;
- create indexes concurrently where appropriate;
- document long-running migrations;
- test rollback or forward recovery;
- seed only non-sensitive reference data.

---

## Seed Data

Seed files should contain:

- Maharashtra state;
- pilot district;
- pilot municipality;
- pilot wards;
- departments;
- categories;
- officer roles;
- routing rules;
- SLA policies;
- test users for local only.

Never commit production officer personal data or secrets into seed files.

---

## Row Level Security

RLS policies must be stored in Git.

Recommended location:

```text
supabase/policies/
```

RLS tests:

```text
supabase/tests/
```

Test:

- anonymous access;
- citizen access;
- officer access;
- ward boundaries;
- department scope;
- municipal scope;
- admin scope;
- revoked roles;
- expired assignments.

Phase 1 also applies column privileges: citizens can directly update only safe profile fields. Device mutation is API-only and uses service-role-only database functions that commit registration/revocation and the corresponding audit event in one transaction. Authenticated SQL reads expose only safe device metadata; identifier hashes and push tokens remain server-only. Profile and device visibility for municipal administrators requires the target user to have a current active membership, while historical role and membership records remain available through their scoped tables. Effective access helpers require both a current role assignment and, for authority-scoped roles, a current authority membership.

---

## Storage Metadata

Supabase Storage objects should be linked to database media records.

Do not rely only on storage object names.

Media record should include:

- complaint ID;
- uploader;
- storage bucket;
- storage path;
- MIME type;
- checksum;
- size;
- processing status;
- moderation status;
- capture source;
- capture time;
- capture location.

---

## Database Backups

Production requirements:

- point-in-time recovery where available;
- daily backups;
- restore test;
- backup retention policy;
- export procedure;
- incident runbook.

---

## Generated Types

Generate the current committed `public` schema types after migrations with the repository script:

```bash
pnpm database:types
```

Expand the script's schema list only after later-phase migrations create those schemas. Generated types are committed and verified in CI.

---

## Database Testing

Phase 1 commits three ordered migrations:

- `20260713100000_phase_1_identity_and_access.sql`;
- `20260713130000_restrict_device_sensitive_column_access.sql`;
- `20260713150000_atomic_device_lifecycle_and_access_provenance.sql`.

A clean local reset and schema lint pass. The three pgTAP plans contain 154 assertions covering schema/privilege invariants, RLS scope and lifecycle behavior, and atomic device/audit operations including rollback on audit failure.

Required:

- migration tests;
- RLS tests;
- foreign key tests;
- status transition tests;
- spatial routing tests;
- concurrent complaint assignment tests;
- idempotency tests;
- notification outbox tests.
