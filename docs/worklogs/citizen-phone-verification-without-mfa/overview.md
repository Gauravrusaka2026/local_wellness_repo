# Citizen Phone Verification Without MFA

## Goal

Replace the citizen dependency on Supabase Advanced Phone MFA with ordinary Supabase Phone Auth
while keeping email/password as the primary JagrukSetu sign-in method.

## Status

Implemented locally. Database reset, all 49 pgTAP files/1,607 assertions, database lint, generated
types, deterministic master-SQL drift, all five local Auth E2E cases, mobile
23-suite tests/type-check/lint/Android export, Citizen Web tests/type-check/lint/build, and
repository-wide tests/type-check/lint pass. The managed Supabase/Twilio device and Auth Hook matrix
remains pending.

## Scope

- confirmed-phone gating for private citizen access;
- phone linking and `phone_change` OTP confirmation;
- fresh phone OTP before supported password change and recovery;
- no email-only password reset for accounts without a confirmed phone;
- unchanged privileged TOTP/`aal2` enforcement;
- managed Supabase and Twilio setup guidance;
- migration, API, mobile, Citizen Web, automated tests and documentation.

## Security Boundary

Supabase Auth receives passwords and OTPs directly. JagrukSetu does not persist or log them. A
linked phone becomes an alternate Supabase AAL1 sign-in identity; this limitation is recorded in
ADR-0033 and must not be described as true MFA.

## Related Decision

[ADR-0033](../../adr/0033-use-confirmed-phone-auth-without-citizen-mfa.md)
