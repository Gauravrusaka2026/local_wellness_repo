# DECISIONS.md

## 2026-07-11 — Phase 0 Implementation Conventions

These implementation conventions supplement the Phase 0 ADRs and do not replace architectural decisions.

### Workspace Naming and Modules

- All applications and packages use the `@local-wellness/*` workspace scope.
- Workspace packages are private and use ECMAScript modules.
- Shared package entry points compile to `dist` and expose declarations through package exports.
- External dependency versions are exact and centralized in the pnpm catalog; internal references use `workspace:*`.

### Runtime and Toolchain Versions

- Node.js 22 is the foundation runtime major.
- pnpm 11.11.0 is pinned through the root `packageManager` field and provisioned with Corepack.
- TypeScript 5.9.3 is pinned across the workspace so Expo SDK 54's supported toolchain and the
  current `typescript-eslint` range share one strict compiler version.
- ESLint 10.6.0 is used instead of the newly published 10.7.0 so pnpm's release-age supply-chain protection does not require an exception.

### TypeScript Project Layout

- Framework-facing application `tsconfig.json` files use `noEmit` for normal type checking.
- Separate `tsconfig.build.json` files provide composite reference targets and emitted application or declaration output.
- Next.js type checks generate framework route types before invoking TypeScript.
- Root type checking runs both Turborepo workspace checks and a TypeScript solution build.

### Local Development Ports

- Citizen web: 3000.
- API: 3001.
- Realtime server: 3002.
- Government dashboard: 3003.
- Admin console: 3004.
- Redis: 6379 (Phase 0 reservation, superseded for V1 by ADR-0007 on 2026-07-13).

These distinct development ports allow `pnpm dev` to start the application foundations without collisions.

### Foundation Entry Points

- Expo and Next.js root routes intentionally render no product UI.
- The NestJS API intentionally has no controllers or feature modules.
- The Socket.IO server intentionally has no event handlers.
- The workers process intentionally has no queues or jobs.

This keeps Phase 0 buildable without introducing later-phase behavior.

### Dependency Security

- pnpm install scripts are allowed only for `esbuild` and `sharp`, the two dependencies verified to require them.
- PostCSS versions below 8.5.10 resolve to 8.5.16 to address the applicable advisory.
- `uuid` versions below 11.1.1 resolve to 11.1.1 for Expo's CommonJS build-tool chain.
- The complete Expo, Next.js, Node, and container builds must pass after any override change.

### Generated Files and Telemetry

- Framework output, TypeScript build information, and dependency directories are ignored.
- Next.js owns `next-env.d.ts`, so Prettier does not rewrite it.
- Deterministic governance generator outputs remain byte-owned by their generators and are excluded
  from Prettier; generator drift checks, schemas, and tests validate those artifacts instead.
- Expo, Next.js, and Turborepo telemetry are disabled in CI and explicitly passed through Turborepo's environment boundary.

### Containers

- API, realtime, and workers images use Node 22 Alpine multi-stage builds.
- Production processes run as the non-root `node` user.
- Phase 0 favors verified workspace-copy production stages; dependency pruning is deferred until runtime dependency boundaries are implemented and testable.

### Changesets

- Changesets is configured for private package version tracking.
- Phase 0 does not create a release changeset because it adds the initial private scaffolds and publishes nothing.

## 2026-07-13 — Phase 1 Identity and Access Conventions

These conventions implement ADR-0006 and ADR-0007.

### Identity and Authorization

- Supabase Auth proves identity; current PostgreSQL role and membership rows determine authorization.
- Global roles require an active profile and current assignment. Authority-scoped roles additionally require a matching current active authority membership.
- The trusted API verifies bearer tokens with Supabase Auth and uses a current secret key or legacy service-role key only as its server-side persistence boundary.
- System role codes are seeded, immutable application constants. Clients cannot assign roles, membership state, grantors or risk state.
- Phase 1 authority UUIDs were intentionally unreferenced until Phase 2; they now reference the canonical governance authority entity through an additive, history-preserving forward fix.

### Sessions and Keys

- Mobile sessions use chunked Expo SecureStore with device-only accessibility; raw access/refresh token callback pairs are rejected.
- Web sessions use Supabase SSR cookie adapters and PKCE for ordinary email sign-in.
- Administrator invite emails use a query-based one-time token hash because `inviteUserByEmail` does not originate a PKCE verifier.
- Current Supabase publishable/secret key environment names are preferred. Legacy anon/service-role names remain nonempty-value fallbacks only.

### Devices and Auditing

- The raw random installation ID remains only in mobile SecureStore. Mobile sends a digest, and the API hashes that value again before persistence.
- Device registration and soft revocation execute in service-only database functions that append their audit event in the same transaction. Direct authenticated device mutation is denied.
- Sensitive device identifier hashes and push tokens are server-only columns; authenticated SQL access is limited to safe metadata.
- Client session audit events are restricted, best-effort and stamped `source: client_reported`. Server access/device/administration events retain authoritative meaning.
- Audit actor, subject and device UUIDs are immutable attribution snapshots. Access-lifecycle actor foreign keys restrict deletion so approval/grant/revocation provenance is retained.

### Runtime Boundaries

- Browser API access uses an exact configured origin allow-list and bearer tokens, not credentialed cross-origin cookies.
- Redis, BullMQ and Sentry are not V1 dependencies. Request IDs and application error logging are the implemented Phase 1 baseline; structured logs, health checks, uptime checks and provider-native metrics are the approved V1 deployment target.
- Phase 0's controller-free/product-UI-free entry-point convention was a scaffold-only constraint and is superseded for identity surfaces by Phase 1.
- Next.js project-reference builds include application, library and proxy sources so the root TypeScript solution validates the complete runtime boundary; test sources remain in the normal no-emit checks.
- TypeScript test scripts use Node's test runner with `--import tsx`, avoiding a separate `tsx` command-process dependency while preserving the same test semantics.
- Repository Git hooks invoke `corepack pnpm` so the pinned package-manager version works even when no global `pnpm` shim is installed. Staged ESLint checks suppress notices only for files already excluded by the repository ESLint configuration; real lint warnings still fail the hook.
- Integration harnesses marked as requiring local Supabase must reject non-loopback API hosts before
  creating fixtures, even if generic environment variables contain otherwise valid hosted
  credentials.

## 2026-07-13 — Phase 2 Maharashtra Governance Conventions

These conventions implement ADR-0008 and do not activate Phase 3 complaint routing.

### Canonical Inputs and Generated Artifacts

- The manifest-pinned CSV files are immutable machine input; the XLSX workbook is the checksum-pinned human reference copy.
- Every CSV title, header, row width, source hash, required parent, placeholder disposition and generated artifact is validated before an atomic write can replace a report or seed.
- Stable namespace UUIDs make repeated generation deterministic without using mutable source row order as identity.
- The main generated seed cannot safely contain its own checksum. A second generated, idempotent companion seed records the externally computed main-seed SHA-256 and rejects conflicting values.
- The baseline generator is not a general delta-refresh engine. Replacement bundles require explicit review and append/close version logic before import.

### Governance Identity and History

- `governance.authorities` is the durable access-control supertype; typed geography, organization and service records retain domain-specific ownership and provenance.
- Structured authority parents follow an enforced type matrix, parent links are immutable, and both row-level and deferred whole-graph checks reject cycles, including multi-row cycles.
- Official LGD codes are nullable text distinct from repository/source codes; placeholder strings never become official identifiers.
- Durable officer roles and people are separate from temporal officer assignments. The supplied officer placeholders create neither people nor assignments.
- Boundary, assignment and routing-reference content is append-versioned. Existing versions may be closed but not rewritten, reopened or deleted.

### Security and Runtime Boundaries

- The `governance` schema is excluded from the Supabase Data API and every table still has forced RLS, least-privilege grants and explicit policies as defense in depth.
- Placeholder, unverified and unresolved rows are never promoted to verified public-safe or routing-eligible records merely because source text says `Active`.
- Effective API access is loaded through service-only database functions that enforce active canonical authority state, membership validity and ward/department ownership. The API does not read raw role/membership rows as an alternate authorization path.
- Jurisdiction lookup is a service-only `ST_Covers` database function over active, verified, current SRID 4326 `MultiPolygon` versions; it returns evidence and does not assign complaints.
- Database types are generated atomically for `public`, `governance`, and `routing`, with drift checks and application-schema database lint enforced in CI.

## 2026-07-13 — Phase 3 Routing and Governance Synchronization Conventions

These conventions implement ADR-0009 and ADR-0010.

### Routing Evidence and Evaluation

- Operational routing configuration lives in the private `routing` schema. Application source
  contains no municipality, ward, category, department, officer, ownership, confidence, or fallback
  mapping.
