# Governance Synchronization — Retired V1 Subsystem

## Status

**Retired and superseded for V1 by
[ADR-0031](adr/0031-prune-deferred-database-subsystems-for-v1.md).**

This document is a historical record. It is not an activation or deployment guide. Do not deploy
the former `governance-sync-fetch` Edge Function, create a governance synchronization Cron job, call
the retired synchronization RPCs, or recreate the removed tables from this document.

The current BMC V1 runtime uses:

- the retained canonical governance registry and PostGIS ward boundaries;
- the private `routing.ward_issue_contacts` ward/category matrix for current recipient data; and
- `complaints.ward_email_outbox` for durable complaint-email intent and delivery state.

Applying `20260723110000_prune_deferred_v1_subsystems.sql` physically removes the 14-table
governance synchronization/contact subsystem and `complaints.complaint_comments`. On the exact
current repository schema, that reduces custom application tables from 129 to 114.

## Retained Governance Source of Truth

The canonical governance inputs remain read-only:

```text
resources/governance/MH_MASTER_GOVERNANCE_DATA_v1.xlsx
resources/governance/csv/*.csv
```

The CSV exports remain the machine-readable source of truth and the workbook remains the human
reference copy. The following canonical import and governance tables are retained:

- `governance.reference_sources`;
- `governance.import_batches`;
- `governance.import_files`;
- `governance.import_records`;
- authorities, states, districts, talukas and local bodies;
- wards and versioned PostGIS jurisdiction boundaries;
- departments, offices, durable officer roles, officers and versioned assignments;
- authority departments, administrative units and routing references.

ADR-0031 does not rewrite the canonical workbook/CSV files, delete normalized governance rows,
change ward geometry, remove BMC categories, or alter existing complaint history.

## Removed Database Surface

The forward-prune migration removes these 14 tables:

```text
governance.source_endpoints
governance.sync_runs
governance.raw_snapshots
governance.sync_run_snapshots
governance.sync_candidates
governance.sync_change_items
governance.sync_review_items
governance.sync_review_events
governance.sync_scope_targets
governance.sync_source_leases
governance.sync_events
governance.source_evidence
governance.contact_channels
governance.contact_channel_versions
```

It also removes:

- `governance.current_verified_contacts`;
- synchronization/contact validation, lifecycle and Storage-guard functions and triggers;
- `public.claim_due_governance_sync_sources`;
- `public.heartbeat_governance_sync_lease`;
- `public.record_governance_sync_snapshot`;
- `public.fail_governance_sync_run`; and
- `complaints.complaint_comments`, which had no runtime reader or writer.

All other currently supported public API/RPC contracts remain. Delivery-readiness functions are
rewritten to read the active private ward/category matrix without exposing its recipient values.

The unused `@local-wellness/database/governance-sync` package export and its source/tests are also
removed because the repository had no runtime consumer. The retained
`@local-wellness/database/governance-import` package remains the canonical offline,
source-validated import tooling.

## Active V1 Routing and Contact Boundary

`routing.ward_issue_contacts` is the current private BMC routing/contact source. Its generated rows
derive from the owner-approved immutable BMC ward and issue-contact bundles; application code does
not hardcode municipality, ward, category, email, phone or WhatsApp mappings.

`public.resolve_v1_ward_route` resolves:

```text
captured complaint location
  -> active PostGIS ward boundary
  -> active category
  -> active ward/category route
  -> complaint assignment
  -> one immutable ward-email outbox recipient snapshot
```

`complaints.ward_email_outbox` remains the only complaint-email delivery queue. Queueing is not
proof that the email was accepted or acted on. A trusted sender must claim a row, send it through
the configured provider, and complete or fail the lease through the retained narrow RPCs.

Phone and WhatsApp values remain private routing reference data. No automatic phone or WhatsApp
delivery is activated by ADR-0031.

## Historical Architecture

Before ADR-0031, the repository contained a review-gated design for:

```text
registered source
  -> Cron dispatch
  -> PostgreSQL claim and lease
  -> allowlisted HTTPS retrieval
  -> immutable raw snapshot
  -> source-specific parsing
  -> normalization and matching
  -> change review
  -> publication
```

The repository had implemented the persistence foundation and a generic fetch/snapshot adapter, but
the system was never activated for the V1 application:

- no production parser/publisher/review workflow existed;
- no current mobile, API, Admin Console or Government Dashboard feature depended on it;
- no repository Cron job was active;
- the pilot endpoints and scope rows were draft/unverified; and
- BMC complaint delivery had already moved to `routing.ward_issue_contacts`.

That design is retained only in historical migrations, ADR-0010 and ADR-0012. ADR-0031 supersedes
both for V1 execution. A future automated governance-refresh feature requires a new ADR, new schema
and explicit data-retention/security review; it must not silently restore the retired tables or
RPCs.

## Existing Raw Snapshot Bucket

The SQL prune intentionally does not delete the private `governance-raw-snapshots` Storage bucket
or any objects it may contain. Database backups cover database metadata, not the underlying Storage
objects.

After confirming no legal, audit or operational retention requirement and confirming the bucket is
empty or its objects are separately retained, an operator may remove objects and then the bucket
through the Supabase Storage API or Dashboard. Never delete `storage.objects` rows with SQL:
database-only deletion can orphan the underlying files.

See:

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups);
- [Supabase Storage object deletion](https://supabase.com/docs/guides/storage/management/delete-objects);
- `docs/deployment.md`; and
- `docs/supabase-setup.md`.

## Migration and Verification

The forward migration is:

```text
supabase/migrations/20260723110000_prune_deferred_v1_subsystems.sql
```

Before applying it to hosted Supabase:

1. confirm a usable database backup or Point-in-Time Recovery point;
2. stop any externally deployed `governance-sync-fetch` function/Cron caller;
3. confirm no active unexpired synchronization lease exists and review any expired history that
   will be removed;
4. apply the migration once through the normal migration workflow or SQL Editor;
5. verify the private prune marker, removed relations/RPCs and retained V1 routing/email surfaces;
6. run authenticated complaint, owner-isolation, government-scope and ward-email smoke tests.

Do not claim that the hosted project was pruned until those operator steps and verification queries
have actually completed.
