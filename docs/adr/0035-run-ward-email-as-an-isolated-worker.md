# ADR-0035: Run Ward Email as an Isolated Worker

## Status

Accepted

## Date

2026-07-24

## Context

ADR-0027 introduced a durable, private ward-email outbox and explicitly separated complaint
submission from external delivery. The SMTP sender was later implemented inside the combined
workers process, alongside notification materialization, SLA escalation, and KPI calculation.

Mobile/API testing does not require those three background subsystems. Starting the combined
process only to send ward email creates avoidable PostgreSQL polling and made it easy to leave the
email sender stopped after the higher-frequency workers were shut down. A committed complaint can
therefore be correctly assigned and queued while no process exists to transmit its email.

## Decision

- Provide a dedicated ward-email executable that starts only the SMTP sender and its narrow
  service-role outbox RPCs.
- Poll at most once every 60 seconds, claim at most ten rows per continuous batch, and preserve the
  existing database lease, retry, dead-letter, idempotency, and provider-message-ID rules.
- Provide an explicit one-shot mode that claims at most one eligible row for controlled smoke tests
  and backlog recovery.
- Keep the combined workers process compatible by reusing the same `WardEmailWorker` loop when SMTP
  configuration is present.
- Load the ignored repository-root environment for worker package scripts. SMTP credentials remain
  server-only and are never exposed to an API response, client bundle, migration, source file, or
  structured log.
- Treat SMTP provider acceptance and an outbox `sent` state as transport evidence, not proof that a
  government mailbox received, read, or acted on the complaint.

## Alternatives Considered

### Always start the combined workers process

Rejected for routine mobile/API testing because it also activates unrelated notification, SLA, and
KPI claim loops.

### Send synchronously from complaint submission

Rejected because SMTP latency or failure must not roll back an otherwise valid complaint and
government assignment.

### Use a tight polling loop

Rejected because the pilot workload does not justify the database request volume and previous
operational evidence requires a deliberately low idle cadence.

### Move delivery to an unreviewed Edge Function or scheduler

Rejected because it would introduce a second deployment and secret-management path without
improving the existing leased-outbox guarantees.

## Consequences

- Mobile/API development can run email delivery without activating unrelated worker subsystems.
- A deployed environment must supervise the dedicated process; SMTP values in `.env` alone do not
  send queued messages.
- Delivery may begin up to roughly 60 seconds after the outbox row becomes eligible.
- One-shot mode safely processes only the oldest eligible row and is not a substitute for a
  continuously supervised staging/production worker.
- Recipient-mailbox, bounce, quota, and provider-abuse monitoring remain release gates.

## Implementation Notes

- Use `pnpm --filter @local-wellness/workers dev:ward-email` for the isolated development process.
- Use `pnpm --filter @local-wellness/workers ward-email:send-once` for a bounded one-row smoke.
- Do not log recipient addresses, complaint descriptions, exact coordinates, SMTP responses,
  passwords, access tokens, or lease capabilities.
- Run no more than one intended continuous sender per environment; database leases prevent
  duplicate claims but do not justify unnecessary pollers.

## Related Documents

- [ADR-0014](./0014-use-postgresql-leased-outbox-delivery-for-v1-notifications.md)
- [ADR-0023](./0023-separate-queue-routing-from-external-contact-delivery.md)
- [ADR-0027](./0027-use-a-simple-ward-contact-routing-facade-for-the-v1-bmc-pilot.md)
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/supabase-setup.md`
