# PROGRESS.md

## Overall Completion

95% implemented.

The current BMC V1 complaint path is locally complete: all 13 operational profiles resolve through
a private PostGIS ward/contact facade across 26 configured wards. The immutable issue-contact archive
supplies 12-category phone/WhatsApp evidence and the immutable 2026-07-20 ward-directory archive
supplies ward-email/office evidence; their deterministic merge generates 312 private rows, and the
general intake profile adds 26 source-preserving rows for a total of 338. Direct
K/N and P/E mailboxes and K/S→K/E plus P/W→P/N mappings are represented explicitly. Raw source
status/provenance remains separate from owner-approved staging activation. Complaint assignment
atomically queues a ward email and retains the existing decision/history/RLS model. Actual provider
sending is implemented behind server-only SMTP configuration; hosted worker deployment and a
controlled recipient-mailbox smoke remain pending, along with exact K/P child geometry and
Pune/statewide coverage. The isolated low-frequency sender has now authenticated to SMTP, processed
the bounded hosted-staging backlog, and persisted provider message IDs including the current K/W
complaint; this proves provider acceptance, not recipient-mailbox delivery or government action.
The mobile/API receipt contract is canonical again, and ambiguous network or response-decoding
outcomes now direct citizens to owned complaints instead of falsely declaring a committed report
unsuccessful.

Phase 0 and Phase 1 are complete. Phase 2's engineering baseline is complete and locally verified;
its remaining exit work requires external, verified pilot identifiers, contacts and real boundary
geometry. The reviewed Maharashtra Batch 0 ZIP is now hash-pinned and reproducibly staged: its 160
CSV rows and 38 source observations retain immutable provenance, Maharashtra plus 35 exact district
matches receive LGD enrichment, and the ambiguous Mumbai row plus all conflicts remain
quarantined. The batch contains no operational municipality, ward, geometry, contact, officer,
asset, or routing records and therefore changes no routing coverage. Phase 3's generic routing engine, database/API boundaries, duplicate framework and
review-gated governance-synchronization prototype were implemented and tested historically. Because
that prototype was never deployed or activated, V1 now physically removes its fourteen
synchronization/versioned-contact tables and the unused public-comment table through migration
`20260723110000_prune_deferred_v1_subsystems.sql`. The application-owned schema is reduced from 129
to 114 tables at the prune boundary; the protected-handoff registry brings the current count to
115 while the active PostGIS complaint path, 338-row ward/profile contact matrix,
Community, government workflow and ward-email delivery remain installed. Optional official-source
BMC seeds continue to provide locally verified internal demo routing for three asset-independent
categories across 22 exact one-to-one wards through 66 deterministic rules. The other nine pilot
categories, split K/P child geometry, managed import, a future replacement source-refresh system
and production email validation remain open.
The JagrukSetu classification and BMC V1 intake layers are also locally complete. Deterministic
generators produce 17 primary categories, 340 subcategories and 19 workflows from the reviewed
source. Thirteen leaves preserve specialised mappings and 243 public/restricted leaves use one
general ward profile, so 256 are submittable. All 84 private/emergency-private leaves expose
official call/browser handoffs instead of ordinary complaints. Migrations 51/54, seeds 55/56, the
public-safe taxonomy RPC, authenticated cached API and two-dropdown mobile experience are locally
verified. Hosted deployment, physical-device interaction and precise replacements for the general
crosswalk remain open.
Phase 4 provides the secure complaint persistence/API boundary and an Android-buildable citizen
capture client. The mobile experience now adds email/password access and recovery, mandatory
ordinary Supabase confirmed-phone OTP, fresh-SMS password change/recovery, private profile images
with camera/gallery selection, an ephemeral verified civic-area
lookup, a modern navigation shell, owned-complaint dashboard/history, reviewed locality Feed,
privacy-safe aggregate Heatmap, foreground Nearby governance lookup, and database-driven
attribute/media requirements. The report flow uses primary-category and subcategory/issue-type
dropdowns, shows derived workflow/routing state, submits mapped civic issues and replaces normal
capture with official help for protected issues. Complaint
capture now renders all inputs and review controls in one scrollable form and explains every unmet
submit requirement; its resumable server stages and fail-closed routing checks are unchanged.
Community, Nearby, and Profile now share a purpose-scoped current-area coordinator: a non-mocked
position accurate to 100 metres or better may be reused in memory for five minutes, identical
concurrent reads are coalesced, and explicit Refresh bypasses reusable positions. No watcher,
periodic/background task, or persisted coordinate cache was added. Auth identity transitions clear
the cache. Automatic feature entry may show the native permission prompt only once per application
process; later attempts are citizen-initiated recovery. Complaint issue and media evidence continue
to require fresh high-accuracy fixes and never reuse the context cache.
Citizen Web now runs public-only: home, transparency and directory remain available without
protected session/network work, while its existing owner complaint, feedback/reopen, reporting and
account code is latent until protected-flow parity is approved. Current issue evidence and captured media are limited to
the reviewed 50 m policy at client/API/database boundaries. A persisted street address remains a
separate private-data decision. Hosted staging now exposes the bounded BMC catalog, finalized
private media, K/W jurisdiction, and internal routing. A complete local full-stack submission
returns `201`; hosted submission still requires additive migration `20260718100000` and a receipt
smoke. Transcription/moderation and physical-device validation remain open. The mobile information hierarchy is now
more compact, with Home, Complaints, Report, Community, and More as primary destinations. Community
offers Local, Trending, and Heat views plus one support per authenticated account and private
star/follow state over current reviewed projections only. Public output exposes only aggregate
support counts, and community signals cannot change official workflow or SLA/KPI state.
Signed-in citizens now also see their three newest owner-scoped complaints in a separate
focus-refreshed **Your reports** panel at the top of Community. That panel works without location,
never enters public map/ranking/engagement state, and remains independently usable when reviewed
transparency is empty or unavailable.
Authenticated Home now presents the current private profile avatar/name with a device-time greeting
and concise report/status/Nearby actions. The five-destination navigation is a rounded, detached
capsule with filled code-native icons. Core mobile auth, Home, complaint/report/result, Community,
Nearby, notifications, menu and profile copy now use typed English/Marathi/Hindi resources with
immediate locale switching. Nearby uses the existing safe governance projection in a first-party
schematic location/result layout. Migration
`20260724120000_verified_civic_area_office_contacts.sql` adds at most 25 verified exact-ward and
explicitly scoped municipality-wide offices with optional public address/phone/email and official
source fields. It never exposes operational routing recipients, WhatsApp values, officer mobiles,
internal identifiers, geometry or unpublished records.
Phase 5 now adds
database-enforced government workflow, an authenticated NestJS operations API, private verified
resolution evidence, and an accessible access-scoped government dashboard. Its engineering is
locally complete with synthetic verified fixtures; production-like use remains gated on verified
pilot data, an authenticated managed-environment smoke test, map policy, and evidence operations.
Phase 6 now provides forced-RLS private complaint conversations, durable in-app notifications,
PostgreSQL-leased materialization/realtime delivery, authenticated database-authorized Socket.IO,
strict communication APIs, and mobile/government client integration. Its local engineering and
verification matrix are complete; managed activation, push/email providers, public-comment policy,
and physical-device/hosted validation remain open. The configured replacement Supabase project uses
owner-confirmed staging credentials. Dashboard failures confirmed an earlier Local Wellness schema
without identifying a reliable cutoff, so the fixed Phase 9 assumption was removed. Adaptive
transaction-atomic SQL Editor parts cover the current 52-migration source set, skip
only a coherent completed prefix, and apply the missing suffix. The owner reports running the
focused migrations 39–43
artifact successfully on current staging; post-upgrade readiness/schema reconciliation,
migration/seed ledger remains unreconciled. The current staging target now has seven distinct,
confirmed synthetic privileged identities with active profiles and exact time-bounded BMC
role/membership scopes; every generated password was verified without email delivery. Interactive
TOTP enrollment previously reached Supabase but failed while rendering its newline-terminated SVG
through Next Image. Both portals now trim the provider QR, use a native fixed-size private image,
and offer explicit recovery for their own unfinished factors. The staging platform-administrator
and BMC municipal-administrator now each have a verified TOTP factor, and both portal roots returned
HTTP `200`. Targeted portal tests pass; remaining role-specific queue-isolation and cross-scope
smoke still remain pending. The successful
23-migration deployment and its earlier identities belong to the previous staging target.
For the likely late-Phase-10 target, a separate 77,849-byte adaptive artifact now covers exact
migrations 39–43 from a verified migration-38 baseline. Its local rehearsal applied all five and
safely skipped them on rerun; the owner reports successful hosted SQL Editor execution, pending an
independent schema/ledger check.
Phase 7 now adds effective-dated resolution policy, captured completion evidence, immutable citizen
feedback, policy-controlled reopening, repeated-reopen escalation, strict APIs, private evidence
access, durable citizen receipts, government accountability history, and owner feedback/reopen
actions on Citizen Web. Local engineering and verification are complete; no operational policy was
seeded or activated, and the replacement-target Phase 7 migration state is unreconciled. Phase 8
local engineering now provides a separately reviewed public projection, generalized PostGIS reads,
reviewed duplicate groups, strict anonymous APIs, account-bound support/private stars, live
`recent|trending` ordering, and provider-neutral citizen web/mobile transparency while publishing
no fixture. Phase 9
local engineering adds reviewed business calendars/SLA policies, materialized clocks and pauses,
transactional escalation, PostgreSQL-leased workers, reproducible organizational KPI snapshots,
strict APIs, and a scoped dashboard. No operational visibility/SLA policy or KPI schedule is seeded,
and their versions have not been reconciled against the current staging ledger. Phase 10 is now 88%
implemented locally: PostgreSQL-backed quotas, security headers, health/readiness, graceful
shutdown, secret scanning, bounded HTTP checks, operator runbooks, citizen email/password and
mandatory mobile/API confirmed-phone verification, fresh-OTP password change/recovery, public-only
Citizen Web,
validated Expo in-app HTTPS links, privileged password entry plus TOTP modes, explicit account context/switching
across all portals, named data-driven official invitation selectors, a guarded expiring staging
account matrix, private avatars, 50 m evidence enforcement, and routing delivery-readiness metadata
are present. Hosted-load hardening now removes a redundant Auth network verification, coalesces only
identical concurrent authorization reads, briefly caches only the non-user-specific category
catalog, and applies bounded idle backoff to the PostgreSQL-leased realtime and worker claim loops.
Authorization, confirmed-phone state, privileged MFA, exact location/routing, drafts, complaints,
and workflow state remain uncached.
A read-only hosted performance audit is available, but its output and any resulting query/index
repair remain pending; no hosted CPU improvement is claimed yet. A mobile-only restore race that
could leave the Report button permanently busy across Auth refresh was fixed and its focused
complaint-state verification passes; physical-device confirmation remains pending. ADR-0033
supersedes citizen Advanced Phone
MFA with ordinary Phone Auth confirmation and leaves privileged TOTP/AAL2 unchanged. A clean local
reset, all 50 pgTAP files/1,640 assertions, generated types, master-SQL drift, and
all five local Auth E2E cases pass. All 23 mobile suites, mobile type-check/lint and the
1,293-module Android export pass, as do Citizen Web's eight test files/type-check/lint/production
build and repository-wide tests/type-check/lint. Migrations 52–54 hosted application,
hosted phone-confirmation/signup/hook settings, installed-device delivery/recovery, stale
`phone_change`/lost-phone operations, provider controls, managed migration activation,
official-account browser validation, cleanup jobs, accessibility/legal review, and hosted/device
smoke remain open. The linked phone is also an alternate Supabase AAL1 sign-in identity even though
JagrukSetu presents email/password as the primary citizen entry.

