# Testing

Completed database verification:

- clean local Supabase reset from all 50 migrations and current seeds — passed;
- full pgTAP database suite — 46 files and 1,550 tests passed;
- database lint — passed with no schema errors;
- generated database type check — passed;
- adaptive master and current-session artifact checks — passed;
- BMC governance, V1 ward-contact, V1 deployment and canonical governance checks — passed.
- static migration safety/idempotency checks — passed, including fail-closed preconditions,
  lease locking and absence of cascading table/view drops.
- workspace formatting and changed-file whitespace checks — passed;
- workspace lint — all 16 packages passed;
- workspace strict type-check — all 16 packages and the root project references passed;
- workspace tests — all 30 package tasks and all 16 root test files passed;
- workspace production build — all 16 package builds passed, including the cached, previously
  completed mobile Android Expo export;
- tracked-file and local-history secret scan — passed.

The focused pruning test verifies:

- all 15 retired relations are absent;
- retired RPCs and triggers are absent;
- the compatibility readiness function uses `routing.ward_issue_contacts`;
- citizen roles cannot execute the private readiness function;
- all 312 active BMC ward/category rows and 12 V1 categories remain;
- complaint submission, ward-email, Community and government queue RPCs remain;
- the application schema contains 114 custom tables.

Hosted Supabase was not modified. The destructive preconditions and post-migration smoke tests in
the deployment runbook remain operator work.