- Pune Municipal Corporation is the architecture and synthetic-test reference only. Supporting a
  different authority must be a database-data change, not a municipality-specific code branch.
- PostGIS and relational SQL materialize current eligible jurisdiction and routing candidates,
  including fallback depth/path. The pure routing engine ranks those candidates; it does not walk a
  database fallback graph or perform I/O itself.
- Eligibility is defense in depth: activation constraints, candidate queries, and the evaluator all
  reject inactive, expired, unverified, placeholder, or non-routable evidence.
- Direct candidates sort before fallbacks. Within a level, asset and ward specificity, configured
  priority, confidence, and a stable identifier give reproducible ordering. A stable identifier
  cannot resolve materially different targets inside the policy's ambiguity delta; that outcome
  requires manual review.
- Confidence weights, thresholds, required signals, ambiguity delta, and per-level fallback penalty
  are versioned database data. Category or city names do not affect the scoring algorithm.
- Candidate context must match the independently resolved state/district/taluka/local-body/ward
  hierarchy and exact boundary-version vector. Asset matches retain the exact asset version,
  distance, and ownership version. Candidate output is deterministically capped at 100 rows.

### API, Audit, and Privacy

- `governance` and `routing` remain outside PostgREST. The NestJS server alone may execute narrow
  `public` category, jurisdiction, candidate, and decision-recording RPCs with its service role.
- Routing request schemas are strict and accept location/category/optional-asset evidence only.
  Clients cannot select an authority, ward, department, role, assignment, rule, or confidence.
- Internal decision evidence retains candidate eligibility/rejections and confidence factors for
  explainability. The citizen response is a sanitized summary and does not expose the complete
  candidate graph, exact-location audit, officer contacts, or raw-source evidence.
- Routing decisions are append-only and duplicate-protected by actor plus request ID. Exact stored
  payloads return the existing row, conflicting reuse fails, and transparent HTTP replay is tracked
  separately under `ROUTING-004`. Exact coordinates,
  accuracy, capture/resolution timestamps, and selected version IDs are sensitive service-only
  audit fields and are omitted from structured application logs.

### Pilot Taxonomy and Duplicates

- The 12 pilot taxonomy records are deterministic seed data for engineering, with status `draft`,
  verification `unverified`, and routing disabled. They are not production placeholders, but they
  cannot become operational merely because a linked Phase 2 reference says `Active`.
- The `Blocked drain` to `Storm-water blockage` bridge is an explicit unverified alias record; the
  canonical CSV label is not modified.
- Duplicate detection is a pure configurable scoring framework and versioned policy model. It is
  not connected to complaint persistence, a candidate query, an API, or automatic merging until
  the complaint phase supplies those boundaries.

### Governance Synchronization

- Synchronization is a permanent staged capability, not an extension of the one-time bootstrap
  generator. Retrieval, immutable snapshot preservation, normalization, matching, change
  detection, review, and transactional publication remain separate ports.
- Source and run metadata, snapshot references, candidates, changes, reviews, and append-only review
  events live inside the forced-RLS governance boundary. Exact raw bytes belong in the private,
  content-addressed `governance-raw-snapshots` bucket.
- A source claim or match score never verifies a record automatically. Placeholder evidence may
  only remain quarantined and non-routable; verification and routing activation require separate,
  attributed reviewer decisions plus record-specific provenance.
- Match evidence must identify the proposal candidate, and placeholder state is a symmetric
  invariant across candidate marker, requested status, quarantine operation/disposition, routing
  disablement, and review decisions. A future publisher must reload all run/change/review evidence
  transactionally before applying it.
- The Phase 3 foundation intentionally selected no connector, scraper, scheduler, queue, cache, or
  error-reporting vendor. ADR-0012 and the 2026-07-14 conventions below now select Supabase Cron,
  one bounded Edge retrieval function, and PostgreSQL leases for the retrieval slice. Redis,
  BullMQ, Redis adapters/caching, and Sentry remain absent.

## 2026-07-14 — Phase 4 Citizen Complaint Capture Conventions

These conventions implement ADR-0011 and do not activate unverified Pune routing data.

### Complaint Ownership and Submission

- Complaint drafts, exact location evidence, media metadata, duplicate evidence, complaints,
  assignments, status history, and mutation replay records live in the unexposed, forced-RLS
  `complaints` schema. The citizen never receives direct table mutation access.
- The NestJS API owns complaint orchestration. Clients may supply issue evidence and explicit user
  acknowledgements, but cannot select a municipality, ward, department, officer role, officer,
  assignment, routing rule, confidence result, or official complaint status.
- Draft creation, media reservation, routing, and final submission use purpose-scoped idempotency
  identities. Raw client idempotency keys are not persisted, and successful routing/submission
  retries return stored evidence instead of recomputing against changed configuration.
- Mobile submission keys remain stable for ambiguous network retries, rotate after successful
  draft-evidence mutations or explicit terminal no-route outcomes, and never rotate merely because
  a response cannot be decoded. `COMPLAINT_ROUTE_UNAVAILABLE` is distinct from a generic dependency
  outage so clients can make that retry decision without guessing from message text.
- Submission is atomic only after the current server-side evidence passes location, media,
  duplicate-policy, route, and acknowledgement checks. Unsupported, ambiguous, placeholder, or
  unverified routes fail closed and create no submitted complaint.

### Private Media and Location

- Original photo, video, and voice files use private Storage buckets. The API reserves one narrow
  object path and returns a short-lived signed upload token; bucket-wide upload permission and
  public object URLs are never issued.
- Finalization reads the private object through the trusted server boundary and verifies byte size,
  MIME type, and SHA-256 against the reservation before marking it ready. A mismatched object is
  removed and cannot be submitted.
- Exact complaint/media coordinates and signed-upload credentials are omitted from structured logs
  and public duplicate results. Submitted location and initial routing evidence become immutable.
- Mobile SQLite persists only an allow-listed opaque resume record. Bearer/session tokens, signed
  upload credentials, descriptions, and coordinates are excluded; retry-only media coordinates use
  device-protected SecureStore and are deleted after finalize, discard, or stale cleanup.

### Citizen Capture UX

- Category identities and requirements come only from the database, never a hardcoded client list.
  The later complaint-category presentation convention may display every non-placeholder category,
  but only the independently verified, active, routing-eligible projection is selectable and
  submittable. A non-routable bootstrap therefore displays an explicit unavailable state.
- Phase 4 accepts live camera photo/video and live microphone evidence. Gallery import is excluded
  from this V1 evidence flow so the capture-source assertion remains meaningful.
- Device location evidence is freshness-, accuracy-, mock-location-, and media-distance-checked;
  final submission additionally requires the database to return `verified` or
  `partially_verified` location evidence.
- Duplicate matches are privacy-safe advisory suggestions and are never merged automatically.
  Suggestions and emergency-category warnings require explicit citizen acknowledgement.
- Voice remains private evidence until an approved speech-to-text/moderation provider is selected.
  The client never fabricates a transcript and requires the citizen to type and confirm the
  description.
- Citizen web email sign-in uses the exact queryless same-origin `/auth/callback` redirect. The
  callback owns the safe default destination rather than encoding `next` into the provider
  allow-list URL.
- Citizen account rendering validates the profile API response and always shows the authenticated
  identity plus an explicit onboarding, provisioning, unavailable, API-error, or complete-profile
  state. It does not fabricate a profile when Auth and the API/database environment are misaligned.
- The mobile toolchain targets Expo SDK 54.0.36, React Native 0.81.5, React 19.1, and SDK-compatible
  native modules so it remains loadable by the current Android Expo Go SDK 54 client. TypeScript
  5.9.3 is the repository compiler compatibility point; future Expo upgrades must run
  `expo install --check`, strict type-checking, and an Android export before acceptance.

## 2026-07-14 — Governance Synchronization Retrieval and Contact Conventions

Historical/superseded for V1: these conventions implemented ADR-0012 while retaining ADR-0010's
human-review publication gate. ADR-0031 removes this undeployed runtime, its tables and its package/
Edge boundary. The details below remain design history only; reintroduction requires a new ADR and
forward migration.

### Source Activation and Scheduling

- Source endpoints are database records, not hardcoded application branches. Official PMC/BMC
  records are seeded as draft, unverified, inactive definitions so parser and cardinality contracts
  can be reviewed before any network work is scheduled.
- Supabase Cron is the environment-owned trigger; it invokes one private Edge dispatcher. Cron
  definitions, dispatch authorization, service credentials, and source activation are deployment
  configuration and are never committed as working secrets or silently enabled by a seed.
