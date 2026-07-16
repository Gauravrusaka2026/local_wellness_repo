# V1 Backup and Restore Rehearsal

## Purpose

A configured backup is not proof of recovery. Each managed environment needs an owner-approved,
documented restore rehearsal into an isolated non-production target.

## Backup Evidence

Record privately:

- project/environment and backup provider;
- backup identifier, UTC creation time, source database version, and retention class;
- encryption and access-control owner;
- Storage coverage and any separately backed-up private objects;
- expected recovery point and recovery time objectives;
- migration commit and application image compatible with the backup.

Do not download citizen data, private media, officer contacts, credentials, or raw governance
snapshots to an unmanaged workstation. Do not commit dumps or restore logs containing record data.

## Isolated Restore Rehearsal

1. Obtain explicit owner approval and create a separate restricted restore target.
2. Confirm the target cannot send email, SMS, push notifications, webhooks, Cron requests, or
   governance fetches.
3. Restore through the provider-supported database and Storage process.
4. Reconcile the migration ledger and regenerate/check database types; do not apply the clean
   master bootstrap over the restored database.
5. Verify extensions, forced RLS, function grants, private buckets, row counts by safe aggregate,
   temporal constraints, append-only history, and latest backup cutoff.
6. Start isolated compatible services and run health plus synthetic authorization/RLS smokes.
7. Record duration, failures, recovery point, evidence location, and corrective work.
8. Destroy or retain the restored environment only under the approved retention policy.

## Failure

A missing object set, RLS/grant drift, migration mismatch, unexpected outbound delivery, or
unreconciled recovery point is a failed rehearsal and a pilot no-go condition. Escalate through the
incident runbook; never conceal the gap by loading synthetic production data.
