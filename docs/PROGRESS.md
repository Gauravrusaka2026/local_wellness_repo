# PROGRESS.md

## Overall Completion

51% implemented.

Phase 0 and Phase 1 are complete. Phase 2's engineering baseline is complete and locally verified;
its remaining exit work requires external, verified pilot identifiers, contacts and real boundary
geometry. Phase 3's generic routing engine, database/API boundaries, duplicate framework and
review-gated governance-synchronization foundation are implemented. A cross-cutting synchronization
slice now adds PostgreSQL work leasing, bounded Edge retrieval, immutable snapshots, source audit,
contact versioning, pure normalization, and generic synchronization scope selection. All ten
PMC/BMC endpoints and ten pilot ward targets remain draft, unverified, and inactive/non-routable;
source-specific parsing, matching, review, publication, and hosted scheduling remain open.
Phase 4 provides the secure complaint persistence/API boundary and an Android-buildable citizen
capture client; production submission remains disabled by the absence of verified routable pilot
data, and transcription/moderation plus physical-device validation remain open. Phase 5 now adds
database-enforced government workflow, an authenticated NestJS operations API, private verified
resolution evidence, and an accessible access-scoped government dashboard. Its engineering is
locally complete with synthetic verified fixtures; production-like use remains gated on verified
pilot data, an authenticated managed-environment smoke test, map policy, and evidence operations.
The dedicated staging Supabase project now uses owner-confirmed replacement credentials and has all
23 migrations through Phase 5 plus the six reviewed non-production seed files. Its bootstrap still
contains zero operational categories and zero active synchronization sources. A citizen profile,
one active platform administrator, and one active Pune-scoped municipal administrator now exist as
confirmed staging-only environment data. The initial invitation was accepted and temporary alias
privileges were revoked with history retained; authenticated UI smoke testing remains pending.
Realtime delivery, citizen resolution feedback, transparency, SLA/KPI and launch hardening remain
in later phases.

## Phase Completion

| Phase                                        | Status      | Completion |
| -------------------------------------------- | ----------- | ---------: |
| Phase 0 — Foundation                         | Complete    |       100% |
| Phase 1 — Identity and access                | Complete    |       100% |
| Phase 2 — Maharashtra governance model       | In progress |        90% |
| Phase 3 — Taxonomy and routing               | In progress |        85% |
| Phase 4 — Citizen complaint capture          | In progress |        95% |
| Phase 5 — Government dashboard               | In progress |        95% |
| Phase 6 — Realtime and notifications         | Not started |         0% |
| Phase 7 — Resolution, feedback and reopening | Not started |         0% |
| Phase 8 — Nearby map and transparency        | Not started |         0% |
| Phase 9 — SLA, escalation and KPI            | Not started |         0% |
| Phase 10 — Hardening and launch              | Not started |         0% |

Phase 1 completion is measured against the `PLAN.md` exit criteria: citizens have phone/email passwordless clients; email and delivered-invite sessions pass locally; current database scope gates government access; escalation attempts fail; and server credentials remain outside client sources. Phone delivery, hosted callbacks, MFA, device-bound session invalidation, access lifecycle expansion, quotas, and real-device validation are documented pre-launch follow-ups rather than hidden completion claims.

Phase 2 engineering completion covers the normalized registry, canonical import and provenance ledger, PostGIS/version history, authority integration, forced RLS, generated types and local tests. It is not marked 100% because the supplied data contains no real polygons, no verified officer incumbents, incomplete official identifiers/coverage and unresolved routing crosswalks. Therefore a real pilot coordinate cannot yet satisfy the `PLAN.md` exit criterion.

Phase 3 engineering completion covers versioned routing taxonomy/assets/rules/policies/audits,
service-only PostGIS candidate resolution, the deterministic pure evaluator, authenticated routing
APIs, the duplicate-scoring framework, and review-gated governance-sync contracts/persistence. The
cross-cutting retrieval slice now supplies database leases, an Edge fetcher, immutable raw evidence,
contact versions, and a pure contact normalizer. Phase 3 is not marked 100% because verified Pune
polygons and operational mappings are absent, the 12 seed categories intentionally remain
non-routable, and synchronization still lacks approved source-specific parsers, entity matching,
review surfaces, and transactional publishers.

