# Phase 3 Routing Implementation

## Status

The current session's engineering implementation and local verification are complete. Production
Pune routing and operational official-source synchronization remain data and adapter work, not
hidden TODOs inside the implemented evaluator.

## Database Migrations

### `20260713200000_phase_3_routing_schema.sql`

- creates the private routing schema and 15 taxonomy, asset, ownership, policy, rule, and decision
  tables;
- separates stable identities from effective-dated versions;
- adds temporal exclusions, hierarchy/scope checks, fallback validation, PostGIS indexes, activation
  invariants, and append-only history guards.

### `20260713201000_governance_synchronization_foundation.sql`

- creates the private raw-snapshot bucket;
- adds source endpoint, run, snapshot, candidate, change, review, and append-only review-event
  persistence;
- enforces lifecycle transitions, immutable evidence, attributed approvals, validation/match gates,
  and placeholder non-promotion.

### `20260713202000_phase_3_routing_security_and_rpc.sql`

- forces RLS, revokes client schema/table/function access, and grants non-destructive service-only
  operations;
- adds accuracy-aware jurisdiction resolution and geography GiST indexes;
- adds service-only category, jurisdiction, routing-candidate, and duplicate-safe decision-recording
  wrappers.

## Seed

`supabase/seed/30_phase_3_pilot_categories.sql` creates the exact 12 approved engineering labels and
one reviewed-but-unverified source alias. It creates no operational rule, policy, boundary,
department mapping, asset owner, officer, or assignment. Every seeded taxonomy record is draft,
unverified, and non-routable.

## Shared Packages

- `@local-wellness/types` defines routing requests, evidence, candidates, policies, decisions,
  public results, and duplicate contracts.
- `@local-wellness/validation` provides strict location/routing/duplicate request schemas.
- `@local-wellness/routing-engine` provides GIS/data-provider interfaces, eligibility, confidence,
  deterministic candidate ranking, routing orchestration, and duplicate scoring.
- `@local-wellness/database/governance-sync` provides stage ports, run transitions, and publication
  eligibility without a network, scheduler, or persistence adapter implementation.

## API

The NestJS routing module adds authenticated category listing/detail, jurisdiction resolution, and
routing resolution. Input is limited to category, location evidence, and optional asset ID. Server
logic enforces required assets and future-capture clock skew, resolves only through the routing
store/database boundary, records every decision, emits coordinate-free structured logs, and returns
a citizen-safe result without internal candidate rejections/factors or contacts.

## Governance Synchronization Bootstrap Registration

The canonical repository bundle is represented as one manual `repository_bootstrap` endpoint for
the `bootstrap_bundle` dataset, linked to the existing Phase 2 import batch and path
`resources/governance/csv/`. It is not represented as an invented external URL and cannot overwrite
the repository files.