A 2026-07-24 hosted diagnostic now proves the current citizen OTP blocker rather than inferring it:
Phone Auth and Twilio Verify are selected correctly, but the hosted Data API returns `PGRST202` for
the migration-52 `user_has_verified_phone` function, and no hosted user has completed phone
confirmation. The mobile same-user `USER_UPDATED` race that could erase OTP code entry after an SMS
request is fixed and covered. Auth-state follow-up is also deferred until Supabase releases its
provider callback, with stale work cancelled across newer events, sign-out and unmount. The
deprecated custom `processLock` that caused zero-millisecond auto-refresh warnings has been removed
in favor of the pinned SDK's lockless default. The SQL Editor artifact now reloads PostgREST and
reports its function/grant checks. The operator subsequently ran it and reported activating the
Before User Created hook.

The same diagnostic also attributed the reported `PUT /auth/v1/user` HTTP `401` for one existing
citizen: that account retained a verified TOTP factor from an earlier Government Dashboard test, so
Supabase required AAL2 before changing its phone even though the application role was only
`citizen`. ADR-0034 adds a conditional same-user authenticator challenge for that exceptional
state. Citizens without a verified factor still proceed directly to the ordinary SMS flow. After
explicit user authorization, the administrator deleted only this citizen's matching legacy TOTP
factor. The Auth user remains intact with zero verified factors and no verified phone; Supabase
invalidated the account's prior sessions.

The operator subsequently applied the combined hosted SQL and reported activating the Before User
Created hook. A follow-up service-role probe now resolves `public.user_has_verified_phone(uuid)`
and confirms the affected citizen still has no verified phone. The former hosted RPC blocker is
closed; the five-column grant evidence, phone-only-signup denial and installed-device matrix remain
open.

The authentication-facing local runtimes now load one repository-root `.env`, with explicitly
injected deployment values taking precedence. A stale Citizen Web app-local file that pointed Auth
at a different Supabase project than the API was removed. Current-target schema/profile/role
reconciliation and a fresh browser-session smoke remain required; this configuration correction
does not prove the hosted database state.

## Phase Completion

| Phase                                        | Status      | Completion |
| -------------------------------------------- | ----------- | ---------: |
| Phase 0 — Foundation                         | Complete    |       100% |
| Phase 1 — Identity and access                | Complete    |       100% |
| Phase 2 — Maharashtra governance model       | In progress |        90% |
| Phase 3 — Taxonomy and routing               | In progress |        95% |
| Phase 4 — Citizen complaint capture          | In progress |        99% |
| Phase 5 — Government dashboard               | In progress |        95% |
| Phase 6 — Realtime and notifications         | In progress |        85% |
| Phase 7 — Resolution, feedback and reopening | In progress |        92% |
| Phase 8 — Nearby map and transparency        | In progress |        92% |
| Phase 9 — SLA, escalation and KPI            | In progress |        85% |
| Phase 10 — Hardening and launch              | In progress |        88% |

