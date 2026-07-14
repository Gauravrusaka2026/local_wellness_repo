# Phase 3 Routing Testing

## Coverage Added

### Validation and Pure Packages

- strict UUID, coordinate, accuracy, timestamp, additional-field, description, and media-hash
  request validation;
- eligible/ineligible routing evidence, deterministic ordering, direct/fallback priority,
  confidence thresholds, required factors, ambiguity, unsupported areas, and missing mappings;
- duplicate policy/input validation, bounds, weighted scores, stable ordering, and result limits;
- governance-sync lifecycle transitions, terminal states, provenance/review requirements,
  placeholder quarantine, ambiguity, validation errors, and explicit routing activation.

### API

- bearer authentication;
- operational category listing;
- deterministic resolve-and-record behavior;
- jurisdiction evidence without contacts;
- rejection of client-selected targets, missing required assets, and future capture times;
- sanitized public result, safe routing dependency errors, and idempotency-conflict mapping;
- runtime decoding of category, jurisdiction, candidate, policy, explanation, and decision-RPC
  responses at the Supabase adapter boundary.

### Database

The Phase 3 pgTAP plans cover:

- routing and synchronization schema, indexes, forced RLS, and service-only RPC privileges;
- exact 12-category seed and exclusion of every engineering category from operational lookup;
- placeholder/unverified non-routing and the explicit `Blocked drain` alias;
- hierarchy, temporal, fallback-cycle, activation, synchronization lifecycle, review, and immutable
  evidence guards;
- rollback-isolated synthetic PostGIS jurisdiction, asset ownership, department/role/assignment,
  confidence, fallback, ambiguity, and idempotent decision-audit scenarios.

## Verification Status

Observed local results on 2026-07-13:

- frozen install passed for all 17 workspace projects;
- governance source/artifact validation passed for 19 source files, 887 raw records and 14 metadata
  records, producing 789 operational/reference records and 98 quarantined records with 0 errors and
  2,343 explicit warnings;
- clean Supabase reset applied every migration and seed through Phase 3;
- database lint reported no application-schema errors;
- all 450 pgTAP assertions passed across 11 plans, including 102 Phase 3 assertions;
- generated `public`, `governance`, and `routing` types were current after regeneration;
- Prettier passed; lint, type-check, and build each passed for all 16 workspaces;
- all 25 Turbo test tasks passed, as did all root test files; focused suites passed 28 of 28
  routing-engine tests, 28 of 28 database-package tests, and 59 of 59 API tests, including 14 of 14
  routing API cases;
- local Auth E2E passed 2 cases with the provider-gated phone case skipped; a regression proves that
  `REQUIRE_LOCAL_SUPABASE=true` refuses a hosted API URL before test setup;
- Docker Compose configuration validation passed; and
- the production dependency audit reported no known vulnerabilities.

HTTP runtime smoke also passed: citizen `/` and `/auth/login` returned 200, API `/` returned the
expected safe `NOT_FOUND` 404 envelope, unauthenticated category access returned 401, and an
authenticated category request returned 200 with zero operational categories. Zero is the required
bootstrap outcome because all 12 engineering categories are draft, unverified, and non-routable.

No Phase 3 routing UI exists. Rendered viewport and screenshot inspection was not performed because
the in-app browser had no connected target; this environment-only follow-up remains `ENV-003` and
does not invalidate the successful HTTP/API smoke checks.