Phase 4 engineering completion covers private forced-RLS drafts/complaints/location/media/history,
private signed Storage uploads with server-side integrity checks, privacy-safe duplicate suggestions,
atomic idempotent routing/submission, complaint receipt/history APIs, and the accessible Expo
photo/video/voice/location workflow with protected resume state. It is not marked 100% because the
current bootstrap exposes no verified routable category, speech-to-text/media-moderation providers
are not selected, and complete physical-device/hosted callback/upload testing remains pending.

Phase 5 engineering completion covers versioned complaint assignments, explicit transition rules,
current-scope authorization, atomic idempotent actions, internal operational records, private
resolution evidence, audit/outbox persistence, strict government APIs, and the server-rendered
queue/detail/action workspace. Placeholder/unverified recipients remain excluded, stale incumbent
versions remain recoverable rather than hiding complaints, and open inspection/dependency work
cannot be stranded by transfer or manual status changes. Phase 5 is not marked 100% because a real
interactive map needs an approved provider/coordinate policy, evidence needs scheduled object
cleanup and full media processing, and an authenticated production-like run needs verified pilot
governance/routing/complaint data.

## Sprint Completion

- Sprint 1 — Project Foundation: 100% complete.
- Sprint 2 — Identity and Access: 100% complete.
- Sprint 3 — Governance data foundation and pilot-data closure: 90% complete.
- Sprint 4 — Data-driven routing and governance synchronization foundation/retrieval: 85% complete.
- Sprint 5 — Secure citizen complaint capture: 95% complete.
- Sprint 6 — Access-scoped government complaint operations: 95% complete.

## Completed Milestones

- Deterministic pnpm/Turborepo monorepo, strict TypeScript project references, code-quality tooling, application/package foundations, CI, and containers.
- Six-table Supabase identity/access model with additive forward migrations, forced RLS, safe column grants, immutable audit attribution, and current-scope helpers.
- Atomic service-only government invitation and device lifecycle persistence with audit history and failure rollback.
- Supabase Auth profile provisioning, immutable seeded roles, one-time first-platform-admin bootstrap, authority memberships, and expiring scoped roles.
- NestJS bearer authentication plus profile, device, access-scope, client-audit, and government-invitation endpoints with exact CORS, request IDs, and stable envelopes.
- Expo SecureStore sessions, mobile phone/email flows, citizen SSR PKCE sessions, token-hash government invitations, protected government scope, and access-gated administration UI.
- Shared identity/configuration/validation/database contracts without client-local domain mirrors.
- Redis, BullMQ, and Sentry removed from the V1 topology and prohibited by repository security tests.
- ADR-0006, ADR-0007, and the Phase 1 implementation/testing worklog.
- Seven additive Phase 2 migrations implementing 22 forced-RLS governance tables, PostGIS boundaries, temporal exclusions, canonical authority ownership, parent-type/cycle integrity and service-only access/jurisdiction functions.
- Deterministic validation and generated seeding for 18 canonical CSVs plus the XLSX checksum, preserving 901 source/metadata rows and quarantining template or placeholder records.
- Maharashtra baseline containing 1 state, 36 districts, 359 talukas, 190 urban local bodies, 70 explicitly placeholder wards, durable catalogs and 18 unresolved non-routable routing references; zero people, assignments or fabricated boundaries.
- ADR-0008, the governance import/refresh guide, generated `public`/`governance` database types, and complete Phase 2 migration/seed/RLS/spatial/versioning test plans.
- Three additive Phase 3 migrations providing a forced-RLS private routing registry, versioned
  taxonomy/assets/ownership/policies/rules/decisions, review-gated synchronization persistence, a
  private raw-snapshot bucket, and narrow service-role RPCs.