- PostgreSQL is the work coordinator. A service-only claim function uses row locking and short
  leases, records each run, and applies bounded retry/freshness state. Exactly one source is claimed
  per dispatch; expired work is failed and backed off without same-call reclamation. The Edge lease
  is 300–900 seconds (300 by default), while the trusted RPC allows 180–900 seconds. No Redis queue,
  BullMQ worker, Redis adapter/cache, or Sentry integration is used.

### Retrieval and Raw Evidence

- Every fetch uses an exact per-source HTTPS host allowlist, manual redirect validation, a bounded
  timeout, response-size and MIME limits, conditional request headers, and safe fixed failure codes.
  DNS/private-address enforcement remains a required source-activation hardening gate.
- Every source contract receives a deterministic SHA-256. Activation requires exact approval of
  the current hash by an active global `platform_admin`; only supported MIME types and HTTPS port
  443 URLs without fragments are accepted.
- Successful bytes are SHA-256-addressed in the private `governance-raw-snapshots` bucket and then
  linked to the run through a lease-checked RPC. The Edge function heartbeats after fetch and after
  Storage, and the RPC checks the exact `storage.objects` size/MIME record. HTTP 304 reuses the
  previous snapshot rather than manufacturing empty evidence. Referenced snapshot objects are
  immutable. Failed or ambiguous finalization retains content-addressed bytes for grace-period
  reconciliation; eager deletion is forbidden because it could race a late commit.
- New required columns on populated synchronization tables use nullable creation, deterministic
  backfill, then constraint enforcement. `source_contract_sha256` follows this sequence and the root
  migration-safety test protects it.
- Edge logs expose only safe run/source identifiers and lifecycle outcomes. Lease tokens, dispatch
  secrets, service credentials, response bodies, and extracted contact values are excluded;
  database synchronization events provide the durable audit trail.

### Contact History, Verification, and Delivery

- A contact channel is a durable typed relationship to exactly one governance owner. Contact values
  are immutable effective-dated versions with source snapshot/locator, verification status,
  visibility, reviewer attribution, and append/close history rather than mutable fields.
- A parser/normalizer may produce at most `source_verified`, staged evidence. It cannot claim manual
  verification, publish a value, approve complaint delivery, update canonical entities, activate a
  route, or overwrite the canonical CSV bootstrap.
- Official-source trust in the contact normalizer requires the current source contract to be
  approved and every record-specific URL to use one of that contract's approved hosts.
- Publication requires a separately attributed manual review linked to the proposed change.
  Complaint delivery requires an additional explicit approval and is permitted only for a current,
  published, manually verified, public-official complaint-intake channel.
- Publication binds the owner UUID, channel/value, source URL, evidence-value hash, and delivery
  decision to the approved candidate/proposal. Each review item is single-use.
- Placeholder, malformed, duplicate, empty, conflicting, stale, layout-drifted, or unexpected-count
  results remain quarantined/non-routable. An empty or changed official page never implies that
  existing officers, assignments, offices, wards, or contacts should be removed.

### Synchronization Scope

- Pilot and future statewide synchronization targets are records in the service-only, forced-RLS
  `governance.sync_scope_targets` registry, not municipality-specific application branches.
- Target identity and authority/local-body/ward hierarchy are immutable. Activation and manual
  verification require attribution to an active global `platform_admin`.
- Selection for synchronization never implies routing eligibility. The routing flag remains false
  unless the selected canonical entity is independently active, verified, non-placeholder, and
  routing eligible.
- The first scope seed resolves five Pune and five Brihanmumbai canonical ward codes only as draft,
  unverified, unapproved, non-routable engineering targets. Their underlying wards remain
  placeholders. The numeric BMC rows are not an ordinal crosswalk to the official lettered ward
  structure; reviewed official records and a new scope version are required.

## 2026-07-14 — Phase 5 Government Complaint Operations Conventions

- Government complaint queues and actions use a separate API/store boundary from citizen-owned
  complaint reads. Both share domain contracts, but an operational endpoint never falls back to a
  citizen-ownership query.
- Current database role and membership scope is authoritative on every read and mutation. The UI
  may hide unavailable controls, but it never derives permission from cached role labels.
- Moderators are read-only. Platform administrators operate globally; municipal administrators and
  government operators operate within an authority; ward and department officers operate only in
  their exact current scope.
- Complaint assignments are append-and-close versions with one active row. Manual transfer stays
  inside the current verified authority until a reviewed cross-authority policy exists.
- Government mutations require an optimistic workflow version plus a purpose-scoped idempotency
  key. Exact replay returns the stored result; changed key reuse fails.
- Status transition, status history, data-minimized audit, current projection, and notification
  outbox persistence commit in one PostgreSQL transaction. Notification delivery remains Phase 6.
- Internal notes and operational records stay private. Only an explicitly bounded public status
  message may enter the citizen-visible timeline.
- Resolution evidence uses a server-allocated path and short-lived signed upload in the private
  bucket. Finalization checks workflow/expiry before download, verifies a bounded binary signature,
  size and SHA-256, marks rejected reservations terminal, and forces authorized signed reads to
  download. Only finalized evidence from the current assignment that is not already linked to a
  resolution may be submitted.
- A changing or expired governance incumbent does not make an existing complaint disappear. The
  current assignment remains authority-recoverable, its stale officer is no longer presented as a
  current verified recipient, and an authorized authority/global operator may reassign it to a
  current verified target.
- Transfers and manual status exits must not strand scheduled inspections or active external
  dependencies. Operators complete the inspection or resolve every active dependency before moving
  the complaint out of that child workflow state.
- All government workspace responses, including signed-upload/read metadata, use
  `Cache-Control: private, no-store`; queue responses never include exact coordinates.
- Queue responses omit coordinates. Exact complaint coordinates are available only on an
  authorized detail response and are not sent to an external map/tile service.
- The pnpm global virtual store is explicitly disabled in workspace configuration so local and CI
  dependency-state verification use the same deterministic node_modules layout.

## 2026-07-14 — Staging Identity and Pilot Ward Conventions

### Environment and Demo Identities

- The owner-confirmed hosted target is staging, not production. Its newly generated privileged and
  database credentials remain untracked; staging deployment does not weaken production separation.
- Demo identities are environment records, never committed seeds. Citizens use ordinary Auth
  provisioning, the first platform administrator uses the audited one-time bootstrap, and a
  government municipality user is a `municipal_admin` with `authority` scope created through the
  invitation plus guarded persistence boundary.
- Repository documents must not retain demo email addresses, Auth UUIDs, OTPs, invitation tokens,
  database connection strings, or access credentials.
- Code-only OTP templates require an explicit OTP verification step in citizen, government, and
  administrator clients. Government invitation acceptance remains the separate token-hash callback
  flow.
- Staging demo-role corrections preserve identity/access history: grant the replacement confirmed
  identity, revoke rather than delete the temporary role/membership rows with actor/time/effective
  bounds, and verify singleton active privileged scopes. A trusted one-time environment correction
  does not replace the still-required audited application lifecycle for existing-user assignment,
  renewal, and revocation.

### Pilot Ward Identity

- The BMC pilot means the official administrative wards A, B, C, D, and E. It does not mean
  electoral ward numbers and must never be implemented as `BRIH-W01 = A` or another ordinal
  conversion of the canonical placeholders.
- The Pune pilot uses the officially current numeric ward model, initially targeting wards 1–5 only
  after record-specific official identity and effective-date review.
- Existing V1 synchronization target identities are immutable. Preserve the numeric bootstrap rows
  and V1 target records as non-routable provenance; create reviewed official ward rows and a new
  versioned synchronization scope rather than repointing history.
- Ward-model selection is not verification. No selected ward becomes active, routable, or suitable
  for complaint delivery without official provenance and reviewed geometry.

## 2026-07-14 — Phase 6 Realtime and Notification Conventions

- A persistent event is committed to PostgreSQL before any Socket.IO emission. Realtime payloads
  invalidate client views; authenticated REST history remains the recovery source of truth.
- The Phase 5 notification outbox is the only domain-event ledger. Materialization and realtime
  delivery use separate PostgreSQL `FOR UPDATE SKIP LOCKED` projections with opaque leases,
  bounded exponential retry, five attempts, retained terminal state, and uniqueness-based replay.
- Communication tables remain in the private, forced-RLS `complaints` schema. Runtime services use
  narrow service-role RPCs that independently reauthorize the actor or current recipient; direct
  service-role table access stays revoked.
- `room_members` records effective participation evidence but never grants access. Complaint,
  authority, ward, and department subscriptions resolve from current database ownership/scope.
- Private-message responses expose an author class and request-relative `authoredByMe` flag, never
  another user's Auth UUID. Message bodies, contact values, exact coordinates, object locators,
  tokens, and lease capabilities stay out of notification metadata and structured logs.
- In-app history is the implemented offline channel. Realtime is at-least-once with stable event
  IDs and a single V1 instance. Redis, BullMQ, Redis adapters/caching, and Sentry remain absent.
