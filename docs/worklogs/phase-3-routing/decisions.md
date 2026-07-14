# Phase 3 Routing Decisions

## Architectural Decisions

- ADR-0009 selects database evidence plus a deterministic pure evaluator.
- ADR-0010 selects staged, review-gated governance synchronization.
- ADR-0007 continues to exclude Redis, BullMQ, and Sentry from V1.

## Database and Service Boundary

- Routing configuration and exact decision evidence live in a private, forced-RLS `routing` schema.
- PostGIS and relational SQL resolve current eligible evidence and materialize direct/fallback
  candidates. The pure engine ranks candidates and performs no database I/O or fallback graph walk.
- Narrow `public` wrappers are executable only by the server service role. Anonymous and ordinary
  authenticated database roles receive no direct routing or synchronization access.
- Routing decisions are append-only and duplicate-protected by actor plus request ID. Exact stored
  payloads return the existing row; conflicting reuse fails closed, while transparent HTTP replay is
  deferred under `ROUTING-004`. Exact coordinates and
  internal explanation evidence are sensitive service data.

## Deterministic Resolution

- Active, current, verified, non-placeholder, routing-eligible evidence is mandatory at every
  layer.
- Direct routes precede fallbacks; specificity, configured priority, confidence, and a stable ID
  provide reproducible ordering.
- Distinct targets within the configured ambiguity delta require manual review. Stable ordering is
  not permission to hide ambiguity.
- Confidence weights, thresholds, required factors, ambiguity, and fallback penalty are versioned
  records rather than application constants.
- Durable officer roles are route targets; current assignments are resolved separately at decision
  time.

## Reference Data

- Pune Municipal Corporation is not hardcoded. It is a planning and synthetic-test reference only.
- The exact 12-category seed remains draft, unverified, and non-routable.
- The `Blocked drain`/`Storm-water blockage` bridge is an explicit unverified alias. The canonical
  CSV label is unchanged.
- Unverified, placeholder, inactive, expired, or non-routable records cannot be promoted by the
  evaluator or by source text such as `Active`.

## Explanations and Duplicates

- Internal evaluation retains evidence, factors, rejections, and fallback steps. Citizen responses
  expose only the selected target and a sanitized policy/boundary/rule/fallback summary.
- Duplicate scoring is pure and policy-driven. Complaint candidate retrieval, persistence, API, and
  merge/review behavior belong to Phase 4.

## Governance Synchronization

- Repository bootstrap and official-source synchronization are separate boundaries.
- Retrieval, immutable snapshot preservation, normalization, matching, change detection, review,
  and transactional publication remain narrow ports and persisted stages.
- Source claims and match scores never verify records automatically. Verification and routing
  activation require explicit attributed reviews plus record-specific provenance.
- Placeholder evidence can be retained only while quarantined and non-routable.
