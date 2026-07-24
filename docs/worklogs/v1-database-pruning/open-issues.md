# Open issues

- A hosted synchronization Edge Function or externally configured Cron schedule cannot be detected
  from repository code. Confirm both are absent or remove them before applying the hosted migration.
- The private `governance-raw-snapshots` bucket remains. Remove it through the Storage API only
  after confirming it is empty or exporting retained evidence.
- If hosted `complaints.complaint_comments` contains any row, the migration stops. Preserve and
  migrate that history through a separately reviewed forward change before retrying.
- An unknown hosted-only dependency on a retired relation also stops the migration. Review that
  dependency explicitly rather than adding `CASCADE`.
- A larger reduction requires compatibility cutovers for active routing, workflow, messaging,
  transparency and SLA/KPI clusters. Do not drop those tables directly.
- Relation-count reduction does not replace the already implemented client request-loop fixes or
  ongoing Supabase request-rate monitoring.
