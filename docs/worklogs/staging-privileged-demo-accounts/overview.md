# Staging Privileged Demo Accounts

## Objective

Provide distinct, repeatable non-production identities for demonstrating platform, municipality,
government-operator, ward, and department access without depending on synthetic email delivery or
sharing one privileged account.

## Implemented Scope

- Existing Government Dashboard and Admin Console identities can sign in with password or the
  existing email code/link methods.
- Every method continues through the same personal TOTP/AAL2 and current database authorization
  gates.
- A trusted operator script provisions a fixed synthetic BMC staging matrix with generated
  passwords and expiring role/membership assignments.
- Scopes are resolved from the verified, non-placeholder, routing-eligible invitation catalog.
- Credentials are written only to a gitignored local artifact forced to mode `0600`.

On 2026-07-18 the guarded operator run created and password-verified the complete seven-account
matrix in the confirmed staging project. Its privileged assignments expire on 2026-08-17. Personal
TOTP enrollment and rendered queue-isolation smoke remain separate operator checks.

## Explicit Non-Goals

- no production synthetic accounts;
- no shared privileged identity or authenticator;
- no MFA bypass;
- no authorization from Auth metadata;
- no public provisioning API;
- no arbitrary existing-user assignment, renewal, additional scope, or revocation;
- no automatic destructive Auth-user teardown.

Production officials remain invitation-first with unique official-controlled email addresses.
