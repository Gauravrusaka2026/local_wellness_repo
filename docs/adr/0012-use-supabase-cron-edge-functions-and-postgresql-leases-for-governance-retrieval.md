# ADR-0012: Use Supabase Cron, Edge Functions, and PostgreSQL Leases for Governance Retrieval

## Status

Accepted

## Date

2026-07-14

## Context

ADR-0010 established a permanent, review-gated governance synchronization pipeline but deferred
the scheduling runtime. The platform now needs a safe operational retrieval slice for official
Pune and Brihanmumbai sources without adding Redis or BullMQ. Multiple scheduled invocations may
overlap, upstream websites may redirect or fail, and exact source bytes must be retained before
parsing. A successful fetch must never imply that an extracted officer, assignment, office, or
contact is verified or suitable for complaint delivery.

Official contact values also change independently of the durable office, role, officer, utility,
or emergency-service identity. Overwriting contact columns would erase history and could expose an
unreviewed address, phone number, or email to citizens.

## Decision

- Use Supabase Cron to invoke a private `governance-sync-fetch` Edge Function on an
  environment-specific schedule. The schedule and dispatch secret are deployment configuration,
  not committed data.
- Keep source schedules and work coordination in Supabase PostgreSQL. A security-definer claim RPC
  selects reviewed due sources with `FOR UPDATE SKIP LOCKED` and issues short leases. Expired leases
  fail their abandoned run before work is reclaimed.
- Give every retrieval contract a deterministic SHA-256 and activate it only when an active global
  platform administrator approves that exact current hash. Add the hash column through a
  nullable/backfill/`NOT NULL` sequence so existing databases can apply the additive migration.
- Use exact HTTPS host allowlists, manual redirect handling, request timeouts, response-size and
  MIME limits, conditional HTTP headers, safe fixed errors, and a dedicated dispatch secret at the
  Edge boundary.
- Preserve exact bytes under content-addressed paths in the private
  `governance-raw-snapshots` bucket. PostgreSQL records the digest, source, run, HTTP metadata, and
  append-only audit events. HTTP 304 links the previous snapshot instead of inventing empty bytes.
  When snapshot-finalization outcome is ambiguous, retain the content-addressed object for a
  grace-period reconciliation job rather than eagerly deleting bytes that a late transaction may
  have committed.
- Register official PMC and BMC pilot endpoints as draft and unverified. Activation requires an
  attributed source review, an official reference source, a cadence, expected media types, and an
  explicit next-run time.
- Model official contacts as durable `contact_channels` plus append-and-close
  `contact_channel_versions`. `source_verified` values remain staged. Only a separate
  `manually_verified` version bound to an approved change review can be published.
- Classify contact visibility and intended use independently. Complaint-delivery approval is an
  explicit flag permitted only for a published, manually verified, public-official complaint
  intake channel.
- Keep parsing, entity matching, review, and publication as later pipeline stages. Retrieval never
  mutates canonical governance entities, activates routing, or promotes a record automatically.
- Continue using structured logs and database audit tables. Do not introduce Redis, BullMQ, Redis
  adapters/caching, or Sentry.

## Alternatives Considered

### Run retrieval inside the NestJS API process

Rejected because API replicas and deploys are not a reliable scheduler, and long-lived retrieval
would couple public request capacity to upstream government websites.

### Use direct `pg_net` calls from PostgreSQL for every source

Rejected for source-body retrieval because bounded streaming, redirects, exact-byte hashing,
content-type validation, and private Storage writes are clearer at the Edge boundary. PostgreSQL
remains the scheduler state and concurrency authority.

### Add Redis and BullMQ

Rejected for V1. PostgreSQL row locks and short leases provide the required at-most-one active
claim per source without another stateful dependency.

### Treat an official website response as automatically verified

Rejected because official pages can be stale, empty, malformed, contradictory, or structurally
changed. Source authenticity is not equivalent to record accuracy or complaint-delivery approval.

### Update contact columns in place

Rejected because it loses temporal history, evidence, and reviewer attribution. Legacy contact
columns become immutable; synchronized values use append-only versions.

## Consequences

- Scheduled fetch work is restartable, auditable, and horizontally safe without a queue service.
- Raw evidence survives parser changes and supports later reprocessing and dispute review.
- Source activation, contact publication, and complaint delivery each require distinct explicit
  approvals.
- Operators must deploy the Edge Function, configure secrets, activate reviewed sources, and create
  the environment-specific Cron invocation before scheduled retrieval runs.
- Ambiguous database-finalization outcomes intentionally retain uploaded bytes. A grace-period
  retention/reconciliation job is required before production activation to preserve late commits
  and safely classify true orphans.
- HTML/PDF parsers, entity matching, repeated-disappearance rules, review UI/API, and transactional
  publication remain separate work.

## Implementation Notes

- Keep `verify_jwt = false` only because the function performs constant-time validation of a
  dedicated high-entropy dispatch secret before claiming work. Do not reuse a user JWT or expose
  the endpoint publicly without that boundary.
- Keep service credentials, dispatch secrets, and Cron authorization values in Supabase secrets or
  environment configuration. Never store their values in source rows, run snapshots, logs, or the
  repository.
- Every redirect must resolve to HTTPS and an exact source allowlist entry. IP literals, localhost,
  local/internal suffixes, credentials, and non-standard ports are rejected.
- Parser output may claim at most `source_verified`; it must remain staged, review-required,
  non-routable, and ineligible for complaint delivery.
- Schema extensions on populated source registries must use additive nullable/backfill/constraint
  sequencing and include upgrade-safety coverage; do not add a populated-table `NOT NULL` column
  without a deterministic backfill.

## Related Documents

- `docs/adr/0007-defer-redis-bullmq-and-sentry-beyond-v1.md`
- `docs/adr/0010-use-review-gated-governance-synchronization.md`
- `docs/governance-synchronization.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