Phase 1 completion is measured against the `PLAN.md` exit criteria: citizen email/password clients
and privileged delivered-invite sessions pass locally; current database scope gates government
access; escalation attempts fail; and server credentials remain outside client sources. Phase 10
now requires server-confirmed ordinary Phone Auth state for citizen mobile/API access and retains
separately configured privileged TOTP/AAL2 policy. Real Twilio delivery/recovery, hosted callbacks,
stale/lost-phone operations, device-bound session invalidation, access lifecycle expansion, and
real-device validation remain explicit pre-launch follow-ups.

Phase 2 engineering completion covers the normalized registry, canonical import and provenance
ledger, PostGIS/version history, authority integration, forced RLS, generated types and local tests.
The optional BMC pack adds official-source internal demo data and legacy ward polygons locally. Its
routing activation is limited to three asset-independent categories and 22 one-to-one wards; nine
asset-dependent categories and the split K/P child geometry remain fail closed. The statewide
canonical baseline and Pune still lack complete reviewed geometry, identifiers, incumbents, and
routing crosswalks. Managed import also remains unproven, so the phase is not marked 100%.

Phase 3 engineering completion covers versioned routing taxonomy/assets/rules/policies/audits,
service-only PostGIS candidate resolution, the deterministic pure evaluator, authenticated routing
APIs and the duplicate-scoring framework. Its undeployed governance-sync prototype is preserved in
history/ADR records but is no longer part of the V1 runtime schema. Optional BMC seeds `52`/`53`
activate 66 internal rules for three asset-independent categories across 22 exact wards from
official-source evidence without enabling automatic external delivery. Phase 3 is not marked 100%
because Pune mappings are absent, the BMC seeds are not reconciled in managed staging, nine
category asset inventories are absent, and any future source-refresh system needs a new reviewed
implementation. The detailed JagrukSetu classification now adds 17 primaries, 340 subcategories and
19 workflows without replacing operational IDs. All 256 public/restricted leaves have a V1
internal route and all 84 private/emergency-private leaves have an official handoff. It is not 100%
because 243 general mappings need progressively more precise reviewed crosswalks and hosted/device
activation is not complete.

Phase 4 engineering completion covers private forced-RLS drafts/complaints/location/media/history,
private signed Storage uploads with server-side integrity checks, privacy-safe duplicate suggestions,
atomic idempotent routing/submission, complaint receipt/history APIs, protected Citizen Web owner
history/detail/timeline, and the accessible Expo photo/video/voice/location workflow with protected
resume state. The authenticated catalog displays non-placeholder unavailable categories without
making them selectable. The baseline bootstrap exposes no verified route; optional BMC seeds supply internal
demo routing only for three categories/22 wards. Speech-to-text/media-moderation providers and
complete physical-device/hosted callback/upload testing remain pending.

Phase 5 engineering completion covers versioned complaint assignments, explicit transition rules,
current-scope authorization, atomic idempotent actions, internal operational records, private
resolution evidence, audit/outbox persistence, strict government APIs, and the server-rendered
queue/detail/action workspace. Placeholder/unverified recipients remain excluded, stale incumbent
versions remain recoverable rather than hiding complaints, and open inspection/dependency work
cannot be stranded by transfer or manual status changes. Phase 5 is not marked 100% because a real
interactive map needs an approved provider/coordinate policy, evidence needs scheduled object
cleanup and full media processing, and an authenticated production-like run needs verified pilot
governance/routing/complaint data.

Phase 6 engineering completion covers private conversation/message/read persistence, current-scope
authorization, source-bound transaction-outbox materialization, durable in-app history, bounded
PostgreSQL leases/retries/dead state, authenticated single-instance Socket.IO delivery, strict API
contracts, and citizen/government client reconciliation. It is not marked 100% because push/email
providers and preferences are unselected, public comments remain deliberately disabled, the two
migrations and processes are not active in staging, and hosted/physical-device reconnect, expiry,
revocation, and offline-delivery validation remains pending.

Phase 7 engineering completion covers effective-dated approved policy selection frozen at the
resolution completion time, captured completion location/work evidence, private before/after/reopen
evidence, immutable feedback, exact-replay citizen actions, policy-controlled reopening, repeated-
attempt escalation, atomic history/outbox writes, strict citizen/government APIs, and mobile/
dashboard accountability surfaces. It is not marked 100% because operational policy values remain
unapproved, the migrations are not active in staging, representative physical-device/hosted flows
remain untested, and government before/reopen evidence review plus current-assignment work-reference
options remain tracked under `RESOLUTION-002`.

Phase 8 engineering completion covers effective-dated visibility policy, immutable reviewed
publications, PostgreSQL-derived generalized coordinates, reviewed duplicate groups, bounded
anonymous nearby/hotspot/ward/detail reads, strict APIs, and provider-neutral accessible citizen
web/mobile surfaces. The current community slice adds one private engagement row per account,
aggregate-only public support counts, private star/follow state, bounded authenticated APIs,
`recent|trending` ordering, and Local/Trending/Heat mobile views without an official-priority side
effect. It is not marked 100% because policy approval, real reviewed publications, pilot moderation
and abuse operations, verified geometry, processed-media operations, external-map/privacy
decisions, managed activation, performance, and rendered/device testing remain incomplete. No
public complaint is activated by engineering fixtures.

Phase 9 engineering completion covers effective-dated business calendars, targets and category
overrides, immutable complaint clocks/deadlines, external-dependency pauses, versioned escalation,
PostgreSQL-leased retry/dead work, reproducible organizational KPI runs/snapshots, strict APIs,
worker loops, and access-scoped dashboard views without officer ranking. It is not marked 100%
because operational policy and verified target roles are unapproved, existing-complaint adoption is
undecided, managed migrations/workers/scheduling/monitoring are inactive, and load/staging smoke
validation remains pending.

## Sprint Completion

- Sprint 1 — Project Foundation: 100% complete.
- Sprint 2 — Identity and Access: 100% complete.
- Sprint 3 — Governance data foundation and pilot-data closure: 91% complete.
- Sprint 4 — Data-driven routing; historical synchronization prototype retired for V1: 89% complete.
- Sprint 5 — Secure citizen complaint capture: 99% complete.
- Sprint 6 — Access-scoped government complaint operations: 95% complete.
- Sprint 7 — Persistent communication and durable notification delivery: 85% complete.
- Sprint 8 — Citizen resolution review and accountable reopening: 92% complete.
- Sprint 9 — Mobile citizen experience completion and privacy-safe projections: 94% complete.
- Sprint 10 — Organizational accountability and managed activation readiness: 85% complete.
- Sprint 11 — V1 citizen access, security, and launch readiness: 80% complete.
- Sprint 12 — Compact V1 database, location coordination, and owner Community access: 92% complete.
- Sprint 13 — JagrukSetu citizen experience and design system: 82% complete.

## Completed Milestones

