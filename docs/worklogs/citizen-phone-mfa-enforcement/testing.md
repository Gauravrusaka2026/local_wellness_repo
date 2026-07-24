# Testing

## Completed Automated Verification

The following commands were run against the implemented mobile milestone:

```bash
corepack pnpm --filter @local-wellness/types build
corepack pnpm --filter @local-wellness/mobile typecheck
corepack pnpm --filter @local-wellness/mobile lint
corepack pnpm --filter @local-wellness/mobile test
./apps/mobile/node_modules/.bin/tsx --test \
  apps/mobile/test/password-phone-auth.test.ts \
  apps/mobile/test/auth-state.test.ts \
  apps/mobile/test/auth-input.test.ts \
  apps/mobile/test/mobile-auth-mode.test.ts \
  apps/mobile/test/mobile-environment.test.ts
corepack pnpm --filter @local-wellness/mobile build
git diff --check
```

Results:

- Shared types build: passed.
- Mobile TypeScript check: passed.
- Mobile lint: passed.
- Full mobile test suite: passed, with 20 test files and no failures.
- Focused authentication suite: 40 tests passed, 0 failed.
- Android Expo export: passed; 1,288 modules were bundled to the ignored `apps/mobile/dist/app` output.
- Diff whitespace validation: passed.

## Covered Behaviour

Automated tests cover:

- `enforce` as the default mobile phone-MFA mode and explicit `observe` handling;
- rejection of ambiguous or malformed recovery callback credentials;
- PKCE code and recovery token-hash session establishment;
- exclusion of TOTP from phone-factor satisfaction;
- selection of the newest verified phone factor;
- temporary proof lifetime, exact expiry boundary, user binding, and factor binding;
- denial of the zero-factor fallback when a verified factor appears;
- global sign-out and explicit local-sign-out fallback;
- restored-session AAL/factor decisions;
- OTP resend timing;
- authentication input validation and user-facing auth-mode behaviour.

## Security Hardening Revalidation

After the password-update ordering and assurance fixes, the following commands were run:

```bash
./apps/mobile/node_modules/.bin/tsx --test apps/mobile/test/password-phone-auth.test.ts
corepack pnpm --filter @local-wellness/mobile typecheck
corepack pnpm --filter @local-wellness/mobile lint
corepack pnpm --filter @local-wellness/mobile test
```

Results:

- Focused password/phone authentication tests: 23 passed, 0 failed after adding exact managed
  Phone MFA configuration-error coverage.
- Mobile TypeScript check: passed.
- Mobile lint: passed.
- Full mobile suite: 20 test files passed, 0 failed.

The focused security cases prove that:

- an otherwise valid user-and-factor proof is rejected if the current Supabase assurance has fallen to AAL1;
- an AAL2 session belonging to another user cannot consume the earlier proof;
- `updateUser` is not called after that assurance failure;
- successful phone verification does not wait for a never-settling audit request;
- global sign-out starts before audit delivery, and local sign-out runs before audit when global revocation fails;
- a never-settling audit is released at its deadline;
- a late audit rejection is observed and does not become an unhandled promise;
- the zero-factor recovery branch remains available without an AAL2 method and still rechecks that no verified factor exists.
- `mfa_phone_enroll_not_enabled`, `mfa_phone_verify_not_enabled`, and `sms_send_failed` produce
  distinct setup/delivery guidance rather than the former broad unavailable message.

The API implementation also includes focused coverage for the zero-factor password-change audit exception. Its contract verifies that the exception:

- accepts only `password_changed` with an exact one-field body;
- rejects other events and expanded payloads;
- rejects citizens who already have a verified factor;
- rejects privileged accounts;
- preserves bearer validation and rate-limit denial.

## Repository and Database Verification

The integrated repository validation completed successfully:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm format:check
corepack pnpm database:master:check
corepack pnpm database:types:check
corepack pnpm security:secrets
supabase test db
supabase db lint --level warning
```

Results:

- All 30 Turbo lint, type-check, build, and test tasks passed.
- The root suite passed 72 tests and skipped only three environment-gated local Auth E2E cases.
- The API passed 232 tests; mobile passed all 20 test files; Citizen Web passed all eight test
  files.
- Android Expo export, formatting, generated master drift, generated database types, and secret
  scanning passed.
- The later integrated taxonomy run applied the current migration/seed history. All 47 current
  pgTAP files passed 1,589 assertions after the V1 database prune removed retired plans.
- The required local Auth E2E run passed citizen email-code and government-invitation flows; only
  the phone case skipped because no local SMS provider is configured.
- Database lint reported only diagnostics in functions owned by the installed PostGIS extension;
  it reported no application-schema issue.
- The deterministic master artifacts cover all 49 migrations with the reviewed 23/26 split.

## Managed Validation Still Required

Run these checks against the configured Supabase Pro project and Twilio provider on at least one physical Android device and one physical iOS device:

1. New account: email/password creation, phone enrollment, OTP verification, AAL2 session, and protected API access.
2. Returning account: password sign-in, fresh phone challenge, successful OTP, and protected API access.
3. OTP behaviour: wrong code, expired code, resend cooldown, provider rate limit, delayed SMS, and interrupted network.
4. Signed-in password change: old password rejected, new password accepted, local session cleared, and another device's refresh session revoked.
5. Recovery with a verified factor: actual email delivery, exact allowlisted callback opening the installed app, fresh phone challenge, password update, audit record, and global sign-out.
6. Recovery with no factor: one-time email recovery, `password_changed` audit record, next sign-in forced into phone enrollment, and no private/API access before AAL2.
7. Lost-phone path: execute the
   [operator factor-reset runbook](../../runbooks/citizen-lost-phone-factor-reset.md), then verify
   old-session denial and user enrollment of a replacement number.
8. Confirm that OTPs, passwords, recovery credentials, and phone proof values do not appear in device, API, Supabase, or observability logs.
9. Verify the project-level Advanced MFA Phone add-on, Phone Enrollment and Phone Verification
   switches independently from the ordinary Phone provider. Confirm Auth logs distinguish
   enrollment-disabled, verification-disabled and SMS-provider failures.

## Release Gate

Do not mark the milestone production-ready until the managed checks above pass and their results are appended to this worklog.
