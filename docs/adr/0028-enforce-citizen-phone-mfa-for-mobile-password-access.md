# ADR-0028: Enforce Citizen Phone MFA for Mobile Password Access

## Status

Superseded by [ADR-0033](0033-use-confirmed-phone-auth-without-citizen-mfa.md)

## Date

2026-07-23

## Context

Citizen accounts use Supabase email and password as their primary credential. Supabase Advanced
Phone MFA is now enabled through Twilio, so the staged observe-mode rollout in ADR-0020 no longer
matches the intended pilot access policy. Citizens must verify a phone factor before using
authenticated mobile features, and a password change must not rely only on possession of an
already-open AAL2 session.

Password recovery has a separate account-lockout constraint. A citizen with a verified phone factor
must prove possession of that factor after opening the generic email recovery link. A legacy
account with no verified phone factor needs one bounded migration path so it can recover the
password and then enroll a phone on its next sign-in. Losing an already verified phone must not
silently weaken recovery to email only.

Supabase Auth owns passwords, recovery sessions, phone factors, OTP challenges and assurance
levels. The Supabase Pro tier does not provide a provider hook that can require a particular phone
challenge for every direct password update. Application and API enforcement can therefore protect
the supported JagrukSetu flows, but cannot honestly claim that a direct Supabase Auth client is
provider-enforced by application code.

Citizen Web does not yet implement the same recovery and fresh-phone password-change experience.
Keeping its authenticated routes active would create inconsistent security behavior across the two
clients.

## Decision

- Keep citizen sign-up and sign-in on Supabase email/password.
- Require a verified Supabase Phone MFA factor and an `aal2` session for authenticated citizen
  mobile access. Mobile and API citizen modes are `enforce`; production API startup fails unless
  enforcement is explicit.
- Require a new SMS challenge for every signed-in password change, including when the current
  session is already `aal2`. Keep the resulting proof only in component memory for at most five
  minutes and bind it to the current user and factor. Recheck the current session user and AAL2
  immediately before the provider mutation.
- Process forgotten-password links through the normal Supabase recovery session. If the account
  has a verified phone factor, require a fresh challenge before showing/enabling password update.
  If it has no verified phone factor, permit one email-recovery fallback, update the password, sign
  out all sessions and require phone enrollment on the next sign-in.
- Do not offer email-only fallback when a verified phone factor exists but is unavailable. Factor
  reset is an attributed administrator operation using Supabase's reviewed recovery process.
- Send passwords directly from the client to Supabase Auth over TLS. Do not introduce a NestJS
  password endpoint, application password storage or custom OTP table.
- After a successful password update, immediately attempt global sign-out, fall back to local
  sign-out if necessary, and then give a non-sensitive best-effort `password_changed` audit at
  most two seconds to settle before returning to sign-in. Never record the password, OTP,
  challenge, recovery code, factor secret or bearer token.
- Do not make successful Phone MFA verification wait for the non-critical `otp_verified` audit
  request. Dispatch it as handled best-effort telemetry after Supabase establishes AAL2.
- Keep the ordinary audit endpoint behind citizen Phone MFA. Its only AAL1 exception is the exact
  `password_changed` body from a valid, active, non-privileged citizen whose server-queried account
  has zero verified phone factors. Existing authentication, validation and PostgreSQL rate limits
  remain active. Treat this as client-reported telemetry, not proof of the provider mutation.
- Keep Citizen Web public transparency and directory pages available, but place its authentication,
  account, owned-complaint and reporting routes behind a fail-closed `public-only` access mode
  until equivalent protected flows are delivered. Unknown future routes are protected by default.
- Open user-initiated HTTPS references inside Expo's in-app browser. Reject non-HTTPS and
  credential-bearing URLs without echoing sensitive or signed URLs in errors. Native settings,
  emergency telephone, authentication deep links and internal routes keep their platform-native
  handlers.

This ADR supersedes ADR-0020. It preserves email/password as the core credential and Supabase Phone
MFA as the second factor, but replaces observe-first citizen access with mobile/API enforcement and
an explicit recovery policy.

