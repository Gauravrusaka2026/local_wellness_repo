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

The focused Phase 8 database run completed with 2 pgTAP files and 91 assertions passing. The final
clean database run passed all 1,275 assertions across 32 plans; repository formatting, lint,
type-check, tests, builds, generated-artifact checks, Compose validation, and production dependency
audit also passed. No managed environment or public projection was activated by this verification.
