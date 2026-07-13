# ADR-0006: Use Supabase Auth and Database-Enforced Access Control

## Status

Accepted

## Date

2026-07-13

## Context

Phase 1 requires passwordless citizen authentication and invitation-only government access. Authorization must account for authority scope, role expiry, revocation, and attempts by clients to grant themselves privileged access. Mobile and web clients also need platform-appropriate session persistence without receiving server credentials.

## Decision

Use Supabase Auth as the V1 identity provider and PostgreSQL Row Level Security as the mandatory data-access boundary.

- Citizens authenticate with phone OTP or email OTP/magic links.
- Government users are invited through the trusted NestJS API and receive explicit, time-bound authority memberships and role assignments.
- Supabase Auth identities are extended by the six Phase 1 identity tables in the exposed `public` schema.
- RLS, column privileges, and server-managed assignment tables prevent client-side role escalation.
- The API validates bearer tokens with Supabase Auth, reauthorizes each operation, and uses a current secret key (or legacy service-role key) as its trusted persistence boundary. The privileged key never reaches clients.
- Mobile sessions use Expo SecureStore. Next.js sessions use the Supabase PKCE cookie integration.
- Authentication and access-management actions create append-only audit events without recording OTPs, bearer tokens, or raw device identifiers.

## Alternatives Considered

- API-only authorization without RLS: rejected because direct Supabase access would lack a mandatory database boundary and a controller bug could expose cross-scope data.
- Custom password and token infrastructure: rejected because it duplicates high-risk identity functionality already provided by the selected core platform.
- Client-managed government onboarding: rejected because clients must never choose privileged roles or authority assignments.
- JWT custom claims as the only role source: rejected because expiry and revocation would remain stale until token refresh and would be harder to audit transactionally.

## Consequences

- Authorization remains effective for direct Supabase queries and API-mediated access.
- Role and membership revocation takes effect from current database state rather than waiting for a JWT refresh.
- Trusted API persistence and invitation operations require a server-only Supabase secret/service-role key and explicit owner/scope checks.
- Hosted phone and email delivery still require environment-specific provider configuration outside source control.
- Future governance tables can add a foreign key for `authority_id`; Phase 1 stores UUID scope identifiers without inventing Phase 2 entities.

## Implementation Notes

- All exposed identity tables have RLS enabled and forced.
- Privilege checks require active, non-expired roles and memberships.
- Profile rows are provisioned from `auth.users` by a narrowly scoped security-definer trigger.
- Role and membership mutations are not granted to client database roles.
- Local pgTAP tests cover anonymous denial, cross-user and cross-authority isolation, expiry, revocation, sensitive-column isolation, and role-escalation attempts.
- The local Auth harness verifies email magic-link sign-in. Its phone OTP case runs only when a real local SMS provider is configured and explicitly enabled.

## Related Documents

- `PLAN.md`
- `docs/architecture.md`
- `docs/authentication.md`
- `docs/database.md`
- `docs/api.md`
- `docs/supabase-setup.md`
