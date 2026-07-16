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

The owner has selected BMC administrative wards A, B, C, D, and E plus Pune's officially current
numeric ward model for the pilot. That decision does not verify the canonical bootstrap rows. The
existing `BRIH-W01`–`BRIH-W05` and `PUNE-W01`–`PUNE-W05` targets remain draft, unverified,
non-routable placeholders. BMC's rows must never be interpreted ordinally as A–E; reviewed official
records and a new versioned synchronization scope are required. Pune rows may be promoted only if
official evidence proves their exact current identity, otherwise new official rows must supersede
them.

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

Five ward rows refer to `Vasai-Virar City Municipal Corporation`, while the corporation table uses `Vasai-Virar Municipal Corporation`. Brihanmumbai is represented by one slash-delimited two-district value and therefore requires a local-body-to-district join rather than one district foreign key. The selected BMC A–E administrative wards require new official-source-backed records; no ordinal crosswalk from the five numeric placeholders is permitted. Pune's selected numeric model likewise requires an official effective-dated identity review.

Only 6 of 18 routing primary department/agency labels exactly match a department row. Officer destinations are mostly composite free-text labels: only 1 of 18 first-recipient, 2 of 18 first-escalation, and 0 of 18 second-escalation values exactly match a durable officer role. All 18 routing notes state that official department/local-body mapping is required despite a source status of `Active`.

These records must remain non-routable references until an explicit, reviewed crosswalk resolves department, role, authority, utility, and asset ownership identifiers. The canonical CSV must not be silently corrected.

### DATA-006 — Provenance and verification metadata are inconsistent

- Severity: Medium
- Status: Open data-quality task
- Discovered: 2026-07-13

Row widths, dates, and declared source URLs are structurally valid, and no exact duplicate source rows were found. However, many URLs are generic home/list pages rather than record-specific evidence. Departments and officer roles have no source URL, verification state, or date; utilities lack verification dates/status and one uses `Municipal source required` instead of a URL; wards contain a text source reference but no URL; routing references have dates but no source URL or verification state.

Imports must preserve the original provenance fields, map missing evidence to an explicit unverified state, and prevent promotion to verified/public-safe data until record-specific evidence exists.

The baseline report now exposes a reconciled accepted/unverified/quarantined/rejected matrix for
every source file. Database and importer checks validate shapes and recognized formats; they cannot
establish that a syntactically valid contact or LGD value is the current official value. Thirteen
normalized emergency contacts inherit verified source status, several from generic official pages,
and require record-specific review before they are represented as fully verified pilot contact
evidence.

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

### GOVSYNC-001 — Governance synchronization is not yet production-operational

- Severity: High for sustained production routing accuracy
- Status: Retrieval/versioning slice implemented; parsing, review, publication, and deployment open
- Discovered: 2026-07-13

The hash-pinned Phase 2 importer is a reproducible bootstrap pipeline, not a permanent government-source synchronization service. Phase 3 now supplies typed stage ports, the enforced run lifecycle, deterministic publication gates, a forced-RLS source/run/snapshot/candidate/change/review persistence model, append-only review events, and a private raw-snapshot Storage bucket.

The 2026-07-14 operational slice adds exact SHA-256 source-contract approval, one-source PostgreSQL
claims, heartbeat-protected short leases, bounded retry state, service-only lifecycle RPCs, a
dispatch-secret-protected Edge fetcher, conditional HTTP 304 handling, immutable content-addressed
Storage writes, structured audit events, durable review-bound versioned contact channels, and a pure
contact normalizer. Ten official PMC/BMC endpoints are registered only as draft, unverified,
inactive source definitions. No source was scheduled or activated, and no retrieved data was
published. The migrations and draft-only source/scope seeds are now present in the dedicated
staging database, but the Edge Function, Cron, dispatch secret, parsers, snapshots, and publication
runtime remain undeployed/inactive.

The slice also adds generic service-only synchronization scope targets and selects five canonical
ward placeholders per pilot municipality. All ten targets remain draft, unverified, unapproved, and
non-routable. Scope activation requires active-global-platform-admin review and never bypasses the
referenced entity's independent routing gate.

