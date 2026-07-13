# KNOWN_ISSUES.md

## Open Issues

### DATA-001 — Canonical CSV path and export shape differ from the requested import layout

- Severity: Medium
- Status: Mitigated — importer pins and validates the available layout; source-package mismatch remains
- Discovered: 2026-07-13

The requested `resources/governance/csv/seed_data_for_mh/` directory is absent. All 18 canonical CSV files are currently stored directly under `resources/governance/csv/`. Every data CSV is UTF-8 with a BOM and uses a workbook-title row at row 1 followed by the actual header at row 2; `README.csv` is metadata rather than a relational table.

The Phase 2 importer now validates this layout explicitly, skips title rows intentionally, and fails clearly if the canonical path, title, headers, row widths, or hashes change. It does not relocate, rewrite, or silently normalize the source files. A future source delivery should still use the documented nested path or intentionally version the manifest path.

### DATA-002 — Maharashtra identifiers and local-government coverage are incomplete

- Severity: High for verified routing
- Status: Open data acquisition task
- Discovered: 2026-07-13

The dataset has no explicit LGD identifier for districts, local bodies, or wards. All 359 taluka rows contain `Needs official LGD code`; all 71 Gram Panchayat rows and all 23 village rows are template records with pending identifiers. The 190 listed urban local bodies are an acknowledged baseline rather than the stated statewide total of 424.

Natural names must remain scoped by their parent jurisdiction until official identifiers are available. Template Gram Panchayat and village rows must not be treated as real entities or verified coverage.

### DATA-003 — Ward, officer, office, and local-body contact records are placeholders

- Severity: High before pilot activation
- Status: Open verification task
- Discovered: 2026-07-13

All 70 ward rows are synthetic five-ward placeholders for 14 corporations and have pending zone, contact, and GIS fields. All corporation, municipal-council, and nagar-panchayat phone/email fields are extraction placeholders. The `Current_Officers.csv` file contains zero named people: its four `Officer Name` values are office/role descriptions or explicit incumbent placeholders.

Phase 2 must not create verified officers or assignments from those labels. Placeholder rows may be retained only with an explicit placeholder/unverified state and raw-source provenance. Production-facing officer names and contacts require record-specific official verification.

### DATA-004 — No jurisdiction geometry is available

- Severity: High for the Phase 2 real-coordinate exit criterion
- Status: Open — external verified GIS input required
- Discovered: 2026-07-13

The canonical CSV corpus contains no coordinates, WKT, GeoJSON, or boundary files. PostGIS storage, versioning, indexes, and synthetic spatial tests can be completed safely, but no real Maharashtra coordinate can resolve to a verified municipality and ward until official pilot polygons are supplied and reviewed.

### DATA-005 — Cross-file names and routing labels are not normalized

- Severity: High for operational routing
- Status: Open data-mapping task
- Discovered: 2026-07-13

Five ward rows refer to `Vasai-Virar City Municipal Corporation`, while the corporation table uses `Vasai-Virar Municipal Corporation`. Brihanmumbai is represented by one slash-delimited two-district value and therefore requires a local-body-to-district join rather than one district foreign key.

Only 6 of 18 routing primary department/agency labels exactly match a department row. Officer destinations are mostly composite free-text labels: only 1 of 18 first-recipient, 2 of 18 first-escalation, and 0 of 18 second-escalation values exactly match a durable officer role. All 18 routing notes state that official department/local-body mapping is required despite a source status of `Active`.

These records must remain non-routable references until an explicit, reviewed crosswalk resolves department, role, authority, utility, and asset ownership identifiers. The canonical CSV must not be silently corrected.

### DATA-006 — Provenance and verification metadata are inconsistent

- Severity: Medium
- Status: Open data-quality task
- Discovered: 2026-07-13

Row widths, dates, and declared source URLs are structurally valid, and no exact duplicate source rows were found. However, many URLs are generic home/list pages rather than record-specific evidence. Departments and officer roles have no source URL, verification state, or date; utilities lack verification dates/status and one uses `Municipal source required` instead of a URL; wards contain a text source reference but no URL; routing references have dates but no source URL or verification state.

Imports must preserve the original provenance fields, map missing evidence to an explicit unverified state, and prevent promotion to verified/public-safe data until record-specific evidence exists.

