# Phase 7 Decisions

- PostgreSQL resolves and enforces the exact approved resolution-policy version.
- Missing or ambiguous policy data fails closed; clients have no fallback policy constants.
- Feedback is immutable and bound to one exact resolution version.
- A resolved feedback outcome confirms resolution; adverse feedback and reopening remain separate
  actions.
- Reopen requests are exactly replayable and PostgreSQL derives reopened versus escalated state.
- Complaint-owner evidence review uses short-lived signed URLs and does not change bucket privacy.
- Original complaint media is before evidence; explicitly linked government resolution media is
  after evidence; citizen reopen evidence remains a separate private record.
- Historical Phase 5 resolutions keep nullable completion-location fields rather than receiving
  fabricated backfill data.

See ADR-0015 for the architectural rationale.
