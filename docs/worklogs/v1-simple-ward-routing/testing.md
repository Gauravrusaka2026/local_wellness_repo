# V1 Simple Ward Routing Testing

## Coverage

- two-archive generator drift validation for 26 email-resolved wards, 12 categories, and 312 unique
  routes;
- direct K/N and P/E email plus K/S→K/E and P/W→P/N mapping/provenance assertions;
- migration application and clean-reset coverage;
- forced RLS, direct privilege, and service-only RPC assertions;
- category activation and facade-only compatibility-rule assertions;
- real PostGIS point resolution through the BMC A ward fixture;
- K/West recipient and WhatsApp lookup assertions without client exposure;
- complaint submission, assignment, single outbox enqueue, lease claim, and sent-state coverage;
- API facade, replay, unsupported-route, and dependency-error tests; and
- mobile optional duplicate-review and submission tests.

## Latest Observed Verification

The contact generator and drift check passed for 26 emails, 12 categories and all 312 routes. A
clean local Supabase reset applied all 48 migrations through
`20260720103000_v1_ward_email_provenance.sql` and the generated seeds successfully. All 48 pgTAP
plans passed 1,645 assertions. The API passed 225 tests plus lint and strict type-check; mobile
passed all 19 test files (99 tests) plus lint and strict type-check. The repository-wide test command
passed all 30 Turbo tasks, including production builds; its root suite passed 72 tests and skipped
only the three environment-gated local Auth E2E cases. The worker suite includes successful SMTP
mapping/completion and sanitized failure-recording cases. Generated database types and the
48-migration master artifacts are current
with a reviewed 23/25 split. The 286,915-byte focused SQL
Editor bundle passed drift validation with ordered payload SHA-256
`bf3f3ee8a902160ab726484468f0996639816dece02ef47ec8b6ac6ee1d1bb72`. These are local results;
hosted staging deployment and an end-to-end provider delivery test remain pending.