- Push and email intent is explicitly `unsupported` until provider, consent/preferences,
  destination verification, localization, fallback, credential, and privacy policy are approved.
- Public-comment storage is structural only. No create/read RPC, grant, event, or client route is
  enabled while complaint visibility and moderation policy remain unresolved.

## 2026-07-16 — Phase 7 Resolution Accountability Conventions

- A resolution policy has a stable scope identity and immutable effective-dated versions. The
  policy applicable at the exact server-recorded resolution completion time governs its later
  feedback, follow-up evidence, and reopen actions even if a newer version is published.
- Missing, ambiguous, draft, or out-of-period policy data is an explicit unavailable state. No API
  or client supplies fallback rating bounds, windows, reasons, attempt limits, or escalation
  thresholds, and the repository seeds no operational Phase 7 policy.
- Original finalized complaint media is `before` evidence; explicitly linked finalized government
  media is `after` evidence; finalized citizen follow-up media is `reopen` evidence. Every object
  stays private and is accessed only through a fresh owner check and short-lived signed URL.
- New government resolutions record server completion time, the complete captured-location
  provenance, optional same-complaint/current-assignment work reference, and at least one finalized
  after-evidence item. Historical Phase 5 rows retain nullable completion fields rather than
  receiving fabricated backfills.
- Citizen feedback and reopening are distinct immutable actions. A `resolved` outcome confirms the
  complaint; an adverse outcome remains auditable but never silently reopens it.
- Feedback, evidence reservation/finalization, and reopening use purpose-scoped exact replay plus
  optimistic workflow versions. PostgreSQL derives `reopened` versus `escalated`, appends history
  and data-minimized audit, and reuses the existing Phase 6 outbox transactionally.
- Government-only completion notes never enter citizen contracts. Feedback text, ratings, exact
  coordinates, object paths, hashes, and signed tokens never enter notification payloads or
  structured logs; logs may retain bounded actor, complaint, action, and evidence identifiers for
  audit correlation.

## 2026-07-16 — Phase 8 Public Transparency Conventions

- Public transparency is a separately reviewed, immutable projection, never a direct filtered read
  of the private complaint row. The private visibility constraint remains unchanged.
- Public positions are derived by PostgreSQL from current reviewed ward geometry. Clients cannot
  submit a public coordinate, and exact complaint/routing geometry is absent from projection DTOs.
- Publication, withdrawal, duplicate grouping, and any later derivative approval are append-only or
  effective-dated and reviewer-attributed. Missing or ambiguous approved policy fails closed.
- Anonymous HTTP reads pass through NestJS service-only functions; no Supabase API role receives
  direct projection-table access.
- Provider-neutral first-party rendering plus an accessible list is the default. External tiles,
  processed public media, and comments remain disabled until their separate privacy, moderation,
  operations, and provider decisions are approved.

## 2026-07-16 — Mobile Citizen Experience Conventions

- The authenticated mobile shell keeps five stable primary destinations: Home, Complaints, the
  central Report action, Community, and More. Secondary profile, language, notifications,
  verified governance/Nearby, device-help, and sign-out actions live in grouped More sections so existing
  complaint/deep-link paths do not change.
- Citizen authentication presents explicit email/password sign-in, account creation, and password
  recovery. Requests and error messages remain non-enumerating. Supabase Phone MFA is the phone-
  verification mechanism and remains in observe mode until provider and recovery gates pass.
- Category requirements are runtime data. Required attributes, photo/video minimum/maximum counts,
  recommended media kinds, asset selection, and routing readiness travel through shared/API/mobile
  contracts and must not be duplicated in municipality/category UI branches.
- Local mobile configuration is sourced from the repository root environment. Native startup
  rejects loopback service URLs and detectable Supabase URL/key project mismatches without exposing
  their values; app-local credential copies are not an accepted override mechanism.
- Expo Location, Camera, Audio, SecureStore, and SQLite remain the native capability boundary for
  foreground capture and protected resume state. OS push is not installed until an Expo/EAS
  project, FCM/APNs credentials, user consent/preferences, verified destinations, and a delivery
  policy are approved. Durable in-app notifications plus optional Socket.IO refresh remain active.
- Citizen-facing governance lookup follows ADR-0017: the app displays only official-source,
  verified projection data and renders low-accuracy, unsupported, or ambiguous outcomes instead of
  inventing a local body, ward, officer, or contact.

## 2026-07-16 — Template-Compatible Privileged and Legacy Callback Conventions

- Email request screens describe both possible provider outcomes: a six-digit token, a secure
  link, or both. Template presentation never changes the database authorization boundary.
- Ordinary web links use the Supabase SSR PKCE flow. Citizen and administrator callbacks reject
  implicit fragments; only the configured government invitation callback may accept a complete
  fragment typed exactly `invite`, and it removes callback material from browser history before
  persisting the session.
- `shouldCreateUser` is true only in explicit citizen account creation. Citizen sign-in/recovery and
  every government/administrator request keep it false, and callbacks never assign application
  roles or memberships.
- Mobile accepts PKCE or reviewed email token hashes and rejects raw fragments. The stable custom
  scheme is validated with an installed development/release build rather than treating Expo Go's
  temporary `exp://` address as production-like evidence.

## 2026-07-16 — Phase 9 SLA and KPI Conventions

- SLA calendars, policies, category overrides, and escalation rules have stable identities plus
  immutable effective-dated versions. Publishing a future replacement atomically closes and
  supersedes the prior version; overlapping/backdated ambiguity fails closed.
- Complaint clocks snapshot the exact assignment, policy, calendar, target, pause, completion, and
  deadline evidence. Existing complaints receive no fabricated backfill and historical deadlines
  are never silently recalculated.
- Overdue escalation and KPI materialization use bounded PostgreSQL leases, retry/dead evidence,
  idempotent execution, and privacy-safe structured logs in the existing worker. Redis, BullMQ,
  Redis caching/adapters, and Sentry remain absent.
- KPI definitions are code-owned and versioned; persisted runs retain source cutoff, window,
  algorithm version, fingerprint, numerator, denominator, exclusions, scope, and segmentation.
  APIs read current authorized organizational snapshots and never calculate or expose individual-
  officer rankings.
- No operational SLA target, calendar, override, escalation rule, KPI schedule, or public metric is
  seeded by engineering fixtures.

## 2026-07-16 — Phase 10 Citizen Access and Hardening Conventions

- Citizens use Supabase email/password plus provider-owned recovery. Phone verification is a
  Supabase Phone MFA factor with a verified factor and `aal2`; the application never stores or
  verifies homemade OTPs in PostgreSQL, Storage, Edge Functions, logs, or resume state.
- Citizen and privileged MFA use matching API/client `observe` and `enforce` modes. Enforcement is
  changed across all participating boundaries only after managed enrollment, delivery, recovery,
  and representative-device smoke tests pass.
- Profile originals remain in the owner-private `profile-images-private` bucket. Clients use
  short-lived signed reads; the public transparency projection excludes avatar metadata and paths.
- Complaint location accuracy and media-to-current-location distance are capped at 50 m by both
  application validation and PostgreSQL. The device's foreground capture point is the issue point;
  a client cannot submit an arbitrary remote location.
- Local, Trending, and Heat surfaces consume only reviewed public projections. The heat view renders
  provider-neutral aggregate circles and never receives exact complaint coordinates, identity, or
  private media.
- V1 API abuse quotas are atomic PostgreSQL fixed-window counters with privacy-safe subject hashes,
  endpoint-specific limits, bounded cleanup, and `Retry-After`; Redis is not a fallback.
- Complaint queue routing and external contact delivery are separate states. A verified
  authority/department/role queue is authoritative; approved officer/body contact readiness is
  optional metadata, and persistence never implies an email, SMS, or telephone delivery.
- Expo SDK 54 stays on a compatible current patch release (`54.0.36`) while Expo Go is the demo
  target. Native-module changes require a Metro restart and installed-build smoke before release.

## 2026-07-17 — Split Master Bootstrap Conventions

- Retain `supabase/master.sql` as the complete deterministic empty-database artifact and generate
  `supabase/master.part-1.sql` plus `supabase/master.part-2.sql` for Dashboard SQL Editor query-size
  limits.
- Split after the complete Phase 5 schema/security pair so a successful Part 1 does not leave that
  phase's new tables waiting for their matching forced-RLS and RPC boundary. Part 1 must complete
  before Part 2; a migration is never divided between queries.
- The existing generate/check commands own all three files and preserve exact source SHA-256
  manifests. Seeds remain separate under `supabase/seed/`.
- Neither split execution nor the complete master is an upgrade path or a migration-ledger repair.
  Dashboard execution on a clean database does not itself record all source versions in Supabase's
  migration-history table.

