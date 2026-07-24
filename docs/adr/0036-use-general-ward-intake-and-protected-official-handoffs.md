# ADR-0036: Use General Ward Intake and Protected Official Handoffs

## Status

Accepted

## Date

2026-07-24

## Context

The JagrukSetu V1 taxonomy contains 340 citizen-facing complaint subcategories. Thirteen leaves
already map to twelve specialised operational routing profiles backed by the private BMC
ward-contact matrix. The remaining 327 leaves were discoverable but unavailable because no
operational crosswalk had been approved.

Creating a separate operational profile and 26 ward-recipient rows for every taxonomy leaf would
duplicate data, make corrections expensive, and work against the V1 database-simplification goal.
However, keeping nearly the entire taxonomy unavailable prevents meaningful Mumbai testing.

The pending set is not homogeneous. Two hundred forty-three leaves are public or restricted
ordinary civic reports that can use the same bounded BMC staging behaviour requested for V1:
resolve the captured location to an operational ward, assign the complaint through the existing
server-owned route, and queue the configured ward mailbox. Eighty-four leaves are private or
emergency-private. They include law-and-order, welfare, corruption, active emergencies, and four
hazard/crime cases outside those primary groups. Sending those reports to a generic ward mailbox
could expose sensitive evidence, delay emergency assistance, or route an allegation to an accused
office.

Official helplines and government portals are safe to display publicly, but they are not equivalent
to an internally submitted JagrukSetu complaint. The product must make that distinction explicit.

## Decision

- Retain the twelve specialised operational routing profiles and their existing thirteen taxonomy
  mappings.
- Add one reusable `general_ward_complaint` operational profile for the remaining 243 public or
  restricted taxonomy leaves.
- Add one verified `V1_WARD_GENERAL_WARD_COMPLAINT` rule and one private contact row for each of the
  26 supported BMC operational wards. Derive those rows from the already imported, owner-approved
  ward contact evidence instead of duplicating contact values in application code or new source
  files.
- Continue deriving the ward from complaint location through PostGIS. The client cannot choose a
  ward, recipient, department, office, role, or routing rule.
- Treat all 84 private or emergency-private leaves as `protected_handoff`. They have no operational
  routing profile, cannot enter the normal complaint-submission pipeline, and cannot enqueue ward
  email.
- Store official protected actions in one private, forced-RLS
  `routing.complaint_handoff_actions` table. V1 supports only:
  - digits-only telephone actions opened through the device dialler; and
  - HTTPS government pages opened through Expo's in-app browser.
- Expose only action key, kind, label, description, target, and priority through the trusted
  taxonomy projection. Do not expose routing contacts, recipient email, source-review internals, or
  arbitrary URI schemes.
- For a protected taxonomy selection, show the official handoff actions instead of the ordinary
  evidence, location, draft-submission, email, Community, and complaint-result workflow. Opening an
  action does not claim that JagrukSetu filed a complaint with the external authority.
- Compute `submission_available` from complete operational readiness, not taxonomy mapping alone.
  A mapped leaf is available only when its profile/domain, matching V1 rule/version, and ward
  contact coverage are active and eligible.
- Generate the mapping overlay, source registry, action data, seed SQL, validation report, manifest,
  and SQL Editor deployment deterministically. Keep the canonical Maharashtra governance CSVs,
  workbook, and supplied BMC archives read-only.
- Treat the general ward profile as a bounded Mumbai V1 staging fallback. Later reviewed
  department, asset-owner, or external-authority routes may replace individual leaf mappings
  additively without changing the mobile taxonomy contract.

## Alternatives Considered

### Ask an external research session to invent a distinct route for all 340 leaves

Rejected because a web result does not establish that a mailbox accepts machine-delivered
complaints, and the immediate V1 does not need hundreds of distinct operational profiles.

### Create 26 contact rows for every taxonomy leaf

Rejected because it would create 8,840 rows with repeated recipients and source evidence. Taxonomy
leaves should reuse operational profiles when the complete routing behaviour is identical.

### Send every category to the resolved ward mailbox

Rejected because protected reports need independent or urgent intake. Corruption must not route to
the potentially accused office, and an emergency handoff must not be represented as an ordinary
queued email.

### Keep all 327 leaves unavailable

Rejected because it prevents the requested Mumbai V1 testing even though ordinary public and
restricted civic complaints can use the explicitly accepted general ward staging fallback.

### Add email addresses or unrestricted links to the mobile bundle

Rejected because recipient data remains private routing configuration and unrestricted URI targets
could create a client-side security boundary.

## Consequences

- Mumbai V1 exposes 256 internally submittable taxonomy leaves through thirteen reusable
  operational profiles.
- Eighty-four sensitive leaves provide explicit official assistance without creating misleading
  JagrukSetu complaint receipts or unsafe ward email.
- The private ward-contact matrix grows by only 26 rows, from 312 to 338, rather than by thousands.
- Public taxonomy responses remain data-driven and contain no operational email address.
- The action registry adds one table and one sanitized projection to the compact V1 database.
- General ward routing is intentionally less precise than future department/asset-owner routing and
  must be labelled as a staging fallback in operational documentation.
- Source URLs and helplines can become stale. The generated overlay records source and review dates
  and must be regenerated after a reviewed source update.

## Implementation Notes

- The source generator must assert exactly 340 unique leaf mappings: 13 specialised, 243 general
  ward, and 84 protected handoff.
- The seed must assert exactly 256 mapped leaves, 84 protected-handoff leaves, 13 active operational
  profiles, and 338 active BMC ward/profile contact rows.
- Exact protected subcategory actions take display precedence over inherited primary-category
  actions. Both may be returned when they serve different purposes.
- Protected action validation accepts only `call` and `browser`, digits-only telephone targets, and
  HTTPS browser targets.
- Direct access to the handoff registry remains revoked from `anon` and `authenticated`; the
  service role calls the sanitized taxonomy RPC.
- The existing transactional ward-email outbox and isolated SMTP worker remain unchanged for
  ordinary complaints.

## Related Documents

- [ADR-0009](./0009-use-database-evidence-for-deterministic-routing.md)
- [ADR-0023](./0023-separate-queue-routing-from-external-contact-delivery.md)
- [ADR-0027](./0027-use-a-simple-ward-contact-routing-facade-for-the-v1-bmc-pilot.md)
- [ADR-0032](./0032-separate-citizen-taxonomy-from-operational-routing-profiles.md)
- `resources/JAGRUKSETU_COMPLAINT_TAXONOMY_V1.md`
- `docs/worklogs/jagruksetu-bmc-intake-v1/overview.md`
