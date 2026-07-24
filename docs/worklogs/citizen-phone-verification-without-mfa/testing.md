# Testing

## Automated Verification

Completed local database verification:

- a clean local Supabase reset applied the current migration/seed history;
- all 49 pgTAP files passed 1,607 assertions;
- application-schema database lint passed;
- generated database types are current;
- deterministic master-SQL generation/drift verification passed.

Local Auth E2E passed all five cases:

1. email OTP;
2. email/password user phone linking and `phone_change` confirmation;
3. existing linked-phone SMS OTP followed by password change;
4. phone-only Auth signup rejected by the Before User Created hook;
5. government invitation.

Client and API verification completed:

- all 23 mobile test suites, type-check, lint, changed-file diff validation and the Expo Android
  export (1,293 modules) passed;
- Citizen Web passed all eight test files, type-check, lint and its production build;
- focused API/config tests, type-check, build and lint passed.
- repository-wide tests, type-check and lint passed.
- targeted Prettier, tracked/current-history secret scanning and repository diff checks passed.

The managed-device/provider matrix remains a separate verification gate. Automated mobile coverage
includes cleanup that locally signs out an isolated recovery session if the reset screen unmounts
during email exchange or phone inspection.

Focused phone-confirmation coverage also verifies that initial inspection runs for a user,
same-user `USER_UPDATED` does not start it again, and switching users requires a fresh inspection.
Auth-state coverage additionally verifies that provider follow-up does not run synchronously inside
the callback and that cancelled stale work never executes. After this repair, all 23 mobile test
suites, mobile type-check and mobile lint pass. Runtime validation also requires a full app reload
so the singleton Supabase client is recreated without the deprecated custom lock.

ADR-0034 focused coverage additionally verifies verified-TOTP discovery, the direct no-factor path
without factor listing, normalized six-digit input, successful same-user AAL2 step-up and explicit
`insufficient_aal` presentation. The focused password/phone and Auth-state files, mobile type-check
and mobile lint pass after the compatibility change.

A live hosted delivery smoke then created an email-backed temporary Auth identity, signed it in,
requested one `phone_change` OTP for the user-supplied Indian number, and removed only that
temporary identity. Supabase accepted the request, returned the exact pending phone and completed
cleanup. This proves the ordinary no-factor Supabase-to-Twilio request path is accepting work; it
does not prove handset delivery, code verification or the existing-TOTP step-up on an installed
device. Those checks remain part of the provider matrix.

## Hosted Diagnostic

The 2026-07-24 read-only managed check confirmed Phone Auth enabled, phone auto-confirmation
disabled and Twilio Verify selected. It also returned `PGRST202` for
`public.user_has_verified_phone(uuid)` and found no confirmed hosted phone. This proves the current
protected-API blocker at that time was the unapplied migration/schema surface. The later
temporary-identity smoke confirmed that an ordinary phone-change request reaches the configured
provider path. After operator SQL execution, a follow-up service-role probe resolves the confirmed-
phone RPC successfully and still returns `false` for the affected user. Hook activation is
operator-reported; no durable hosted user has yet completed phone confirmation.

After explicit user authorization, an administrator deleted only the affected user's matching
verified legacy TOTP factor. A read-after-write check confirmed zero verified factors, an intact
Auth user and no verified phone. Supabase invalidated the account's prior sessions, so the next
installed-device check must begin with a fresh email/password sign-in.

## Managed Verification Required

- new email/password account and first phone confirmation;
- existing confirmed-phone account sign-in;
- resend, wrong, expired and rate-limited OTPs;
- phone already assigned to another account;
- post-verification identity mismatch denial;
- signed-in password change and global session revocation;
- email recovery followed by phone OTP and password change;
- no-phone and lost-phone recovery denial;
- Citizen Web protected-route behavior;
- privileged government/admin TOTP and AAL2 regression;
- existing linked-phone OTP allowed while a new phone-only Auth user is rejected by the active
  hosted Before User Created hook;
- confirmation that no password, OTP, bearer token or Twilio secret appears in logs.