The production subsystem still needs source-specific PMC/BMC HTML/API/PDF parsers, retained parser
fixtures, canonical entity matching, change detection, an operator review API/UI, transactional
append/close publishers for every supported entity/version type, disappearance/conflict policy,
retention/reconciliation, environment Cron/secrets, and operational monitoring. Those capabilities
must be exercised against reviewed official sources before synchronization is described as
operational. Automated jobs must never overwrite the canonical CSV bootstrap files or promote
placeholder, unverified, conflicting, stale, or merely source-verified records.

The publisher must transactionally reload and bind the persisted run, change set, proposals,
candidate matches and latest reviews rather than trusting application-supplied arrays. The Phase 3
eligibility helper validates match-to-candidate identity and exact placeholder quarantine invariants,
but authoritative run/change-set binding belongs to that not-yet-implemented publisher.

### GOVSYNC-002 — Official-source fetches need DNS-resolution and rebinding enforcement

- Severity: High before activating remote sources
- Status: Open security hardening task
- Discovered: 2026-07-14

The Edge fetcher rejects non-HTTPS URLs, credentials, non-standard ports, IP literals, local/internal
host suffixes, and redirects outside each source's exact host allowlist. It does not yet resolve the
hostname and reject loopback, private, link-local, reserved, or changed DNS answers before and after
connection. A compromised or misconfigured DNS record could therefore bypass string-level host
validation.

Keep all source endpoints inactive until the runtime performs resolver-backed address checks at
each redirect/connection boundary or the platform provides an equivalent reviewed egress policy.
Retain the current URL/host controls as defense in depth, and add deterministic tests for IPv4,
IPv6, rebinding, CNAME, redirect, and resolver-failure cases.

### GOVSYNC-003 — Partial snapshot persistence needs orphan reconciliation

- Severity: Medium before scheduled retrieval
- Status: Open operational hardening task
- Discovered: 2026-07-14

Raw snapshot bytes are written to private content-addressed Storage before the database completion
RPC records and links them. If Storage succeeds and database finalization fails, a safe retry can
reuse the same verified object, but a permanently failed run can leave an object without a database
reference. The Edge function intentionally retains a newly created object when finalization fails or
its outcome is ambiguous: eager deletion could race a late commit that has already linked the object.
The current implementation has no periodic grace-period reconciliation or retention process.

Add an idempotent scheduled reconciler that lists only the dedicated private bucket, verifies the
content-addressed path/digest, waits an approved grace period, rechecks for late committed snapshot
links, preserves referenced snapshots, quarantines or removes aged true orphans under an approved
retention policy, and records every action in synchronization audit tables. Do not introduce Redis
or BullMQ.

### ROUTING-001 — Verified Pune pilot routing data is unavailable

- Severity: High for operational Phase 3 routing
- Status: Engineering implemented; data validation pending
- Discovered: 2026-07-13

The generic routing schema, PostGIS queries, deterministic evaluator, authenticated API contracts,
confidence/fallback behavior, and decision-audit boundary can be tested with rollback-isolated
synthetic verified fixtures. That engineering does not make the bootstrap production-routable.

Pune Municipal Corporation still requires reviewed municipality and selected-ward polygons,
current LGD identifiers where applicable, authority-department availability, durable officer roles,
current officer assignments where safely verified, asset types/assets/owners for asset-dependent
categories, operational category records, confidence-policy versions, route-rule versions, and
complete fallback paths. The 12 seeded categories are draft, unverified, and non-routable, and all
Phase 2 placeholder records remain excluded. Until those inputs pass record-specific official-source
review, a real Pune coordinate must not produce a production route.

### COMPLAINT-001 — Transcription and media moderation providers are not configured

- Severity: Medium before public pilot
- Status: Engineering fallback complete; provider integration pending
- Discovered: 2026-07-14

Phase 4 records private voice evidence and explicit processing/moderation states, but no approved
speech-to-text or media-moderation provider has been selected. The mobile client therefore states
that transcription is unavailable, never invents text, and requires the citizen to type and confirm
the complaint description. Media remains pending rather than being represented as automatically
reviewed.

