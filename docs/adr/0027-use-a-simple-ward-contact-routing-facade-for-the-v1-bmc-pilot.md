# ADR-0027: Use a Simple Ward-Contact Routing Facade for the V1 BMC Pilot

## Status

Accepted

## Date

2026-07-20

## Context

The generalized routing pipeline introduced in Phase 3 resolves and ranks many versioned evidence
types before it can assign a complaint. That model remains useful for future statewide routing,
but it made the immediate BMC pilot difficult to operate and troubleshoot. Citizens need a smaller
V1 path that uses their captured location and selected category to identify a ward, assign the
complaint, and queue it for the ward's configured complaint email.

The repository now contains two owner-supplied immutable BMC inputs covering 26 operational ward
labels and 12 complaint categories. `Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` supplies category,
telephone, WhatsApp, durable-role and issue-source evidence;
`local_wellness_bmc_ward_directory_2026-07-20.zip` supplies ward email, office and email-source
evidence. The owner has approved their merged rows for staging use without the normal governance-
review promotion gate. That approval remains separate from raw source-reported status and does not
establish that the contacts have been operationally tested or approved for production citizen-data
delivery.

The simplification must not discard existing complaint history, routing decisions, RLS policy, or
normalized governance records. It must also avoid hardcoded municipality or contact data in mobile,
web, or API source code.

## Decision

- Use PostGIS jurisdiction geometry to resolve a captured complaint location to the configured BMC
  operational ward.
- Store the generated 26-ward by 12-category routing matrix in the private, forced-RLS
  `routing.ward_issue_contacts` table. Application code does not contain ward, category, email,
  telephone, or WhatsApp mappings.
- Resolve one email per operational ward during generation: use direct K/N and P/E records, map K/S
  to the K/E parent-office record, and map P/W to the P/N parent-office record. Preserve these as
  source-data mappings rather than application routing branches.
- Resolve the V1 route through one service-only `public.resolve_v1_ward_route` facade. The facade
  selects the current database category, ward contact row, durable department/role target, and a
  facade-only compatibility rule, then records the routing decision used by complaint submission.
- Preserve the existing complaint ledger, immutable submission request, assignment, status
  history, routing-decision evidence, and database authorization checks. Existing governance and
  routing tables are not dropped or rewritten; the facade is an additive compatibility path.
- Activate the 12 supplied BMC categories for the pilot without requiring asset selection. A route
  is still data-driven and can succeed only where the database has a matching jurisdiction and
  active ward/category contact row.
- Enqueue one immutable recipient snapshot in the private
  `complaints.ward_email_outbox` in the same transaction that creates the V1 ward assignment.
  Queueing does not mean an email was sent or accepted by BMC.
- Keep email addresses, phone numbers, and WhatsApp numbers service-only. Citizen responses expose
  only sanitized assignment/routing metadata. Phone and WhatsApp values are reference data in this
  iteration and are not contacted automatically.
- Provide narrow service-role claim, completion, and failure RPCs for a future email sender. No
  sender, provider credentials, polling runtime, or scheduled job is activated by this decision.
- Treat the supplied contact matrix as owner-approved staging data. Preserve both input hashes,
  source URLs/dates, record locators and raw email-source status independently from staging
  approval, and require a separate operational review before production delivery is enabled.
- Do not introduce Redis, BullMQ, Redis adapters, Redis caching, or Sentry.

This decision supersedes ADR-0009 as the active BMC V1 routing execution path. ADR-0009's generalized
engine may remain in the repository for compatibility and later statewide work, but it is not the
required critical path for the BMC pilot. ADR-0023 remains accepted because assignment and external
delivery are still separate states.

## Alternatives Considered

### Continue requiring the generalized candidate evaluator for every BMC complaint

Rejected for the current pilot because its additional evidence graph, eligibility gates, and
candidate ranking increased latency and operational complexity without improving a complete
ward/category contact lookup.

### Delete the normalized governance and routing schemas

Rejected because destructive removal would break historical evidence, foreign keys, government
scope, RLS tests, and future statewide expansion. The additive facade provides a smaller runtime
path without corrupting existing records.

### Embed the ward contact matrix in the API or mobile application

Rejected because deployments would become the data source of truth, contacts could leak to
clients, and routine contact corrections would require application releases.

### Send email synchronously inside complaint submission

Rejected because provider latency or failure would make an otherwise valid complaint transaction
fail. A durable outbox records intent independently from transport outcome.

### Expose phone and WhatsApp contacts to citizen clients

Rejected because the values are operational routing data, are not required for submission, and
have not been approved as a public directory contract.

## Consequences

- BMC V1 routing has one explainable database path: location, ward, category, assignment, and email
  queue intent.
- All supplied pilot categories can be selected without asset configuration when a matching ward
  contact exists.
- Existing audit, history, RLS, idempotency, and government-access behavior remain intact.
- The private matrix duplicates a deliberately small amount of normalized data to reduce runtime
  joins and eligibility checks. The generator and database constraints must keep all 312 rows
  complete and unique.
- Split or approximate ward crosswalks may select a deterministic configured ward until exact
  operational boundary geometry is available. This is a staging limitation and must be reviewed
  before production.
- Email delivery is not operational until a provider-backed sender claims the outbox and records
  success or failure. Telephone and WhatsApp delivery remain out of scope.
- Owner approval makes the contact records usable for staging; it does not prove recipient
  ownership, mailbox acceptance, response SLAs, or production privacy approval.
- A raw source conflict or non-promoted status is retained rather than rewritten. The separate
  owner staging flag controls this bounded facade and is not governance verification.
- The existing generalized schema remains installed, so this decision simplifies the critical
  execution path rather than performing a destructive database-size reduction.

## Implementation Notes

- Generate the contact seed deterministically from
  `resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` and
  `resources/local_wellness_bmc_ward_directory_2026-07-20.zip`; do not modify either archive.
- Apply `20260720103000_v1_ward_email_provenance.sql` after the base V1 facade migration so active
  rows must include email source URL, dates, locator, raw reported status and explicit owner staging
  approval. The focused `supabase/deploy/v1-simple-ward-routing.sql` contains both migrations and
  generated seed `54` in order.
- Keep the contact and outbox tables outside the PostgREST exposure list, force RLS, revoke ordinary
  client access, and grant only narrow service-role RPC execution.
- Use idempotent assignment/outbox constraints so submission replay cannot enqueue duplicate mail.
- Store the selected recipient on the outbox record so later contact edits do not rewrite delivery
  evidence for an already submitted complaint.
- Do not log contact values, complaint descriptions, exact coordinates, access tokens, or provider
  credentials.
- The current API must call `resolve_v1_ward_route` directly for V1 submission. The legacy
  `resolve_routing_candidates` RPC remains service-only compatibility code and is not a fallback
  for the facade.

## Related Documents

- [ADR-0009](./0009-use-database-evidence-for-deterministic-routing.md)
- [ADR-0011](./0011-use-server-orchestrated-complaint-submission-and-private-signed-media-uploads.md)
- [ADR-0014](./0014-use-postgresql-leased-outbox-delivery-for-v1-notifications.md)
- [ADR-0023](./0023-separate-queue-routing-from-external-contact-delivery.md)
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/worklogs/v1-simple-ward-routing/overview.md`
