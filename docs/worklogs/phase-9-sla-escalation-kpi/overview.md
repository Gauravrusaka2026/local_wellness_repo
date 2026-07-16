# Phase 9 SLA, Escalation, and KPI Accountability

## Objective

Provide policy-driven complaint clocks, auditable overdue escalation, and reproducible
organizational KPI snapshots without inventing unapproved targets or ranking individual officers.

## Engineering Scope Present in the Repository

- private, effective-dated business calendars, SLA policies, category overrides, and escalation
  rule versions;
- immutable complaint-policy bindings, materialized milestone clocks, external-dependency pauses,
  and append-only deadline history;
- bounded PostgreSQL-leased escalation and KPI calculation work with retries and terminal audit
  state;
- append-only escalation evidence and data-minimized notification outbox integration;
- versioned KPI definitions plus immutable calculation runs and municipality, ward, and department
  snapshots;
- government-scoped NestJS accountability APIs, strict shared DTO validation, complaint SLA UI,
  and an organizational KPI dashboard;
- worker loops for escalation execution and KPI materialization in the existing trusted worker
  process.

Redis, BullMQ, Redis adapters/caching, Sentry, public KPI endpoints, and individual-officer rankings
remain outside this phase.

## Operational Activation Boundary

The schema and execution paths are engineering-complete in the repository, subject to the root
session's aggregate verification. No active SLA calendar, policy, category override, or escalation
rule is seeded. Production behavior remains inactive until an operator provides and approves
official targets, calendars, role assignments, effective dates, and escalation actions; applies the
migrations; deploys and schedules the worker; and completes environment verification. Missing,
ambiguous, expired, draft, placeholder, or unverified policy data fails closed and creates no
operational clock or automatic escalation.