Select providers only after privacy, retention, regional processing, cost, failure, and deletion
requirements are approved. Implement processing without Redis or BullMQ, preserve the original
private evidence, require user confirmation of normalized text, and add retry/audit/provider-failure
coverage before claiming automatic transcription or moderation.

### COMPLAINT-002 — Complete complaint capture needs physical-device and hosted smoke tests

- Severity: High before pilot launch
- Status: Local engineering verified; device/environment validation pending
- Discovered: 2026-07-14

The mobile unit suites and Android Expo export pass, and database/API integration covers the secure
submission path with rollback-isolated verified fixtures. This environment had no connected physical
device or in-app browser target. Camera, video, microphone, foreground GPS, mock-location behavior,
OS protected storage, interrupted upload recovery, deep links, delivered email callbacks, and
network transitions therefore still require representative Android/iOS and managed-environment
testing. The canonical bootstrap also exposes zero operational categories, so production-like
submission must wait for reviewed Pune routing evidence rather than activating placeholders.

### COMPLAINT-003 — Expired private upload reservations need scheduled cleanup

- Severity: Medium before sustained public use
- Status: Open operational hardening task
- Discovered: 2026-07-14

Upload reservations expire and cannot be submitted after their lifecycle window, while failed
integrity checks remove the mismatched object immediately. A client that abandons an upload after
object transfer can still leave an expired reservation or orphaned private object. Phase 4 does not
yet run a cleanup scheduler.

Add an idempotent PostgreSQL/platform-scheduled cleanup operation that claims expired reservations,
removes only their exact private object locators, records the outcome, and tolerates missing objects.
Do not introduce Redis or BullMQ for this task.

### ENV-003 — Rendered application smoke test needs an in-app browser session

- Severity: Low
- Status: Open validation-environment follow-up
- Discovered: 2026-07-13

The citizen web and API started successfully during Phase 3 verification. Citizen `/` and
`/auth/login`, the expected API root 404 envelope, unauthenticated category rejection, and an
authenticated zero-operational-category response were verified over HTTP. The approved in-app
browser had no connected target, so viewport layout, interaction, and screenshot inspection could
not be completed.

Repeat the visual smoke test when the in-app browser is connected. This is not evidence of an
application runtime failure, and Phase 3 intentionally adds no routing UI.

### ENV-004 — Citizen account data requires one aligned migrated environment

- Severity: Medium for local and hosted account testing
- Status: Staging schema/profile alignment resolved; browser/API validation pending
- Discovered: 2026-07-14

The citizen account route authenticates with Supabase and reads its profile through the NestJS API.
If the browser Auth client and API target different Supabase environments, the API is stopped, or
the selected database has not applied the Phase 1 profile trigger/migrations, a valid Auth session
cannot produce the expected `public.profiles` response. This was previously experienced as an empty
account surface.

The route now validates the API response and visibly distinguishes signed-in identity, onboarding,
profile provisioning/unavailability, and API failure, with retry and sign-out actions. Operators
must still configure the citizen web and API against the same fully migrated local or hosted
Supabase environment and complete delivered-link/SSR-cookie testing under `AUTH-005`/`ENV-002`.
The dedicated staging project now contains the identity trigger/backfill migration, and a read-only
check confirmed the existing citizen Auth identity has an active profile and citizen role. A real
browser session against a reachable staging-configured API is still required before this issue can
be closed completely.

### GOVDASH-001 — Interactive complaint map needs a provider and coordinate-sharing policy

- Severity: Medium for the full Phase 5 map experience
- Status: Open product/privacy input
- Discovered: 2026-07-14

The access-scoped queue and complaint-detail workflow can be implemented without sending complaint
coordinates to a third party. A real interactive basemap cannot be selected safely until the owner
chooses a provider and records key/billing/domain restrictions plus whether exact or generalized
coordinates may leave Local Wellness infrastructure. Phase 5 therefore exposes no queue map points
and uses authorized textual location context on complaint detail; it must not add fake map tiles or
unreviewed outbound coordinate links.

### GOVDASH-002 — Resolution evidence needs scheduled object cleanup and full media processing

- Severity: High before a public pilot
- Status: Open provider/operations hardening task
- Discovered: 2026-07-14