- ADR-0033 citizen authentication implementation: email/password remains the primary credential;
  ordinary Supabase Phone Auth links and confirms the same user's phone without requiring Advanced
  Phone MFA/AAL2; the API checks service-owned `auth.users.phone` plus `phone_confirmed_at`; and
  password change/recovery uses an isolated non-persistent OTP session with strict identity
  binding and immediate global/local sign-out. Privileged portal TOTP/AAL2 is unchanged. Forward
  migrations `20260723130000_citizen_phone_verification_without_mfa.sql` and
  `20260724100000_require_email_identity_for_auth_signup.sql`, plus their combined SQL Editor
  artifact, are present. The latest integrated clean reset covers all 50 pgTAP files/1,640
  assertions; focused Auth E2E, generated types and master-SQL drift also pass. Mobile
  tests/type-check/lint and Citizen Web tests/type-check/lint/build pass; managed-device activation
  remains pending.

- JagrukSetu detailed classification generated from the reviewed source: 17 primaries, 340
  subcategories and 19 workflows. Thirteen specialised plus 243 general leaves are submittable;
  all 84 private/emergency-private leaves use protected official handoffs. Mobile uses two
  dropdowns, API/PostgreSQL own the operational mapping, and protected actions bypass ordinary
  complaint/email/Community capture. Migrations 51/54, seeds 55/56, both SQL Editor artifacts and
  focused/full local tests pass; hosted deployment and device QA remain separate gates.

- Forward-only V1 physical database prune removing fourteen never-deployed governance
  synchronization/versioned-contact tables plus `complaints.complaint_comments`. The prune boundary
  is 114 tables instead of 129; the later handoff registry makes the current count 115. Its clean
  reset and regression suite retain complaint submission/detail,
  Community, government workflow and ward-email paths. The zero-consumer database-package
  governance-sync module is also removed while governance import remains. Hosted Supabase remains
  unchanged.

- Hosted-load hardening with verified local JWT claims, current database-backed authorization,
  identical in-flight actor-context coalescing, a 30-second non-user-specific category cache,
  bounded adaptive idle backoff for realtime/workers, and a locally validated read-only database
  performance audit. Hosted query evidence and complaint latency validation remain pending.

- Maharashtra Batch 0 immutable ZIP intake with a deterministic archive/header/hash validator,
  29-file/160-record import ledger, 38 canonical source registrations, non-destructive Maharashtra
  plus 35-district LGD enrichment, transient-token redaction, one quarantined Mumbai alias, a
  three-part SQL Editor deployment, generated database types/master artifacts, and passing full
  local migration/seed/RLS verification.

- Deterministic `supabase/master.sql` clean-bootstrap artifact plus two reviewed-boundary, ordered SQL
  Editor parts generated from all 43 migrations, with per-source transaction boundaries, SHA-256
  provenance, and one drift check covering all three files.
- Exact signed-in account context, wrong-account switching, recovery guidance, and distinct
  enrollment/challenge messaging across Citizen Web, Government Dashboard, and Admin Console;
  privileged access still requires identity, personal TOTP/AAL2, and database scope independently.
- Existing privileged identities can enter either portal with password without bypassing TOTP or
  database authorization. Seven separate BMC staging identities now cover global administration,
  municipality, operator, A/K-Ward, Solid Waste Management, and Public Health scopes with verified
  passwords and assignments expiring on 2026-08-17.
- Named official-onboarding choices backed by a service-role-only verified/routable governance
  projection, strict caller-authority filtering, and no operator-entered raw UUID fields.
- Template-compatible passwordless callbacks across citizen web, government dashboard, admin
  console, and mobile: code entry remains available, ordinary links use PKCE, only the government
  invite accepts a narrowly typed default fragment, and database authorization remains mandatory.
- Review-gated Phase 8 transparency with immutable sanitized publications, generalized PostGIS
  projections, reviewed duplicate groups, four bounded anonymous read surfaces, strict APIs, and
  provider-neutral accessible web/mobile clients; no public data was activated.
- Account-bound reviewed-public complaint engagement with one support per account, private
  star/follow state, aggregate-only public counts, live `recent|trending` ordering, bounded quotas,
  withdrawal handling, and no effect on routing, status, escalation, SLA, or KPI state.
- Four transaction-atomic BMC SQL Editor deployment parts covering baseline categories/core,
  official boundaries, reviewed ward/governance crosswalk, and three-category routing activation;
  K/P split wards, unavailable categories, and automatic external delivery remain fail closed.
- Compact current-session SQL Editor upgrade covering exact migrations 39–43 from a verified
  migration-38 baseline, with deterministic generation/static checks, an advisory-locked adaptive
  transaction, final readiness verification, successful local first-run/safe-rerun rehearsal, and
  90 focused pgTAP assertions.
- Database-enforced Phase 9 SLA/escalation/KPI architecture with 19 forced-RLS tables, atomic policy
  supersession, materialized clocks/pauses/deadlines, transactional escalation/outbox evidence,
  PostgreSQL-leased workers, reproducible organizational snapshots, strict APIs, and a scoped
  government accountability dashboard.
- Modern Expo citizen shell with explicit sign-in/create/recovery modes; Home, Complaints, Report,
  Community, and More navigation; refreshable owned-complaint summaries/history; grouped profile/help
  actions; category-driven complaint attributes/media limits; focus refresh; permanent-permission
  recovery; and single-pass location/media preparation.
- One-page mobile complaint reporting with compact category cards, accepted-location/media gates,
  duplicate and emergency review, a complete submission-blocker checklist, and bell notification
  affordances while retaining the existing private server workflow.
- Authenticated verified-governance directory with a service-role-only official-source PostGIS
  projection, honest low-accuracy/unsupported/ambiguous states, public-safe mobile cards, strict
  contracts, ADR-0017, and migration/API/mobile/ACL coverage.
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
- The mobile workspace is aligned to Expo SDK 54.0.36, React Native 0.81.5, React 19.1, compatible
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
- Official-source BMC staging/demo artifacts containing 114 source records across ten tables, seven
  zones, 26 operational wards, versioned offices/roles/officers/assignments/contacts and internal
  routing references; optional routing seeds activate three asset-independent categories across 22
  exact wards with 66 rules, while external production delivery remains false.
- Two additive Phase 6 migrations implementing private forced-RLS complaint rooms, immutable
  messages, monotonic read receipts, durable notifications, provider-channel state, append-only
  delivery attempts, and PostgreSQL-leased materialization/realtime queues.
- Authenticated message/notification APIs, a bounded notification worker, and a Supabase-JWT-
  authenticated Socket.IO server with current database room authorization, persistence-before-
  broadcast, stable event envelopes, retry/dead evidence, readiness, and graceful shutdown.
- Mobile private conversations and durable notification history/read state plus a government
  dashboard conversation panel, all REST-recoverable when realtime is unavailable.
- ADR-0014 and the Phase 6 realtime/notification implementation and testing worklog.
- Two additive Phase 7 migrations implementing captured resolution completion evidence,
  effective-dated resolution policy, private citizen action/audit, immutable feedback, follow-up
  evidence, reopen requests, and repeated-reopen escalation under forced RLS.
- Authenticated citizen resolution-context, feedback, private evidence, and reopen APIs plus a
  current-scope government accountability API with strict shared contracts and database decoding.
