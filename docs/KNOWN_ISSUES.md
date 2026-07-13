# KNOWN_ISSUES.md

## Open Issues

### SEC-001 — Exposed environment credentials require rotation

- Severity: Critical
- Status: Open — owner action required
- Discovered: 2026-07-11
- Affected systems: Supabase and Redis

The previously ignored `.env.example` contained live-looking privileged Supabase, database, and Redis credentials. The values were removed and replaced with safe, names-only placeholders during Phase 0.

The file is not tracked in the current Git index and has no entries in the currently available Git history. Pattern scans of the working source and current Git objects found no remaining matches. This does not establish that the credentials are safe because they were present in the working copy and may have been copied or exposed elsewhere.

Required owner actions before any hosted Supabase integration or any future Redis use:

1. Revoke and rotate the affected Supabase privileged credential.
2. Rotate the affected database password or connection credential.
3. Revoke and rotate the affected Redis token.
4. Review Supabase and Redis provider audit or access logs for unexpected activity.
5. Run secret scanning against all local branches and the remote repository.
6. Store replacement secrets only in approved environment-specific secret managers or untracked local environment files.

Local Supabase is isolated and does not use these values. Development, staging and production services must not use the affected credentials until these actions are complete.

### ENV-002 — Hosted identity environments require activation

- Severity: High for hosted integration; not blocking local Phase 1 completion
- Status: Open
- Discovered: 2026-07-13

Separate managed development, staging and production Supabase projects, current publishable/secret keys, SMS/email provider credentials, exact redirects, hosted invite templates, rate limits and backup settings remain operator-managed inputs.

Before hosted identity activation:

- complete SEC-001 credential rotation;
- configure the exact token-hash government invite template in every project;
- configure and verify email and Indian SMS delivery;
- smoke-test redirects, invitation acceptance, SSR cookies and effective government scope;
- apply and verify migrations/RLS in development, then staging, before production.

### AUTH-001 — Existing-user assignment and role renewal are incomplete

- Severity: High for broader government onboarding
- Status: Open — newly discovered Phase 1 follow-up
- Discovered: 2026-07-13

The implemented endpoint securely invites a new government Auth user and creates one membership/role assignment. It intentionally returns a non-enumerating conflict for an existing email. There is no server workflow yet to promote an existing citizen, add another authority or role, revoke access, or renew an expired assignment.

Authorization stops at `effective_until`, but partial unique indexes use stored status. Without an explicit transition from `active` to `expired`, a time-expired row can block a replacement. Add audited expire/revoke/renew/assign operations and concurrency tests before onboarding existing or returning government users.

### AUTH-002 — Privileged MFA enforcement is not implemented

- Severity: High before pilot launch
- Status: Open hardening task
- Discovered: 2026-07-13

The identity model is MFA-ready, but the government dashboard, admin console and privileged API operations do not yet enforce an Authenticator Assurance Level. Add enrollment/recovery UX and reject privileged actions below the required AAL before production access.

### AUTH-003 — Device revocation does not invalidate active sessions

- Severity: High before device-risk enforcement is relied upon
- Status: Open hardening task
- Discovered: 2026-07-13

Soft revocation atomically clears the push token, records an audit event and prevents the same installation identifier from silently re-registering. Phase 1 does not bind Supabase sessions to device rows or revoke an already-issued session. Add provider-side session revocation and device-bound authorization before presenting device revocation as forced logout.

### AUTH-004 — Identity append paths need abuse quotas

- Severity: Medium
- Status: Open hardening task
- Discovered: 2026-07-13

Authenticated clients can submit unlimited client-reported session events and can generate many distinct device registrations. Both create append-only rows. The privileged government-invitation endpoint also lacks an application-level request quota beyond provider controls. Add PostgreSQL/platform-backed endpoint limits, per-account device quotas, deduplication and monitoring before public launch. Do not introduce Redis for this V1 work.

### AUTH-005 — Real-device and hosted callback smoke tests remain

- Severity: Medium
- Status: Open validation task
- Discovered: 2026-07-13

Local email and delivered-invite flows pass, and phone paths have unit coverage. Real SMS delivery, Expo development-build deep links, OS SecureStore behavior, browser cookie attributes and hosted callback URLs still require device/environment smoke tests.

### DB-001 — Authority scope has no governance foreign key

- Severity: Medium until Phase 2
- Status: Open planned task
- Discovered: 2026-07-13

Phase 1 stores authority UUIDs without inventing a governance table. The Phase 2 migration must create the canonical authority entity, validate existing values and add forward foreign keys for membership, role and audit scope.

### OPS-001 — Production container images are not pruned

- Severity: Low
- Status: Open technical debt
- Discovered: 2026-07-11

The production images copy the verified workspace from the build stage. They run as a non-root user and build successfully, but they include source and development dependencies and are larger than necessary.

Evaluate pnpm deployment pruning or service-specific production dependency packaging after real runtime dependencies exist. Any optimization must preserve reproducible builds and non-root execution.

### DOC-001 — Tracking-document locations are inconsistent

- Severity: Low
- Status: Open
- Discovered: 2026-07-11

`AGENTS.md` refers to root-level tracking filenames, while the repository currently stores them under `docs/`. The repository also contains an empty `docs/architecture.md,` file with a trailing comma.

Resolve both in a documentation-only change after confirming the intended canonical locations; do not create duplicate trackers.

## Resolved Issues

### ENV-001 — Supabase tooling and local environment inputs were unavailable

- Severity: Previously high for database/Auth work
- Status: Resolved on 2026-07-13

The repository now pins the Supabase CLI, commits validated local configuration and an invite template, applies the Phase 1 migration series cleanly, generates database types and runs pgTAP/Auth E2E coverage. Managed environment activation remains separately tracked as ENV-002.

### DEP-001 — Moderate transitive dependency advisories

- Severity: Moderate
- Status: Resolved on 2026-07-11

The initial audit identified vulnerable transitive PostCSS and `uuid` releases through current Next.js and Expo dependencies. Narrow pnpm overrides select patched compatible releases. Peer checks, the full Expo and Next.js builds, frozen installation, and complete dependency audit pass after the change.
