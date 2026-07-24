# Open Issues

> Historical record: ADR-0033 supersedes this worklog. Do not use the Advanced Phone MFA
> activation, AAL2, zero-factor fallback, or factor-reset items below as current citizen release
> instructions. See
> [`citizen-phone-verification-without-mfa`](../citizen-phone-verification-without-mfa/open-issues.md).

## Managed Twilio and Device Validation

**Priority:** P0 before production

Automated tests cannot prove SMS delivery, carrier behaviour, native deep-link handling, or cross-device refresh-token revocation. Complete the physical-device matrix in [testing.md](testing.md) using the managed Supabase and Twilio configuration.

Adding Twilio credentials under **Authentication → Sign In / Providers → Phone** enables the
ordinary Phone provider but does not by itself activate Advanced Phone MFA. In every managed
project, separately activate the Advanced MFA Phone add-on and enable both Phone Enrollment and
Phone Verification under the MFA settings. No SQL migration can change those hosted Auth settings.

Use the Supabase Auth log code to distinguish setup from delivery:

- `mfa_phone_enroll_not_enabled`: Advanced Phone MFA enrollment/add-on is off;
- `mfa_phone_verify_not_enabled`: MFA phone verification is off;
- `sms_send_failed`: enrollment/verification reached the provider but Twilio delivery failed.

## Recovery Callback Allowlist

**Priority:** P0 before production

Confirm that the exact mobile recovery callback used by the installed development and release builds is present in the Supabase Auth redirect allowlist. Test the link from a real recovery email rather than manually constructing the URL.

## Lost-Phone Operator Runbook

**Status:** Documented; managed rehearsal and named-environment roster pending

The client correctly refuses to bypass an existing verified phone factor. The reviewed
[citizen lost-phone factor-reset runbook](../../runbooks/citizen-lost-phone-factor-reset.md) now
defines separation of duties, identity/account checks, exact Supabase Admin factor deletion, audit
evidence, old-session denial, replacement enrollment, failure handling, and a user communication
template. Before the external pilot, map its functional roles to named people in the private
environment roster and complete the synthetic managed-staging rehearsal.

## Zero-Factor Audit Exception

**Status:** Locally resolved; managed verification pending

The earlier limitation was that a recovered AAL1 account with no phone factor could update its password but could not append `password_changed` through a globally phone-MFA-protected API.

The integrated API implementation now permits that single audit event only when all of the following are true:

- the endpoint handler carries the explicit legacy-password-change marker;
- the authenticated user is a non-privileged citizen at AAL1;
- the server confirms that the citizen has no verified phone factor;
- the body is exactly `{ "eventType": "password_changed" }`;
- bearer validation and the existing audit rate limit succeed.

Other event types, added metadata, privileged users, and users with an existing factor remain blocked. This removes the known local audit gap without weakening general API enforcement. Confirm the complete recovery-and-audit flow against the managed project before closing this item.

## Temporary Legacy Recovery Fallback

**Priority:** P1 after phone-enrollment coverage is high

Email-only password recovery for accounts with zero factors is intentionally narrow but weaker than phone-verified recovery. Track how many active citizens remain factorless. Remove the fallback when migration coverage and the support process make it unnecessary.

## Production Configuration Evidence

**Priority:** P0 before production

Capture evidence that the managed project has:

- email/password authentication enabled;
- the Advanced MFA Phone add-on active;
- Phone Enrollment and Phone Verification enabled in the managed MFA settings;
- the intended Twilio Verify transport configured with the correct Account SID, Auth Token and
  Verify Service SID;
- the expected confirm-email policy;
- exact redirect allowlisting;
- password-change notifications enabled where required;
- mobile and API citizen phone-MFA modes set to `enforce`.

Do not place SMTP, Twilio, Supabase service-role, or other secret values in this worklog.

## Provider-Wide Fresh-Phone Enforcement

**Priority:** P0 before describing the policy as provider-enforced

The supported JagrukSetu mobile flow rechecks the current AAL2 session immediately before the
password mutation, but Supabase Auth does not expose an application hook that forces this exact
fresh-phone proof on every direct `updateUser({ password })` call. Keep this limitation visible as
`AUTH-013`, monitor Auth/audit activity, and do not describe application enforcement as a
provider-wide credential policy.
