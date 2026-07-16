# V1 Incident, Support, and Moderation

## Incident Triage

Treat credential exposure, cross-user/private-media access, RLS bypass, incorrect official routing,
data loss, destructive migration behavior, or unauthorized privileged access as critical. Treat
sustained readiness failure, queue dead work, provider outage, and stale governance/SLA data as
high severity when they affect pilot operation.

1. Open an incident in the approved private system and assign an incident lead.
2. Preserve UTC times, request IDs, safe structured logs, audit identifiers, deploy/image versions,
   and affected scopes. Do not copy complaint text, exact coordinates, contacts, tokens, OTPs,
   private paths, or media into chat or source control.
3. Contain narrowly: revoke/rotate affected credentials, remove traffic, stop a worker or schedule,
   or withdraw reviewed public projections. Do not delete immutable history.
4. Assess citizen, authority, privacy, routing, and legal impact with the responsible owners.
5. Recover using the release/rollback runbook and verify authorization plus data integrity.
6. Record root cause, corrective actions, notification decisions, and follow-up tests.

## Support Triage

Support records may contain only a public complaint/reference ID, safe request ID, broad issue
type, affected client/version, UTC time, and consented contact channel. Support must not request an
OTP, access token, service credential, full private complaint payload, or original media.

Identity/access changes, complaint status changes, assignment changes, evidence access, and data
corrections must use audited application/operator workflows. A support agent must never edit a
database row directly to make a ticket disappear. Escalate suspected security/privacy incidents
immediately.

## Moderation

Only trained, currently authorized reviewers may review content in the intended private surface.
Use reason-coded, auditable withdrawal or review actions. Do not publish original media, exact
locations, contact details, internal notes, or unreviewed duplicate relationships. Preserve the
private source record and immutable action history unless an approved retention/deletion workflow
requires otherwise.

Automated malware scanning, full media decoding, face/plate/address redaction, and orphan cleanup
remain mandatory before public media can be enabled. Until then, keep processed public media
disabled rather than manually bypassing the gate.
