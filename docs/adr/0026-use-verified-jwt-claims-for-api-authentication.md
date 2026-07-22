# ADR-0026: Use Verified JWT Claims for API Authentication

## Status

Accepted

## Date

2026-07-18

## Context

Every protected API request previously called Supabase Auth `getUser()` and then `getClaims()`.
`getUser()` always performs a network request, while `getClaims()` verifies an asymmetric Supabase
JWT against the project's cached public signing key. Complaint capture makes several protected API
requests, so the duplicate verification path added avoidable Auth/database traffic and latency on
the bounded staging compute.

Application authorization does not come from editable user metadata or long-lived JWT role claims.
The API and PostgreSQL still read the current profile, role, membership, jurisdiction, assignment,
and workflow state for each operation. The current staging project publishes an ES256 signing key.

## Decision

- Verify Supabase access tokens once with `supabase.auth.getClaims()`.
- Accept only signature-verified, unexpired claims with an authenticated audience and role, a UUID
  subject, and a recognized `aal1` or `aal2` assurance level.
- Read email and phone only from the verified claims and continue treating current application
  profile/role/membership data as the authorization source of truth.
- Coalesce concurrent reads of the same user's application access context only while that read is
  in flight. Do not retain a completed security-context cache.
- Use profile/role/membership revocation for immediate application lockout. A Supabase session-only
  revocation follows normal short-lived JWT expiry semantics.
- If a project uses a symmetric signing key, retain the same API contract; Supabase may fall back to
  server-side verification. Prefer asymmetric signing keys for bounded runtime load.

## Alternatives Considered

- Call `getUser()` on every request: rejected because it duplicates verified-claims work and forces
  regional Auth traffic for every API operation.
- Decode the JWT without signature verification: rejected because unverified client claims are not
  authentication.
- Cache profiles, MFA policy, roles, or memberships with a time-to-live: rejected because completed
  authorization state must not remain valid after an application revocation.
- Introduce Redis for token or authorization caching: rejected because Redis is outside V1 and is
  unnecessary for local public-key verification.

## Consequences

- Protected API requests no longer require a `getUser()` network round trip when asymmetric claims
  verification succeeds.
- Signing-key discovery follows Supabase's bounded JWKS cache and rotation behavior.
- Authorization and MFA policy continue to use current database state; concurrent request bursts
  share only the same unfinished read.
- Session-only revocation can remain usable until the short-lived access token expires. Operators
  requiring immediate denial must deactivate the application profile or role/membership as well.
- No Redis, BullMQ, Sentry, new external service, or database migration is introduced.

## Implementation Notes

- Never log or use a bearer token as a cache key. The current implementation stores no completed
  token cache.
- Reject anonymous, service-role, malformed, wrong-audience, or invalid-assurance claims.
- Keep Supabase access-token expiry bounded and test signing-key rotation before production launch.
- Continue current RLS, service-only function, and database scope checks independently of JWT
  validation.

## Related Documents

- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/authentication.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`