## 2026-07-17 — Existing-Database SQL Editor Upgrade Convention

- This convention supersedes using `master.part-1.sql` and `master.part-2.sql` as clean-bootstrap
  slices. `master.sql` remains the complete clean-database bootstrap.
- The current parts target the repository's previously generated 34-migration Phase 9 baseline and
  contain only the six later Phase 10 migrations. Part 1 ends after citizen Phone MFA; Part 2
  contains profile-image, proximity, and routing-delivery work.
- Each part is one transaction and fails closed against representative baseline, prior-part, and
  target markers. A mismatch requires reconciliation or a new forward-only bundle; operators must
  never add `IF NOT EXISTS` to conceal drift.
- SQL Editor execution remains separate from the Supabase migration ledger. The parts neither seed
  data nor claim to repair `supabase_migrations.schema_migrations`.

## 2026-07-17 — Adaptive Full-History SQL Editor Reconciliation

- This supersedes the fixed Phase 9 baseline assumption, which was not supported by managed-schema
  evidence. The two parts cover all current migrations at the reviewed Phase 5 boundary; as of
  2026-07-17, that is 43 migrations split 23/20.
- Idempotence is migration-level: catalog fingerprints identify a coherent complete prefix, exact
  immutable source migrations after that prefix execute dynamically, and reruns skip complete
  migrations as units. Blanket statement-level `IF NOT EXISTS` is prohibited because it cannot
  validate policies, triggers, functions, constraints, grants, RLS, or prior DML.
- Each part uses one advisory-locked transaction and fails on partial/non-contiguous fingerprints.
  Seeds and `supabase_migrations.schema_migrations` remain separate operator concerns.

## 2026-07-17 — Explicit Portal Identity and Official-Onboarding Conventions

- After Supabase establishes a session, every portal shows the exact current account email (or the
  available citizen phone label) and a clear sign-out/switch-account action. Pre-authentication
  responses remain non-enumerating and never reveal whether another account exists.
- Privileged access is explained and enforced as three independent gates: Supabase Auth identity,
  that user's own TOTP factor at AAL2 when enforced, and current database authority membership plus
  scoped role. Passing one gate never implies another.
- A QR code is displayed only to enroll a new TOTP factor. Returning users challenge an existing
  factor with its six-digit code. Lost-factor recovery is administrator-mediated and cannot bypass
  API or RLS authorization.
- Government invitation scope choices come from a trusted service-role projection of active,
  verified, non-placeholder, routing-eligible governance records. Platform administrators may see
  all eligible choices; municipal administrators are filtered to their own authority. Operators
  select names while opaque IDs remain transport values, not manually entered fields.
- Each official uses an individual invited email and individual authenticator enrollment. Existing
  Auth identities continue to require the future audited lifecycle under `AUTH-001`; Auth metadata
  is never used to grant application access.
- No ADR was added for this slice because it implements and clarifies ADR-0006 and ADR-0020 without
  changing the accepted identity, MFA, database-authorization, or deployment architecture.

## 2026-07-17 — Single Root Environment for Authentication-Facing Local Runtimes

- The untracked repository-root `.env` is the only local environment file for the API, mobile
  client, Citizen Web, Government Dashboard, and Admin Console. Their package scripts load it
  before build/start/development commands.
- Values already present in the shell or injected by a deployment platform take precedence over
  the local file. A missing root file is valid in CI and managed deployment environments.
- App-local `.env.local` copies are prohibited because Next.js precedence can silently split the
  browser Auth project from the API's database project. The runner rejects supported local
  environment filenames, and Turbo hashes the root file plus explicitly injected public build
  variables. After changing projects, rebuild/restart the client and establish a fresh session.
- This is an implementation/setup convention, not a deployment-topology or authentication
  architecture change, so no ADR is required.

## 2026-07-17 — Citizen Profile, Web Accountability, and BMC Demo-Routing Conventions

- Mobile profile photos may come from Expo Camera or the existing gallery picker, but both paths
  use the same owner-private validation, upload, replacement, signed-read, and removal boundary.
  Permission denial is explicit and permanent denial links to operating-system settings.
- “Use current area” on the mobile profile performs a fresh foreground-location lookup through the
  verified governance projection and retains only derived authority/local-body/ward labels in
  component memory. It does not store exact coordinates or create a persisted street address.
  Persisted addresses require a separate private schema/API, consent/retention rules, RLS review,
  and an approved reverse-geocoding/provider policy.
- Citizen Web complaint history, detail, timeline, feedback, confirmation, and reopening use the
  existing owner-authorized server APIs. Server actions reload the current resolution/workflow
  context instead of trusting client-supplied workflow or resolution identifiers. When policy
  requires new location-bound evidence, the web client sends the citizen to the mobile capture flow.
- Optional BMC internal routing is activated only by generated seeds `52`/`53` and only for
  `garbage_dump`, `missed_sweeping`, and `mosquito_breeding` across the 22 exact one-to-one ward
  crosswalks. The 66 rules are data records, not municipality/category branches in application
  source. The other nine categories remain unavailable, six explicitly because asset ownership
  evidence is absent, and the K/P split child wards remain fail closed.
- Internal queue routing never claims BMC official-system submission or external email/SMS delivery.
  The optional seeds remain separate from incremental migrations and must be deliberately applied
  and smoke-tested in a reconciled non-production environment.
- Reviewed-public support, private star/follow state, and live trending are implemented under
  ADR-0024. Public comments, supporter identities, engagement notifications, and automatic
  official-priority effects remain disabled. Community signals never override routing, status,
  escalation, SLA, or KPI state.

## 2026-07-17 — Complaint Category Catalog Presentation

- The authenticated category catalog may show every non-placeholder database category, including
  categories whose routing is not operational, so citizens can understand the supported taxonomy.
- Availability is derived server-side by comparing the bounded full catalog with the existing
  verified-only operational projection. Clients cannot promote a category, and placeholder or
  malformed records are never returned.
- Unavailable categories are visibly disabled. An available category is only eligible for the
  subsequent location-specific routing check; it is not a promise of coverage at every coordinate.
- The existing verified-only category lookup and complaint submission checks remain authoritative.
  This additive presentation convention does not change ADR-0009 or require a new ADR.

## 2026-07-17 — Compact Mobile Community and BMC Deployment Conventions

- Mobile screens use short visible labels, concise state summaries, and progressive disclosure.
  Detailed operational guidance remains available in error/help states and accessibility labels
  instead of appearing below every action.
- Community is a primary destination with Local, Trending, and Heat views. Local and Trending use
  only current reviewed public projections; Heat uses minimum-cohort aggregate hotspots. Support is
  public only as an aggregate count, while the current account's star/follow state stays private.
- ADR-0024 governs engagement storage, authorization, withdrawal, ranking, privacy, and separation
  from official workflow. Comments and public participant identities remain disabled.
- The existing-target BMC demo is deployed through four generated transaction-atomic SQL Editor
  files in exact order: baseline categories/core, official boundaries, ward/governance crosswalk,
  and routing activation/verification. A broad Phase 2 seed run must be followed by all four parts
  because that bootstrap intentionally restores its older non-routable state.
- When an existing target is complete through migration 38, use the focused 77,849-byte adaptive
  migrations 39–43 artifact before the BMC files. A baseline, partial, or non-contiguous error is a
  stop condition; reconcile drift or use adaptive master Part 1 then Part 2 as appropriate. SQL
  Editor execution never repairs the official migration ledger.
- The focused artifact must remain deterministic, embed exact immutable source bytes, run under one
  advisory-locked transaction, verify migration 43/readiness, and be safe to rerun after success.
- The BMC bundle enables only three categories over 22 one-to-one wards and leaves K/S, K/N, P/E,
  P/W, the other nine categories, and automatic external delivery fail closed.
- A target confirmed at the exact prior 42-migration cutoff may apply the small `20260717100000`
  engagement migration directly. Its table/index creation is replay-safe, functions are replaced
  deterministically, and a final catalog/security check rejects an incomplete result. A confirmed
  migration-38 target uses the focused migrations 39–43 artifact; unknown, partial, or older
  cutoffs require reconciliation or the adaptive master parts. The single delta is not a general
  drift-repair tool.
- API readiness and Storage bucket presence are infrastructure signals, not governance/routing data
  signals. The later hosted audit was healthy on those dependencies but returned zero category
  projections and no tested BMC jurisdiction rows, so pilot data activation remains a separate
  operator task.

## 2026-07-18 — One-Page Mobile Complaint Form Convention

- Mobile complaint reporting presents category/details, current location and optional asset,
  private evidence, similar-report review, and final confirmation on one scrollable page. These are
  form sections, not separate navigation steps.