- Pure routing and duplicate-scoring packages with strict evidence eligibility, deterministic
  fallback/specificity/priority/confidence ordering, ambiguity handling, and no municipality- or
  category-specific application branches.
- Authenticated NestJS category, jurisdiction, and routing APIs with strict runtime decoding,
  citizen-safe explanations, coordinate-free logs, and append-only actor/request-attributed audits.
- ADR-0009, ADR-0010, the governance-synchronization guide, and the Phase 3 implementation/testing
  worklog.
- Two additive Phase 4 migrations providing an unexposed, forced-RLS complaint registry, private
  Storage buckets, immutable status/location/routing evidence, service-only complaint/media/
  duplicate/submission/history functions, and replay-safe idempotency records.
- Authenticated NestJS complaint draft, media upload/finalization, duplicate suggestion, submission,
  receipt/list/detail/timeline APIs with strict runtime decoding, coordinate-free logs, and private
  signed-upload targets.
- Expo citizen home and end-to-end capture workflow for live photo/video/voice evidence, foreground
  GPS verification, duplicate review, emergency acknowledgement, private upload retry, receipt and
  owned complaint history. SQLite retains only an allow-listed opaque resume record; retry-only
  coordinates use device-protected storage.
- Exact same-origin queryless citizen email callback construction, ADR-0011, generated complaint
  database types, and the Phase 4 implementation/testing worklog.
- Two additive governance synchronization migrations implementing due-source claiming, short
  PostgreSQL leases, exact contract-hash approval, retry/freshness state, append-only audit/evidence,
  and immutable effective-dated contact channels with single-use review-bound publication and
  separate complaint-delivery approvals.
- A bounded `governance-sync-fetch` Edge Function for exact-host HTTPS retrieval, conditional 304
  handling, one-source dispatch, heartbeat-protected private content-addressed raw snapshots,
  safe retention after ambiguous finalization, structured logging, and service-only
  completion/failure RPCs;
  all pilot endpoints remain inactive.
- Upgrade-safe source-contract hashing that adds the required column nullable, deterministically
  backfills existing rows, then applies `NOT NULL`, with a root migration-safety regression.
- Ten official PMC/BMC source records seeded as draft and unverified, a pure contact normalizer with
  malformed/placeholder/duplicate/cardinality/layout checks, ADR-0012, and a dedicated worklog.
- A generic service-only forced-RLS synchronization-scope registry plus five Pune and five
  Brihanmumbai canonical ward selections, all draft, unverified, unapproved, placeholder-backed, and
  non-routable with routing eligibility independently gated.
- Citizen account rendering now exposes verified sign-in identity and explicit onboarding,
  provisioning, API-failure, and complete-profile states instead of presenting an empty account
  surface; OTP completion uses a reliable full-page transition.
- The mobile workspace is aligned to Expo SDK 54.0.33, React Native 0.81.5, React 19.1, compatible
  SDK 54 native modules, and TypeScript 5.9.3 for current Android Expo Go compatibility.
- Two additive Phase 5 migrations provide private forced-RLS government workflow tables,
  capability/transition rules, versioned assignment history, inspections, work/dependencies,
  resolution versions/evidence, idempotency/audit records, and a data-minimized notification outbox.
- Authenticated government queue/detail/action APIs enforce current Auth identity and database scope,
  return strict privacy-safe contracts, and use bounded private resolution-evidence upload/read
  flows with expiry, checksum, binary signature, replay, and terminal failure handling.
- The government dashboard now provides effective-scope queues, bookmarkable filters, pagination,
  complaint/routing/assignment context, every Phase 5 operational action, private evidence upload,
  and accessible loading/error/empty/conflict states without an external map call.
- ADR-0013 and the Phase 5 government-dashboard implementation/testing worklog.
- Dedicated staging database activation through all 23 existing migrations and six reviewed
  non-production seeds, with post-deploy verification of the migration ledger, Pune authority,
  fail-closed category/source state, citizen profile, audited platform administrator, and active
  Pune-scoped municipal administrator.
- BMC A–E administrative wards and Pune's officially current numeric ward model recorded as pilot
  identity selections without promoting the existing placeholder rows or activating routing.

