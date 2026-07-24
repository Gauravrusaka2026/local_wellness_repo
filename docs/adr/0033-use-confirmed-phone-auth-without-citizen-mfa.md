# ADR-0033: Use Confirmed Phone Auth Without Citizen MFA

## Status

Accepted

## Date

2026-07-23

Amended on 2026-07-24 after local Auth E2E proved that Supabase rejects
`signInWithOtp({ phone, shouldCreateUser: false })` when Phone Auth signup is disabled.

## Context

Citizen accounts use Supabase email and password as their primary application sign-in method.
ADR-0028 required Supabase Advanced Phone MFA, a verified phone factor and an `aal2` session before
private citizen access. The configured Twilio Verify credentials enable the ordinary Supabase Phone
provider, but they do not activate the separately managed Advanced Phone MFA add-on. The resulting
`mfa_phone_enroll_not_enabled` and `mfa_phone_verify_not_enabled` errors prevent citizens from
completing the required flow.

The V1 requirement is to confirm that a citizen controls a mobile number and to require a fresh SMS
code before a supported password change. Government and platform-administrator accounts have a
different risk profile and must retain their existing TOTP/`aal2` policy.

Supabase ordinary Phone Auth can attach a phone to an authenticated email account with
`updateUser({ phone })`, confirm it with a `phone_change` OTP, and create a fresh phone-auth session
with an `sms` OTP. It does not create an MFA factor and it remains `aal1`. Once confirmed, the phone
is also a Supabase passwordless sign-in identity even when JagrukSetu only presents email/password
on its sign-in screen.

## Decision

- Keep email/password as the only citizen sign-up and sign-in method presented by JagrukSetu.
- Use ordinary Supabase Phone Auth for citizen phone confirmation:
  - request a change with `updateUser({ phone })`;
  - resend with `resend({ type: 'phone_change' })`;
  - confirm with `verifyOtp({ type: 'phone_change' })`;
  - require the returned and subsequently fetched user ID, normalized phone, and
    `phone_confirmed_at` value to match the initiating email account.
- Define a verified citizen phone from current `auth.users.phone` and
  `auth.users.phone_confirmed_at`, not profile metadata, JWT phone claims or `auth.mfa_factors`.
- Require that confirmed-phone state for private citizen API access when the citizen phone
  verification mode is `enforce`. Do not require citizen `aal2`.
- Keep privileged government and platform-administrator TOTP/`aal2` enforcement unchanged.
- Before a supported signed-in or recovery password change:
  - require an already confirmed phone on the expected account;
  - send an ordinary phone OTP with `shouldCreateUser: false`;
  - verify it on an isolated, non-persistent Supabase client;
  - require the resulting user ID and normalized phone to match the expected account;
  - immediately update the password through that isolated Supabase session;
  - append non-sensitive best-effort audit events and globally revoke sessions;
  - clear the persistent mobile session locally.
- Continue to start forgotten-password recovery with the generic Supabase email recovery link.
  Accounts without a previously confirmed phone fail closed and require reviewed support recovery;
  there is no email-only password-update fallback.
- Keep passwords and OTP values out of the Local Wellness API, PostgreSQL, Storage, logs and
  persistent mobile state. Do not introduce a custom OTP table, Edge Function or NestJS password
  endpoint.
- Enable ordinary Phone Auth signup capability because Supabase uses that provider gate even when
  an existing linked user requests an OTP with `shouldCreateUser: false`. Install and activate a
  Before User Created Auth Hook that rejects every new Auth user without a non-empty email. This
  keeps existing linked-phone OTP working while phone-only account creation fails closed. Enable
  phone confirmations and the configured Twilio Verify transport. Disable citizen Phone MFA
  enrollment and verification; keep TOTP enabled for privileged accounts.
- Prefer the new `*_PHONE_VERIFICATION_MODE` environment variables. Accept the former
  `*_PHONE_MFA_MODE` names temporarily as deprecated compatibility inputs.

This ADR supersedes ADR-0028. It changes the citizen assurance model, but it does not change the
privileged TOTP policy.

ADR-0034 complements this decision for exceptional existing citizen accounts that already have a
verified authenticator. Those accounts step up the current session through that factor before a
phone mutation; ordinary no-factor citizens remain on this ADR's direct `phone_change` SMS path.

