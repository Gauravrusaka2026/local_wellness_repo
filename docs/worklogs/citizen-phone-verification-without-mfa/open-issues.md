# Open Issues

## Managed SMS and Device Validation

Automated tests cannot prove carrier delivery, hosted Twilio configuration, native recovery links or
cross-device revocation. Complete the matrix in `testing.md` before production.

## Linked Phone Is an AAL1 Sign-In Identity

Ordinary Supabase Phone Auth treats a confirmed phone as an alternate passwordless login identity.
JagrukSetu presents email/password as its primary sign-in UI and rejects new phone-only users
through the Before User Created hook, but cannot prevent a custom client from signing into an
existing linked account with a valid phone OTP.

## Managed Auth Hook Activation

Supabase must keep Phone Auth signup capability enabled for existing-linked-phone OTP delivery.
The migration creates `public.hook_require_email_identity`, and the operator reports activating it
as the hosted Before User Created Auth Hook. Verify both an allowed existing-linked-phone OTP and a
denied new phone-only signup before release.

## Provider-Wide Password Policy

The fresh phone challenge is enforced by supported JagrukSetu flows, not a provider hook on every
possible direct `updateUser({ password })` call.

## Pending Phone-Change Ambiguity

Supabase documents a risk involving duplicate stale `phone_change` values. The client performs
strict initiating-user and confirmed-phone postchecks and fails closed. Add a server-side
stale-claim preflight if managed testing or provider guidance shows that additional mitigation is
required.

## Lost-Phone Support

The earlier MFA-factor reset runbook is not applicable to ordinary Phone Auth. Define and rehearse a
reviewed account-recovery procedure before production.