- The existing persisted capture stage remains internal resume metadata. Server drafts, private
  signed uploads, duplicate evidence, idempotency identities, route resolution, and atomic
  submission retain their accepted boundaries.
- A pure client helper projects every locally knowable submission blocker into a visible checklist.
  The list includes unsaved details, required attributes/asset/media, upload state, duplicate review,
  voice/emergency acknowledgement, and connectivity. It does not replace API or PostgreSQL
  validation and cannot promote a disabled category.
- A resolved ward and an operational category are independent facts. Category cards state routing
  unavailability, and the form explains that final coordinate-specific routing is still verified at
  submission.
- Server-mutating controls are disabled while a complaint draft request is in flight. Native
  capture controls still permit safely stopping an active recording, without enabling a second
  draft mutation.
- Notification entry points use a bell glyph. Visible mobile copy stays concise while fuller context
  remains in accessibility hints and state-specific safety/error guidance.
- No ADR is required because this changes presentation only and implements ADR-0009, ADR-0011, and
  the existing compact-mobile convention without changing architecture, privacy, or trust policy.

## 2026-07-18 — Complaint Submission Evidence and Mumbai Expansion Conventions

- Jurisdiction boundary provenance is verified once through the dedicated PostGIS jurisdiction
  result. Routing candidates must contain verified hierarchy evidence and the exact same
  boundary-version vector, but their explanation payload does not need to duplicate local-body and
  ward boundary evidence already established by that independent result. Entity eligibility,
  geometry matching, version equality, and evaluator checks all remain mandatory.
- A complaint submission compares actor, routing request, routed status, category, optional asset,
  exact PostGIS point, accuracy, and capture time without tolerances. Additive database repairs may
  return a granular allow-listed marker for the first differing field, but must preserve the
  canonical prerequisite order and public conflict envelope. Raw provider messages, coordinates,
  descriptions, tokens, contacts, and object paths remain excluded from logs and responses.
- The mobile complaint draft has one exclusive mutation boundary. Category, details, location,
  media, duplicate review, discard, and submission cannot overlap; repeated submission taps share
  the same in-flight promise. This is a concurrency convention over the existing server
  idempotency contract, not a replacement for it.
- Official MCGM GIS layer metadata may be pinned as a network-free discovery contract before data
  import. A manifest or informational feature count does not approve retrieval, identifier
  stability, ownership, publication, routing, or external delivery. Every feature still passes the
  review-gated synchronization and versioned asset-ownership workflow.
- No ADR is required. These conventions implement ADR-0009, ADR-0010, ADR-0011, and ADR-0023 without
  changing the accepted routing, synchronization, complaint, or delivery architecture.

## 2026-07-18 — Synthetic Staging Privileged Account Convention

- ADR-0025 permits password sign-in only for an already provisioned privileged identity. Password
  and email code/link authentication converge on the same personal TOTP/AAL2 and current database
  authorization path; neither portal creates an identity or grants access.
- A trusted operator helper may create only the fixed non-production platform, municipal,
  government-operator, ward, and department demo matrix. The exact hosted project reference,
  reviewed authority name, verified invitation catalog, bounded expiry, and existing trusted
  access functions are mandatory.
- Synthetic roles and memberships are preassigned before portal use and expire after 1–90 days.
  Passwords are non-deterministic and live only in Supabase Auth plus the gitignored local
  `.local/staging-demo-accounts.<project-ref>.json` artifact, which is forced to mode `0600`.
- Every exercised identity enrolls a separate TOTP factor. No password, synthetic marker, Auth
  metadata value, or staging flag bypasses MFA or current membership/role/scope authorization.
- Production onboarding remains invitation-first with unique official-controlled addresses.
  Auth-user teardown is operator-managed, and the arbitrary existing-user assign/revoke/renew and
  additional-scope lifecycle remains open under `AUTH-001`.

## 2026-07-18 — Immutable Governance Source-Bundle Intake Convention

- A reviewed research ZIP is a `source_bundle`, not a workbook. `governance.import_batches` pins the
  exact bundle SHA-256 while retaining nullable workbook provenance for workbook-backed imports;
  every batch must provide at least one exact source artifact.
- Archive paths, expansion, member inventory, internal hashes, CSV headers, row counts, primary
  keys, and duplicate rows are validated before any SQL is emitted. Canonical Phase 2 CSV/workbook
  files remain unchanged.
- Transient authentication/CSRF query values are removed from generated JSON, SQL, logs, and
  reports. The immutable archive remains the evidence copy and the import ledger retains the hash
  of each original pre-redaction row plus an explicit redaction diagnostic.
- Batch-level `source_verified` means the official observation was reviewed; it does not become
  core `verified`, routing eligibility, publication approval, or external-delivery authority.
- Additive hierarchy enrichment may fill a null LGD code only for an exact existing canonical
  identity. It preserves stronger verification, provenance, placeholder, and routing fields and
  aborts on conflicts. Aliases such as `Mumbai` → `Mumbai City` require an attributed crosswalk.
- Header-only operational files create no entities. A stale document is retained as file evidence,
  never as a current officer/contact source. Missing rows never deactivate existing entities.
- No ADR is required: this convention extends the immutable bootstrap and review-gated publication
  boundaries already accepted in ADR-0008; it does not change their architecture.

## 2026-07-18 — Privileged TOTP QR Rendering and Recovery Convention

- Provider-generated TOTP QR SVG data URLs are trimmed before use. They are short-lived private
  enrollment material and render through a fixed-size native image, not Next image optimization or
  inline SVG injection.
- An interrupted setup is recovered only after explicit user action. Each portal may remove its own
  unverified TOTP factors identified by the exact friendly name it created, but it never
  automatically deletes verified factors or another application's factor.
- Provider factor-name conflicts and disabled TOTP enrollment map to actionable bounded messages;
  raw provider errors and QR/setup secrets are never logged or displayed.
- No ADR is required. This hardens the already accepted personal TOTP/AAL2 flow without changing
  its identity, authorization, recovery, or enforcement architecture.

## 2026-07-18 — Hosted Database Load-Shedding Convention

- Fixed-interval PostgreSQL claim loops use bounded adaptive backoff while idle or failing and
  reset to their configured base interval immediately after work is claimed. Realtime delivery is
  capped at 15 seconds and notification, SLA, and KPI workers at 60 seconds.
- Only immutable or broadly shared non-user-specific reads may use a bounded process-local cache.
  The complaint-category catalog uses 30 seconds plus in-flight coalescing; exact jurisdiction and
  routing, profiles, MFA, roles, memberships, drafts, complaints, and workflow state never use a
  completed in-process authorization cache.
- Identical concurrent actor-context reads may share only the same in-flight promise. Current
  database rows still determine every completed request's authorization and privileged policy.
- Indexes and query rewrites require hosted `pg_stat_statements`, `EXPLAIN`, or Index Advisor
  evidence. Table count alone is not a performance diagnosis, and application tables are not
  removed or denormalized merely to reduce their count.
- Redis, BullMQ, Redis adapters, and Sentry remain excluded under ADR-0007. ADR-0026 records the
  separate verified-JWT-claims authentication decision.

## 2026-07-20 — Simplified V1 BMC Ward Routing and Contact Convention

- ADR-0027 replaces the advanced candidate/evaluator pipeline only on the current BMC V1 citizen-
  submission path. The normalized governance registry, legacy engine and versioned evidence remain
  installed for compatibility and later statewide expansion; no destructive table removal occurs.
- The runtime derives the ward from PostGIS, then resolves one active ward/category configuration.
  Application source never contains municipality, ward, recipient, department or role branches.
- The V1 matrix has two immutable inputs: `Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` supplies
  category/phone/WhatsApp/role evidence and `local_wellness_bmc_ward_directory_2026-07-20.zip`
  supplies email/office evidence. They must reconcile to 26 unique email-resolved wards, 12
  categories and 312 unique ward/category rows before the generated seed changes. Source bytes are
  never rewritten.
- Direct K/N and P/E email records take precedence; K/S maps to the K/E parent-office mailbox and
  P/W maps to the P/N parent-office mailbox. These are generator input-resolution rules, not
  application-source routing branches.
- Recipient email, primary/secondary phone, `1916`, WhatsApp and source metadata are private
  operational data. Raw source-reported email status/provenance remains separate from explicit
  owner-approved staging routing under migration `20260720103000_v1_ward_email_provenance.sql`.
  Citizen/category/governance responses never expose those values.
- Complaint assignment and external delivery are separate facts. Initial assignment atomically
  creates one idempotent ward-email outbox row; `pending` is not `sent`, and no provider runtime is
  implied by schema or seed installation.
- Duplicate suggestions remain advisory and do not block a V1 submission when no duplicate check
  was requested. Existing suggestions must still be acknowledged before submission.