The baseline report exposes aggregate classifications plus per-file dispositions/diagnostics, but not a complete accepted/unverified/quarantined/rejected matrix per file. Database and importer checks validate shapes and recognized formats; they cannot establish that a syntactically valid contact or LGD value is the current official value. Thirteen normalized emergency contacts inherit verified source status, several from generic official pages, and require record-specific review before they are represented as fully verified pilot contact evidence.

### DATA-007 — Workbook-to-CSV parity has not been independently verified

- Severity: Medium
- Status: Open validation gap
- Discovered: 2026-07-13

The user-designated Excel workbook exists and is preserved as the human reference copy. The approved spreadsheet artifact runtime was unavailable during the initial Phase 2 audit, so visual and cell-level workbook-to-CSV parity could not be checked without violating the repository session's spreadsheet tooling rules.

The CSV files remain the machine-readable source of truth. Add an approved workbook parity check when that runtime is available; until then, record both workbook and CSV checksums for refresh traceability.

### DATA-008 — Replacement-bundle delta refresh is not automated

- Severity: Medium
- Status: Open operator-tooling task
- Discovered: 2026-07-13

The committed governance generator intentionally reproduces the hash-pinned Phase 2 baseline and fails closed on source or artifact drift. It does not yet compare a replacement bundle with the accepted batch, close superseded temporal versions, or publish reviewed verification promotions.

Do not overwrite the current canonical bundle or use the baseline generator as an unreviewed in-place refresh. Before importing a replacement dataset, implement a reviewed delta workflow that reports additions, removals, hierarchy/identifier changes and version closures, then applies the accepted change through an additive seed/version artifact or migration.

### ENV-003 — Rendered application smoke test needs an in-app browser session

- Severity: Low
- Status: Open validation-environment follow-up
- Discovered: 2026-07-13

The citizen web, government dashboard and admin console started successfully and their public/auth routes, protected redirects and visible server-rendered copy were verified over HTTP. The approved in-app browser had no connected browser target during the recovery session, so viewport layout, interaction and screenshot inspection could not be completed.

Repeat the visual smoke test when the in-app browser is connected. This is not evidence of an application runtime failure and Phase 2 intentionally adds no new governance UI.

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

Phase 2 also retains any pre-governance arbitrary authority UUID as a non-routable placeholder for audit/history. Effective-access functions exclude those rows, but an operator workflow must explicitly map or revoke them before reactivating an existing government's access.

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

### AUTH-006 — Citizen email magic links fall back to the landing page

- Severity: High for citizen browser sign-in
- Status: Open defect
- Discovered: 2026-07-13

The citizen web client requests a query-bearing `/auth/callback?next=/account` redirect, while the local Supabase allow-list contains only the exact queryless callback. Supabase therefore falls back to the configured site URL, so the PKCE authorization code reaches the static landing page and is never exchanged for a session. When sign-in begins on `localhost` but the fallback uses `127.0.0.1`, the host-scoped PKCE verifier is also unavailable.

Use the exact same-origin queryless callback for the current citizen flow, which already defaults safely to `/account`, and add a regression test that follows a delivered email through the Next.js callback and SSR cookie creation. Apply the equivalent exact callback configuration and smoke test to every managed environment before activation.

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

### DB-001 — Authority scope has no governance foreign key

- Severity: Previously medium until Phase 2
- Status: Resolved on 2026-07-13

Phase 2 created `governance.authorities`, preserved any pre-existing arbitrary Phase 1 scope as an explicit non-routable legacy placeholder, and added restrictive authority foreign keys to memberships, non-global roles and authority-attributed audit events. Future scoped roles also validate canonical authority lifecycle plus ward and department ownership.

### ENV-001 — Supabase tooling and local environment inputs were unavailable

- Severity: Previously high for database/Auth work
- Status: Resolved on 2026-07-13

The repository now pins the Supabase CLI, commits validated local configuration and an invite template, applies the Phase 1 migration series cleanly, generates database types and runs pgTAP/Auth E2E coverage. Managed environment activation remains separately tracked as ENV-002.

### DEP-001 — Moderate transitive dependency advisories

- Severity: Moderate
- Status: Resolved on 2026-07-11

The initial audit identified vulnerable transitive PostCSS and `uuid` releases through current Next.js and Expo dependencies. Narrow pnpm overrides select patched compatible releases. Peer checks, the full Expo and Next.js builds, frozen installation, and complete dependency audit pass after the change.
