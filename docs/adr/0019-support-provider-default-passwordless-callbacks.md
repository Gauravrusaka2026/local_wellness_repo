# ADR-0019: Support Provider-Default Passwordless Callbacks

## Status

Accepted

## Date

2026-07-16

## Context

Local Wellness uses Supabase Auth for passwordless citizen, government, and administrator
authentication. The repository's local templates intentionally deliver a six-digit token for
deterministic testing, but a managed Supabase project may use the provider's default
`ConfirmationURL` and invite templates. Requiring template-edit permission would make application
authentication depend on an operator capability that is not always available.

Ordinary browser sign-in requests originate from the Supabase SSR browser client and therefore have
a PKCE verifier. Supabase administrator invitations are different: the trusted server creates them
without a browser-held PKCE verifier, and the provider's default invite confirmation can return a
session in the redirect fragment. Authorization must remain independent of either delivery format.

## Decision

- Keep phone/email code entry and accept provider-default secure links alongside it. A managed
  template may contain a token, a confirmation URL, or both.
- Use the Supabase SSR PKCE flow for citizen, government, and administrator browser sign-in. The
  callback consumes one code or explicitly supported token hash, requires a verified session, and
  then reloads through the existing application guards.
- Make callback completion a one-shot client operation so URL fragments are available when needed.
  Capture the callback once, immediately replace browser history with the clean callback path, and
  never log callback values.
- Reject implicit fragment sessions in citizen and administrator callbacks. Only the government
  callback—the configured destination of the trusted invitation workflow—may accept a complete
  access/refresh fragment, and only when the provider type is exactly `invite`.
- Treat callback completion as authentication only. It cannot create a government membership,
  assign a role, select a scope, or bypass API/RLS checks. The trusted invitation transaction must
  already have persisted current membership and role evidence.
- Keep mobile on PKCE or reviewed `email`, `magiclink`, and `signup` token hashes. Reject raw mobile
  fragment sessions, provider errors, duplicate methods, and invite/recovery types. Use an installed
  development or release build for the stable `localwellness://auth/callback` scheme.
- Require exact environment-specific callback entries in the Supabase redirect allow-list. Template
  editing is optional; redirect configuration and delivered-flow smoke testing are not.

## Alternatives Considered

### Require custom code-only and token-hash templates in every managed project

Rejected as the only supported path because it makes working authentication depend on template
editor access. Those templates remain supported and are still useful for deterministic local tests.

### Accept any complete implicit fragment on every web client

Rejected because ordinary sign-in already has PKCE evidence and broad fragment acceptance would
unnecessarily increase login-session fixation exposure.

### Add passwords or a custom authentication/email service

Rejected because it would expand the credential and recovery attack surface, duplicate Supabase
Auth, and introduce an unrelated provider solely to work around presentation templates.

## Consequences

- Managed projects can use their default Supabase email templates without an application release or
  a custom mail sender.
- The three Next.js callback routes are dynamic client bridges rather than server-only route
  handlers, because URL fragments are never sent to the server.
- A default government invite fragment exists briefly in browser memory. It is accepted only on the
  government callback, must be complete and typed `invite`, is removed from history before network
  completion, and still yields no authorization without current database evidence.
- PKCE links must return to the browser or installed app that initiated the request. A delivered
  code is the cross-device fallback only when the chosen template includes one.
- Expo Go's temporary `exp://` URL is not a stable production-like callback target; installed build
  validation remains required.

## Implementation Notes

- Reject duplicate, partial, ambiguous, unsupported, oversized, whitespace-altered, or
  provider-error callback parameters.
- Do not place access tokens, refresh tokens, OTPs, token hashes, callback URLs, or PKCE codes in
  structured logs, audit metadata, analytics, or error messages.
- Keep callback pages free of third-party resources and redirect only to validated same-origin
  application paths.
- Smoke-test code, PKCE link, default government invite, expiry/reuse, SSR cookie persistence,
  current role/membership denial, and sign-out in each managed environment.

## Related Documents

- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/authentication.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
- `docs/KNOWN_ISSUES.md`
