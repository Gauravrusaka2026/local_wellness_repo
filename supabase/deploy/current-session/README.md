# Current-session Supabase upgrade

This compact SQL Editor artifact upgrades an existing Local Wellness Supabase
database that is already complete through
`20260716115000_phase_10_profile_images.sql` (migration 38).

Run [`01_migrations_39_through_43.sql`](./01_migrations_39_through_43.sql) once
in **Supabase Dashboard → SQL Editor → New query**. Paste the complete file and
select **Run**. It is 77,849 bytes, substantially
smaller than `supabase/master.part-2.sql`.

The query:

- holds a transaction advisory lock;
- detects a complete migration 39-43 prefix and skips it;
- rejects partial or non-contiguous schema state;
- executes the exact missing source migrations in order;
- verifies migration 43 and `public.api_readiness_check()` before commit;
- changes neither `supabase_migrations.schema_migrations` nor seed data.

It is safe to run again after a successful execution: all five migrations are
detected as complete and skipped. If the query reports a baseline, partial, or
non-contiguous-state error, stop and reconcile that drift. Use
`supabase/master.part-1.sql` followed by `supabase/master.part-2.sql` only
when their coherent-prefix checks are appropriate. Never edit the guards or add
broad `IF NOT EXISTS` clauses.

This file installs schema changes only. A pre-V1 target that still lacks reviewed BMC category,
ward and geometry seed data may next use the legacy BMC bootstrap under
`supabase/deploy/bmc-mobile-demo/`. That bundle must run before the V1 ward-routing facade and
migration 50. After the legacy bootstrap, apply exact migrations 44–46, the V1 ward-routing
artifact for 47/48 plus seed 54, and then migrations 49–50. Never replay the bootstrap into an
already-pruned project.

## Complaint-submission forward repair

After migrations 39–43 and the BMC bundle are present, run
[`../../migrations/20260718100000_complaint_routing_evidence_diagnostics.sql`](../../migrations/20260718100000_complaint_routing_evidence_diagnostics.sql)
in the SQL Editor. This focused 19 KB migration replaces a potentially stale hosted complaint
completion implementation, keeps the internal functions non-executable by clients, and preserves
strict evidence validation. Its `CREATE OR REPLACE` statements make a SQL Editor retry safe.

Then run
[`../diagnostics/bmc_submission_runtime_audit.sql`](../diagnostics/bmc_submission_runtime_audit.sql)
and confirm every runtime check reports `passed = true` before retrying a saved complaint. Running
the migration through the SQL Editor repairs runtime behavior but does not add a row to the
Supabase CLI migration ledger; a later CLI deployment may safely apply and record the same
idempotent forward repair.
