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

Phase 2 adds restrictive foreign keys from `authority_memberships`, non-global `user_roles`, and authority-attributed audit events to `governance.authorities`. The forward fix first preserves any older arbitrary identifier as a `placeholder`/`other` authority with routing disabled, so an upgrade does not discard access history or misrepresent a legacy UUID as verified governance data. Placeholder authority scopes are retained for remediation but excluded from effective access. Scoped role writes additionally validate authority, ward, and authority-department ownership.

### Governance

- reference_sources;
- import_batches;
- import_files;
- import_records;
- authorities;
- states;
- districts;
- talukas;
- local_bodies;
- local_body_districts;
- administrative_units;
- wards;
- departments;
- authority_departments;
- offices;
- officer_roles;
- officers;
- officer_assignments;
- utilities;
- emergency_contacts;
- jurisdiction_boundary_versions;
- complaint_routing_references.

The Phase 2 tables live in an unexposed `governance` schema. `authorities` is the common identity used by access control; typed tables preserve the actual hierarchy. Nullable `lgd_code` fields are distinct from synthetic/source codes, retain leading zeroes as text, and use partial unique indexes only when a real code exists. A local body may cover more than one district through `local_body_districts`.

Every normalized source-backed row points to an immutable import record and, where available, an official reference URL. Verification status, last-verified date, placeholder state, and routing eligibility are separate fields. Database checks make routing eligibility possible only for active, verified, non-placeholder rows. The baseline intentionally creates no named officer, officer assignment, or boundary version because the canonical files contain no safely verified incumbent or geometry.

Officer roles are durable definitions. Incumbency belongs to versioned `officer_assignments`. Boundary geometry and complaint-routing references are versioned independently with half-open UTC effective periods. Routing rows from the baseline remain `draft`, `unresolved`, and non-routable; they are reference evidence for Phase 3, not executable rules.

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
status
reference_source_id
source_version
verification_status
last_verified_on
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

Phase 2 enables PostGIS in the `extensions` schema. Jurisdiction geometry is stored separately from durable entities in `governance.jurisdiction_boundary_versions` as non-empty, valid `MultiPolygon` values with SRID 4326 and longitude/latitude coordinates constrained to the valid world envelope.

Required spatial data:

- complaint points;
- municipality polygons;
- ward polygons;
- district polygons;
- asset points;
- road lines;
- special jurisdiction polygons.

Implemented Phase 2 index:

```sql
create index jurisdiction_boundary_versions_boundary_gix
on governance.jurisdiction_boundary_versions
using gist (boundary);
```

The service-role-only `governance.resolve_jurisdiction` function uses `ST_Covers`, so a coordinate exactly on a polygon edge is included. It considers only effective, active, verified, non-placeholder, routing-eligible local-body and ward boundaries. The function returns boundary version identifiers for auditability and does not execute complaint assignment.

---

## Routing Query

Conceptual query:

```sql
select *
from governance.resolve_jurisdiction(:longitude, :latitude, :resolved_at);
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

Phase 2 seed inputs are hash-pinned by `resources/governance/manifests/phase-2-baseline.v1.json`. Generate, validate, and check them with:

```bash
pnpm governance:data:validate
pnpm governance:data:generate
pnpm governance:data:check
```

The generated main SQL is `supabase/seed/20_phase_2_governance.generated.sql`; `21_phase_2_governance_checksum.generated.sql` records its externally computed checksum without self-reference. Supabase applies both before `supabase/seed/roles.sql` by lexical path order. Never edit generated SQL or canonical CSVs manually; update the versioned source bundle and manifest, review validation output, then regenerate all artifacts together.

The Phase 2 seed contains:

- Maharashtra state;
- the supplied district, taluka, and urban-local-body structural baseline;
- synthetic wards marked as placeholders and routing-ineligible;
- departments;
- officer roles;
- offices and utilities;
- emergency-contact references;
- unresolved complaint-routing references;
- all raw source rows and import provenance.

Template Gram Panchayat and village rows remain in raw provenance rather than becoming named entities. Current-officer placeholders create zero officer and assignment rows. Never commit production officer personal data, credentials, or secrets into seed files.

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

Phase 2 enables and forces RLS on every governance table. Anonymous roles receive no schema usage. Authenticated users receive no governance mutation privileges; verified, active, non-placeholder directory rows are selectable only through explicit policies, and authority managers may read their own managed scope. Import ledgers require platform-administrator scope. Officer/person and assignment rows are never public-directory data. The service role has explicit non-destructive DML and jurisdiction-resolution privileges but no delete grant on retained version/import history. The schema is also absent from the local Data API schema allow-list, so RLS and grants remain defense in depth for direct database access rather than an accidental public API.

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

Generate the current committed `public` and `governance` schema types after migrations with the repository script:

```bash
pnpm database:types
```

The script writes through a temporary file and replaces the committed output only after the Supabase CLI and formatter succeed. CI runs `pnpm database:types:check` to detect drift without truncating the committed file on generation failure.

---

## Database Testing

Phase 1 commits three ordered migrations:

- `20260713100000_phase_1_identity_and_access.sql`;
- `20260713130000_restrict_device_sensitive_column_access.sql`;
- `20260713150000_atomic_device_lifecycle_and_access_provenance.sql`.

A clean local reset and schema lint pass. The three pgTAP plans contain 154 assertions covering schema/privilege invariants, RLS scope and lifecycle behavior, and atomic device/audit operations including rollback on audit failure.

Phase 2 adds seven ordered migrations for the governance schema, security/version guards, identity-authority forward fix, jurisdiction resolution, scope immutability/effective-access hardening, authority parent-type enforcement, and coordinate-envelope/placeholder-access hardening. Its five pgTAP plans contain 194 assertions covering schema and indexes, canonical seed counts and quarantine state, RLS/ACL visibility, hierarchy and role-scope constraints, temporal versioning, and synthetic PostGIS resolution. All eight database plans contain 348 passing assertions. Source-pipeline unit tests independently cover manifest/hash/title/header/row-width drift, malformed rows, duplicate keys, missing values, placeholders, cross-file references, deterministic IDs, SQL escaping, generated-artifact drift and failure atomicity.

Required:

- migration tests;
- RLS tests;
- foreign key tests;
- status transition tests;
- spatial routing tests;
- concurrent complaint assignment tests;
- idempotency tests;
- notification outbox tests.
