# V1 Operator Runbooks

These runbooks describe the evidence required to operate the Local Wellness V1 pilot safely. They
do not authorize production access, activate placeholder data, or replace owner, municipal,
security, or legal approval.

## Runbook Index

- [Release verification and rollback](release-and-rollback.md)
- [Backup and restore rehearsal](backup-and-restore.md)
- [Incident, support, and moderation](incident-support-and-moderation.md)
- [Governance correction and contact refresh](governance-data-correction.md)
- [Pilot go/no-go](pilot-go-no-go.md)

## Evidence Boundary

Repository checks can prove that code, migrations, RLS tests, generated artifacts, and local
contracts are consistent. They cannot prove hosted backups, provider delivery, municipal data
ownership, official geometry, staffing, or legal approval. Store environment evidence in the
approved private operational system, never in source control.

Custom Supabase Auth templates are optional because the clients support provider-default links and
delivered codes. Exact redirect allow-lists, provider limits, and hosted callback tests remain
mandatory.