Phase 5 keeps resolution evidence private, caps active unlinked reservations, validates workflow
version and expiry before download, verifies exact size and SHA-256 plus bounded JPEG/PNG/WebP/
HEIC/HEIF/MP4/QuickTime/WebM signatures, rejects MIME spoofing, and marks failed or elapsed
reservations terminal. Authorized reads are short-lived, non-cacheable, and forced to download.

Signature recognition is deliberately a narrow integrity gate, not full container/image decoding,
malware scanning, content moderation, or a guarantee that media is safe to open in another
application. Expired database reservations can be marked in bounded batches, but no scheduled job
yet deletes their exact private Storage objects or reconciles missing/orphan objects.

Before public operation, select and approve a privacy-compatible scanning/moderation approach,
enforce bounded concurrency and resource limits, add full decode/container validation, and deploy an
idempotent Supabase-scheduled cleanup process that deletes only server-owned object paths and audits
every result. Do not introduce Redis, BullMQ, or Sentry for this work.

### SEC-001 — Exposed environment credentials require rotation

- Severity: Critical
- Status: Mitigated for staging — replacement credentials confirmed; historical audit remains
- Discovered: 2026-07-11
- Affected systems: Supabase and Redis

The previously ignored `.env.example` contained live-looking privileged Supabase, database, and Redis credentials. The values were removed and replaced with safe, names-only placeholders during Phase 0.

The file is not tracked in the current Git index and has no entries in the currently available Git history. Pattern scans of the working source and current Git objects found no remaining matches. This does not establish that the credentials are safe because they were present in the working copy and may have been copied or exposed elsewhere.

On 2026-07-14 the owner confirmed that the active hosted target is a dedicated staging project and
that its Supabase privileged credential and database credential are newly generated replacements.
Those replacement values remain only in the untracked local environment and were sufficient for the
reviewed staging migration deployment. They are not the earlier values described above.

Remaining owner/security actions:

1. Confirm the replaced Supabase/database values are revoked if that was not part of generating the
   new credentials.
2. Revoke any legacy Redis token that still exists; Redis remains unused and deferred.
3. Review Supabase/legacy-provider audit or access logs for unexpected activity.
4. Run secret scanning against all local branches and the remote repository.
5. Move deployed-environment values into approved environment-specific secret managers; keep local
   replacements only in untracked environment files.

The confirmed replacement staging credentials may be used for non-production integration. No old
credential may be reused, and production remains separately gated.

### ENV-002 — Hosted identity environments require activation

- Severity: High for hosted integration; not blocking local Phase 1 completion
- Status: Staging database activated; provider/application smoke configuration remains open
- Discovered: 2026-07-13

The dedicated staging project and replacement credentials are confirmed. All 23 repository
migrations through Phase 5 and all six reviewed non-production seed files were applied successfully
on 2026-07-14. The project still needs fully reviewed SMS/email provider settings, exact redirects,
hosted OTP/invite templates, rate limits, backup settings, managed secrets, and application smoke
tests. Separate development and production projects remain operator-managed inputs.

Before completing hosted identity activation:

- finish the historical security audit under `SEC-001` without reusing prior values;
- configure the exact token-hash government invite template in every project;
- configure and verify email and Indian SMS delivery;
- smoke-test OTP delivery, redirects, SSR cookies, and effective government scope in the browser;
- repeat migration/RLS smoke in development where used, and never promote to production without an
  independently reviewed production project/deployment.

The first staging government invitation has been accepted and the demo privileges were reconciled
to confirmed owner-controlled Auth identities with the temporary alias assignments revoked. This
proves the stored staging identity state, not the remaining delivered-OTP/browser session checks.

### AUTH-001 — Existing-user assignment and role renewal are incomplete

- Severity: High for broader government onboarding
- Status: Open — newly discovered Phase 1 follow-up
- Discovered: 2026-07-13

The implemented endpoint securely invites a new government Auth user and creates one membership/role assignment. It intentionally returns a non-enumerating conflict for an existing email. There is no server workflow yet to promote an existing citizen, add another authority or role, revoke access, or renew an expired assignment.

