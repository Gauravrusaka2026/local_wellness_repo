# ADR-0023: Separate Queue Routing from External Contact Delivery

## Status

Accepted

## Date

2026-07-16

## Context

Complaint submission already resolves a verified jurisdiction, department, durable officer role,
and current officer assignment from database evidence. That is sufficient to place work in the
correct access-scoped government queue even when the authority has not published an approved
complaint-intake email address or phone number.

Treating queue assignment and outbound contact delivery as the same event would create two unsafe
failure modes: rejecting an otherwise valid government work item because a current public contact
is absent, or claiming that a person was contacted when the system only created an internal
assignment. The bootstrap data also contains placeholder and unverified contacts that must never be
used for production delivery.

## Decision

- A successful routing decision assigns the complaint to a verified government authority,
  department, durable role, and current assignment where available. This is the authoritative
  government work-queue destination.
- External contact readiness is evaluated separately. A contact is eligible only when it is
  current, manually verified, explicitly approved for complaint intake, and attached to the routed
  officer/assignment or an eligible governing-body fallback.
- Routing responses expose bounded readiness metadata: verified queue, verified officer contact,
  verified governing-body contact, or queue-only. They never expose private contact values to
  citizens.
- Queue creation does not imply email, SMS, telephone, or other outbound delivery. V1 records
  `automaticOutboundDelivery` as false until a reviewed communication channel and delivery/audit
  implementation exists.
- Placeholder, staged, unverified, stale, superseded, or source-only contacts remain ineligible.
  Their absence does not cause a verified queue assignment to fall back to another municipality or
  an unrelated officer.

## Alternatives Considered

### Reject submission unless a verified officer contact exists

Rejected because durable department/role queues remain operational during staff turnover and
contact-directory delays. Requiring a named officer would unnecessarily strand valid complaints.

### Send to any published or discovered contact

Rejected because source discovery is evidence collection, not approval. It could disclose citizen
data to stale, placeholder, or unrelated recipients.

### Report every routed complaint as delivered

Rejected because persistence in a government queue and successful outbound transport are distinct,
auditable events.

## Consequences

- Citizens can submit to a verified operational queue while officer/contact verification proceeds
  independently.
- Government operators can distinguish queue-only assignments from records with approved contact
  evidence.
- A later outbound-delivery subsystem must persist attempts, provider responses, retries, and final
  outcomes before it may claim delivery.
- Production routing still requires verified pilot geometry, routing rules, assignments, and
  authority memberships. The engine continues to fail closed when those are absent.

## Implementation Notes

- Keep contact values in private governance tables protected by forced RLS and service-only
  functions.
- Prefer a current verified officer/assignment complaint-intake contact, then an eligible office,
  department, ward, local-body, or authority contact associated with the selected route.
- Never activate a contact automatically from governance synchronization staging.
- Do not introduce Redis, BullMQ, or Sentry for routing or delivery.

## Related Documents

- `docs/adr/0009-use-database-evidence-for-deterministic-routing.md`
- `docs/adr/0010-use-review-gated-governance-synchronization.md`
- `docs/adr/0013-use-database-enforced-government-complaint-workflows.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