## Current Milestone

Phase 5 engineering and its local verification matrix are complete, and the database portion is now
deployed to dedicated staging. Invitation acceptance and role reconciliation are complete; the
remaining closeout milestone is authenticated citizen/admin/government browser smoke testing. A
populated operational queue still requires real verified pilot records; no placeholder recipient
may be activated for a demo.

## Next Milestone

Begin Phase 6 realtime and notification delivery from the Phase 5 transactional outbox with
authorized events, PostgreSQL claiming/retry/replay, and single-instance Socket.IO delivery. Redis,
BullMQ, Redis adapters/caching, and Sentry remain deferred. In parallel, continue reviewed PMC/BMC
parsers and obtain verified pilot ward/contact/assignment/geometry/routing evidence.

## Current Blockers

- No blocker remains for the Phase 2 schema, baseline import, security or local verification.
- The dedicated staging project and newly generated privileged/database credentials are confirmed,
  and all existing migrations/seeds are applied. Provider/template/redirect, SMS, backup, secret-
  management, and browser/device smoke configuration remains incomplete; historical credential-log/
  repository audit and any legacy Redis-token cleanup remain under `SEC-001`.
- Phone OTP E2E needs a real SMS provider; phone request/verification code paths have unit coverage.
- Citizen email callback construction now uses the exact allow-listed queryless same-origin route;
  delivered hosted-link and SSR-cookie behavior remain part of the environment-gated `AUTH-005` test.
- The real-coordinate Phase 2 exit criterion requires pilot selection and official local-body/ward polygons (`DATA-004`).
- Official LGD codes, complete local-government coverage, verified contacts/incumbents and reviewed routing crosswalks remain external data gaps (`DATA-002` through `DATA-006`).
- Workbook-to-CSV cell parity and rendered browser inspection remain environment-gated follow-ups (`DATA-007`, `ENV-003`); source/hash validation and HTTP runtime smoke checks passed.
- Production Pune routing is blocked by absent verified geometry and complete reviewed routing
  evidence (`ROUTING-001`), not by the generic Phase 3 implementation.
- Governance synchronization retrieval is implemented and locally tested, but it is not deployed or
  active. Source-specific parsers, entity matching/change detection, review API/UI, transactional
  publishers, environment Cron/secrets, and production source validation remain (`GOVSYNC-001`).
- Pilot synchronization scope is implemented generically, but all ten V1 target rows remain
  placeholders and non-routable. BMC A–E are now the selected administrative targets and Pune will
  use its officially current numeric model; official canonical identities, effective dates,
  geometry, reviewed V2 scope records, and placeholder supersession remain pending (`DATA-003` to
  `DATA-005`).
- Exact HTTPS host/redirect controls are implemented, but DNS result/private-address and rebinding
  checks must be added before source activation (`GOVSYNC-002`). Raw snapshot uploads also need
  reconciliation when database finalization fails (`GOVSYNC-003`).
- The staging Auth and profile schema are now aligned and the existing citizen identity has an
  active profile/citizen role. A reachable API plus browser session smoke is still required before
  closing the account-page environment issue (`ENV-004`).
- Conflicting confidence-policy versions across simultaneously applicable rules fail closed at
  runtime and the service-only activation report is available; production activation still needs
  reviewed conflict-free policy data (`ROUTING-003`).
- Production complaint submission is intentionally unavailable because the canonical bootstrap
  contains zero verified routable categories and no verified Pune route (`ROUTING-001`).
- Speech-to-text/media-moderation processing, expired-upload cleanup, and representative physical
  device capture/resume checks remain (`COMPLAINT-001` through `COMPLAINT-003`).
- One staging platform administrator and one Pune-scoped municipal administrator are active on
  confirmed owner-controlled Auth identities. Authenticated dashboard access remains to be smoke-
  tested; a production-like queue additionally needs verified pilot roles, assignments, geometry,
  routes, and complaints.
