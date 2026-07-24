# Implementation

## Phone Confirmation

1. Authenticate the citizen with email and password.
2. Read the current Supabase user.
3. If the user has no confirmed phone, collect an E.164 number and call
   `updateUser({ phone })`.
4. Confirm the delivered code with `verifyOtp({ type: 'phone_change' })`.
5. Re-read the user and require the initiating user ID, normalized phone and confirmation timestamp
   to match.
6. Refresh application auth state and continue to protected routes.

The phone screen claims its initial inspection once per authenticated user ID. Supabase's expected
same-user `USER_UPDATED` event after `updateUser({ phone })` therefore cannot replace code entry
with a new phone-entry state.

The persistent client uses the pinned Auth SDK's lockless default instead of the deprecated
`processLock`, whose legacy auto-refresh branch can emit fail-fast zero-millisecond warnings during
ordinary Auth work. The shared Auth provider also schedules authoritative `getUser()` inspection
after `onAuthStateChange` returns so the callback remains short. Each scheduled resolution has an
ID; a newer event, sign-out, or unmount cancels or invalidates stale work before it can update
application state.

## Pre-existing Authenticator Compatibility

A managed account can retain a verified TOTP factor even when its current application role is only
`citizen`. Supabase then requires AAL2 before accepting `updateUser({ phone })` and returns
`insufficient_aal` before any Twilio request.

The mobile flow now inspects the current and next assurance levels before phone entry. If AAL2 is
available but not current, it deterministically selects a verified TOTP factor, collects a
transient six-digit code and calls `challengeAndVerify`. It requires the expected user both before
and after verification and requires the session to report AAL2 before allowing phone mutation.
Accounts with no verified factor skip this compatibility step and continue directly to SMS. The
flow never enrolls, removes, persists or logs a factor or authenticator code.

## Password Change and Recovery

1. Require an already confirmed phone on the expected user.
2. Send an OTP from an isolated client with `shouldCreateUser: false`.
3. Verify the SMS code on an isolated, non-persistent client.
4. Require the returned identity to match the expected user and phone.
5. Immediately update the password through that isolated session.
6. Record non-sensitive best-effort audit events, revoke sessions globally and clear the persistent
   local session.
7. If navigation unmounts the reset-password screen after the email exchange establishes an
   isolated recovery session but before completion, locally sign that isolated session out.

## API Policy

The API checks a service-only `user_has_verified_phone(uuid)` result for non-privileged citizens.
It does not require citizen AAL2. Privileged users continue through the existing TOTP/AAL2 branch.

The additive source migrations are
`supabase/migrations/20260723130000_citizen_phone_verification_without_mfa.sql` and
`supabase/migrations/20260724100000_require_email_identity_for_auth_signup.sql`. Operators who
cannot use the normal migration workflow may run the matching complete SQL Editor artifact at
`supabase/deploy/citizen-phone-verification-without-mfa.sql`, then reconcile the migration ledger
separately. The artifact requests a PostgREST schema reload and returns explicit function/grant
checks after installation.

## Hosted Configuration

The managed project needs the ordinary Phone provider, Twilio Verify credentials, phone
confirmations and appropriate SMS controls. Phone Auth signup capability remains enabled for
existing-linked-phone OTP, while `public.hook_require_email_identity` must be active as the Before
User Created Auth Hook to reject phone-only user creation. It does not need Advanced Phone MFA for
citizens.
New deployments set `API_CITIZEN_PHONE_VERIFICATION_MODE`,
`EXPO_PUBLIC_PHONE_VERIFICATION_MODE`, and
`NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE` to `enforce`. The former `*_PHONE_MFA_MODE` names are
deprecated compatibility fallbacks only.
