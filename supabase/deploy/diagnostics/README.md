# Hosted Supabase diagnostics

Run `database_performance_audit.sql` in **Supabase Dashboard → SQL Editor → New query** while CPU
pressure is observable. It reports cumulative query cost, focused Local Wellness RPC cost, active
waits, hot-table churn, index use, and the largest tables without changing data. Keep its result
private because database activity and normalized statements are operationally sensitive.

Run `bmc_submission_runtime_audit.sql` in **Supabase Dashboard → SQL Editor → New query** when a
verified BMC complaint reaches routing but submission returns `DEPENDENCY_UNAVAILABLE`.

The audit is read-only. It reports whether the complaint submission wrapper, granular routing-
evidence classifier, protected `complaints.complete_complaint_submission_v2` implementation,
service-role boundary, required triggers, and expected BMC internal-routing records are present. It
does not inspect or return citizen, complaint, contact, credential, or location values.

The current wrapper must delegate to `complaints.complete_complaint_submission_v2`. Only the
service-role-facing `public.submit_complaint` wrapper is executable by `service_role`; both the
classifier and canonical implementation remain internal. Migration
`20260718100000_complaint_routing_evidence_diagnostics.sql` installs that boundary and causes an
exact routing-evidence mismatch to return a granular, non-sensitive marker without relaxing any
actor, request, status, category, asset, coordinate, accuracy, or capture-time comparison.

Copy both result grids when reporting a failure. Any `passed = false` runtime row identifies hosted
schema drift that must be repaired with an additive deployment artifact. Do not edit a function,
grant, or trigger directly in the Dashboard before the drift is reviewed against the immutable
source migrations.

If every runtime row passes but the API log reports `PGRST202` for `submit complaint`, run
`reload_postgrest_schema_cache.sql` once and retry with the same saved complaint. The guarded file
does not change application data; it only asks the hosted PostgREST process to reload its schema
cache.
