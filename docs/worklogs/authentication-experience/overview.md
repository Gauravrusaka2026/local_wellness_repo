# Authentication Experience and Official Onboarding

## Objective

Make it unambiguous which account is active in Citizen Web, Government Dashboard, and Admin
Console, while preserving Supabase Auth, per-user privileged TOTP, current database authorization,
RLS, and non-enumerating public responses.

## Completed Scope

- exact current-account context and switch-account actions across all three portals;
- separate first-time TOTP QR enrollment and returning authenticator challenge states;
- reviewed recovery and wrong-account guidance without a bypass;
- named, data-driven authority/ward/department invitation choices;
- strict API, service-role database projection, shared contracts, and tests.

This work implements ADR-0006 and ADR-0020. It does not introduce a new architectural decision.
