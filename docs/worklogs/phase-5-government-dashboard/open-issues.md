# Phase 5 Open Issues

- Production queue data remains unavailable until verified Pune governance, geometry, recipient,
  and routing records are reviewed and activated.
- A real interactive map requires an approved provider and explicit coordinate-sharing policy.
- Notification delivery and realtime events remain Phase 6 work; Phase 5 persists only the outbox
  event needed for transactional correctness.
- Binary signature, MIME, size, and checksum verification is not full media decoding, malware
  scanning, or moderation. Approved processing providers and policy remain required before launch.
- The database has bounded service-only expiration/failure functions, but no scheduled job removes
  expired/failed private Storage objects. Add an idempotent scheduled reconciliation/retention flow
  before production evidence uploads are enabled.
- Cross-authority transfers require a separate reviewed authorization and routing policy.
- Physical-device and hosted-environment validation remain externally gated.
