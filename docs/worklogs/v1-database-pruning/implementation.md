# Implementation

## Database

`20260723110000_prune_deferred_v1_subsystems.sql`:

- requires the migration-48 ward-contact provenance shape;
- requires a complete owner-approved ward/category matrix before removing any populated historical
  governance subsystem;
- refuses to delete non-empty complaint-comment history;
- locks the synchronization lease table and rejects active unexpired work;
- removes obsolete Storage and legacy-contact triggers;
- drops the unused public-comment table;
- drops all 14 governance synchronization/contact relations and their RPC surface with dependency-
  restricted operations;
- recreates delivery-readiness functions over the private ward matrix;
- installs an adaptive master-bundle prune marker.

## Repository cleanup

- removed the synchronization Edge Function and shared fetch helper;
- removed the unused `@local-wellness/database/governance-sync` package export, implementation and
  tests after confirming that it had no consumers;
- removed the Edge Function registration;
- removed pilot synchronization seeds;
- removed retired synchronization tests;
- removed the old source-registry insert from the category seed;
- updated BMC verification generation to avoid the retired contact tables;
- made the legacy BMC bootstrap abort after the V1 facade/prune and documented the exact
  migrations-44-through-50 continuation order;
- regenerated database types and master SQL artifacts.

The canonical offline `@local-wellness/database/governance-import` tooling remains.

## Compatibility

Complaint submission, 26-by-12 BMC ward routing, ward email, owner history, Community, government
queue/actions, private communication, notifications, accountability and SLA/KPI relations remain.
