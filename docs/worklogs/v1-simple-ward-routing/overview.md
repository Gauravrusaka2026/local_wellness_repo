# V1 Simple Ward Routing Worklog

## Objective

Make the current BMC citizen-reporting path small and operational: resolve a captured location to a
ward, resolve the selected complaint category through private database records, preserve the normal
complaint assignment, and queue an email to that ward's configured recipient.

## Delivered Scope

- a deterministic generator that joins the immutable issue-contact ZIP with the immutable ward-
  email/office ZIP;
- a complete private 26-ward by 12-category contact matrix;
- PostGIS ward resolution through one service-only V1 routing facade;
- compatibility with the existing complaint ledger, decisions, assignments, history, and RLS;
- activation of all 12 supplied BMC complaint categories without an asset requirement;
- a private, idempotent ward-email outbox with claim and result-recording RPCs; and
- optional duplicate review in the mobile flow rather than a submission prerequisite.

## Security and Data Boundaries

Email, phone, and WhatsApp values remain private and are never returned to citizen clients. The
two source archives are unchanged, and their hashes, URLs, dates, locators and raw status are
retained in generated records. Direct K/N and P/E email records and K/S→K/E plus P/W→P/N mappings
are resolved during generation. The owner has approved the merged data for staging routing, but
operational recipient testing and production approval remain separate.

## Current Outcome

The V1 database can resolve and assign configured BMC ward/category complaints and persist an email
delivery intent. The trusted workers process now has an optional SMTP sender with a data-minimized
template, bounded lease claims, provider-message-ID completion, and retry recording. It runs only
when server-side SMTP configuration is present. Hosted worker deployment and a controlled recipient
mailbox smoke remain required before external delivery is represented as operational. The change
simplifies the active route without destructively removing the broader governance and routing model.
