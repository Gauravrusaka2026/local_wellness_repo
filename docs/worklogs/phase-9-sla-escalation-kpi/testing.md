# Phase 9 Testing

## Coverage Present

- shared accountability schema validation, including strict rejection of unknown/private fields;
- NestJS route/service/store authorization, query validation, unavailable-state, and RPC decoding
  tests;
- government dashboard SLA/KPI loading, filters, empty/error states, and no-ranking behavior;
- worker configuration, lease claim/execute/fail decoding, retry, shutdown, and safe logging tests;
- atomic calendar/policy/escalation-rule supersession and transactional status-history/escalation-
  event/notification-outbox behavior;
- database migration/ACL/business-calendar/policy selection/clock lifecycle/escalation/KPI
  integration coverage.

## Verified Results

- a clean local Supabase reset applied all 34 migrations and reviewed non-production seeds;
- `031_phase_9_sla_kpi_schema_and_acl.test.sql` passed 48/48 assertions;
- `032_phase_9_sla_kpi_integration.test.sql` passed 51/51 assertions;
- the aggregate database suite passed all 1,275 assertions across 32 plans;
- application-schema database lint reported no findings; remaining full lint diagnostics belong to
  installed Supabase/PostGIS extension functions;
- generated database types and the deterministic 34-migration master SQL artifact passed drift
  checks;
- the API passed 173 tests plus strict type-check, lint, and build; the worker passed all seven test
  files plus strict type-check, lint, and build;
- the government dashboard passed 32 tests plus strict type-check and lint; its production build
  passed as part of the stabilized authentication/client verification.

Managed-environment activation still requires a migration-version check, reviewed operational
policy, worker/schedule configuration, and a rollback-isolated synthetic smoke run. Local fixtures
do not constitute approved production policy.
