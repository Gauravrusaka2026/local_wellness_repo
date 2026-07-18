# Phase 8 Testing

The verification matrix covers schema and ACL invariants, fail-closed publication, approximate
geometry, withdrawals, bounded spatial filters, aggregate privacy, safe public DTO decoding,
anonymous HTTP contracts, and provider-neutral client states.

Duplicate-group database coverage verifies:

- service-role-only review and withdrawal, including authenticated and anonymous denial;
- the requirement that every group member has a current published projection;
- bounded membership, same-local-body/category, and canonical-member validation;
- public-only response fields with no internal complaint IDs or review evidence;
- stable ordering, exclusion of the detail report from related IDs, exact idempotent replay,
  conflict rejection, and withdrawal behavior.

The engagement slice adds focused coverage for direct ACL denial, forced RLS, one row per account,
idempotent state setting, withdrawn projections, inactive profiles, aggregate-only output, bounded
lookup, recent/trending ordering, quota integration, private client-state decoding, and separation
from official workflow state. These cases exist in pgTAP plan 044, the expanded Phase 8 integration
plan, API/store tests, shared validation tests, and mobile query/service tests.

The current focused Phase 8 set passes 120 assertions across plans 029, 030, and 044. A clean local
reset applied all 43 migrations and reviewed seeds, and all 1,542 assertions across 44 pgTAP plans
passed. Application-schema lint, generated database-type drift, adaptive master/BMC artifact drift,
repository formatting, all-workspace lint and strict type-check, the full test/build pipeline, and
the Android Expo export passed. No managed environment or public projection was activated by this
verification.
