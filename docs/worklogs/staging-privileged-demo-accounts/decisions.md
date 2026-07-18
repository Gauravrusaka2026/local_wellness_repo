# Decisions

## Architecture

ADR-0025 accepts password sign-in for an already provisioned privileged identity and a tightly
guarded synthetic staging provisioner. It does not replace ADR-0006 database-enforced access or
ADR-0020 personal TOTP/AAL2 assurance.

## Provisioning Boundary

The provisioner is a trusted operator script rather than a portal/API route. It uses a server-only
Supabase credential, the existing platform-administrator bootstrap, and the existing government
invitation persistence function. Portal password forms authenticate only; they cannot create an
identity or role.

## Credential Handling

Generated passwords are non-deterministic, never logged, and stored only in Supabase Auth plus
`.local/staging-demo-accounts.<project-ref>.json`. The directory is gitignored and the artifact is
forced to mode `0600`. Each exercised account must enroll its own TOTP factor.

## Lifecycle Boundary

Role and membership access expires in 1–90 days. Auth identity disable/revocation and artifact
deletion remain explicit operator teardown. The fixed matrix does not close `AUTH-001`.