- The interactive government complaint map needs an approved provider and exact-coordinate sharing
  policy (`GOVDASH-001`). Resolution evidence still needs scheduled private-object cleanup, full
  media decoding, malware scanning/moderation, and bounded operational concurrency (`GOVDASH-002`).

## Verification Summary

- Frozen installation passed for all 17 workspace projects; the lockfile remained current.
- Canonical governance validation and generated-artifact drift checks passed across 19 source files:
  887 raw records plus 14 metadata records reconcile to 41 accepted, 691 unverified, 169
  quarantined, and 0 rejected records. The generator still reports 789 operational/reference and 98
  seed-quarantined records, with 0 errors and 2,343 explicit warnings.
- Prettier, ESLint, strict TypeScript checks, and production builds passed for the application
  implementation. After the Expo SDK alignment, `expo install --check`, mobile strict type-check,
  and the Expo Android export passed (1,204 modules).
- The API suite passed all 121 tests, the government dashboard passed all 17 tests, shared
  validation passed 31 tests across five suites, and mobile, citizen web, admin, API-client,
  routing-engine, database-package, workspace and root suites passed without failures.
- A clean local Supabase reset applied all migrations and seeds through Phase 5. All 846 pgTAP
  assertions passed across 23 plans; the focused government-workflow integration plan passed 94/94.
  Database lint reported only diagnostics owned by the installed PostGIS extension, not
  application-schema failures.
- Generated `public`, `governance`, `routing`, and `complaints` database types were regenerated
  atomically and the drift check passed.
- Local Auth E2E passed 2 cases with 0 failures; the phone case remained correctly provider-gated
  and skipped. The local-required harness now rejects non-loopback Supabase URLs before test setup.
- Development Docker Compose validation passed, and the production dependency audit reported no
  known vulnerabilities.
- All eleven Edge fetch helper cases and all nine contact-normalizer cases passed, covering dispatch
  authorization, one-source claims, heartbeat/ambiguous-finalization retention behavior,
  HTTPS/redirect/size/MIME limits, safe failures, current source-contract trust, normalization,
  placeholders, duplicates, cardinality/layout drift, and non-promotion. All three database-package
  test files and the root migration-safety regression passed.
- The populated Phase 3 upgrade fixture passed and deterministically backfilled the existing source
  contract hash to 64 hexadecimal characters before `NOT NULL` enforcement.
- API behavior was exercised through in-process HTTP contracts and local database integration.
  Authenticated category resolution correctly exposes zero operational categories with the current
  non-routable engineering seed, so positive submission remains rollback-isolated synthetic test
  coverage. The SDK 54 Expo Android export passed; rendered/device inspection remains pending
  because no in-app browser or physical-device target was connected.
- A staging dry run listed exactly 23 pending migrations and six seed files. The subsequent push
  completed successfully through `20260714124000`; read-only verification returned 23 migration
  ledger rows, the canonical Pune authority/local body, 12 categories with zero operational rows,
  and 11 synchronization sources with zero active rows.
- Staging identity verification confirmed the existing citizen profile/role, the first global
  platform-administrator assignment created through the audited bootstrap, and one active Pune
  `municipal_admin` membership/role created from an Auth invitation. The invitation was accepted;
  a later atomic operator reconciliation revoked both temporary alias privileges and left exactly
  one active global platform administrator plus one active Pune municipal administrator on the
  owner's existing confirmed Auth identities. The original citizen remains active.
- Administrator and government-dashboard code-only OTP tests, ESLint, strict type-checking, and
  production builds passed; the canonical governance seed/report drift check remained clean.
- No source, synchronization scope, ward, category, route, officer assignment, complaint, snapshot,
  media object, Edge Function, Cron job, hosted application, or production database was activated
  or deployed. The new loopback guard continues to prevent local Auth E2E from targeting staging.
- Citizen web account regression coverage now verifies explicit signed-in identity, onboarding,
  profile-unavailable, API-error, and retry states. Delivered hosted links, SSR cookies, and
  cross-device behavior remain environment-gated under `AUTH-005`/`ENV-002`.

## Last Updated

2026-07-14
