# V1 Simple Ward Routing Implementation

## Source Processing

`scripts/generate-bmc-v1-ward-contacts.mjs` reads
`resources/Mumbai_BMC_Ward_Issue_Contacts_CSV.zip` as the immutable category/phone/WhatsApp source
and `resources/local_wellness_bmc_ward_directory_2026-07-20.zip` as the immutable ward-email/office
source. It validates the issue archive's ward directory, wide matrix and 312-row long form, then
joins one email to each of 26 operational wards. Direct K/N and P/E records win; K/S maps to the K/E
parent office and P/W maps to the P/N parent office. The generator rejects missing wards,
categories, emails/contacts, duplicate ward/category keys, and inconsistent source metadata without
rewriting either archive.

## Database Path

`routing.ward_issue_contacts` is the private denormalized lookup used by V1. It joins a PostGIS-
resolved ward and category to the configured recipient, telephone/WhatsApp references, durable
role, and source metadata. Forward migration `20260720103000_v1_ward_email_provenance.sql` requires
an active row to keep its email source URL, dates, record locator, raw source-reported status and
independent owner-approved staging flag. Forced RLS and revoked client privileges keep those values
service-only.

`public.resolve_v1_ward_route` resolves the location and matching contact row, selects the generic
database target, and records a routing decision compatible with the existing complaint submission
contract. Facade-only compatibility rules are excluded from the legacy candidate evaluator so the
two paths cannot produce duplicate candidates.

When complaint submission creates the corresponding V1 assignment, a database trigger appends one
recipient snapshot to `complaints.ward_email_outbox`. Service-only lease RPCs can claim a batch and
record sent or failed outcomes. No sender process or schedule is installed yet.

## Application Integration

The NestJS routing store and service call the V1 facade through the established routing API. Mobile
duplicate checks remain available for review but no longer block an otherwise valid submission when
no duplicate check was requested. Contact values stay behind the API/database boundary.