- Mobile before/after review, policy-driven ratings/reopening, live follow-up capture, durable
  feedback/reopen/escalation receipts, and realtime refresh; government completion-location input
  and access-scoped accountability history.
- ADR-0015 and the Phase 7 resolution-accountability implementation and testing worklog.
- Six additive Phase 10 migrations through `20260716117000` implementing PostgreSQL quotas,
  privileged/citizen MFA helpers, owner-private profile images, 50 m complaint/media proximity,
  and government routing-delivery readiness.
- Two additive migrations through `20260716119000` add BMC ward relationship versioning and the
  government invitation selector projection; the later engagement migration brings the current
  migration source set and generated master artifacts to 43.
- Citizen mobile email/password signup/sign-in and recovery, mandatory confirmed-phone OTP,
  fresh-SMS password updates, private avatar management, mobile camera/gallery selection, a
  non-persistent verified
  civic-area lookup, and compact mobile Local/Trending/Heat experiences using only reviewed public
  projections.
- A fail-closed Citizen Web public-only gate that keeps public home/transparency/directory routes
  available while preventing protected routes, sessions and network work until web auth parity.
- API health/readiness, security headers, graceful shutdown, PostgreSQL-backed `429` behavior,
  bounded HTTP smoke/load tooling, tracked/history secret scanning, monitoring signals, and V1
  deployment/rollback/backup/incident/data-correction/go-no-go runbooks.
- Routing tests prove exact authority, department, durable role, and current assignment resolution,
  reject placeholder evidence, and distinguish verified government queue placement from optional
  approved contact readiness without claiming automatic outbound delivery.
- ADR-0021 through ADR-0023 covering private profile-image storage, PostgreSQL-backed V1
  hardening, and queue-versus-contact delivery semantics. ADR-0028 records the superseded citizen
  Phone-MFA design; ADR-0033 is the current confirmed-phone OTP/password-recovery decision.
- ADR-0029 and the purpose-scoped mobile location coordinator: bounded current-area reuse for
  Community/Profile/Nearby, explicit-refresh and Auth-clear behavior, concurrent request
  coalescing, and an isolated fresh complaint-evidence path with no persisted coordinates or
  background tracking.
- ADR-0030 and the Community owner-visibility boundary: focus-refreshed private complaint access for
  the signed-in owner without automatic publication, map/heat/ranking inclusion, or public
  engagement controls.

## Current Milestone

The JagrukSetu BMC intake and core mobile-polish milestone is locally implemented. Mobile uses two
dropdowns, the API
exposes an authenticated public-safe catalog with a 30-second cache, PostgreSQL validates the
primary/subcategory/workflow tuple at draft and complaint insertion, and existing route-profile
IDs remain stable. Thirteen specialised plus 243 general leaves are submit-capable; 84 protected
leaves expose official call/browser actions and cannot enter ordinary capture. Hosted
migration/seed deployment and physical-device QA remain the exit gates. The mobile shell uses a
compact civic palette, smaller type, filled code-native icons, one autosaving report page,
dedicated submission-result routes, typed English/Marathi/Hindi copy, purpose-scoped automatic
location, an owner-private Community preview, lazy Heat loading, virtualized lists, and the
sanitized civic-area office contract.

The revised mobile citizen security milestone is implemented in source: email/password remains the
primary credential, protected mobile/API access requires a confirmed ordinary Supabase Phone Auth
number rather than Advanced Phone MFA/AAL2, and every supported password change uses a fresh SMS
challenge in an isolated non-persistent Auth client. Verification is bound to the initiating user
and normalized phone; successful password updates immediately clear global/local sessions.
Recovery fails closed when an account has no already-confirmed phone. Citizen Web includes the same
ordinary phone-confirmation primitive but remains public-only until its complete protected-flow
release matrix is approved. The integrated migrations-52–54 clean reset, all 50 pgTAP files/1,640
assertions, generated types, master-SQL drift and five-case Auth E2E pass. Mobile and Citizen
Web package validation pass; the current mobile run covers 23 suites plus a 1,293-module Android
export, and repository-wide tests/type-check/lint also pass. Hosted migration/hook activation and the installed-device
Twilio/recovery matrix remain the milestone exit gates.
Existing citizens who already carry a verified TOTP factor now receive an ADR-0034 AAL2 step-up
before phone mutation; this conditional compatibility path does not make MFA mandatory for
ordinary no-factor citizens. A live temporary-identity smoke also confirms that Supabase accepts
an exact ordinary `phone_change` request through the configured Twilio path and that test cleanup
completed; handset receipt, OTP verification and the installed-device TOTP path remain unproven.
The legacy-factor screen now explicitly distinguishes locally rotating authenticator codes from
the later SMS code and explains the administrator-reset path when the authenticator is lost.

The repeated-location engineering defect is also resolved locally. General locality screens share
one bounded current-area result instead of independently starting GPS acquisition, while complaint
evidence retains the stricter fresh-position path. The remaining exit gate is the representative
Android/iOS matrix for native last-known behavior, permission UI, movement, background/resume,
identity clearing, and fresh sequential evidence capture.

The Community ownership gap is resolved locally. A newly submitted complaint is visible to its
owner through the existing private complaint list as soon as Community gains focus, while the
reviewed-public Local/Trending/Heat contract remains unchanged. Installed-device submission/focus
and cross-account isolation remain the exit checks.

## Next Milestone

Apply `supabase/deploy/jagruksetu-complaint-taxonomy-v1.sql` and then
`supabase/deploy/jagruksetu-bmc-intake-v1.sql` after reconciling hosted staging through migration
53 and confirming the 312-row base matrix. Deploy the matching API/mobile build and smoke one
specialised submission, one general submission and protected call/browser actions. Protected
actions must not create complaint, Community or ward-email records.

Then apply `supabase/deploy/civic-area-office-contacts.sql`, deploy the matching API/mobile build,
and verify one exact-ward plus one explicitly scoped municipality-wide office response. Confirm
absent fields stay absent, safe phone/mail/source actions open correctly, and no routing recipient,
WhatsApp value, officer mobile, internal identifier, geometry, or unpublished record appears.

Separately, apply `20260723130000_citizen_phone_verification_without_mfa.sql` to reconciled hosted
staging, followed by `20260724100000_require_email_identity_for_auth_signup.sql`. Enable the
ordinary Supabase Phone provider with Twilio Verify, phone confirmations and Phone Auth signup
capability, then activate `public.hook_require_email_identity` as the Before User Created Auth Hook.
The provider gate is required for existing linked-phone OTP; the hook rejects new phone-only user
creation. Set `API_CITIZEN_PHONE_VERIFICATION_MODE`,
`EXPO_PUBLIC_PHONE_VERIFICATION_MODE`, and
`NEXT_PUBLIC_CITIZEN_PHONE_VERIFICATION_MODE` to `enforce`; legacy `*_PHONE_MFA_MODE` names remain
compatibility fallbacks only.
Advanced Phone MFA is not required for citizens, while privileged portal TOTP/AAL2 remains
unchanged. Run the installed-app matrix for link/change, wrong/expired/resend handling, returning
confirmed access, fresh-OTP password change, verified-phone recovery, identity mismatch,
global/local sign-out, phone-only signup denial, stale `phone_change` cleanup and lost-phone
support. Keep Citizen Web
public-only until its equivalent release smoke is complete.

