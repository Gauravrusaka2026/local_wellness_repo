# Phase 3 Routing Open Issues

## Engineering Complete vs Data Validation Pending

The generic schema, evaluator, query/API boundaries, audit model, duplicate framework, and
governance-sync foundation are implemented. Real Pune routing is not ready because the current
bootstrap cannot supply verified operational evidence. See `ROUTING-001`.

## Pune Pilot Evidence

Acquire and review current Pune Municipal Corporation and selected-ward polygons, official
identifiers, category ownership, authority departments, durable officer roles, current assignments,
assets/owners for asset-dependent categories, confidence policies, operational rule versions, and
complete fallback paths. Do not activate any record based on a template or generic source page.

## Canonical Source Gaps

- `resources/governance/csv/seed_data_for_mh/` is absent; the pinned CSVs are directly under
  `resources/governance/csv/`.
- Workbook-to-CSV cell parity remains pending under `DATA-007`.
- LGD identifiers, statewide coverage, ward geometry, current officers, contacts, provenance, and
  routing crosswalks remain incomplete under `DATA-002` through `DATA-006`.
- Replacement-bundle delta automation remains pending under `DATA-008`.

## Governance Synchronization Operations

The source registry/persistence/ports are not a running service. Implement approved source records,
connectors, immutable Storage writes, scheduling/claiming, source parsers, entity matching, change
detection, operator review UI, transactional per-entity publication, retention/backup, and monitoring
before claiming permanent synchronization is operational. See `GOVSYNC-001`.

## Duplicate Integration

Complaint candidate retrieval, persistence, API, privacy rules, suggestion UX, merge behavior, and
review semantics remain Phase 4 work. See `ROUTING-002`.

## Hosted and Visual Validation

Hosted activation remains blocked by owner-managed credentials, provider configuration, verified
pilot data, and security tasks already recorded in `KNOWN_ISSUES.md`. Local database, repository,
API, and HTTP application checks passed. Rendered viewport inspection remains open under `ENV-003`
because no in-app browser target was connected; Phase 3 introduces no routing UI to inspect.

## Routing Activation and Retry Follow-ups

Before pilot activation, add a reviewed configuration report that rejects simultaneously applicable
rules with conflicting confidence-policy versions (`ROUTING-003`). Before Phase 4 clients use
automatic retries, add a distinct routing idempotency key and atomic stored-result replay contract
(`ROUTING-004`). The current runtime fails closed for both unsafe conditions.