- Split-boundary crosswalks may provide deterministic staging coverage, but exact K/P child geometry
  remains an explicit data-quality follow-up. Coverage never falls back to a hardcoded ward.
- Redis, BullMQ, caching and Sentry are not introduced. Email claim RPCs use bounded PostgreSQL
  leases and must not be polled until a trusted provider worker is configured.
- The trusted ward-email worker maps snake_case RPC rows into the camelCase template contract at one
  explicit boundary. SMTP delivery is enabled only by complete server-only `EMAIL_SMTP_*`
  configuration, records provider IDs through the lease owner, and never logs credentials,
  recipient addresses, complaint descriptions, or rendered message bodies.

## 2026-07-20 — JagrukSetu UI Benchmark Conventions

- The benchmark is implemented as an incremental evolution of the existing Local Wellness clients;
  it does not create a parallel starter app or rebrand the repository's legal/product identity.
- Shared design tokens and typed UI contracts live in `packages/design-system`; locale-neutral
  message keys and `en`/`hi`/`mr` fallback resolution live in `packages/localization`. Persisted
  profile language codes remain `en`, `hi`, and `mr`, with English formatted as `en-GB`.
- The mobile complaint flow remains one scrollable page. Benchmark-style progressive disclosure is
  represented by an accessible section-progress summary and compact state indicators, not six new
  routes or a second draft lifecycle.
- First-party privacy-safe spatial plots remain the default. Leaflet, Mapbox, geocoding, public
  comments, guest/public complaint modes, and contact-directory exposure require their existing
  provider/privacy/moderation/API decisions and are not faked in UI.
- Demo/mock records may appear in tests and stories only. Production application surfaces consume
  existing server-owned contracts and show explicit unavailable states when policy or data is absent.
- Authenticated mobile Home derives its avatar and display name from the current private profile,
  falls back to an initial when no signed image is available, and selects its greeting from the
  device-local time.
- The five stable mobile destinations use a rounded, detached navigation capsule and
  dependency-free filled React Native icon shapes; this refinement does not add another menu
  destination or icon package.
- Nearby may use a clearly schematic, first-party spatial panel for orientation, but its result
  cards remain backed by the safe governance projection and must not fabricate contacts,
  distances, opening hours, directions, or external-map data.

## 2026-07-23 — Citizen Password, Recovery, and External-Link Conventions

- The Phone-MFA/AAL2, five-minute proof, zero-factor fallback, and audit-exception decisions in this
  section are superseded by ADR-0033 and retained only as the ADR-0028 implementation record. The
  external-link convention remains current.
- ADR-0028 owns the architecture: mobile/API citizen access is Phone-MFA enforced and Citizen Web
  stays public-only until protected-flow parity is implemented.
- Every signed-in password change starts a new Phone MFA challenge. A successful verification
  produces only a user/factor-bound in-memory proof with a five-minute lifetime; it is never
  persisted or restored.
- A recovery callback accepts exactly one reviewed PKCE code or recovery token. Verified-phone
  accounts must complete a fresh SMS challenge. Email-only fallback is limited to an account with
  zero verified phone factors, and factor state is checked again immediately before update.
- Passwords go directly from the mobile client to Supabase Auth. Successful updates immediately
  attempt global sign-out, fall back to local sign-out when required, and only then wait for at
  most two seconds for the non-sensitive `password_changed` audit; passwords, OTPs, challenges,
  recovery material, factor secrets and access tokens never enter audit metadata.
- The only AAL1 citizen audit exception is the exact JSON body
  `{ "eventType": "password_changed" }` on the decorated audit method, after normal bearer,
  profile, non-privileged-role and server-side zero-phone-factor checks. Existing PostgreSQL rate
  limits still apply. The event remains client-reported telemetry rather than proof of a provider
  password mutation.
- OTP sends use a visible 30-second client cooldown and repeated submit actions use an in-memory
  exclusive guard. Successful OTP verification does not wait for best-effort audit delivery.
  Provider expiry, retry and abuse limits remain authoritative.
- User-initiated external HTTP references use the shared Expo in-app-browser adapter. Only HTTPS
  URLs without embedded credentials are accepted. Error copy never echoes the URL. Settings,
  `tel:112`, Auth/deep links and internal Expo Router navigation retain native handlers.

## 2026-07-23 — Purpose-Scoped Mobile Location Coordination

- Community, Profile, and Nearby share one current-area policy with a five-minute in-memory TTL,
  a 100-metre accuracy ceiling, non-mocked input, operating-system last-known reuse, and
  single-flight acquisition.
- Explicit Refresh bypasses memory and last-known results. Passive navigation never starts a
  watcher, polling loop, background task, or scheduled location read.
- Complaint issue, photo, video, and voice evidence use a separate fresh high-accuracy path. A
  current-area, in-flight evidence, or completed evidence result is never reused across complaint
  capture actions.
- Existing permission state is checked before prompting. Permanent denial directs the user to
  settings without repeatedly presenting the OS request dialog.
- Current-area coordinates remain memory-only and are cleared across Auth sign-out/account
  replacement. Generation invalidation prevents a late native result from crossing that identity
  boundary.
- ADR-0029 owns the architecture and complements the existing complaint-location security policy
  in ADR-0017.

## 2026-07-23 — Community Owner-Report Visibility

- Community may compose a signed-in owner preview and reviewed-public locality views, but the two
  result sets remain separate throughout state, rendering, navigation, and engagement handling.
- The owner preview reuses the existing authenticated complaint list, shows the three newest
  reports, refreshes on screen focus, and works without location or a successful transparency
  request.
- Owner cards link only to authenticated complaint detail and do not expose public support/star
  controls. They are never adapted into public map items, heat aggregates, or trending inputs.
- Public visibility still requires the existing reviewed publication workflow. Showing a report to
  its owner does not publish it.
- ADR-0030 records this privacy-preserving presentation decision.

## 2026-07-23 — Physical V1 Database Pruning Convention

- ADR-0031 owns physical database reduction. Applied migration history remains immutable; removals
  use the forward-only `20260723110000_prune_deferred_v1_subsystems.sql` migration.
- A subsystem may be physically removed from V1 only when it is undeployed or unused and repository
  dependency analysis plus clean-reset regression coverage proves that current complaint,
  Community, government workflow and ward-email behavior does not depend on it.
- V1 removes fourteen governance synchronization/versioned-contact tables and the unused
  `complaints.complaint_comments` table. The private 312-row
  `routing.ward_issue_contacts` matrix remains the contact source used by current routing and
  readiness behavior.
- The unused `@local-wellness/database` governance-sync export, source and tests are removed with
  the database prototype because they have zero runtime consumers. The governance-import pipeline
  remains supported and is not part of this retirement.
- The application-owned table count moves from 129 to 114. This is a maintainability and
  operational-surface reduction, not a diagnosis or claimed fix for the earlier high-CPU
  PostgREST request storm.
- Another reduction may begin only after each affected capability has an approved replacement,
  required data backfill, compatibility window, cutover/rollback plan and complete regression
  evidence. Complaint history, security evidence and active delivery state are never deleted to
  satisfy a table-count target.
- Hosted application remains an explicit operator action after backup and preflight; local
  migration verification does not imply that hosted Supabase was modified.

## 2026-07-23 — JagrukSetu Taxonomy and Phone-MFA Diagnostics

- ADR-0032 owns the taxonomy architecture. The 12 operational routing-profile IDs remain stable;
  the existing `routing.issue_categories` relation also stores taxonomy primaries/subcategories so
  V1 does not add a parallel table family.
- Mobile uses two selectors: primary category and **Subcategory / issue type**. Workflow is derived
  from the selected subcategory. A third issue-variant selector is deferred until reference data
  defines actual variant rows.
- The client persists only `taxonomy_primary_code`, `taxonomy_subcategory_code` and
  `taxonomy_workflow_type`. PostgreSQL owns the mapping to an operational profile and validates it
  again at complaint insertion. Clients never choose an authority, office, department, officer,
  recipient or route rule.
- The 340-leaf authenticated taxonomy projection is public-safe and may be cached in one API
  process for 30 seconds. Exact-coordinate routing, security state, drafts and submissions remain
  uncached and freshly validated.
- Thirteen leaves map to the twelve stable operational profiles; 327 remain visible/resumable but
  unavailable. All 20 `COR` leaves are private, protected and excluded from ward-email/public/
  Community fallback until independent oversight safeguards are approved.
- Phone-MFA error handling uses Supabase Auth error codes before legacy message matching.
  `mfa_phone_enroll_not_enabled` and `mfa_phone_verify_not_enabled` are managed Advanced MFA setup
  failures; `sms_send_failed` is provider delivery failure.
