# Governance Synchronization Testing

## Coverage Added

### Database

The three new pgTAP plans cover:

- due-source eligibility, source approval, concurrent claims, lease expiry/recovery, retries,
  one-source dispatch, contract-hash approval, heartbeats, freshness, HTTP 304 behavior,
  Storage-object validation/immutability, run/snapshot/event lifecycle, service-only RPC access,
  and forced RLS;
- contact-owner integrity, effective-dated version overlap, immutable history, source evidence,
  verification states, single-use publication review attribution, exact owner/value/URL/evidence/
  delivery binding, complaint-delivery approval, visibility, placeholder/conflicting rejection, and
  least privilege;
- synchronization-scope schema/indexes, forced RLS/ACLs, ten exact pilot targets, hierarchy
  integrity, immutable identity, active-global-platform-admin review, placeholder non-routing, and
  routing-gate independence.

### Edge Fetch and Normalization

- eleven Edge/helper tests cover the dispatch boundary, single-source claims, lease bounds/heartbeats,
  exact HTTPS/redirect hosts, conditional requests, MIME/size/time bounds, content hashing,
  ambiguous-finalization retention, and safe error handling;
- nine contact-normalizer tests cover supported normalization, malformed/incomplete/placeholder
  values, duplicates, empty extraction, cardinality/layout drift, current contract approval,
  approved source hosts, and prevention of parser-driven manual verification/publication.
- the root migration-safety regression verifies nullable creation, deterministic backfill, and
  `NOT NULL` enforcement for the source-contract hash on a populated Phase 3 schema.

## Observed Local Results — 2026-07-14

- clean Supabase reset applied all three synchronization migrations and the draft-only PMC/BMC
  source/scope seeds after all earlier migrations/seeds;
- all 657 pgTAP assertions passed across 18 plans; plans 016–018 contribute 100 assertions
  (`44 + 26 + 30`);
- all eleven Edge fetch/helper tests passed;
- all nine contact-normalizer tests passed;
- all three database-package test files passed;
- the root migration-safety regression passed;
- its populated Phase 3 upgrade fixture backfilled the existing source endpoint with a
  64-character contract SHA-256 before `NOT NULL` enforcement;
- database lint reported only diagnostics owned by the installed PostGIS extension, not
  application-schema failures;
- canonical CSV/workbook bytes and hosted Supabase were not changed.

## Validation Not Yet Performed

- deployed Edge Function invocation through environment-owned Supabase Cron and secrets;
- live approved-source retrieval with DNS/private-address and rebinding enforcement;
- fixture-backed PMC/BMC HTML/API/PDF parsing and layout/cardinality baselines;
- entity matching, disappearance/change detection, review API/UI, and transactional publication;
- current officer/contact correctness, record-specific manual verification, and complaint-delivery
  approval;
- official Pune ward evidence and reconciliation of the numeric BMC placeholder targets to the
  official lettered ward structure;
- orphan snapshot reconciliation, retention/backup, alerting, and rollback in a hosted environment.
