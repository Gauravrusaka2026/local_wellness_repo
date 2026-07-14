# Governance Synchronization Open Issues

## Engineering Work Remaining

1. Implement retained-fixture parsers for one reviewed PMC HTML/API source and one BMC HTML/PDF
   source, including expected layout/cardinality and repeated-empty/disappearance safeguards.
2. Implement canonical entity matching and explainable change detection for offices, roles,
   officers, assignments, wards, departments, utilities, emergency contacts, and contact versions.
3. Add an access-scoped review API/UI and transactional append/close publishers that reload all
   persisted run, candidate, evidence, change, and review state before applying an approval.
4. Resolve DNS and reject loopback/private/link-local/reserved/rebound destinations at every source
   connection/redirect boundary before activating remote sources (`GOVSYNC-002`).
5. Reconcile aged Storage objects after an approved grace period, rechecking for late committed
   snapshot links before classifying/removing true orphans, and record each retention decision
   (`GOVSYNC-003`).
6. Configure environment secrets and Supabase Cron only after source/parser/security review; add
   metrics, alerts, backups, retention, and rollback procedures.

## Data Validation Remaining

- confirm current official PMC/BMC page/API/PDF endpoints and terms/operational stability;
- verify source-specific result counts, layouts, identifiers, effective dates, contacts and
  incumbent names against record-level evidence;
- verify Pune's current numeric ward identities and create official-source-backed BMC
  administrative ward `A`–`E` records; never ordinal-map the retained numeric BMC placeholders;
- review conflicts between official sources and the canonical bootstrap without rewriting either;
- approve publication separately from routing activation and complaint-delivery use;
- acquire verified Pune ward geometry and complete ownership/routing evidence independently of
  synchronization engineering (`ROUTING-001`).

## Environment Gates

- use only the owner-confirmed replacement staging credentials and complete the historical
  provider-log, remote/all-branch secret, and any legacy Redis-token audit (`SEC-001`);
- keep all ten pilot source endpoints draft, unverified, and inactive until parser/security/data
  reviews pass;
- keep all ten pilot ward scope targets draft, unverified, and non-routable until canonical identity,
  hierarchy, geometry, and source evidence reviews pass;
- complete hosted Edge/Cron/RLS/Storage tests without Redis, BullMQ, or Sentry;
- complete rendered browser and physical-device application smoke tests (`ENV-003`,
  `COMPLAINT-002`).
