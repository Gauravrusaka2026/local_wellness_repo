# Phase 1 Decisions

## Architectural Decisions

- ADR-0006 selects Supabase Auth and database-enforced scoped authorization.
- ADR-0007 records the owner-directed deferral of Redis, BullMQ and Sentry beyond V1.

## Implementation Decisions

- Current database state, not JWT role metadata, determines effective access.
- Authority identifiers remain UUIDs without a foreign key until the Phase 2 governance table exists.
- Admin-created government invitations are also the approval action: membership and role become active atomically, while Supabase Auth still prevents use until the recipient completes invited sign-in.
- Operational roles are grantable by an active municipal administrator for the same authority. Privileged roles require a platform administrator.
- The first platform administrator is created only through a one-time, service-role-only database function invoked by an explicit operator command.
- Raw installation identifiers never enter the database. Mobile hashes the local identifier and the API hashes the submitted value again before storage.
- Device registration and revocation are server-mediated database transactions so their audit events cannot be separated from the mutation or bypassed through direct authenticated writes.
- A revoked device identifier cannot silently reactivate, but registry revocation does not invalidate an already-issued Supabase session.
- Browser API access uses an exact environment allow-list and bearer tokens; the API does not accept credentialed cross-origin cookies.
- Client-submitted audit events are restricted to self-session events and marked `client_reported`. Administrative, device and access-denial events are server-generated.
- Audit actor, subject and device UUIDs are immutable snapshots. Access-lifecycle actor foreign keys restrict deletion to retain provenance.
- Administrator invite emails use a one-time `token_hash` callback; ordinary email sign-in uses PKCE.