- Ordinary Phone/Twilio provider configuration does not activate the Advanced MFA Phone add-on or
  its Enrollment/Verification switches. Those are hosted administrator settings and cannot be
  fixed with an application SQL migration.

## 2026-07-23 — Confirmed-Phone OTP Without Citizen MFA

- ADR-0033 supersedes ADR-0028 for citizen authentication. Email/password remains the primary
  JagrukSetu sign-in credential, while ordinary Supabase Phone Auth links and confirms the same
  citizen's phone through `phone_change` OTP. Citizen access does not require an Advanced Phone MFA
  factor or an AAL2 session. Government Dashboard and Admin Console TOTP/AAL2 policy is unchanged.
- Phone confirmation must fail closed unless Supabase returns the initiating user, the normalized
  requested phone, and a non-null `phone_confirmed_at`. The trusted API independently checks current
  `auth.users.phone` and `phone_confirmed_at` through the service-role-only
  `public.user_has_verified_phone` function introduced by migration
  `20260723130000_citizen_phone_verification_without_mfa.sql`; clients cannot assert confirmation.
- Every supported phone-gated password change/recovery creates an isolated, non-persistent
  Supabase client, sends an ordinary SMS OTP with `shouldCreateUser: false`, verifies the returned
  identity and phone, updates the password immediately in that same isolated session, then attempts
  global sign-out and clears the persistent application session. No proof access token, refresh
  token, OTP, challenge or password is stored in React state, SecureStore, application tables or
  logs.
- The mobile reset-password screen owns the isolated recovery-client lifetime. If navigation
  unmounts after email recovery creates a session but before phone inspection/password completion,
  cleanup locally signs that isolated session out so a late exchange cannot leave it alive.
- Email recovery only establishes the initiating account. If that account has no already-confirmed
  phone, the application fails closed to attributed support instead of silently adding an email-
  only password-reset bypass. Stale or duplicate `phone_change` state and lost-phone recovery remain
  managed operational cases, not client-side identity rewriting.
- The ordinary Phone provider is intentionally accepted for V1 even though linking a phone creates
  an alternate Supabase AAL1 sign-in identity that a custom client can exercise. JagrukSetu does
  not expose phone-only sign-in in its UI, but it cannot claim that email/password is the only
  provider-level login path.
- Supabase's Phone Auth signup capability remains enabled because the provider rejects
  `signInWithOtp({ phone, shouldCreateUser: false })` for an existing linked user when that gate is
  off. Migration `20260724100000_require_email_identity_for_auth_signup.sql` provides
  `public.hook_require_email_identity`, and every managed project activates it as the Before User
  Created Auth Hook. The hook accepts new users only when the Auth event contains a non-empty email,
  so phone-only account creation fails closed. `shouldCreateUser: false` remains mandatory in the
  supported password flow as defense in depth, not as the server-side signup boundary.
- Preferred configuration names are `API_CITIZEN_PHONE_VERIFICATION_MODE`,
  `EXPO_PUBLIC_PHONE_VERIFICATION_MODE`, and
  `NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE`. The prior `*_PHONE_MFA_MODE` names are read only as
  temporary backward-compatible fallbacks; new deployments use the preferred names.
- Phone-verification screens claim their initial authoritative inspection by stable authenticated
  user ID. They do not depend on the complete Auth context for one-time flow initialization because
  provider `USER_UPDATED` events are expected during `updateUser({ phone })` and must not reset an
  in-progress OTP challenge for the same user.
- The mobile Supabase client uses the pinned Auth SDK's lockless default. Do not restore the
  deprecated custom `processLock`; the SDK coordinates refresh concurrency internally and the
  legacy auto-refresh branch can emit zero-millisecond acquisition warnings. The mobile provider
  keeps Auth callbacks short by scheduling authoritative follow-up after they return, invalidates
  superseded resolutions, and cancels scheduled work on sign-out or unmount.
- ADR-0034 defines a narrow compatibility rule for an existing citizen account that already has a
  verified TOTP factor. If Supabase reports that AAL2 is available but the current session is AAL1,
  the mobile phone-confirmation flow challenges that factor and requires same-user AAL2 before
  calling `updateUser({ phone })`. Citizens without a verified factor continue directly to SMS.
  Never delete a factor automatically or use administrator authority to bypass this assurance
  check.
- Supabase Storage, PostgreSQL tables and Edge Functions remain outside OTP generation/verification.
  Twilio Verify is configured through the ordinary Supabase Phone provider, phone confirmations are
  enabled, Phone Auth signup capability plus the email-required creation hook are enabled, and
  Advanced Phone MFA may remain disabled.

## 2026-07-24 — Canonical complaint receipts and isolated ward-email operation

- `ComplaintReceipt.categoryId` is authoritative. The nested `ComplaintRoutingSummary` does not
  duplicate it. Mobile may decode the earlier first-submit shape only when the duplicate value
  exactly matches, then normalizes it away; unknown/private fields remain rejected.
- A committed complaint must not be represented as failed because of an application response-shape
  mismatch. API contract tests and mobile decoder tests cover the first-submit and replay shapes.
- Mobile treats only submission `NETWORK_ERROR` and `INVALID_RESPONSE` failures as an unknown
  outcome. The recovery screen directs the citizen to owned complaints before retrying; attributed
  routing, validation and dependency failures remain explicit failures.
- Ward email is asynchronous and remains independent from complaint transaction success. SMTP
  configuration is inert unless a trusted sender process is running.
- ADR-0035 owns the isolated ward-email executable. It uses the existing leased outbox, a 60-second
  cadence, a ten-row continuous batch, and a one-row explicit smoke mode without activating
  notification, SLA, or KPI loops.
- SMTP provider acceptance plus a persisted message ID means `sent`; it does not mean the recipient
  mailbox accepted, read, or acted on the complaint.

## 2026-07-24 — Complete BMC V1 intake classification

- ADR-0036 owns the full-intake split. Preserve the 13 specialised taxonomy mappings, route the
  other 243 public/restricted leaves through one `general_ward_complaint` profile, and expose
  official handoffs for all 84 private/emergency-private leaves.
- General ward intake deliberately reuses the current ward mailbox and approved provenance. It is
  a coarse V1 intake route, not evidence of a precise department, officer, asset owner or filing in
  an external government case-management system.
- Do not create one ward/contact row per taxonomy leaf. One generic profile adds 26 rows to the
  existing 312-row matrix, producing 338 rows across 13 operational profiles.
- Protected handoff actions support digits-only telephone numbers and credential-free HTTPS
  browser targets only. They do not submit a JagrukSetu complaint or create ward email, Community,
  duplicate-check, location, media or result records.
- Public taxonomy action objects use the camel-case keys `key`, `kind`, `label`, `description`,
  `target` and `priority`. Source URLs, verification evidence and recipient email remain private.
- Complaint owner, government and email surfaces resolve the validated detailed taxonomy label
  before falling back to the operational profile name.

## 2026-07-24 — Compact mobile interaction conventions

- Use the citizen-facing name **JagrukSetu** in visible mobile copy. Keep the legacy URI scheme and
  internal package identifiers stable until a separately planned deep-link migration.
- Use one detached five-item navigation capsule: Home, Complaints, central Report, Community, and
  More. Civic Area belongs under More and selects that tab; individual screens must not add a
  duplicate menu affordance.
- Use the shared compact React Native token adapter: restrained civic green/saffron/white/blue,
  22–24 px page titles, 18 px section headings, 14 px body copy, 12 px helper text, and 10 px
  navigation labels. Interactive targets remain at least 44 px even when icons and text shrink.
- Use code-native `CivicIcon` shapes consistently instead of decorative emoji or text glyphs for
  primary navigation and menu actions. Colour supplements an icon and text label; it never conveys
  state alone.
- Render complaint capture as one autosaving page ordered category, description, location,
  evidence, duplicate/review, then one sticky Submit action. Preserve reducer stages only as
  internal resume/idempotency state.
- Start contextual location automatically when a relevant screen or persisted routable complaint
  category needs it. Hide manual controls during an automatic attempt and after valid success;
  show Retry/Settings only for recovery and Refresh only for an ineligible fix.
- Keep owner-private complaints in a distinct Community section. Never merge them into reviewed
  public DTOs, ranks, support/star state, or hotspot aggregates.
- Fetch Community Heat only when its mode is opened and virtualize paginated public rows. Do not
  poll location or public data merely because a tab exists.
- All core mobile navigation, authentication, complaint, Community, civic-area, notification, and
  profile copy must use the complete English/Marathi/Hindi catalogue. Dynamic official names and
  server-sanitized error messages remain data, not translation keys.
- Show optional civic-office fields only when present. Public office contact actions use a
  validated dial/mail target and in-app HTTPS source browser; private routing recipients remain
  invisible.