In parallel, complete the installed-device location matrix recorded under `COMPLAINT-002`: verify
five-minute reuse across Community/Nearby/Profile, force-refresh and ward-boundary movement,
permission/service recovery, Auth cache clearing, absence of persisted coordinates, and fresh
issue/photo/video/voice evidence.

## Current Blockers

- The sanitized office contract is verified locally but migration
  `20260724120000_verified_civic_area_office_contacts.sql` has not been applied to hosted staging.
  Apply the matching SQL Editor artifact only after ledger reconciliation, deploy the matching API/
  mobile build, and verify exact-ward plus municipality-wide scope and safe actions.
- Migrations `20260723120000_jagruksetu_complaint_taxonomy.sql` and
  `20260724110000_v1_bmc_general_intake_and_handoffs.sql`, with seeds 55–56, are locally verified
  but not applied to hosted Supabase. The matching API/mobile build must be deployed together.
  Precise replacements for the 243 coarse general mappings remain a data-quality follow-up
  (`TAXONOMY-001`).

- Migration `20260723110000_prune_deferred_v1_subsystems.sql` is verified only on a clean local
  database. Hosted Supabase still requires an operator backup/preflight, ordinary migration
  application, a 115-table final inventory check and complaint/Community/government/email smoke
  tests.
  This prune reduces maintenance surface; it is not evidence that table count caused or fixed the
  earlier PostgREST request storm or high CPU.

- Hosted Supabase has reported CPU above 80% and the mobile report action can stall while the
  project is under pressure. Application-side one-second idle claim loops and redundant Auth work
  are mitigated locally, but the highest-cost hosted statements have not yet been captured. Run the
  private read-only performance audit during the condition and validate any repair with
  `pg_stat_statements`, `EXPLAIN`, and Index Advisor before adding indexes, removing tables, or
  resizing compute.

- The mobile code path is locally complete, but a physical phone still needs a LAN-reachable API/
  realtime URL and representative permission, capture, interruption, SecureStore/SQLite, callback,
  refresh, and logout testing. Location coordination additionally needs native verification of
  cache reuse/expiry, forced refresh, boundary movement, Auth clearing, and fresh sequential
  complaint evidence (`COMPLAINT-002`, `AUTH-005`).
- The new 12-category/26-ward facade and 312 contact rows are locally verified but have not been
  claimed as applied to hosted Supabase. Both immutable source hashes and the forward email-
  provenance migration are included in the focused SQL Editor file. Apply that file, then require
  one fresh complaint receipt, assignment and `pending` outbox row before closing the hosted gate.
- Ward complaint email sending still needs an approved provider, sender identity, template,
  retries/bounce reconciliation and a provider-message-ID smoke (`DELIVERY-001`). Phone/WhatsApp
  values are stored only as private operational contacts and are not automated.
- OS push notifications require an owned Expo/EAS project, FCM/APNs credentials, consent and
  preferences, verified destinations, and delivery policy. Durable in-app history and Socket.IO
  refresh remain available (`NOTIFY-001`).
- Draft attachment removal/replacement, owner signed viewing of finalized original evidence, and
  mobile notification pagination beyond the newest 100 remain bounded UX/security follow-ups; the
  existing private upload/submission and durable server history remain complete
  (`COMPLAINT-004`, `COMPLAINT-005`, `NOTIFY-004`).
- No blocker remains for the Phase 2 schema, baseline import, security or local verification.
- The dedicated staging project and newly generated credentials are confirmed, but its exact
  migration ledger remains unreconciled through the 43-migration cutoff. The earlier readiness
  `503`/`PGRST202` symptom is resolved; do not use healthy readiness as evidence that category,
  governance, routing, transparency, or engagement data has been loaded. Never use the master SQL
  as an upgrade.
- Citizen Advanced Phone MFA activation is no longer a blocker. The current source uses ordinary
  confirmed-phone OTP, hosted migrations 52–53 are applied, the ordinary Phone/Twilio provider is
  configured, and hook activation is operator-reported. The active hook must still be proven to
  reject phone-only creation while strict same-user/phone checks are exercised. Ordinary Phone
  Auth makes the linked number an alternate AAL1 provider login; installed-device delivery, stale
  `phone_change`, lost-phone support and provider/DLT/abuse controls remain explicit release risks.
  An account that already has a verified TOTP factor must complete the conditional ADR-0034 AAL2
  step-up before phone mutation; a lost authenticator requires attributed recovery rather than an
  automatic bypass (`AUTH-010`, `AUTH-014`, `AUTH-015`).
- Citizen, government, and administrator email clients now accept a delivered code or the managed
  default PKCE link without template edits. Exact redirect allow-lists, delivered link/SSR-cookie
  behavior, and an installed mobile build remain environment-gated under `AUTH-005`/`ENV-002`.
- Portal account identity, TOTP enrollment/challenge wording, switching, and recovery guidance are
  complete locally. Interactive managed-browser verification remains pending (`ENV-003`), and an
  already-existing Auth email cannot receive government scope until the audited lifecycle under
  `AUTH-001` is implemented.
- The real-coordinate Phase 2 exit criterion requires pilot selection and official local-body/ward polygons (`DATA-004`).
- Official LGD codes, complete local-government coverage, verified contacts/incumbents and reviewed routing crosswalks remain external data gaps (`DATA-002` through `DATA-006`).
- Workbook-to-CSV cell parity and rendered browser inspection remain environment-gated follow-ups (`DATA-007`, `ENV-003`); source/hash validation and HTTP runtime smoke checks passed.
- Production Pune routing is blocked by absent verified geometry and complete reviewed routing
  evidence (`ROUTING-001`), not by the generic Phase 3 implementation.
- The undeployed governance synchronization prototype was retired from V1. A future replacement
  still needs source-specific parsers, entity matching/change detection, attributed review,
  transactional publication, secure retrieval, retention and production source validation
  (`GOVSYNC-001`).
- Batch 0 improves official source discovery and top-level LGD identifiers only. Its six unresolved
  discrepancy groups, 21 data issues, absent municipality/ward/contact/geometry/routing rows, stale
  PMC booklet, and unreviewed `Mumbai` → `Mumbai City` alias remain open under `DATA-009`; no hosted
  Supabase deployment was performed in this intake session.
- The retired synchronization scope rows no longer exist in the compact V1 schema. The optional BMC
  pack independently supplies source-backed operational ward identities and legacy geometry for
  local internal routing. That pack is not reconciled in the replacement staging target, split K/P
  geometry still needs reviewed handling, and Pune's current numeric model remains pending
  (`DATA-003` to `DATA-005`).
- Any future remote source runtime must include DNS/private-address/rebinding defenses and snapshot
  orphan/retention handling in its replacement design (`GOVSYNC-002`, `GOVSYNC-003`).
- The staging Auth and profile schema are now aligned and the existing citizen identity has an
  active profile/citizen role. A reachable API plus browser session smoke is still required before
  closing the account-page environment issue (`ENV-004`).
- Conflicting confidence-policy versions across simultaneously applicable rules fail closed at
  runtime and the service-only activation report is available; production activation still needs
  reviewed conflict-free policy data (`ROUTING-003`).
