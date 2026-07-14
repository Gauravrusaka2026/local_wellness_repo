# Governance Synchronization Implementation

## Database Migrations

### `20260714110000_governance_sync_scheduling_and_contacts.sql`

- extends source endpoints with reviewed HTTPS allowlists, fetch bounds, retry/freshness state, and
  deterministic SHA-256 contract hashes plus exact-hash, active-global-platform-administrator
  approval metadata;
- introduces the required contract hash through nullable creation, deterministic trigger backfill,
  and then `NOT NULL` so populated Phase 3 databases upgrade safely;
- adds short source leases, append-only synchronization events, and field-level source evidence;
- adds durable contact channels and immutable effective-dated contact versions;
- separates visibility, source/manual verification, publication, and complaint-delivery approval,
  binding each publication to one single-use review and exact owner/value/URL/evidence/delivery data;
- forces RLS, applies least-privilege grants, and protects append-only/version invariants.

### `20260714111000_governance_sync_service_rpc.sql`

- adds service-only one-source due claiming with row locks and expired-run failure/backoff without
  same-call reclamation;
- enforces 180–900 second trusted leases and supports bounded heartbeat renewal;
- records successful immutable snapshots and reuses prior evidence for HTTP 304 responses;
- verifies exact `storage.objects` size/MIME metadata before finalization and protects referenced
  snapshot objects from material mutation/deletion;
- records bounded failure/backoff state and releases only the matching lease;
- keeps source activation, parsing, matching, review, and canonical publication outside retrieval.

### `20260714112000_governance_sync_scope.sql`

- adds generic service-only, forced-RLS authority/local-body/ward synchronization targets;
- enforces immutable target identity and composite canonical hierarchy;
- requires an active global platform-administrator review before activation;
- keeps synchronization selection independent from routing eligibility and requires the referenced
  canonical entity to be verified/non-placeholder/routable before that separate flag can be set.

## Pilot Source Seed

`supabase/seed/40_governance_sync_pilot_sources.sql` registers four PMC and six BMC official
endpoints for office, ward-office/contact, department, officer-role/assignment, emergency, and
directory discovery. Every endpoint is draft, unverified, inactive, and associated with an explicit
parser contract placeholder. The seed performs no fetch and grants no publication or delivery
approval.

`supabase/seed/41_governance_sync_pilot_wards.sql` resolves `PUNE-W01`–`PUNE-W05` and
`BRIH-W01`–`BRIH-W05` from the canonical bootstrap. The ten scope targets are draft, unverified,
unapproved, placeholder-backed, and non-routable. Preserve the BMC numeric rows as V1 evidence; they
must not be ordinal-mapped to official administrative wards `A`–`E`. Reviewed official ward records
and a new scope version are required before activation. Pune's selected numeric model likewise
requires record-specific identity, effective-date, and geometry evidence.

## Edge Retrieval Runtime

`supabase/functions/governance-sync-fetch/` accepts only authenticated scheduled POST dispatches,
claims due work through the database, performs a bounded fetch, preserves content-addressed bytes in
the private raw-snapshot bucket, and records completion/failure through lease-checked RPCs. It does
not parse, match, review, publish, route, or mutate canonical governance entities.

Each dispatch claims exactly one source and accepts a 300–900 second lease, defaulting to 300. The
function heartbeats after retrieval and after a Storage write. If a new upload cannot be finalized,
or the RPC outcome is ambiguous, the content-addressed object is intentionally retained. A
grace-period reconciler must recheck for a late committed database link before removing a true
orphan; eager deletion is unsafe.

The dispatch secret and Supabase service credential belong in environment secrets. The function
does not return or log lease tokens, secrets, bodies, contact values, or service credentials.

## Normalization Boundary

`packages/database/src/governance-sync/contact-normalizer.ts` converts parser-extracted contact
evidence into deterministic staged candidates. It normalizes supported values, detects malformed or
placeholder content, downgrades duplicates/layout/cardinality problems, and refuses parser claims of
manual verification or publication. Output is review-required and ineligible for automatic
publication or complaint delivery. Official-source trust also requires current contract approval
and record URLs on the approved source host set.

## Version and Approval Invariants

- source retrieval authenticates evidence; it does not verify the extracted claim;
- contact values append/close versions instead of overwriting history;
- `source_verified` remains staged;
- manual publication requires attributed approved change evidence;
- complaint delivery requires a current, published, manually verified public-official intake
  channel plus a separate delivery approval;
- placeholder, unverified, conflicting, superseded, and stale records remain ineligible.