## Alternatives Considered

### Activate Advanced Phone MFA

Rejected for V1 because the requested flow must work without the separately managed Advanced Phone
MFA feature. Advanced MFA remains a valid future option if true second-factor `aal2` is required.

### Use `auth.reauthenticate()` before password changes

Rejected because Supabase sends the reauthentication nonce to a confirmed email first and uses the
phone only when no confirmed email exists. That does not guarantee the required phone challenge for
email/password citizens.

### Build a custom Twilio verification service

Rejected for V1 because it would move OTP orchestration and password administration into the
application backend, add server-side Twilio secrets, and materially expand the credential-handling
surface.

### Retain email-only recovery for accounts without a phone

Rejected because the stated password-change policy requires a verified phone. A reviewed support
path is clearer than silently weakening the supported recovery flow.

## Consequences

- Twilio Verify plus the ordinary Supabase Phone provider is sufficient; Advanced Phone MFA does not
  need to be enabled for citizen flows.
- Citizen sessions remain `aal1`. Privileged users still require their own TOTP and `aal2`.
- Confirmed phone state is server-checked for every citizen API access-context load and is never
  trusted from editable metadata.
- A linked phone is an alternate Supabase passwordless sign-in identity. JagrukSetu can omit phone
  sign-in from its UI, set `shouldCreateUser: false`, and block phone-only user creation through
  the Before User Created hook, but it cannot prevent a custom client from using a valid phone OTP
  for an existing linked account.
- The fresh-phone password rule is enforced by supported JagrukSetu flows, not by a provider-wide
  hook. A direct Supabase client with a valid account session is outside that application gate.
- Supabase currently documents an ambiguity risk when stale duplicate `phone_change` values exist.
  The client binds verification to the initiating user and fails closed on any post-verification
  mismatch. Managed monitoring and a future server-side stale-claim preflight remain release
  hardening work.
- Citizens who lose their confirmed phone need reviewed support recovery. Existing MFA-factor reset
  instructions do not apply to this ordinary Phone Auth design.

## Implementation Notes

- Apply additive migration
  `supabase/migrations/20260723130000_citizen_phone_verification_without_mfa.sql` followed by
  `supabase/migrations/20260724100000_require_email_identity_for_auth_signup.sql`. The complete SQL
  Editor alternative is `supabase/deploy/citizen-phone-verification-without-mfa.sql`; SQL Editor
  execution requires separate migration-ledger reconciliation.
- Set `API_CITIZEN_PHONE_VERIFICATION_MODE=enforce`,
  `EXPO_PUBLIC_PHONE_VERIFICATION_MODE=enforce`, and
  `NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE=enforce`.
- In local Supabase configuration, enable Phone Auth signup and phone confirmations, disable Phone
  MFA enrollment/verification, and activate
  `pg-functions://postgres/public/hook_require_email_identity` as the Before User Created hook.
  Retain deterministic test OTPs only in local configuration.
- In every managed environment, enable the Phone provider, configure Twilio Verify, enable phone
  confirmations and Phone Auth signup, then activate `public.hook_require_email_identity` as the
  Before User Created hook. Confirm a phone-only signup is rejected before reviewing SMS rate
  limits, CAPTCHA and change notifications.
- Never persist the isolated phone-auth client, access token, refresh token, OTP or password.
- Treat the mobile reset-password screen as the owner of its isolated recovery session. On
  unmount, locally sign out any session established during email exchange or phone inspection that
  has not reached the completed password-change cleanup.
- Treat `PHONE_VERIFICATION_REQUIRED` as a citizen access requirement, not an MFA/AAL2 error.
- Rehearse phone linking, resend, wrong/expired codes, identity mismatch denial, password change,
  recovery, global sign-out, lost-phone support and privileged TOTP regression on managed devices.

## Related Documents

- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0026-use-verified-jwt-claims-for-api-authentication.md`
- `docs/adr/0028-enforce-citizen-phone-mfa-for-mobile-password-access.md`
- `docs/adr/0034-step-up-existing-authenticator-before-citizen-phone-change.md`
- `docs/authentication.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/database.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
- `docs/KNOWN_ISSUES.md`