- The Maharashtra baseline still has no production route. Hosted BMC data enables only three
  categories across 22 exact wards and explicitly leaves official external delivery false. Nine
  reviewed asset-ownership imports and K/P child geometry remain pending (`ROUTING-001`,
  `DATA-004`).
- Speech-to-text/media-moderation processing, physical-device capture/resume, expired-upload
  cleanup, per-attachment draft removal, and original-evidence owner viewing remain
  (`COMPLAINT-001` through `COMPLAINT-005`).
- The prior staging target had one verified platform administrator and one Pune-scoped municipal
  administrator. The replacement target now has a verified seven-account synthetic BMC matrix, but
  each account used still needs personal TOTP enrollment and rendered cross-scope denial testing.
  Synthetic Auth identities do not auto-disable at role expiry and require explicit teardown under
  `AUTH-012`; production officials still require unique official-controlled identities.
- The interactive government complaint map needs an approved provider and exact-coordinate sharing
  policy (`GOVDASH-001`). Resolution evidence still needs scheduled private-object cleanup, full
  media decoding, malware scanning/moderation, and bounded operational concurrency (`GOVDASH-002`).
- Phase 6 push/email delivery needs approved providers, consent/preferences, destination
  verification, privacy-safe templates, and credentials (`NOTIFY-001`). Its V1 realtime topology is
  intentionally single-instance (`NOTIFY-002`), and public comments remain disabled until a
  visibility/privacy/moderation decision is approved (`NOTIFY-003`).
- A persisted citizen street address needs a dedicated owner-private data model, consent/retention,
  RLS, and reviewed reverse-geocoding/provider policy. The current mobile civic-area labels are
  intentionally ephemeral and coordinate-free (`PROFILE-002`).
- Reviewed-public support, private star/follow state, and live trending are implemented with
  account uniqueness, API quotas, aggregate-only public output, and no official routing/SLA effect.
  Managed migration/data activation, pilot moderation/abuse operations, and rendered/device smoke
  remain pending. Public comments stay disabled (`COMMUNITY-001`, `NOTIFY-003`).
- The replacement target's Phase 6 migration state is unreconciled; its worker and realtime process
  are not active. Hosted reconnect/deduplication, token-expiry disconnect, revoked-scope denial,
  disconnected-recipient history, exact-origin checks, and backlog monitoring remain environment
  validation work.
- Phase 7 seeds no operational policy. Product owners must approve and publish rating/window/status/
  reason/evidence/attempt/escalation values before managed feedback or reopening can activate
  (`RESOLUTION-001`).
- Government before/reopen evidence signed review and current-assignment-only work-reference options
  remain pre-pilot follow-up work; database authorization already rejects stale scope/reference use
  (`RESOLUTION-002`).
- Phase 8/9 migrations have not been reconciled against the current managed-project ledger. No
  transparency publication, SLA calendar/target/escalation rule, KPI schedule, or operational
  snapshot is active from this local work (`TRANSPARENCY-001`, `SLA-001`, `KPI-001`). Existing-
  complaint adoption and sustained lease sizing remain explicit rollout decisions (`SLA-002`).

## Verification Summary

- A clean local reset applies all 55 migrations through
  `20260724120000_verified_civic_area_office_contacts.sql` plus generated seeds `54`–`56`; all 51
  pgTAP files pass 1,655 assertions. Application-schema database lint has no error; an additional
  all-schema inspection reports only pre-existing PostGIS extension-body false positives and no
  project-function errors. Generated database types, deterministic master/current-session SQL drift,
  and byte identity between migration 55 and its SQL Editor artifact pass. The resulting
  application-owned table count is 115, down
  from 129 before the prune. The master parts use the reviewed 23/31 split. The local
  Auth E2E passes all five email OTP, phone link/confirmation, existing-phone SMS password change,
  phone-only-signup denial and government-invite cases.
- The final compact/localised Expo client passes all 156 mobile tests, strict TypeScript, ESLint,
  and a fresh Android export of 1,305 modules. The localisation package passes all three catalogue,
  key-parity and placeholder-contract tests plus strict TypeScript, ESLint and build. Static audits
  find no legacy React Native shadow/elevation properties and no visible Local Wellness branding;
  the retained `localwellness` URI scheme is an internal deep-link compatibility identifier.
- The BMC intake generator passes all six focused tests and drift checks with exact counts of 13
  specialised, 243 general and 84 protected leaves, 338 private contacts and 29 approved actions.
  Focused API tests pass 51 assertions and focused mobile taxonomy/handoff tests pass 16. The full
  API and mobile suites pass 234/234 and 143/143 respectively.
- The current citizen-auth client review passes all 23 mobile test suites, mobile type-check/lint
  and the Expo Android export (1,293 modules); Citizen Web passes all eight test files,
  type-check/lint and its production build. Repository-wide tests, type-check and lint pass. The
  mobile reset-password screen also signs out a just-established isolated recovery session if
  navigation unmounts it during recovery exchange or phone inspection. Targeted Prettier,
  tracked/current-history secret scanning and repository diff checks also pass.
- At the preceding migration-51 checkpoint, the two-archive generator verified 26 email-resolved
  wards, 12 categories and 312 unique routes; workspace lint, strict type-check, all 30 package
  test tasks, all 16 root test files and all 16 production builds passed. That earlier run included
  the cached mobile Android Expo export, worker ward-email mapping/completion and sanitized failure
  handling, focused taxonomy verification across 50 API tests and four selected mobile files, and
  the focused routing artifact at 286,915 bytes with ordered payload SHA-256
  `bf3f3ee8a902160ab726484468f0996639816dece02ef47ec8b6ac6ee1d1bb72`. It is retained as historical
  evidence, not as validation of the later ADR-0033 client changes.

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
- A clean local reset applied all 25 migrations and reviewed seeds. All 967 assertions passed across
  25 pgTAP plans, including the new communication schema/ACL and integration plans. Strict lint of
  the application-owned `complaints`, `governance`, `private`, `public`, and `routing` schemas
  reported no errors; full extension lint still reports only installed PostGIS-owned diagnostics.
- Phase 6 generated database types are current. Frozen install, Prettier, ESLint, strict TypeScript,
  all 28 workspace test tasks, seven root safety test files, all 16 workspace builds, Compose
  validation, Expo SDK alignment/Android export, and the production dependency audit passed. The
  audit reported no known vulnerabilities.
- Focused Phase 6 coverage passed for strict shared contracts, communication controllers/adapters,
  worker configuration/lease/retry/dead behavior, authenticated room authorization, persistence-
  before-broadcast, stale-scope reauthorization, client REST reconciliation, and privacy-safe
  sender/event payloads.
- A clean local reset applied all 27 migrations and reviewed seeds. All 1,072 assertions passed
  across 27 pgTAP plans, including 56 Phase 7 schema/ACL assertions and 49 rollback-isolated
  accountability integration assertions. Application-schema database lint exited successfully;
  broader output contains only pre-existing PostGIS-owned diagnostics.
- Phase 7 database types were regenerated and the drift check passed. All 144 API tests, 45 shared
  validation tests, 7 mobile test files, 22 government-dashboard tests, 28 workspace test tasks,
  and root security/resource tests passed. Repository lint and strict type-check passed across all
  16 packages; formatting, development Compose validation, offline SDK 54 dependency alignment,
  the 1,243-module Android Expo export, and existing production builds also passed. The production
  dependency audit reported no known vulnerabilities.
