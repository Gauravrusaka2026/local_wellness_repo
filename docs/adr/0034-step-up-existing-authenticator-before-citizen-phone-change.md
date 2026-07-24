# ADR-0034: Step Up Existing Authenticators Before Citizen Phone Change

## Status

Accepted

## Date

2026-07-24

## Context

ADR-0033 keeps ordinary citizens at AAL1 and uses Supabase Phone Auth only to confirm a phone
number after email/password sign-in. A read-only managed diagnostic found an existing citizen
account with a verified TOTP factor created during an earlier Government Dashboard test. The
account has no privileged role or active authority membership, but Supabase evaluates its verified
factor independently of application roles.

When that AAL1 session calls `updateUser({ phone })`, Supabase rejects the request with HTTP `401`
and `insufficient_aal` before it invokes Twilio Verify. Deleting the factor automatically would be
destructive and could remove an authenticator the account still depends on. Updating the phone
through a service-role bypass would weaken the identity-change boundary.

## Decision

- Keep the ordinary no-factor citizen flow unchanged: email/password sign-in proceeds directly to
  phone entry and the `phone_change` SMS challenge.
- Before changing a citizen phone, inspect the current and next Authenticator Assurance Levels.
- If AAL2 is available but not current, list verified TOTP factors and ask the citizen for a code
  from the existing authenticator.
- Challenge and verify the selected factor, then require both AAL2 and the same authenticated user
  before returning to phone entry.
- Keep factor selection deterministic when more than one verified TOTP factor exists.
- Do not enroll a new factor, remove an existing factor, trust application roles to bypass Auth,
  or perform an administrator phone mutation.
- Continue to use the ordinary `phone_change` SMS challenge after the conditional TOTP step-up.

This is a compatibility path for accounts that already have a verified authenticator. It does not
reintroduce mandatory citizen MFA or change the privileged portal TOTP/AAL2 policy.

## Alternatives Considered

### Delete the Existing Factor Automatically

Rejected because factor deletion is a destructive account-security operation and the mobile client
cannot establish that the authenticator is obsolete.

### Use a Separate Citizen Account

Viable as an attributed support option when the user has lost the authenticator, but insufficient
as the normal product behavior for an otherwise valid existing account.

### Update the Phone with Service-Role Authority

Rejected because it bypasses Supabase's assurance check for a sensitive identity change and would
move credential-level mutation into the application backend.

### Require MFA for Every Citizen

Rejected because ADR-0033 intentionally uses ordinary confirmed-phone OTP at AAL1. A legacy factor
on one account does not justify making Advanced Phone MFA a V1 citizen requirement.

## Consequences

- Citizens without a verified factor continue directly to SMS with no added step.
- A citizen with an existing factor must prove possession once before changing the phone in an
  AAL1 session.
- The existing factor is preserved, and the ordinary phone-confirmation flow remains provider
  managed.
- A user who has lost the authenticator cannot bypass Supabase's assurance boundary. Recovery
  requires an attributed administrator factor reset or a separate citizen account.
- `insufficient_aal` and factor challenge failures need explicit user-facing messages instead of a
  generic phone-provider error.
- Privileged government and administrator TOTP/AAL2 behavior remains unchanged.

## Implementation Notes

- Keep factor IDs and authenticator codes transient; never persist or log either value.
- Accept only normalized six-digit authenticator codes.
- Verify the expected Auth user before and after `challengeAndVerify`.
- Require `currentLevel = aal2` after factor verification before allowing the phone mutation.
- Cancel stale assurance resolution when the Auth identity changes.
- Cover the direct no-factor path, verified-factor discovery, successful AAL2 step-up, invalid-code
  normalization, same-user binding and `insufficient_aal` presentation in mobile tests.

## Related Documents

- `docs/adr/0033-use-confirmed-phone-auth-without-citizen-mfa.md`
- `docs/authentication.md`
- `docs/KNOWN_ISSUES.md`
- `docs/worklogs/citizen-phone-verification-without-mfa/implementation.md`
- `docs/worklogs/citizen-phone-verification-without-mfa/testing.md`