ADR-0033 subsequently replaced this citizen Phone-MFA/AAL2 design with ordinary confirmed-phone
OTP. The decision and consequences below remain an immutable record of the superseded design.

## Alternatives Considered

### Keep citizen MFA in observe mode

Rejected because Twilio and Advanced Phone MFA are now available and the product requirement is
mandatory phone verification. Observe mode would continue admitting AAL1 mobile sessions.

### Put password changes behind a NestJS endpoint

Rejected because the API would receive or relay a password and expand the credential-processing
surface. Supabase Auth already provides the reviewed password update and global sign-out boundary.

### Allow email recovery whenever SMS is unavailable

Rejected for accounts that already have a verified phone factor because it silently removes the
required second factor. Only legacy accounts with zero verified phone factors receive the bounded
fallback.

### Keep protected Citizen Web routes active

Rejected until they implement the same fresh-phone challenge and recovery behavior. A public-only
web surface is clearer and safer than two inconsistent citizen security policies.

### Build a custom OTP service

Rejected because it would duplicate high-risk credential state and would not establish Supabase
Auth `aal2`.

## Consequences

- New and returning mobile citizens cannot enter authenticated application routes until Phone MFA
  succeeds.
- Password changes require an additional SMS even during an AAL2 session. This adds friction and
  provider cost in exchange for explicit recent proof.
- A legacy no-factor recovery can restore access without SMS, but global sign-out and the normal
  enforced next sign-in prevent continued protected use without enrollment.
- Accounts with a lost verified phone require support/admin recovery; the app cannot bypass that
  control.
- Citizen Web is intentionally limited to public pages for this milestone. Its authenticated code
  remains latent behind explicit `full` mode for future implementation and testing.
- Supported application paths enforce the policy, while operator controls must still prevent
  untrusted direct use of Supabase credentials. The application does not overstate this as an Auth
  provider hook.
- The legacy recovery audit exception cannot prove the preceding password update and has a small
  factor-state time-of-check/time-of-use window. Its effect is limited to one allow-listed,
  rate-limited append-only event and grants no other protected API access.
- Twilio delivery, rate limiting, exact recovery redirects, abuse monitoring and physical-device
  testing remain operational release gates.

## Implementation Notes

- Set `API_CITIZEN_PHONE_MFA_MODE=enforce` and
  `EXPO_PUBLIC_PHONE_MFA_MODE=enforce`.
- Set `NEXT_PUBLIC_CITIZEN_ACCESS_MODE=public-only` and retain
  `NEXT_PUBLIC_CITIZEN_PHONE_MFA_MODE=enforce` for the latent protected implementation.
- Configure exact installed-mobile recovery redirects. Do not use Expo Go's temporary URL as a
  production recovery target.
- Disable Confirm Email only when phone verification is the approved signup-verification step.
- Configure Supabase/Twilio rate limits, resend cooldowns, CAPTCHA/abuse controls and password-change
  notifications before pilot release.
- Treat the five-minute client proof as a UX/session gate; Supabase's challenge expiry and
  verification result remain authoritative.
- Record `otp_verified` after successful MFA verification and `password_changed` only after
  Supabase accepts the password update.
- Test enrollment, returning challenge, wrong/expired codes, resend, repeated taps, signed-in
  change, recovery with a verified phone, the zero-factor fallback, lost-factor denial, global
  sign-out and next-login enrollment on representative devices.

## Related Documents

- `docs/adr/0033-use-confirmed-phone-auth-without-citizen-mfa.md`
- `docs/adr/0006-use-supabase-auth-and-database-enforced-access-control.md`
- `docs/adr/0019-support-provider-default-passwordless-callbacks.md`
- `docs/adr/0020-use-email-password-and-staged-mfa.md`
- `docs/authentication.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/runbooks/citizen-lost-phone-factor-reset.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
- `docs/KNOWN_ISSUES.md`
