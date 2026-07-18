# ADR-0025: Use Password Sign-In for Pre-Provisioned Privileged Identities

## Status

Accepted

## Date

2026-07-18

## Context

The Government Dashboard and Admin Console already support invitation-controlled email code or
secure-link authentication. A staging demonstration also needs repeatable synthetic users for
platform administration, municipal administration, government operations, ward queues, and
department queues. Synthetic `localwellness.test` identities cannot receive provider email, and
manually sharing one official account or authenticator would undermine attribution and scope tests.

Authentication is only the first privileged-access gate. A signed-in identity must still complete
its own TOTP challenge at AAL2 when enforcement is enabled and must have a current database role,
authority membership, and scope. Password sign-in must not become an account-creation path, an MFA
bypass, or an alternative authorization source.

## Decision

- Allow the Government Dashboard and Admin Console to authenticate an existing Supabase Auth
  identity by email/password in addition to the existing email code/link flow.
- Password sign-in establishes only an Auth session. Both portals immediately continue through the
  existing TOTP/AAL2 flow and current API/database authorization checks. A password never grants a
  role, membership, scope, or MFA exemption.
- Provide a trusted operator script for synthetic staging accounts only. It requires an explicit
  non-production acknowledgement, the exact 20-character hosted project reference, an exact
  reviewed authority name, and an HTTPS Supabase URL whose host matches that project reference.
- Create separate confirmed `@localwellness.test` identities with generated non-deterministic
  passwords. Preassign their bounded roles through the existing trusted platform-administrator
  bootstrap and government-access persistence functions. Resolve authority, ward, and department
  scopes only from the verified, non-placeholder, routing-eligible invitation catalog.
- Give every privileged assignment an `effective_until` value from 1 to 90 days, defaulting to 30
  days. Expiry removes effective database access even if the synthetic Auth identity can still
  authenticate at AAL1.
- Write credentials only to
  `.local/staging-demo-accounts.<project-ref>.json`. The directory is gitignored, the file is forced
  to mode `0600`, and passwords, server credentials, OTPs, and authenticator secrets are not printed
  or logged. Existing synthetic passwords rotate only with an explicit operator flag.
- Require a separate TOTP enrollment for every synthetic account that is actually exercised. Never
  share one account, password artifact, or authenticator factor between testers.
- Keep invitation-first onboarding with unique official-controlled email addresses as the preferred
  production path. Synthetic password provisioning is not a production onboarding mechanism and
  does not complete the audited arbitrary existing-user assign/revoke/renew lifecycle in
  `AUTH-001`.

## Alternatives Considered

### Reuse one administrator or government identity for every demonstration

Rejected because shared credentials and factors destroy individual attribution, weaken MFA
practice, and cannot prove ward/department scope isolation.

### Send invitations to synthetic addresses

Rejected because the reserved test domain has no mailbox and would make the demonstration depend on
an unrelated external inbox. Production and real-official staging onboarding still use invitations.

### Skip TOTP for password-authenticated users

Rejected because password authentication is not equivalent to privileged AAL2 assurance. The
existing MFA and database authorization gates remain mandatory.

### Encode demo roles in Auth metadata

Rejected because current PostgreSQL membership and role records are the authorization source of
truth. Auth metadata cannot grant government access.

## Consequences

- Staging can exercise distinct platform, municipal, ward, department, and operator views without
  relying on email delivery or sharing an official identity.
- The privileged portals expose two authentication methods, but both converge on the same MFA and
  authorization path.
- The credential artifact is sensitive local operator material and requires deliberate secure
  handling and deletion after testing.
- Assignment expiry is automatic, while synthetic Auth-user deactivation and artifact cleanup
  remain explicit operator teardown tasks.
- Production onboarding policy remains invitation-first and `AUTH-001` remains open for arbitrary
  existing users, renewals, revocations, and additional scopes.

## Implementation Notes

- `pnpm access:provision-staging-demo -- ...` loads the repository-root environment and requires a
  server-only secret/service-role credential plus a public key. Neither belongs in a client bundle.
- Provisioning refuses a mismatched project host, ambiguous authority/scope, partial existing
  access, an unexpected active platform administrator, or an existing synthetic identity unless
  password rotation was explicitly requested.
- The script verifies each generated password through a separate public Supabase client and signs
  that temporary verification session out.
- Role and membership expiry must continue to be evaluated from current database state. Tests must
  cover environment guards, unique account/scope mapping, password generation, portal input
  validation, failed authentication, audit recording, and continued MFA/authorization routing.

## Related Documents

- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0020-use-email-password-and-staged-mfa.md`
- `docs/authentication.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
- `docs/worklogs/staging-privileged-demo-accounts/overview.md`
