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

- Categories come only from the verified, active, routing-eligible database catalog. With the
  current non-routable bootstrap the app displays an explicit unavailable state instead of a
  hardcoded or placeholder category list.
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
- The mobile toolchain targets Expo SDK 54.0.33, React Native 0.81.5, React 19.1, and SDK-compatible
  native modules so it remains loadable by the current Android Expo Go SDK 54 client. TypeScript
  5.9.3 is the repository compiler compatibility point; future Expo upgrades must run
  `expo install --check`, strict type-checking, and an Android export before acceptance.

## 2026-07-14 — Governance Synchronization Retrieval and Contact Conventions

These conventions implement ADR-0012 while retaining ADR-0010's human-review publication gate.

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