- Phase 7 activated no managed database, operational policy, public bucket, placeholder governance/
  routing row, Redis, BullMQ, Redis adapter/cache, or Sentry integration.
- The mobile suite passed all 12 test files, including OTP mode, environment diagnostics, dashboard
  aggregation, complaint decoding/capture, transparency, and governance-directory coverage. Mobile
  lint, strict type-check, and the SDK 54 Android export passed; no physical-device smoke is claimed.
- The API suite passed 161 tests and strict type-check/build; shared validation passed all nine test
  files. Governance projection coverage verifies bearer auth, strict requests/responses,
  low-accuracy/unsupported/ambiguous behavior, adapter decoding, private-field rejection, and safe
  dependency failures.
- A clean local Supabase run applied all 30 migrations and passed 1,085 assertions across 28 pgTAP
  plans, including the 13-assertion verified-governance projection plan. Application-schema lint,
  generated database-type drift, and the 30-migration master-SQL drift check passed. Staging was not
  migrated and synthetic fixtures were not promoted.
- A clean local Supabase reset applied all 34 migrations and reviewed non-production seeds. The
  aggregate database suite passed 1,275 assertions across 32 pgTAP plans; focused Phase 9 plans
  passed 48/48 schema/ACL and 51/51 lifecycle assertions. Application-schema lint had no findings;
  remaining full-lint diagnostics are installed Supabase/PostGIS extension functions.
- Generated database types and the deterministic 34-migration master SQL passed drift checks. The
  API passed 173 tests plus strict type-check/lint/build; workers passed all seven test files plus
  type-check/lint/build; shared validation passed all ten files.
- Citizen web passed three test files, admin console one, government dashboard 32 tests, and mobile
  all 12 test files after callback hardening. All four passed strict type-check and lint; all three
  Next.js production builds and the Expo Android export passed. Managed delivery, exact redirects,
  browser cookies, and installed-device callbacks were not claimed from local tests.
- Phase 8 focused database coverage passed 45/45 schema/ACL and 46/46 integration assertions. No
  operational policy, public projection, officer ranking, placeholder route, Redis, BullMQ, Redis
  adapter/cache, or Sentry integration was activated.
- The prior clean local reset applied all 42 migrations through `20260716119000` and reviewed seeds,
  including optional BMC routing seeds `52`/`53`. All 1,513 assertions across 43 pgTAP plans passed,
  including 20 assertions for exact 22-ward/three-category/66-rule activation, split-boundary
  exclusion, candidate resolution, and external-delivery denial. Application-owned schema lint
  reported no errors.
- Before the engagement slice, the API passed 210 tests; Citizen Web passed 7 test files; Government Dashboard passed
  51/51 tests; Admin Console passed 3 test files; mobile passed 17 test files; and shared validation
  passed 10 test files. The new Citizen Web and mobile slices passed lint and strict type-check, and
  the Citizen Web production build passed. No physical-device or hosted-browser result is claimed.
- Before the engagement migration, generated database types, the deterministic 42-migration master SQL, its adaptive parts, and BMC
  governance/routing artifacts passed drift checks. The BMC generator/test verified the optional
  routing seeds without modifying canonical Maharashtra CSV/workbook inputs. Tracked files plus all
  locally available Git history passed secret scanning.
- The current master generator target is the 53-migration clean bootstrap with adaptive SQL Editor
  parts containing migrations 1–23 and 24–53. Catalog fingerprints, an advisory lock, exact source
  hashes, whole-migration skipping, and partial/non-contiguous rejection replace the unproven fixed
  Phase 9 baseline.
- The new engagement migration, pgTAP plan, API/store tests, shared-validation cases, and mobile
  service/query tests pass. A clean local reset applied all 43 migrations and reviewed seeds; all
  1,542 assertions across 44 pgTAP plans passed, schema lint reported no errors, and database-type
  plus master-artifact drift checks passed. The BMC bundle passed its deterministic static test and
  first-run/safe-rerun local execution at 12 visible categories, three operational categories, and
  22 routable wards.
- The compact current-session artifact passed deterministic static checks. Applied to a local
  migration-38 baseline, it installed migrations 39–43 in one transaction; an immediate rerun
  skipped all five safely. Focused plans 038, 039, 040, 042, and 044 passed 90 assertions on that
  upgraded state.
- The mobile complaint presentation now uses one scrollable form with an explicit blocker
  checklist while retaining the server-owned draft and routing lifecycle. Focused blocker tests,
  all 17 mobile test files, lint, strict type-check, and the 1,278-module Android Expo export pass.
  Physical-device interaction and managed positive-route submission remain environment gates.
- A later credential-safe managed audit found API readiness healthy and all five private Storage
  buckets present, superseding the earlier `503`/`PGRST202` observation. It also found zero category
  projections and no tested BMC jurisdiction data. A follow-up probe found migrations 42 and 43
  absent through their public RPC signatures while the exact 38–41 cutoff remains unproven. Confirm
  the owner-reported successful compact migrations 39–43 execution through a fresh readiness/schema
  audit, then apply and verify the BMC bundle. SQL Editor execution does not update the official
  ledger, so reconcile it separately. Local
  engineering verification does not supersede the managed ledger, official pilot data, provider,
  recovery, or installed-device gates.

## Last Updated

2026-07-24

## JagrukSetu UI/UX benchmark sprint — updated 2026-07-24

The benchmark has been translated into the existing Local Wellness architecture. Shared civic
tokens now cover colour, status, typography, spacing, radius, motion, z-index, and breakpoints;
the localisation package provides typed English, Marathi, and Hindi core mobile copy with
locale-aware formatting; and mobile reporting remains one autosaving scrollable form with
automatic location/duplicate progression and explicit result routes. Citizen Web has a responsive navigation/feed
shell with a report launcher, search affordance, reviewed-issue entry point, trust explanation,
and honest empty-state handling. Mobile Home now adds the current profile avatar/name, a
device-time greeting, and one-row quick actions; its five-destination bar is a detached rounded
capsule with code-native icons. Nearby now mirrors the supplied information hierarchy with a
first-party schematic area summary and sanitized verified office cards backed by the existing
projection. Community keeps owner-private reports separate from reviewed-public discovery,
virtualises lists, and loads Heat only when selected. Current-area lookup reuses a five-minute
memory-only fix and limits automatic permission prompting to once per process, while complaint
evidence remains fresh.

Sprint completion: 82% (foundation, refined/localised core mobile surfaces, purpose-scoped
location, protected mobile auth, detailed two-dropdown taxonomy, owner Community preview,
sanitized office directory, and public-only web boundary complete). Remaining non-core/web strings,
reusable component stories, authenticated web capture, rendered accessibility tests, hosted
migration activation, and device/browser QA remain open. No public comments, guest submission,
external map tiles, operational routing-contact exposure, or notification-provider claims were
introduced.

The complaint submission concurrency check has a forward migration that removes false failures
caused by sub-second timestamp and small GPS serialization differences. Strict routing identity
checks remain active; hosted staging must apply migration `20260718123000` before retesting.
