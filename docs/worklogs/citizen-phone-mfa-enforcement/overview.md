# Citizen Phone MFA Enforcement

## Status

Superseded by
[ADR-0033](../../adr/0033-use-confirmed-phone-auth-without-citizen-mfa.md) on 2026-07-23. This
worklog preserves the earlier ADR-0028 implementation record; its Phone-MFA factor, AAL2,
zero-factor fallback, and factor-reset instructions are not the current citizen design. Current
implementation evidence lives in
[`citizen-phone-verification-without-mfa`](../citizen-phone-verification-without-mfa/overview.md).

## Objective

Keep email and password as the citizen account credential while requiring a verified phone OTP session for private application access and every password change. Password recovery must preserve that requirement when a verified phone factor already exists, while still allowing a legacy account with no phone factor to recover its password once and enroll a phone at the next sign-in.

## Delivered

- Email/password sign-in and account creation continue to use Supabase Auth.
- Phone MFA is enforced by default after password authentication.
- Existing verified phone factors are challenged; accounts without a factor are guided through enrollment and verification.
- Signed-in password changes require a new phone OTP even when the current session is already AAL2.
- A successful phone verification grants a five-minute, in-memory password-change proof bound to the current user and phone factor.
- Immediately before Supabase receives a phone-protected password update, the app rechecks that the
  current authenticator assurance remains AAL2 and that the current session still belongs to the
  proof's user. An AAL1 downgrade or account replacement cannot consume an earlier proof.
- Recovery callbacks accept one unambiguous Supabase PKCE code or recovery token hash and reject malformed or mixed credentials.
- Recovery with an existing verified phone factor requires a fresh OTP before showing the password form.
- Recovery without any verified phone factor has a narrowly scoped email-recovery fallback. The factor list is checked again immediately before the password update, and the next sign-in must enroll and verify a phone before private access.
- A registered but inaccessible phone factor is not bypassed. The UI directs the citizen to an administrator-assisted factor reset.
- The operator path is documented in the
  [citizen lost-phone factor-reset runbook](../../runbooks/citizen-lost-phone-factor-reset.md), with
  two-person approval, exact factor selection, audit evidence, old-session denial, replacement
  enrollment, and safe communication. Managed rehearsal remains a release gate.
- Successful password updates immediately request global sign-out. If global revocation fails, the device is signed out locally and the user receives an explicit warning. Only after those revocation attempts does the app wait, for at most two seconds, for the best-effort `password_changed` audit append.
- Successful OTP verification never waits for non-critical audit delivery; `otp_verified` is
  dispatched as handled best-effort telemetry after Supabase has established AAL2.
- OTP resend cooldowns, double-submit protection, and actionable phone/authentication error states are included.
- Enrollment-disabled, verification-disabled and provider-send failures are now distinct error
  states so an operator can correct the managed Supabase gate before debugging Twilio delivery.
- The profile screen exposes the signed-in password-change flow.

## Security Boundary

The mobile client sends the new password only to Supabase Auth. It does not send passwords, OTP values, recovery credentials, or the temporary phone proof to the Local Wellness API and does not persist them to local storage.

The default mobile and API citizen MFA modes are `enforce`. `observe` remains an explicit diagnostic setting rather than the default.

## Related Decision

The architectural decision and migration from the earlier staged model are recorded in [ADR-0028](../../adr/0028-enforce-citizen-phone-mfa-for-mobile-password-access.md).

## Release State

This milestone is ready for managed-environment smoke testing, not yet for a production-ready
declaration. See [testing.md](testing.md) for the completed checks,
[open-issues.md](open-issues.md) for the remaining operator work, and the
[lost-phone reset runbook](../../runbooks/citizen-lost-phone-factor-reset.md) for the recovery
rehearsal.
