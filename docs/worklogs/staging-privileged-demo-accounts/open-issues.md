# Open Issues

## AUTH-001 — General privileged lifecycle

The staging helper handles only its fixed synthetic matrix. Arbitrary existing-user assignment,
additional scope, renewal, expiry transition, and revocation still need audited API/database
operations and concurrency coverage.

## AUTH-002 — Managed TOTP enforcement and recovery

Password entry does not remove the need to rehearse personal factor enrollment/recovery and verify
AAL1 denial plus AAL2 success in managed staging before enforcement.

## AUTH-012 — Synthetic identity teardown

Database role and membership expiry is bounded, but Supabase Auth identities are not automatically
disabled. After a demonstration, a trusted operator must delete the local credential artifact and
revoke, disable, or rotate the synthetic identities. Automatic destructive cleanup is deferred
until audit/history safety and recovery behavior are designed.

## Production Boundary

The helper must never run in production. Official onboarding remains invitation-first and uses one
official-controlled email and authenticator per person.