Authorization stops at `effective_until`, but partial unique indexes use stored status. Without an explicit transition from `active` to `expired`, a time-expired row can block a replacement. Add audited expire/revoke/renew/assign operations and concurrency tests before onboarding existing or returning government users.

Phase 2 also retains any pre-governance arbitrary authority UUID as a non-routable placeholder for audit/history. Effective-access functions exclude those rows, but an operator workflow must explicitly map or revoke them before reactivating an existing government's access.

A one-time trusted staging transaction reconciled the demo privileges between already-confirmed
identities while retaining revoked rows and audit history. That environment operation does not
provide the missing application/API lifecycle and does not close this issue.

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

### NOTIFY-001 — Push and email notification providers and user preferences are not configured

- Severity: High before offline notification channels are represented as operational
- Status: Open provider and product-policy decision
- Discovered: 2026-07-14

Phase 6 now implements PostgreSQL-backed notification persistence, in-app history, retry and
deduplication, authenticated single-instance Socket.IO delivery, and inert provider-channel state.
No approved push/email provider, credentials, consent/preference model, channel fallback policy,
or privacy-reviewed external payload template exists yet. Push and email therefore remain
explicitly `unsupported`; they must never be marked sent or silently dropped.

Provider selection and production credentials require owner input. Any external payload must remain
data-minimized and omit complaint descriptions, exact coordinates, citizen/contact identifiers,
private media, internal notes, paths, and tokens. Real-device/background push and delivered-email
tests are required before closing the Phase 6 offline-channel exit criterion.

### NOTIFY-002 — Realtime delivery is intentionally single-instance in V1

- Severity: Medium for availability and future scale
- Status: Accepted V1 limitation; horizontal topology deferred
- Discovered: 2026-07-14

ADR-0005 and the Phase 6 plan permit one Socket.IO instance for the pilot. PostgreSQL remains the
durable source of truth, so reconnecting clients can recover persisted messages and notifications,
but active broadcasts are not coordinated across multiple realtime processes and in-memory typing
presence is lost on restart. Do not introduce Redis or a Redis adapter. A later horizontal design
must choose a reviewed cross-instance mechanism, define presence semantics, and preserve database-
first delivery and authorization.

### NOTIFY-003 — Public complaint comments remain disabled pending visibility policy

- Severity: High before any public complaint surface is enabled
- Status: Open product, privacy, moderation, and abuse-control decision
- Discovered: 2026-07-14

Phase 6 creates only the forced-RLS structural `complaint_comments` table. It intentionally grants
no create/read RPC, direct role access, realtime event, or client route because ADR-0011 keeps
complaints and original media private. Enabling comments first requires a reviewed public/private
complaint policy, moderation lifecycle, reporting and abuse controls, retention/deletion rules,
safe public media derivatives, and an explicit architectural/privacy decision. The structural
table must not be mistaken for an operational public feature.

### OPS-001 — Production container images are not pruned

- Severity: Low
- Status: Open technical debt
- Discovered: 2026-07-11

The production images copy the verified workspace from the build stage. They run as a non-root user and build successfully, but they include source and development dependencies and are larger than necessary.

Evaluate pnpm deployment pruning or service-specific production dependency packaging after real runtime dependencies exist. Any optimization must preserve reproducible builds and non-root execution.

## Resolved Issues

### AUTH-009 — Privileged clients could request a code-only email without offering code entry

- Severity: Previously high for administrator and government demo access
- Status: Resolved in code on 2026-07-14; hosted template/login smoke remains under `ENV-002`
- Discovered: 2026-07-14

The administrator and government clients previously requested `signInWithOtp` but instructed the
user to follow a sign-in link. That did not match the reviewed code-only magic-link template. Both
clients now provide explicit six-digit code entry and call `verifyOtp` with the `email` type while
retaining `shouldCreateUser: false`, non-enumerating request behavior, safe return paths, and auth
audit recording. The separate one-time government invitation token-hash callback remains intact.
Focused tests, lint, type-checking, and production builds pass for both applications. The managed
staging project's magic-link template and delivered OTP still require inbox/browser verification.

### AUTH-007 — Existing Auth users could be missing identity profile rows

