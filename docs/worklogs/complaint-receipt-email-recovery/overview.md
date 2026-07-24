# Complaint Receipt and Ward-Email Recovery

## Date

2026-07-24

## Incident

A routed complaint committed successfully and received a complaint number, but mobile showed
“Report not submitted.” Its ward email also remained unsent.

## Findings

- The API completed submission and logged the committed complaint.
- The first-submit response included an undeclared duplicate `routing.categoryId`; the strict
  mobile decoder rejected the otherwise valid success response.
- The K/W route and ward recipient were configured correctly.
- SMTP credentials authenticated successfully, but no sender process was running to claim the
  durable ward-email outbox.
- The detailed taxonomy currently exposes 340 leaves: 13 mapped/available, 243 ordinary pending,
  and 84 protected pending. This is a data crosswalk gap, not a mobile rendering defect.

## Implementation

- Canonicalized the API receipt and added backward-compatible, fail-closed mobile normalization.
- Added a distinct unknown-outcome result for network and response-decoding failures, with owned
  complaints as the primary recovery path before any retry.
- Added an isolated low-frequency ward-email process plus one-row smoke mode.
- Processed the bounded pending backlog and left the isolated sender running for the active local
  test session.
- Recorded the architecture decision in ADR-0035.

## Security

No credential, recipient value, description, exact coordinate, access token, or lease capability
was committed or added to structured logs. SMTP acceptance is not represented as government
acknowledgement.
