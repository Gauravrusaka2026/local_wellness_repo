# ADR-0020: Use Email Password and Staged MFA

## Status

Superseded by [ADR-0028](0028-enforce-citizen-phone-mfa-for-mobile-password-access.md)

ADR-0028 was subsequently superseded by
[ADR-0033](0033-use-confirmed-phone-auth-without-citizen-mfa.md). The Phone-MFA/AAL2 material below
is retained as architectural history and is not the current citizen authentication policy.

## Date

2026-07-16

## Context

Citizen authentication must work without custom email-template access while supporting an explicit
email/password experience and phone verification. The staging project does not yet have an SMS
provider. Enforcing a phone factor before delivery and recovery are proven would lock citizens out.
Government and platform-administrator access also needs stronger assurance without weakening the
existing invitation, membership, role, and scope boundary.

Supabase Storage and Edge Functions can preserve files or invoke a provider, but they are not an SMS
carrier and a custom OTP table would not establish Supabase Auth `aal2`. Passwords, recovery codes,
phone challenges, MFA factors, and sessions must remain owned by Supabase Auth.

## Decision

- Citizen web and mobile use Supabase email/password account creation and sign-in. Password recovery
  uses the provider recovery flow and returns non-enumerating request responses.
- Citizen phone verification uses Supabase Phone MFA enrollment, challenge, and verification. A
  current verified phone factor plus `aal2` is the enforceable proof; a phone value in profile or
  user metadata is not sufficient.
- Phone MFA has matching `observe` and `enforce` modes in the citizen clients and API. `observe` is
  the default until Advanced Phone MFA, an approved SMS provider, recovery, rate limits, and hosted
  device tests are operational. `enforce` must be enabled across all three boundaries together.
- Government and administrator clients retain invitation/passwordless email entry and provider-
  default callback compatibility. Privileged sessions enroll and verify TOTP and must reach `aal2`
  when privileged enforcement is enabled.
- The API independently verifies the Auth assurance level and current factor/access evidence. A
  client redirect is usability behavior, not an authorization control.
- OTPs, passwords, recovery material, factor secrets, and bearer tokens are never stored in
  application tables, logs, analytics, or client resume state.

This ADR supersedes ADR-0019. It preserves that ADR's restricted provider-default callback behavior
for government invitations and privileged email entry while replacing citizen passwordless entry.

## Alternatives Considered

### Store and verify a custom phone OTP in Supabase Storage or PostgreSQL

Rejected because neither service delivers SMS, the design would duplicate credential handling, and
successful verification would not create a Supabase Auth phone factor or `aal2` session.

### Require phone MFA immediately

Rejected until delivery, recovery, abuse controls, and representative-device testing are working.
An observe-first rollout preserves access without misrepresenting verification as complete.

### Keep citizen email magic links as the primary experience

Rejected for the requested product flow. Existing provider callbacks remain narrowly compatible
for legacy sessions and recovery, but new citizen entry is email/password.

## Consequences

- Citizens can create, recover, and use accounts before SMS is configured.
- Production phone verification requires a paid/configured provider capability and Indian
  TRAI/DLT compliance where applicable; Supabase Pro alone does not deliver messages.
- Switching only a client or only the API to `enforce` can produce inconsistent access, so rollout
  configuration and smoke testing are an operator gate.
- Disabling email confirmation is required when phone MFA is intended as the signup-verification
  step; otherwise Supabase may withhold the initial session until email confirmation.

## Implementation Notes

- Keep `API_CITIZEN_PHONE_MFA_MODE`, `NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE`, and
  `EXPO_PUBLIC_PHONE_MFA_MODE` at `observe` until the managed gate passes.
- Enable email/password, allow-list exact recovery redirects, configure Phone MFA enrollment and
  verification, then configure a supported SMS provider or reviewed Send SMS Hook.
- Test signup, sign-in, password reset, factor enrollment, challenge/retry/expiry, recovery,
  rate-limit, sign-out, and both `aal1` and `aal2` API behavior before enforcement.

## Related Documents

- `docs/adr/0033-use-confirmed-phone-auth-without-citizen-mfa.md`
- `docs/adr/0028-enforce-citizen-phone-mfa-for-mobile-password-access.md`
- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0019-support-provider-default-passwordless-callbacks.md`
- `docs/authentication.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