- Severity: Previously high for affected account pages
- Status: Resolved locally on 2026-07-14; hosted rollout remains under `ENV-002`/`ENV-004`
- Discovered: 2026-07-14

An additive, idempotent migration backfills only missing `public.profiles` and baseline global
citizen roles for existing `auth.users`. It preserves existing profiles, privileged assignments,
revocations, and non-citizen scopes. Local migration, RLS, security, and Auth-flow tests pass;
managed projects must apply the migration before hosted legacy accounts benefit.

### AUTH-008 — Local email OTP templates still emitted sign-in links

- Severity: Previously medium for passwordless testing
- Status: Resolved in repository configuration on 2026-07-14
- Discovered: 2026-07-14

Local confirmation and magic-link templates now render the delivered six-digit token only and do
not include a sign-in URL. Auth E2E extracts and verifies the code and rejects link-bearing email
content. Hosted Supabase projects retain their own operator-managed templates and must update both
confirmation and magic-link/OTP templates before hosted behavior changes.

### DOC-001 — Tracking-document locations were inconsistent

- Severity: Low
- Status: Resolved on 2026-07-14
- Discovered: 2026-07-11

`AGENTS.md` now names the canonical tracker files under `docs/` and includes them in the required
reading order. The empty trailing-comma file `docs/architecture.md,` was removed; no duplicate
tracking documents were created.

### ROUTING-003 — Conflicting applicable confidence policies lacked activation reporting

- Severity: Previously medium for operational routing configuration
- Status: Resolved on 2026-07-14
- Discovered: 2026-07-13

A service-only activation report now identifies simultaneously applicable active verified routing
rules whose confidence-policy versions differ across authority, local-body, ward, asset, and
effective-time scope. Runtime resolution retains its fail-closed guard as defense in depth.

### MOB-001 — Mobile Expo SDK was incompatible with the current Android Expo Go client

- Severity: High for local mobile testing
- Status: Resolved locally; physical-device smoke remains under `COMPLAINT-002`
- Discovered: 2026-07-14
- Resolved: 2026-07-14

The mobile workspace previously targeted an unsupported newer Expo SDK and could not open in the
user's Android Expo Go client, which supports SDK 54. The workspace is now aligned to Expo SDK
54.0.33, React Native 0.81.5, React 19.1, compatible SDK 54 native modules, and TypeScript 5.9.3.
`expo install --check`, mobile strict type-check, and the Android export passed (1,202 modules).
Camera, microphone, GPS, SecureStore, deep-link, and interruption behavior still require the
separate representative physical-device test tracked by `COMPLAINT-002`.

### AUTH-006 — Citizen email magic links used a non-allow-listed callback

- Severity: Previously high for citizen browser sign-in
- Status: Resolved in code on 2026-07-14

The citizen web client now requests the exact queryless same-origin `/auth/callback` URL already
handled by the PKCE callback route, whose safe default destination is `/account`. Unit regression
coverage prevents query parameters from being reintroduced into the provider redirect. Delivered
hosted-link, cookie, and cross-device behavior remains an environment validation task under
`AUTH-005` and `ENV-002`, not a known callback-construction defect.

### ROUTING-002 — Duplicate detection was not connected to complaints

- Severity: Previously medium for Phase 4 complaint capture
- Status: Resolved on 2026-07-14

Phase 4 adds versioned duplicate-policy selection, bounded private candidate retrieval, deterministic
scoring, persisted result evidence, and an authenticated citizen suggestion API. Responses expose
only complaint number/category/status/time, approximate distance, and score; they omit identity,
description, exact location, and media. Suggestions require explicit acknowledgement and are never
merged automatically.

### ROUTING-004 — Routing HTTP retries were not replay-idempotent

- Severity: Previously medium before automatic client retries
- Status: Resolved on 2026-07-14

Routing now accepts a distinct `Idempotency-Key`, reloads the actor-scoped stored decision before
evaluation, returns the original sanitized response across clock/configuration changes, and rejects
key reuse with different category, asset, location, accuracy, or capture time. Complaint submission
uses its own replay record and returns the stored receipt without recomputing routing or creating a
second complaint.

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
