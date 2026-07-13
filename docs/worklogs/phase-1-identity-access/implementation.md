# Phase 1 Implementation

## Database

The Phase 1 migration series creates `profiles`, `devices`, `roles`, `user_roles`, `authority_memberships` and `auth_audit_events`. It provisions a profile and citizen role from new `auth.users`, maintains safe identity copies, versions role/membership periods, protects audit history, and exposes narrowly granted security functions.

System roles are seeded idempotently. Public tables use forced RLS and explicit grants. The service-role-only government invitation function writes membership, role assignment and audit history atomically. Device registration/revocation functions likewise commit the mutation and audit event together, and direct authenticated device mutation is denied. Forward-fix migrations restrict sensitive device columns and former-member PII, preserve membership approval provenance, retain lifecycle actors through restrictive foreign keys, and store audit attribution UUIDs as immutable snapshots. A separate one-time bootstrap function makes the first platform-admin path reachable without committing environment users.

## Shared Packages and API

`packages/types`, `packages/validation`, `packages/database` and `packages/config` contain the shared identity contracts, Zod input schemas, generated database types and explicit environment validation.

The NestJS API adds:

- bearer-token verification and application account-state checks;
- request ID propagation and stable success/error envelopes;
- exact-origin CORS;
- profile read/update;
- device list/register/revoke;
- effective user and government scope;
- restricted authentication audit ingestion marked as client-reported;
- scoped government invitations with provider rollback/reconciliation.

## Clients

The Expo app implements phone/email passwordless sign-in, deep-link callback handling, secure session restoration, profile/language setup, hashed device registration and sign-out. The registration contract accepts only an exact lowercase SHA-256 client digest, and the API hashes that digest again before database persistence.

The citizen web app uses the current Supabase SSR PKCE cookie pattern for phone/email sign-in, callback exchange, protected profile actions and sign-out. Government invitations use a custom one-time token-hash email link because administrator invites do not originate a PKCE verifier; the government callback verifies `type=invite` and writes the SSR session. The dashboard then shows only effective API-derived authority scope. The admin console exposes the server-validated invitation workflow to authorized administrators.

## Infrastructure and CI

The repository pins the Supabase CLI, commits local Auth configuration and its invite template, validates migrations/RLS/generated types in CI, always runs the local email/invite Auth flows in the database job, and runs phone E2E only when a real SMS provider is explicitly enabled. Redis was removed from the active development Compose topology; no BullMQ or Sentry dependency was added.
