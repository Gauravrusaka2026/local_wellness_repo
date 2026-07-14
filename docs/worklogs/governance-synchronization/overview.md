# Governance Synchronization Worklog

## Objective

Build a permanent, statewide-capable pipeline that preserves and reviews current official
governance evidence without overwriting the hash-pinned CSV bootstrap or automatically promoting
officers, assignments, offices, wards, departments, utilities, emergency contacts, routing data, or
complaint-delivery contacts.

PMC and BMC are the initial source-registry targets. They are test/planning targets, not hardcoded
runtime branches and not automatically activated production authorities.

## Data Flow

```text
reviewed official source definition
→ scheduled claim and PostgreSQL lease
→ bounded Edge HTTPS retrieval
→ private immutable raw snapshot
→ source-specific parser
→ normalizer and validator
→ canonical entity matching
→ change proposal and evidence
→ human review
→ transactional append/close publication
→ separately approved routing or complaint delivery
```

## Delivered Engineering

- deterministic SHA-256 source contracts with exact-hash approval by an active global platform
  administrator;
- one-source claims, heartbeat-protected short leases, retry/freshness, completion, HTTP 304,
  expired-lease backoff, failure, and audit persistence in Supabase PostgreSQL;
- a dispatch-secret-protected `governance-sync-fetch` Edge Function with exact HTTPS host
  allowlists, manual redirects, time/size/MIME bounds, SHA-256 content addressing, private Storage,
  conditional requests, heartbeat renewal, exact Storage metadata finalization, safe retention after
  ambiguous finalization, and structured logs;
- populated-database-safe contract-hash migration sequencing plus a root migration-safety
  regression;
- source evidence plus durable contact-channel identities and immutable effective-dated values with
  verification, visibility, source snapshot/locator, single-use review, exact publication binding,
  and delivery metadata;
- a pure contact normalizer for email, phone, website, and address evidence with malformed,
  placeholder, duplicate, source-trust, cardinality, and layout-drift diagnostics;
- ten official PMC/BMC endpoints registered as draft, unverified, inactive records;
- a generic forced-RLS synchronization-scope registry plus five Pune and five Brihanmumbai canonical
  ward selections, all service-only, draft, unverified, unapproved, placeholder-backed, and
  non-routable;
- forced RLS, least-privilege service RPCs, pgTAP coverage, Edge/helper tests, normalization tests,
  ADR-0012, and updated operational documentation.

## Current Outcome

### Engineering implemented and locally verified

The scheduling/retrieval/snapshot/contact-version/scope foundation is implemented. A clean local
reset applied the migrations and draft-only source/scope seeds; all 657 pgTAP assertions across 18
plans passed, with plans 016–018 contributing 100 assertions (`44 + 26 + 30`). Eleven Edge fetch
tests, nine contact-normalizer tests, all three database-package test files, and the root
migration-safety regression passed. Database lint reported only PostGIS extension-owned diagnostics.

### Operational activation and data validation pending

No source is active, no Cron invocation or secret was deployed, no official page was fetched by a
scheduled job, no parser-specific record was published, and no hosted Supabase data was changed.
Source-specific PMC/BMC parsers, canonical matching, change detection, review API/UI,
transactional publishers, DNS-resolution hardening, orphan snapshot reconciliation, retention,
monitoring, and record-specific human verification remain open. The ten ward scope targets remain
inactive/non-routable; BMC's numeric placeholder wards require an official lettered-ward crosswalk.

## Explicit Exclusions

- unofficial sources;
- automatic verification, publication, routing activation, or complaint-delivery approval;
- overwriting canonical CSV/workbook inputs or effective-dated history;
- municipality-specific application logic;
- Redis, BullMQ, Redis adapters/caching, and Sentry.
